export type AgentStatus = "idle" | "thinking" | "executing_tool" | "waiting_approval" | "verifying" | "done" | "error";

export interface LiveStatusInfo {
  status: string;
  detail?: string;
  icon?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  result: string;
  isError?: boolean;
}

export interface AgentStep {
  id: string;
  type: "thought" | "tool_call" | "tool_result" | "approval_request" | "message";
  content: string;
  toolName?: string;
  toolArgs?: Record<string, any>;
  toolOutput?: string;
  isError?: boolean;
  approvalStatus?: "pending" | "approved" | "rejected";
  timestamp: number;
}

export interface AgentResponse {
  reply: string;
  steps: AgentStep[];
  sessionId?: string;
  actionTaken?: string;
  modifiedFiles?: string[];
  executionResult?: {
    stdout: string;
    stderr: string;
    exitCode: number;
  };
}

export interface AgentChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  engine?: string;
  steps?: AgentStep[];
  status?: AgentStatus;
  timestamp?: number;
}

export type Message = AgentChatMessage;

export interface ConversationSession {
  id: string;
  sessionId?: string;
  workspaceId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: AgentChatMessage[];
}

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "code" | "debug" | "refactor" | "runner" | "api" | "workspace";
  promptTemplate: (input: string, context?: any) => string;
}
