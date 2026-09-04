import { AgentStep } from "../agent/agentTypes";
import { runningTasksService } from "../services/runningTasksService";
import { ideActionService } from "../../ide/services/ideActionService";
import { formatToolAction, parseAndExecuteIdeActions } from "./astraFormatters";
import { executeCommand } from "../../../modules/linux-runner/src";

export interface StreamEventHandlerOptions {
  workspaceId?: string;
  isInteractive: boolean;
  onSessionId?: (sessionId: string) => void;
  onStep?: (step: AgentStep) => void;
  onTextDelta?: (delta: string) => void;
  onStatusChange?: (status: any) => void;
  onLiveStatus?: (status: any) => void;
  onApprovalRequest?: (step: AgentStep) => Promise<boolean>;
  onResolveEarly?: (reply: string) => void;
}

/**
 * Tools the CLI approval gate lets through without waiting (pure reads).
 * MUST mirror astraInteractiveApproval.js: every tool NOT in this set blocks
 * the CLI until the user answers, so every one of them needs a UI modal here.
 * An unpaired wait = silent 10-minute stall with zero UI.
 */
const READ_ONLY_TOOLS = new Set([
  "read_file",
  "read_many_files",
  "view_file",
  "list_dir",
  "list_directory",
  "glob",
  "find_by_name",
  "grep_search",
  "grep",
  "search",
  "google_web_search",
  "web_search",
  "web_fetch",
  "cat",
  "ls",
  "find",
  "get_file",
  "file_search",
  "read",
  "look",
  "inspect",
]);

export class AstraStreamParser {
  private steps: AgentStep[] = [];
  private modifiedFiles: string[] = [];
  private accumulatedReply = "";
  private opts: StreamEventHandlerOptions;

  constructor(opts: StreamEventHandlerOptions) {
    this.opts = opts;
  }

  getSteps(): AgentStep[] {
    return this.steps;
  }

  getModifiedFiles(): string[] {
    return this.modifiedFiles;
  }

  getAccumulatedReply(): string {
    return this.accumulatedReply;
  }

  setAccumulatedReply(reply: string): void {
    this.accumulatedReply = reply;
  }

  private addStep(step: Omit<AgentStep, "id" | "timestamp">): AgentStep {
    const fullStep: AgentStep = {
      ...step,
      id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
    };
    this.steps.push(fullStep);
    if (this.opts.onStep) this.opts.onStep(fullStep);
    return fullStep;
  }

