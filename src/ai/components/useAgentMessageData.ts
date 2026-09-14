import { useMemo, useCallback, useState } from "react";
import { AgentChatMessage } from "../agent/agentTypes";

/** Memoized step filtering + section toggles for a chat message. */
export function useAgentMessageData(message: AgentChatMessage) {
  const [showThoughts, setShowThoughts] = useState(true);
  const [showSteps, setShowSteps] = useState(true);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const steps = message.steps || [];
  const thoughtSteps = useMemo(
    () => steps.filter((s) => s.type === "thought" && s.content?.trim()),
    [steps]
  );
  const toolSteps = useMemo(
    () =>
      steps.filter(
        (s) =>
          s.type !== "thought" &&
          s.toolName !== "update_topic" &&
          s.toolName !== "set_topic" &&
          !s.content?.startsWith("## Topic:")
      ),
    [steps]
  );

  const totalToolSteps = toolSteps.length;
  const visibleToolSteps = useMemo(
    () => (showAllHistory || totalToolSteps <= 3 ? toolSteps : toolSteps.slice(-3)),
    [showAllHistory, totalToolSteps, toolSteps]
  );
  const hiddenCount = totalToolSteps > 3 && !showAllHistory ? totalToolSteps - 3 : 0;

  const handleToggleThoughts = useCallback(() => setShowThoughts((v) => !v), []);
  const handleToggleSteps = useCallback(() => setShowSteps((v) => !v), []);
  const handleShowAllHistory = useCallback(() => setShowAllHistory(true), []);
  const handleHideOlderHistory = useCallback(() => setShowAllHistory(false), []);

  return {
    steps, thoughtSteps, toolSteps, totalToolSteps, visibleToolSteps, hiddenCount,
    showThoughts, showSteps, showAllHistory, setShowSteps,
    handleToggleThoughts, handleToggleSteps, handleShowAllHistory, handleHideOlderHistory,
  };
}
