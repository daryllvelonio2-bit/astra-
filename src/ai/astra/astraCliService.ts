import {
  Workspace,
  getWorkspaceDirPath,
  notifyWorkspaceChanged,
  loadOrCreateDefaultWorkspace,
  normalizeCleanPath,
} from "../../ide/services/workspaceService";
import { makeDir } from "../../ide/services/nativeFs";
import { AgentStep, AgentStatus, LiveStatusInfo } from "../agent/agentTypes";
import {
  loadApiKey,
  loadApiKeys,
  rollNextApiKey,
  loadSelectedModel,
  loadCognitiveMode,
  loadReasoningEffort,
  loadInteractiveApproval,
  DEFAULT_MODEL_ID,
} from "../../ide/services/configService";
import { AstraCognitiveMode, AstraEffort, getAstraModeInfo } from "./astraModes";
import { runningTasksService } from "../services/runningTasksService";
import {
  executeCommandStream,
  addCommandOutputListener,
  stopCommand,
  executeCommand,
} from "../../../modules/linux-runner/src";
import { buildAstraPrompt, escapeShellPrompt } from "./astraPromptBuilder";
import { AstraStreamParser, parseFallbackStdout } from "./astraStreamParser";

export interface StreamAstraCallbacks {
  onTextDelta?: (delta: string) => void;
  onStep?: (step: AgentStep) => void;
  onSessionId?: (sessionId: string) => void;
  onStatusChange?: (status: AgentStatus) => void;
  onLiveStatus?: (status: LiveStatusInfo) => void;
  onApprovalRequest?: (step: AgentStep) => Promise<boolean>;
}

export interface AstraStreamResult {
  reply: string;
  sessionId: string;
  steps: AgentStep[];
  modifiedFiles: string[];
}

/**
 * Executes an autonomous query using Astra CLI running inside embedded Alpine Linux (PRoot).
 */