  handleLine(rawLine: string): void {
    const trimmed = rawLine.trim();
    if (!trimmed) return;

    // Surface engine progress notes (rate-limit cooldowns, key rolls) as live
    // status so long backoff waits never look like a stuck spinner.
    if (
      trimmed.startsWith("[Astra RateGuard]") ||
      trimmed.startsWith("[Astra Key Rolling]") ||
      trimmed.startsWith("[Astra Rate Limit]")
    ) {
      this.opts.onLiveStatus?.({
        status: "reasoning",
        detail: trimmed.slice(0, 80),
        icon: "time-outline",
      });
      return;
    }

    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const event = JSON.parse(trimmed);
        this.handleEvent(event);
      } catch (_) {}
    }
  }

  private handleEvent(event: any): void {
    const { onSessionId, onTextDelta, onLiveStatus, onStatusChange, onApprovalRequest, onResolveEarly, isInteractive, workspaceId } = this.opts;

    if (event.type === "init") {
      if (event.session_id && onSessionId) {
        onSessionId(event.session_id);
      }
    } else if (event.type === "thought") {
      const desc = event.description || event.subject || event.thought;
      if (desc) {
        this.addStep({ type: "thought", content: desc });
        onLiveStatus?.({
          status: "reasoning",
          detail: String(desc).slice(0, 40),
          icon: "sparkles",
        });
      }
    } else if (event.type === "tool_use" || event.type === "tool_call") {
      const toolName = event.tool_name || event.tool || event.name || "tool";
      const args = event.parameters || event.args || {};

      if (toolName === "update_topic" || toolName === "set_topic") {
        const topicTitle = args.title || args.topic || args.strategic_intent;
        if (topicTitle) {
          onLiveStatus?.({
            status: "reasoning",
            detail: `Topic: ${String(topicTitle).slice(0, 35)}`,
            icon: "sparkles",
          });
        }
        return;
      }

      const { title, detail, icon } = formatToolAction(toolName, args);

      // Paired with the CLI gate: anything not read-only blocks the engine
      // until the user answers, so it must raise a modal here.
      const isDangerousAction = !READ_ONLY_TOOLS.has(toolName.toLowerCase());

      const fullStep = this.addStep({
        type: "tool_call",
        toolName,
        toolArgs: args,
        content: title,
        approvalStatus: isInteractive && isDangerousAction ? "pending" : "approved",
      });

      if (isInteractive && isDangerousAction && onApprovalRequest) {
        // Hold the waiting state until the user decides — do NOT emit
        // executing_tool here or the UI looks busy while blocked on approval.
        onStatusChange?.("waiting_approval");
        onLiveStatus?.({
          status: "waiting_approval",
          detail: `Approval Needed: ${title}`,
          icon: "shield-outline",
        });

        onApprovalRequest(fullStep).then(async (approved) => {
          if (!approved) {
            fullStep.approvalStatus = "rejected";
            fullStep.toolOutput = "Action rejected by user.";
            fullStep.isError = true;
            if (this.opts.onStep) this.opts.onStep(fullStep);
            try {
              await executeCommand(`echo '{"outcome":"cancel","approved":false}' > /tmp/astra-approval.json`, workspaceId);
            } catch (_) {}
            onStatusChange?.("thinking");
            onLiveStatus?.({ status: "thinking", detail: "Continuing...", icon: "sparkles" });
            return;
          }
          fullStep.approvalStatus = "approved";
          if (this.opts.onStep) this.opts.onStep(fullStep);
          try {
            await executeCommand(`echo '{"outcome":"proceed_once","approved":true}' > /tmp/astra-approval.json`, workspaceId);
          } catch (_) {}
          onStatusChange?.("executing_tool");
          onLiveStatus?.({ status: "executing", detail, icon });
        });
      } else {
        onStatusChange?.("executing_tool");
        onLiveStatus?.({ status: "executing", detail, icon });
      }

      const isFileModification = /write|edit|replace|create_file/i.test(toolName);
      const targetFilePath = args.file_path || args.TargetFile || args.path || args.file;
      if (targetFilePath) {
        this.modifiedFiles.push(targetFilePath);
        if (isFileModification) {
          ideActionService.openFile(targetFilePath, undefined, workspaceId);
        }
      }

      const cmd = args.command || args.cmd;
      if (cmd) {
        const isOneShot = /create-expo-app|create-react-app|create-vite|npm\s+(install|i|ci|build|test|audit)|yarn\s+(add|install)|apk\s+add|pip\s+install|git\s+|mkdir|touch|cp|rm|ls\s/i.test(cmd);
        const isServerOrStart = /expo\s+start|npm\s+start|yarn\s+start|pnpm\s+start|artisan\s+serve|npm\s+run\s+dev|yarn\s+dev|vite|python.*http\.server|node\s+.*server|node\s+.*app/i.test(cmd);
        if (!isOneShot && (args.is_background || isServerOrStart || cmd.includes("&"))) {
          let port: number | undefined;
          const portMatch = cmd.match(/(?:--port|-p)\s+(\d{2,5})|:(\d{4,5})/i);
          if (portMatch) {
            port = parseInt(portMatch[1] || portMatch[2], 10);
          }
          if (!port && /expo\s+start/i.test(cmd)) port = 8081;
          if (!port && /artisan\s+serve/i.test(cmd)) port = 8000;
          if (!port && /vite/i.test(cmd)) port = 5173;

          const url = port ? (/expo/i.test(cmd) ? `exp://127.0.0.1:${port}` : `http://127.0.0.1:${port}`) : undefined;
          const regTask = runningTasksService.addTask({ command: cmd, port, url, workspaceId });
          runningTasksService.triggerTerminal(regTask.id);
          if (url && !/expo/i.test(cmd)) {
            ideActionService.openBrowser(url, port);
          }
        }
      }
    } else if (event.type === "tool_result") {
      const output = typeof event.output === "string" ? event.output : (event.result ? String(event.result) : event.error?.message || "Completed");
      const isError = event.status === "error" || Boolean(event.error);

      if (output && typeof output === "string") {
        parseAndExecuteIdeActions(output, workspaceId);
        const regTask = runningTasksService.inspectAndRegisterFromText(output, workspaceId);
        if (regTask) {
          runningTasksService.appendOutput(regTask.id, output);
          runningTasksService.triggerTerminal(regTask.id);
          if (regTask.url && !regTask.url.startsWith("exp://")) {
            ideActionService.openBrowser(regTask.url, regTask.port);
          }
        } else {
          runningTasksService.appendOutput("", output);
        }
      }

      const lastToolCall = [...this.steps].reverse().find((s) => s.type === "tool_call" && !s.toolOutput);
      if (lastToolCall) {
        lastToolCall.toolOutput = output;
        lastToolCall.isError = isError;
        if (this.opts.onStep) this.opts.onStep(lastToolCall);
      } else if (event.tool_name !== "update_topic" && event.tool_name !== "set_topic" && !output.startsWith("## Topic:")) {
        this.addStep({
          type: "tool_result",
          toolName: event.tool_name || "tool",
          content: output,
          toolOutput: output,
          isError,
        });
      }
    } else if (event.type === "message" || event.type === "delta") {
      if (event.role !== "user") {
        const textChunk = event.content || event.text || "";
        if (textChunk && typeof textChunk === "string") {
          this.accumulatedReply += textChunk;
          onTextDelta?.(textChunk);
        }
      }
    } else if (event.type === "result" || event.type === "done") {
      if (this.accumulatedReply) {
        parseAndExecuteIdeActions(this.accumulatedReply, workspaceId);
        runningTasksService.inspectAndRegisterFromText(this.accumulatedReply, workspaceId);
      }
      if (event.status === "error" && event.error?.message) {
        const errMsg = event.error.message;
        this.accumulatedReply = (this.accumulatedReply ? this.accumulatedReply + "\n" : "") + errMsg;
        onTextDelta?.(errMsg);
      } else if (event.response && typeof event.response === "string" && !this.accumulatedReply) {
        this.accumulatedReply = event.response;
        onTextDelta?.(event.response);
        runningTasksService.inspectAndRegisterFromText(event.response, workspaceId);
      }
      onLiveStatus?.({ status: "idle", detail: "Completed", icon: "checkmark-circle" });
      onStatusChange?.("done");

      setTimeout(() => {
        onResolveEarly?.(this.accumulatedReply);
      }, 500);
    } else if (event.type === "error") {
      if (event.severity !== "warning") {
        const errMsg = event.message || event.error?.message || "An error occurred";
        this.accumulatedReply = (this.accumulatedReply ? this.accumulatedReply + "\n" : "") + errMsg;
        onTextDelta?.(errMsg);
      }
    }
  }
}

