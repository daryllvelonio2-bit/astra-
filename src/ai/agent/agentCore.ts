import { Workspace } from "../../ide/services/workspaceService";
import { streamAstraCliChat } from "../astra/astraCliService";
import { AstraCognitiveMode, AstraEffort } from "../astra/astraModes";
import { AgentResponse, AgentStep, AgentStatus, Message, LiveStatusInfo } from "./agentTypes";

export interface ProcessAgentOptions {
  query: string;
  sessionId?: string;
  workspace?: Workspace;
  history?: Message[];
  activeFileContent?: string;
  activeFileName?: string;
  cognitiveMode?: AstraCognitiveMode;
  effort?: AstraEffort;
  interactiveApproval?: boolean;
  abortSignal?: AbortSignal;
  onTextDelta?: (delta: string) => void;
  onStep?: (step: AgentStep) => void;
  onSessionId?: (sessionId: string) => void;
  onStatusChange?: (status: AgentStatus) => void;
  onLiveStatus?: (status: LiveStatusInfo) => void;
  onApprovalRequest?: (step: AgentStep) => Promise<boolean>;
}

export async function processAgentQuery(
  optionsOrQuery: ProcessAgentOptions | string,
  workspaceArg?: Workspace
): Promise<AgentResponse> {
  const options: ProcessAgentOptions =
    typeof optionsOrQuery === "string"
      ? { query: optionsOrQuery, workspace: workspaceArg }
      : optionsOrQuery;

  const {
    query,
    sessionId,
    workspace,
    activeFileName,
    activeFileContent,
    cognitiveMode,
    effort,
    interactiveApproval,
    abortSignal,
    onStep,
    onStatusChange,
    onTextDelta,
    onLiveStatus,
    onSessionId,
    onApprovalRequest,
  } = options;

  try {
    if (onStatusChange) onStatusChange("thinking");

    // Execute autonomously via Astra CLI running in Embedded Alpine Linux PRoot
    const res = await streamAstraCliChat(
      query,
      workspace,
      {
        onTextDelta,
        onStep,
        onSessionId,
        onStatusChange,
        onLiveStatus,
        onApprovalRequest,
      },
      sessionId,
      activeFileName,
      activeFileContent,
      cognitiveMode,
      effort,
      interactiveApproval,
      abortSignal
    );

    if (onStatusChange) onStatusChange("done");

    return {
      reply: res.reply,
      sessionId: res.sessionId,
      steps: res.steps,
      modifiedFiles: res.modifiedFiles,
    };
  } catch (err: any) {
    if (onStatusChange) onStatusChange("error");
    const errMsg = `Error: ${err.message || String(err)}`;
    if (onTextDelta) onTextDelta(errMsg);
    return {
      reply: errMsg,
      steps: [],
      modifiedFiles: [],
    };
  }
}
