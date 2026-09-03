import { useState, useEffect, useRef, useCallback } from "react";
import { ScrollView } from "react-native";
import { Clipboard } from "../../services/clipboardService";
import {
  startTerminalSession,
  writeTerminalInput,
  stopTerminalSession,
  getSessionHistory,
  addTerminalDataListener,
  initializeEnvironment,
} from "../../../../modules/linux-runner/src";
import { TERMINAL_THEMES, TerminalTheme } from "./terminalThemes";
import { runningTasksService, RunningTask } from "../../../ai/services/runningTasksService";
import { useTheme } from "../../../theme/themeContext";

export interface TerminalTab {
  id: string;
  name: string;
  isTask?: boolean;
  taskId?: string;
}

interface UseTerminalSessionProps {
  workspaceId?: string;
}

const getBanner = (workspaceId?: string) => {
  const dir = workspaceId ? `/workspaces/${workspaceId}` : "/workspace";
  return `\u001b[1;34m⚡ Astra Embedded Alpine Linux & PRoot Terminal\u001b[0m\r\n\u001b[1;32mastra\u001b[0m:\u001b[1;34m${dir}\u001b[0m# `;
};

const formatTaskTabName = (cmd: string) => {
  const clean = (cmd || "Task")
    .replace(/^(?:nohup|sudo|bash\s+-c)\s*/i, "")
    .replace(/\s+>[^&]+.*$/, "")
    .trim();
  const shortCmd = clean.length > 16 ? `${clean.slice(0, 14)}..` : clean;
  return `⚙️ ${shortCmd}`;
};

