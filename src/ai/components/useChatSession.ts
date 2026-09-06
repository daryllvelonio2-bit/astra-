import { useState, useEffect, useRef, useCallback } from "react";
import { Alert, ScrollView } from "react-native";
import { processAgentQuery } from "../agent/agentCore";
import { AgentChatMessage, AgentStatus, ConversationSession, LiveStatusInfo, AgentStep } from "../agent/agentTypes";
import {
  listSessions,
  getActiveSession,
  createSession,
  deleteSession,
  updateSessionMessages,
  updateSessionId,
  subscribeSessionChanges,
} from "../services/conversationService";
import {
  Workspace,
  loadWorkspace,
  loadOrCreateDefaultWorkspace,
  saveFileContent,
  notifyWorkspaceChanged,
} from "../../ide/services/workspaceService";
import { useWorkspaceAutoRefresh } from "../../ide/components/useWorkspaceAutoRefresh";
import {
  loadSelectedModel,
  saveSelectedModel,
  loadCognitiveMode,
  saveCognitiveMode,
  loadReasoningEffort,
  saveReasoningEffort,
  subscribeConfigChanges,
} from "../../ide/services/configService";
import { sanitizeAgentText, isMachineJsonDump } from "./sanitizeAgentText";
import { AstraCognitiveMode, AstraEffort } from "../astra/astraModes";
import { executeCode } from "../runner";
import { runningTasksService } from "../services/runningTasksService";
import { reconcileStaleMessages } from "./sessionReconcile";

export interface UseChatSessionProps {
  workspaceId?: string;
  activeFileName?: string;
  activeFileContent?: string;
  onRefreshWorkspace?: () => void;
}

