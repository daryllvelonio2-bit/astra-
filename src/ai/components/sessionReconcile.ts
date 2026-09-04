import { AgentChatMessage } from "../agent/agentTypes";

/**
 * Self-heal persisted state from turns that died without resolving
 * (killed process, JS reload, app restart): a live turn always overwrites
 * these, so anything still marked in-flight on load is stale.
 */
export function reconcileStaleMessages(msgs: AgentChatMessage[]): AgentChatMessage[] {
  return (msgs || []).map((msg) => {
    const staleStatus =
      msg.status === "thinking" ||
      msg.status === "executing_tool" ||
      msg.status === "waiting_approval" ||
      msg.status === "verifying";
    const steps = (msg.steps || []).map((s) =>
      s.approvalStatus === "pending" ? { ...s, approvalStatus: "expired" as const } : s
    );
    if (!staleStatus && steps === msg.steps) return msg;
    return { ...msg, status: staleStatus ? ("idle" as const) : msg.status, steps };
  });
}