/**
 * Parses unstreamed fallback stdout when stream listener is interrupted or in synchronous mode.
 */
export function parseFallbackStdout(rawOutput: string, query: string): string {
  const lines = rawOutput.split(/\r?\n/);
  const textChunks: string[] = [];

  for (const l of lines) {
    const tr = l.trim();
    if (!tr) continue;
    if (tr.startsWith("{") && tr.endsWith("}")) {
      try {
        const ev = JSON.parse(tr);
        if ((ev.type === "message" || ev.type === "delta") && ev.role !== "user") {
          const c = ev.content || ev.text;
          if (c) textChunks.push(c);
        } else if ((ev.type === "result" || ev.type === "done") && ev.response) {
          textChunks.push(ev.response);
        } else if (ev.type === "error" && ev.message) {
          textChunks.push(ev.message);
        }
      } catch (_) {}
    } else {
      if (
        !tr.startsWith("proot warning:") &&
        !tr.startsWith("proot info:") &&
        !tr.startsWith("[Astra Key Rolling]") &&
        !tr.startsWith("[Astra RateGuard]")
      ) {
        textChunks.push(tr);
      }
    }
  }

  let cleaned = textChunks
    .join(textChunks.some((t) => t.includes("\n")) ? "" : "\n")
    .replace(/proot warning:[\s\S]*?\n/g, "")
    .replace(/proot info:[\s\S]*?\n/g, "")
    .replace(/Please set an Auth method[\s\S]*?\n/g, "")
    .replace(/Warning: True color[\s\S]*?\n/g, "")
    .replace(/YOLO mode is enabled[\s\S]*?\n/g, "")
    .replace(/\[Astra Key Rolling\][\s\S]*?\n/g, "")
    .replace(/\[Astra RateGuard\][\s\S]*?\n/g, "")
    .replace(/innerError Error:[\s\S]*?\n/g, "")
    .replace(new RegExp(`^\\[Context:[^\\]]+\\]\\s*`, "gm"), "")
    .trim();

  if (
    cleaned.includes("fetch failed sending request") ||
    cleaned.includes("TypeError: fetch failed")
  ) {
    cleaned =
      "⚠️ **Network / API Connection Error**\n\nCould not connect to Gemini API. Please verify your internet connection and that your Gemini API key is valid in **Settings** (⚙️).";
  } else if (cleaned.startsWith(query)) {
    cleaned = cleaned.slice(query.length).trim();
  }

  return cleaned;
}