export function useChatSession({ workspaceId: initialWorkspaceId,
  activeFileName,
  activeFileContent,
  onRefreshWorkspace,
}: UseChatSessionProps) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const [renderLimit, setRenderLimit] = useState(100);
  const [input, setInputState] = useState("");
  // Synchronous mirror: state lags a render, so a fast type+send tap could
  // read stale (even empty) input and silently drop the send. The ref never lags.
  const inputRef = useRef("");
  const setInput = useCallback((text: string) => {
    inputRef.current = text;
    setInputState(text);
  }, []);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  const [selectedModel, setSelectedModel] = useState<string>("gemini-3.5-flash-lite");
  const [selectedCognitiveMode, setSelectedCognitiveMode] = useState<AstraCognitiveMode>("default");
  const [selectedEffort, setSelectedEffort] = useState<AstraEffort>("default");
  const [pendingApprovalStep, setPendingApprovalStep] = useState<AgentStep | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState<boolean>(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showCognitiveModeModal, setShowCognitiveModeModal] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ConversationSession | null>(null);
  const [runOutput, setRunOutput] = useState<{ code: string; stdout: string; stderr: string } | null>(null);
  const [liveStatus, setLiveStatus] = useState<LiveStatusInfo | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const pendingApprovalResolverRef = useRef<((approved: boolean) => void) | null>(null);
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const currentSessionRef = useRef<ConversationSession | null>(null);
  const messagesRef = useRef<AgentChatMessage[]>(messages);
  messagesRef.current = messages;
  const scrollRef = useRef<ScrollView>(null);
  const shouldScrollToEndRef = useRef(true);
  const isAgentWorkingRef = useRef(false);

  useEffect(() => {
    isAgentWorkingRef.current = agentStatus !== "idle";
  }, [agentStatus]);

  // 1. Initial Load
  useEffect(() => {
    let isMounted = true;
    async function init() {
      let ws: Workspace;
      if (initialWorkspaceId) {
        try { ws = await loadWorkspace(initialWorkspaceId); } catch { ws = await loadOrCreateDefaultWorkspace(); }
      } else {
        ws = await loadOrCreateDefaultWorkspace();
      }
      if (!isMounted) return;
      setWorkspace(ws);

      const [model, cogMode, eff, sessionList] = await Promise.all([
        loadSelectedModel(),
        loadCognitiveMode(),
        loadReasoningEffort(),
        listSessions(ws.id),
      ]);
      if (!isMounted) return;

      setSelectedModel(model || "gemini-3.5-flash-lite");
      setSelectedCognitiveMode(cogMode || "default");
      setSelectedEffort(eff || "default");
      setSessions(sessionList);

      let active = await getActiveSession(ws.id);
      if (!active) {
        active = await createSession(ws.id);
        const updated = await listSessions(ws.id);
        if (isMounted) setSessions(updated);
      }
      if (!isMounted) return;
      setCurrentSession(active);
      currentSessionRef.current = active;
      setMessages(reconcileStaleMessages(active.messages || []));
      setRenderLimit(100);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 80);
    }
    init();
    return () => { isMounted = false; };
  }, [initialWorkspaceId]);

  // 2. Subscriptions
  useEffect(() => {
    const unsubSessions = subscribeSessionChanges(async (wsId) => {
      if (!workspace || workspace.id !== wsId || isAgentWorkingRef.current) return;
      const sessionList = await listSessions(wsId);
      setSessions(sessionList);
      const activeId = currentSessionRef.current?.id;
      if (activeId) {
        const fresh = sessionList.find((s) => s.id === activeId);
        if (fresh) {
          setCurrentSession(fresh);
          currentSessionRef.current = fresh;
          if (messagesRef.current.length === 0 && fresh.messages && fresh.messages.length > 0) {
            setMessages(reconcileStaleMessages(fresh.messages));
          }
        }
      }
    });

    const unsubConfig = subscribeConfigChanges((cfg) => {
      if (cfg.selectedModel) setSelectedModel((prev) => prev !== cfg.selectedModel ? cfg.selectedModel : prev);
      if (cfg.selectedCognitiveMode) setSelectedCognitiveMode((prev) => prev !== cfg.selectedCognitiveMode ? cfg.selectedCognitiveMode : prev);
      if (cfg.selectedEffort) setSelectedEffort((prev) => prev !== cfg.selectedEffort ? cfg.selectedEffort : prev);
    });

    return () => {
      unsubSessions();
      unsubConfig();
    };
  }, [workspace?.id]);

  // Workspace tree follows agent/saves writes via a debounced coalesced
  // reload (see hook) — a direct loadWorkspace per notify wedges the UI.
  useWorkspaceAutoRefresh(workspace?.id, setWorkspace);

  // 3. Auto-save messages to active session
  useEffect(() => {
    if (messages.length > 0 && currentSession && workspace) {
      updateSessionMessages(workspace.id, currentSession.id, messages);
    }
  }, [messages, currentSession?.id, workspace?.id]);

  const startTimer = useCallback(() => {
    setElapsedSeconds(0);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const handleStopAgent = useCallback(() => {
    stopTimer();
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
      activeAbortControllerRef.current = null;
    }
    try {
      const { stopAllCommands } = require("../../../modules/linux-runner/src");
      stopAllCommands();
    } catch (_) {}
    if (pendingApprovalResolverRef.current) {
      pendingApprovalResolverRef.current(false);
      pendingApprovalResolverRef.current = null;
    }
    setShowApprovalModal(false);
    setPendingApprovalStep(null);
    setAgentStatus("idle");
    setLiveStatus({ status: "idle", detail: "Stopped by user", icon: "pause-circle" });
    runningTasksService.verifyProcesses();
    setMessages((prev) =>
      prev.map((msg) =>
        msg.status === "thinking" || msg.status === "executing_tool" || msg.status === "waiting_approval"
          ? { ...msg, status: "idle" }
          : msg
      )
    );
  }, [stopTimer]);

  const handleSend = useCallback(
    async (overrideText?: string) => {
      const query = (overrideText || inputRef.current).trim();
      if (!query || agentStatus !== "idle") return;

      setInput("");
      shouldScrollToEndRef.current = true;
      startTimer();
      setAgentStatus("thinking");
      setLiveStatus({ status: "thinking", detail: "Analyzing codebase...", icon: "sparkles" });

      const abortController = new AbortController();
      activeAbortControllerRef.current = abortController;

      const userMsg: AgentChatMessage = { id: `user-${Date.now()}`, role: "user", text: query, timestamp: Date.now() };
      const assistantMsgId = `asst-${Date.now()}`;
      const assistantMsg: AgentChatMessage = { id: assistantMsgId, role: "assistant", text: "", status: "thinking", steps: [], timestamp: Date.now() };
      const updatedHistory = [...messages, userMsg];
      setMessages([...updatedHistory, assistantMsg]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

      try {
        let currentWs = workspace;
        if (!currentWs) {
          currentWs = await loadOrCreateDefaultWorkspace();
          setWorkspace(currentWs);
        }

        let activeSession = currentSessionRef.current;
        let targetSessionId = activeSession?.sessionId;
        if (!activeSession && currentWs) {
          activeSession = await createSession(currentWs.id, "Astra AI");
          currentSessionRef.current = activeSession;
          setCurrentSession(activeSession);
          targetSessionId = activeSession.sessionId;
        }

        if (activeSession && (!activeSession.messages || activeSession.messages.length === 0)) {
          const generatedTitle = query.length > 26 ? `${query.slice(0, 26)}...` : query;
          const updated = { ...activeSession, title: generatedTitle };
          currentSessionRef.current = updated;
          setCurrentSession(updated);
        }

        const response = await processAgentQuery({
          query,
          sessionId: targetSessionId,
          workspace: currentWs || undefined,
          activeFileName,
          activeFileContent,
          cognitiveMode: selectedCognitiveMode,
          effort: selectedEffort,
          // Interactive mode removed from the UI: always auto-approve (YOLO).
          interactiveApproval: false,
          abortSignal: abortController.signal,
          history: updatedHistory,
          onSessionId: (newSessionId) => {
            const session = currentSessionRef.current;
            if (workspace && session && session.sessionId !== newSessionId) {
              const updated = { ...session, sessionId: newSessionId };
              currentSessionRef.current = updated;
              setCurrentSession(updated);
              updateSessionId(workspace.id, session.id, newSessionId);
            }
          },
          onTextDelta: (delta) => {
            setMessages((prev) => prev.map((msg) => msg.id === assistantMsgId ? { ...msg, text: msg.text + delta } : msg));
            scrollRef.current?.scrollToEnd({ animated: true });
          },
          onStep: (step) => {
            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.id !== assistantMsgId) return msg;
                const existing = msg.steps || [];
                const idx = existing.findIndex((s) => s.id === step.id);
                return { ...msg, steps: idx >= 0 ? existing.map((s, i) => (i === idx ? step : s)) : [...existing, step] };
              })
            );
            scrollRef.current?.scrollToEnd({ animated: true });
          },
          onStatusChange: (status) => {
            setAgentStatus(status);
            setMessages((prev) => prev.map((msg) => msg.id === assistantMsgId ? { ...msg, status } : msg));
          },
          onLiveStatus: (status) => setLiveStatus(status),
          onApprovalRequest: (step: AgentStep) => {
            return new Promise<boolean>((resolve) => {
              pendingApprovalResolverRef.current = resolve;
              setPendingApprovalStep(step);
              setShowApprovalModal(true);
            });
          },
        });

        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id !== assistantMsgId) return msg;
            const rawReply =
              msg.text && msg.text.trim().length > 0 && response.reply === "✅ Astra CLI task completed."
                ? msg.text
                : response.reply || msg.text;
            // Never persist a machine JSON dump as message text.
            const cleaned = isMachineJsonDump(rawReply) ? sanitizeAgentText(rawReply) : rawReply;
            const finalReply = cleaned.trim().length > 0 ? cleaned : "✅ Completed.";
            return {
              ...msg,
              text: finalReply,
              steps: response.steps.length > 0 ? response.steps : msg.steps,
              status: "done",
            };
          })
        );

        if (workspace?.id) {
          notifyWorkspaceChanged(workspace.id);
          if (onRefreshWorkspace) onRefreshWorkspace();
        }
      } catch (err: any) {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === assistantMsgId ? { ...msg, text: `**Error:** ${err.message || "Unexpected error"}`, status: "error" } : msg))
        );
      } finally {
        stopTimer();
        setAgentStatus("idle");
        runningTasksService.verifyProcesses();
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
    },
    [agentStatus, messages, selectedCognitiveMode, selectedEffort, workspace, activeFileName, activeFileContent, startTimer, stopTimer, onRefreshWorkspace]
  );

  const handleSelectSession = useCallback((session: ConversationSession) => {
    shouldScrollToEndRef.current = true;
    setRenderLimit(100);
    currentSessionRef.current = session;
    setCurrentSession(session);
    setMessages(reconcileStaleMessages(session.messages || []));
    setShowSessionsModal(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 80);
  }, []);

  const handleCreateNewChat = useCallback(async () => {
    if (!workspace) return;
    shouldScrollToEndRef.current = true;
    setRenderLimit(100);
    const newSession = await createSession(workspace.id, "Astra AI");
    currentSessionRef.current = newSession;
    setCurrentSession(newSession);
    setMessages([]);
    setSessions(await listSessions(workspace.id));
    setShowSessionsModal(false);
  }, [workspace]);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    if (!workspace) return;
    const updated = await deleteSession(workspace.id, sessionId);
    setSessions(updated);
    if (currentSession?.id === sessionId) {
      if (updated.length > 0) handleSelectSession(updated[0]);
      else await handleCreateNewChat();
    }
  }, [workspace, currentSession?.id, handleSelectSession, handleCreateNewChat]);

  const handleRunSnippet = useCallback(async (code: string, language: string) => {
    try {
      const result = await executeCode({ code, language, tier: "client" });
      setRunOutput({ code, stdout: result.stdout || "(no output)", stderr: result.stderr || "" });
    } catch (err: any) {
      Alert.alert("Execution Failed", err.message || "Unknown error executing code");
    }
  }, []);

  const handleApplyFile = useCallback(async (filePath: string, content: string) => {
    if (!workspace) return;
    try {
      await saveFileContent(workspace.id, filePath, content);
      notifyWorkspaceChanged(workspace.id);
      if (onRefreshWorkspace) onRefreshWorkspace();
      Alert.alert("Success", `Applied changes to ${filePath}`);
    } catch (err: any) {
      Alert.alert("Save Failed", err.message || "Could not write file to workspace.");
    }
  }, [workspace, onRefreshWorkspace]);

  const handleSelectModel = useCallback(async (modelId: string) => {
    setSelectedModel(modelId);
    await saveSelectedModel(modelId);
    setShowModelPicker(false);
  }, []);

  const handleSelectCognitiveMode = useCallback(async (mode: AstraCognitiveMode) => {
    setSelectedCognitiveMode(mode);
    await saveCognitiveMode(mode);
    setShowCognitiveModeModal(false);
  }, []);

  const handleSelectEffort = useCallback(async (effort: AstraEffort) => {
    setSelectedEffort(effort);
    await saveReasoningEffort(effort);
  }, []);

  const handleApproveAction = useCallback(() => {
    if (pendingApprovalResolverRef.current) {
      pendingApprovalResolverRef.current(true);
      pendingApprovalResolverRef.current = null;
    }
    setShowApprovalModal(false);
    setPendingApprovalStep(null);
  }, []);

  const handleApproveSession = useCallback(async () => {
    if (pendingApprovalResolverRef.current) {
      pendingApprovalResolverRef.current(true);
      pendingApprovalResolverRef.current = null;
    }
    setShowApprovalModal(false);
    setPendingApprovalStep(null);
  }, []);

  const handleRejectAction = useCallback(() => {
    if (pendingApprovalResolverRef.current) {
      pendingApprovalResolverRef.current(false);
      pendingApprovalResolverRef.current = null;
    }
    setShowApprovalModal(false);
    setPendingApprovalStep(null);
  }, []);

  return {
    workspace,
    messages,
    renderLimit,
    setRenderLimit,
    input,
    setInput,
    agentStatus,
    selectedModel,
    selectedCognitiveMode,
    selectedEffort,
    pendingApprovalStep,
    showApprovalModal,
    setShowApprovalModal,
    showModelPicker,
    setShowModelPicker,
    showCognitiveModeModal,
    setShowCognitiveModeModal,
    showSessionsModal,
    setShowSessionsModal,
    sessions,
    currentSession,
    runOutput,
    setRunOutput,
    liveStatus,
    elapsedSeconds,
    scrollRef,
    shouldScrollToEndRef,
    handleSend,
    handleStopAgent,
    handleSelectSession,
    handleCreateNewChat,
    handleDeleteSession,
    handleRunSnippet,
    handleApplyFile,
    handleSelectModel,
    handleSelectCognitiveMode,
    handleSelectEffort,
    handleApproveAction,
    handleApproveSession,
    handleRejectAction,
  };
}
