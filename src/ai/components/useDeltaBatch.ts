import { useRef, useCallback } from "react";
import { AgentChatMessage } from "../agent/agentTypes";

type SetMessages = React.Dispatch<React.SetStateAction<AgentChatMessage[]>>;

/**
 * Batches fast agent text deltas into one setState per ~100ms instead of
 * one O(n) map per token. Same final text, far fewer renders.
 */
export function useDeltaBatch(
  setMessages: SetMessages,
  throttleScrollToEnd: () => void
) {
  const deltaBufferRef = useRef("");
  const deltaFlushTimerRef = useRef<any>(null);
  const deltaTargetIdRef = useRef<string | null>(null);

  const flushDeltaBuffer = useCallback(() => {
    const chunk = deltaBufferRef.current;
    const targetId = deltaTargetIdRef.current;
    deltaBufferRef.current = "";
    deltaFlushTimerRef.current = null;
    deltaTargetIdRef.current = null;
    if (!chunk || !targetId) return;
    setMessages((prev) => {
      let changed = false;
      const next = prev.map((msg) => {
        if (msg.id !== targetId) return msg;
        changed = true;
        return { ...msg, text: msg.text + chunk };
      });
      return changed ? next : prev;
    });
    throttleScrollToEnd();
  }, [setMessages, throttleScrollToEnd]);

  const queueDelta = useCallback(
    (targetId: string, delta: string) => {
      deltaBufferRef.current += delta;
      deltaTargetIdRef.current = targetId;
      if (!deltaFlushTimerRef.current) {
        deltaFlushTimerRef.current = setTimeout(flushDeltaBuffer, 100);
      }
    },
    [flushDeltaBuffer]
  );

  /** Take pending chunk for synchronous final commit. Clears timer. */
  const consumePending = useCallback((targetId: string): string => {
    if (deltaFlushTimerRef.current) {
      clearTimeout(deltaFlushTimerRef.current);
      deltaFlushTimerRef.current = null;
    }
    const pending =
      deltaTargetIdRef.current === targetId ? deltaBufferRef.current : "";
    deltaBufferRef.current = "";
    deltaTargetIdRef.current = null;
    return pending;
  }, []);

  const clearDelta = useCallback(() => {
    if (deltaFlushTimerRef.current) {
      clearTimeout(deltaFlushTimerRef.current);
      deltaFlushTimerRef.current = null;
    }
    deltaBufferRef.current = "";
    deltaTargetIdRef.current = null;
  }, []);

  return { queueDelta, flushDeltaBuffer, consumePending, clearDelta };
}