export function useTerminalSession({ workspaceId }: UseTerminalSessionProps) {
  const { themeMode } = useTheme();
  const [sessions, setSessions] = useState<TerminalTab[]>([
    { id: "session-1", name: "1: sh" },
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>("session-1");
  const [sessionOutputs, setSessionOutputs] = useState<Record<string, string>>({
    "session-1": getBanner(workspaceId),
  });
  const [isCtrlActive, setIsCtrlActive] = useState<boolean>(false);
  const [isAltActive, setIsAltActive] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<number>(12.5);
  const [themeId, setThemeId] = useState<string>(
    themeMode === "light" ? "light" : themeMode === "midnight" ? "midnight" : "alpine"
  );
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const isAutoScrollEnabled = useRef<boolean>(true);

  // Sync terminal theme with global app theme mode
  useEffect(() => {
    if (themeMode === "light") {
      setThemeId("light");
    } else if (themeMode === "midnight") {
      setThemeId("midnight");
    } else if (themeMode === "dark") {
      setThemeId("alpine");
    }
  }, [themeMode]);

  const activeTheme: TerminalTheme = TERMINAL_THEMES[themeId] || TERMINAL_THEMES.alpine;

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  }, []);

  // Initialize Linux environment and start initial session
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      await initializeEnvironment();
      if (!mounted) return;
      setIsReady(true);
      await startTerminalSession("session-1", workspaceId);
      const hist = await getSessionHistory("session-1");
      if (hist && mounted) {
        setSessionOutputs((prev) => ({
          ...prev,
          "session-1": hist,
        }));
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, [workspaceId]);

  // Subscribe to native terminal streaming events for the active session
  useEffect(() => {
    let isSubscribed = true;

    // Load buffered history when switching sessions (for native sh sessions)
    if (!activeSessionId.startsWith("task-")) {
      getSessionHistory(activeSessionId).then((hist) => {
        if (hist && isSubscribed) {
          const cleanHist = hist.replace(/\/bin\/sh:\s*can't access tty;\s*job control turned off\r?\n?/g, "");
          setSessionOutputs((prev) => ({
            ...prev,
            [activeSessionId]: cleanHist,
          }));
        }
      });

      const subscription = addTerminalDataListener(activeSessionId, (chunk: string) => {
        if (!isSubscribed) return;
        const cleanChunk = chunk.replace(/\/bin\/sh:\s*can't access tty;\s*job control turned off\r?\n?/g, "");
        setSessionOutputs((prev) => {
          const current = prev[activeSessionId] || "";
          const updated = current + cleanChunk;
          return {
            ...prev,
            [activeSessionId]: updated.length > 100000 ? updated.slice(-80000) : updated,
          };
        });

        if (isAutoScrollEnabled.current) {
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 20);
        }
      });

      return () => {
        isSubscribed = false;
        subscription.remove();
      };
    }
  }, [activeSessionId]);

  // Synchronize running background tasks with terminal tabs
  useEffect(() => {
    const unsubTasks = runningTasksService.subscribe((tasks) => {
      if (tasks.length === 0) return;

      setSessions((prevSessions) => {
        const existingIds = new Set(prevSessions.map((s) => s.id));
        const newTabs: TerminalTab[] = [];

        tasks.forEach((task) => {
          const tabId = `task-${task.id}`;
          if (!existingIds.has(tabId)) {
            newTabs.push({
              id: tabId,
              name: formatTaskTabName(task.command),
              isTask: true,
              taskId: task.id,
            });
          }
        });

        if (newTabs.length === 0) return prevSessions;
        return [...prevSessions, ...newTabs];
      });

      // Update session outputs for all running tasks
      setSessionOutputs((prevOutputs) => {
        let changed = false;
        const updated = { ...prevOutputs };

        tasks.forEach((task) => {
          const tabId = `task-${task.id}`;
          const currentOut = updated[tabId];
          const taskOut = task.output || "";
          if (currentOut !== taskOut && taskOut) {
            updated[tabId] = taskOut;
            changed = true;
          }
        });

        return changed ? updated : prevOutputs;
      });
    });

    // Auto-focus the newly triggered task tab
    const unsubTrigger = runningTasksService.subscribeTrigger((taskId) => {
      const targetId = taskId ? `task-${taskId}` : undefined;
      if (targetId) {
        setActiveSessionId(targetId);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
      }
    });

    return () => {
      unsubTasks();
      unsubTrigger();
    };
  }, []);

  const sendInput = useCallback(
    (inputData: string) => {
      let finalData = inputData;

      if (isCtrlActive && inputData.length === 1) {
        const code = inputData.toUpperCase().charCodeAt(0);
        if (code >= 64 && code <= 95) {
          finalData = String.fromCharCode(code - 64);
        }
        setIsCtrlActive(false);
      } else if (isAltActive && inputData.length === 1) {
        finalData = `\x1b${inputData}`;
        setIsAltActive(false);
      }

      writeTerminalInput(activeSessionId, finalData);
    },
    [activeSessionId, isCtrlActive, isAltActive]
  );

  const runCommandDirectly = useCallback(
    (cmd: string) => {
      const trimmed = cmd.trim();
      if (!trimmed) return;

      // Add to command history
      setCommandHistory((prev) => {
        const filtered = prev.filter((c) => c !== trimmed);
        return [...filtered, trimmed];
      });
      setHistoryIndex(-1);

      // Append command with newline to session display buffer so it stays visible
      setSessionOutputs((prev) => {
        const current = prev[activeSessionId] || "";
        return {
          ...prev,
          [activeSessionId]: `${current}${trimmed}\r\n`,
        };
      });

      // Route directly to native active session
      writeTerminalInput(activeSessionId, `${trimmed}\n`);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 30);
    },
    [activeSessionId]
  );

  const navigateHistory = useCallback(
    (direction: "up" | "down"): string | null => {
      if (commandHistory.length === 0) return null;

      let newIdx = historyIndex;
      if (direction === "up") {
        if (historyIndex === -1) {
          newIdx = commandHistory.length - 1;
        } else if (historyIndex > 0) {
          newIdx = historyIndex - 1;
        }
      } else {
        if (historyIndex !== -1) {
          if (historyIndex < commandHistory.length - 1) {
            newIdx = historyIndex + 1;
          } else {
            newIdx = -1;
          }
        }
      }

      setHistoryIndex(newIdx);
      return newIdx === -1 ? "" : commandHistory[newIdx] || "";
    },
    [commandHistory, historyIndex]
  );

  const copyActiveOutput = useCallback(async () => {
    const text = (sessionOutputs[activeSessionId] || "").replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
    if (text) {
      await Clipboard.setStringAsync(text);
      showToast("Output copied to clipboard");
    }
  }, [sessionOutputs, activeSessionId, showToast]);

  const pasteFromClipboard = useCallback(async () => {
    const text = await Clipboard.getStringAsync();
    if (text) {
      writeTerminalInput(activeSessionId, text);
      showToast("Pasted from clipboard");
    }
  }, [activeSessionId, showToast]);

  const zoomIn = useCallback(() => {
    setFontSize((prev) => Math.min(22, prev + 1));
  }, []);

  const zoomOut = useCallback(() => {
    setFontSize((prev) => Math.max(9, prev - 1));
  }, []);

  const addNewSession = useCallback(async () => {
    const nextIdx = sessions.length + 1;
    const newId = `session-${Date.now()}`;
    const newTab: TerminalTab = {
      id: newId,
      name: `${nextIdx}: sh`,
    };

    setSessions((prev) => [...prev, newTab]);
    setSessionOutputs((prev) => ({ ...prev, [newId]: getBanner(workspaceId) }));
    setActiveSessionId(newId);

    await startTerminalSession(newId, workspaceId);
  }, [sessions, workspaceId]);

  const closeSession = useCallback(
    async (idToClose: string) => {
      if (sessions.length <= 1) return;

      if (idToClose.startsWith("task-")) {
        const taskId = idToClose.replace(/^task-/, "");
        await runningTasksService.killTask(taskId);
        showToast("Background task stopped");
      } else {
        await stopTerminalSession(idToClose);
      }

      const remaining = sessions.filter((s) => s.id !== idToClose);
      setSessions(remaining);
      setSessionOutputs((prev) => {
        const copy = { ...prev };
        delete copy[idToClose];
        return copy;
      });

      if (activeSessionId === idToClose) {
        setActiveSessionId(remaining[0]?.id || "session-1");
      }
    },
    [sessions, activeSessionId, showToast]
  );

  const restartActiveSession = useCallback(async () => {
    if (activeSessionId.startsWith("task-")) {
      const taskId = activeSessionId.replace(/^task-/, "");
      const task = runningTasksService.getRunningTasks().find((t) => t.id === taskId);
      if (task) {
        await runningTasksService.killTask(taskId);
        runningTasksService.addTask({
          command: task.command,
          port: task.port,
          url: task.url,
          workspaceId: task.workspaceId,
        });
        showToast("Task restarted");
      }
      return;
    }

    await stopTerminalSession(activeSessionId);
    setSessionOutputs((prev) => ({ ...prev, [activeSessionId]: getBanner(workspaceId) }));
    await startTerminalSession(activeSessionId, workspaceId);
    showToast("Session restarted");
  }, [activeSessionId, workspaceId, showToast]);

  const clearActiveSession = useCallback(() => {
    if (activeSessionId.startsWith("task-")) {
      const taskId = activeSessionId.replace(/^task-/, "");
      const task = runningTasksService.getRunningTasks().find((t) => t.id === taskId);
      const banner = `\u001b[1;34m⚡ Background Task: \u001b[1;37m${task?.command || "Task"}\u001b[0m\r\n----------------------------------------\r\n`;
      setSessionOutputs((prev) => ({
        ...prev,
        [activeSessionId]: banner,
      }));
      return;
    }

    const dir = workspaceId ? `/workspaces/${workspaceId}` : "/workspace";
    writeTerminalInput(activeSessionId, "\x0c");
    setSessionOutputs((prev) => ({
      ...prev,
      [activeSessionId]: `\u001b[1;32mastra\u001b[0m:\u001b[1;34m${dir}\u001b[0m# `,
    }));
  }, [activeSessionId, workspaceId]);

  return {
    sessions,
    activeSessionId,
    setActiveSessionId,
    activeOutput: sessionOutputs[activeSessionId] || "",
    isCtrlActive,
    isAltActive,
    setIsCtrlActive,
    setIsAltActive,
    isReady,
    fontSize,
    theme: activeTheme,
    themeId,
    setThemeId,
    toastMessage,
    scrollRef,
    sendInput,
    runCommandDirectly,
    navigateHistory,
    copyActiveOutput,
    pasteFromClipboard,
    zoomIn,
    zoomOut,
    addNewSession,
    closeSession,
    restartActiveSession,
    clearActiveSession,
  };
}