export async function streamAstraCliChat(
  query: string,
  workspace?: Workspace,
  callbacks?: StreamAstraCallbacks,
  remoteSessionId?: string,
  activeFileName?: string,
  activeFileContent?: string,
  cognitiveMode?: AstraCognitiveMode,
  effort?: AstraEffort,
  interactiveApproval?: boolean,
  abortSignal?: AbortSignal
): Promise<AstraStreamResult> {
  const sessionId = remoteSessionId || `astra-${Date.now()}`;
  if (callbacks?.onSessionId) callbacks.onSessionId(sessionId);

  const apiKeys = await loadApiKeys();
  const rawApiKey = await loadApiKey();
  const apiKey = (rawApiKey || (apiKeys[0] || "")).trim();
  const selectedModel = await loadSelectedModel();
  const model = selectedModel || DEFAULT_MODEL_ID;

  const currentMode = cognitiveMode || (await loadCognitiveMode());
  const currentEffort = effort || (await loadReasoningEffort());
  const isInteractive = interactiveApproval ?? (await loadInteractiveApproval());
  const modeInfo = getAstraModeInfo(currentMode);

  if (!apiKey && apiKeys.length === 0) {
    const errorMsg =
      "⚠️ **Gemini API Key Required**\n\nPlease set your Google Gemini API key in **Settings** (⚙️) to run Astra CLI.";
    callbacks?.onTextDelta?.(errorMsg);
    callbacks?.onStatusChange?.("error");
    return { reply: errorMsg, sessionId, steps: [], modifiedFiles: [] };
  }

  // Roll key for next turn in multi-key setup
  if (apiKeys.length > 1) {
    rollNextApiKey().catch(() => {});
  }

  callbacks?.onStatusChange?.("thinking");
  callbacks?.onLiveStatus?.({
    status: "reasoning",
    detail: `Astra CLI ${modeInfo.badge} (${model})...`,
    icon: "hardware-chip-outline",
  });

  // Build mode and effort flags
  let extraFlags = "";
  if (modeInfo.cliFlag) {
    extraFlags += ` ${modeInfo.cliFlag}`;
  }
  if (currentEffort && currentEffort !== "default") {
    extraFlags += ` --effort "${currentEffort}"`;
  }

  let targetDirPath: string | undefined = undefined;
  if (workspace?.dirPath) {
    targetDirPath = normalizeCleanPath(workspace.dirPath).replace(/\/+$/, "");
  } else if (workspace?.id) {
    const rawDir = await getWorkspaceDirPath(workspace.id);
    targetDirPath = normalizeCleanPath(rawDir).replace(/\/+$/, "");
  }

  if (!targetDirPath) {
    try {
      const defaultWs = await loadOrCreateDefaultWorkspace();
      const rawWsDir = await getWorkspaceDirPath(defaultWs.id);
      targetDirPath = normalizeCleanPath(rawWsDir).replace(/\/+$/, "");
    } catch (_) {}
  }

  const workingDir = targetDirPath || "/root";
  try {
    if (workingDir.startsWith("/")) {
      await makeDir(workingDir);
    }
  } catch (_) {}

  const promptPayload = buildAstraPrompt({ query, workingDir, workspace, activeFileName });
  const escapedPrompt = escapeShellPrompt(promptPayload);

  // Pass all keys for turn-by-turn rolling inside CLI engine
  const allKeysJoined = apiKeys.length > 0 ? apiKeys.join(",") : apiKey;
  const permFlag = isInteractive ? "" : "-y ";
  const astraCmd = `GEMINI_API_KEYS="${allKeysJoined}" GEMINI_API_KEY="${apiKey}" /bin/astra ${permFlag}--skip-trust --session-id "${sessionId}" -m "${model}"${extraFlags} -p "${escapedPrompt}" -o stream-json`;

  const commandId = `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

  let resolveEarly: ((val: any) => void) | null = null;
  const earlyDonePromise = new Promise<any>((resolve) => {
    resolveEarly = resolve;
  });

  const parser = new AstraStreamParser({
    workspaceId: workspace?.id,
    isInteractive,
    onSessionId: callbacks?.onSessionId,
    onStep: callbacks?.onStep,
    onTextDelta: callbacks?.onTextDelta,
    onStatusChange: callbacks?.onStatusChange,
    onLiveStatus: callbacks?.onLiveStatus,
    onApprovalRequest: callbacks?.onApprovalRequest,
    onResolveEarly: (reply) => {
      resolveEarly?.({ stdout: reply, exitCode: 0 });
    },
  });

  const onAbort = () => {
    try {
      stopCommand(commandId);
    } catch (_) {}
    try {
      executeCommand(`echo '{"outcome":"cancel","approved":false}' > /tmp/astra-approval.json`, workspace?.id);
    } catch (_) {}
    resolveEarly?.({ stdout: parser.getAccumulatedReply() || "Operation cancelled by user.", exitCode: 130 });
  };

  if (abortSignal) {
    abortSignal.addEventListener("abort", onAbort);
  }

  let listener: { remove: () => void } | null = null;

  try {
    callbacks?.onStatusChange?.("thinking");
    callbacks?.onLiveStatus?.({
      status: "thinking",
      detail: "Initializing...",
      icon: "sparkles",
    });

    // Correctly bind listener to commandId and process incoming stream lines
    listener = addCommandOutputListener(commandId, (chunk: string) => {
      if (!chunk) return;
      const subLines = chunk.split(/\r?\n/);
      for (const subLine of subLines) {
        parser.handleLine(subLine);
      }
    });

    const execRes = await Promise.race([
      executeCommandStream(commandId, astraCmd, workingDir),
      earlyDonePromise,
    ]);

    let finalReply = parser.getAccumulatedReply();
    if (!finalReply) {
      const rawOutput = (execRes.stdout || "") + "\n" + (execRes.stderr || "");
      const cleaned = parseFallbackStdout(rawOutput, query);
      finalReply = cleaned || "✅ Astra CLI task completed.";
      parser.setAccumulatedReply(finalReply);
      callbacks?.onTextDelta?.(finalReply);
    }

    if (workspace?.id) notifyWorkspaceChanged(workspace.id);
    runningTasksService.verifyProcesses();

    callbacks?.onLiveStatus?.({ status: "idle", detail: "Completed", icon: "checkmark-circle" });
    callbacks?.onStatusChange?.("done");

    return {
      reply: finalReply,
      sessionId,
      steps: parser.getSteps(),
      modifiedFiles: parser.getModifiedFiles(),
    };
  } catch (err: any) {
    const errorMsg = `Error running Astra CLI: ${err.message || String(err)}`;
    callbacks?.onTextDelta?.(errorMsg);
    callbacks?.onStatusChange?.("error");
    return {
      reply: errorMsg,
      sessionId,
      steps: parser.getSteps(),
      modifiedFiles: [],
    };
  } finally {
    listener?.remove();
    if (abortSignal) {
      abortSignal.removeEventListener("abort", onAbort);
    }
    runningTasksService.verifyProcesses();
  }
}
