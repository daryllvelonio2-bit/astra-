import { useEffect, useRef } from "react";
import {
  loadWorkspace,
  subscribeWorkspaceChanges,
  Workspace,
} from "../services/workspaceService";

const DEBOUNCE_MS = 700;
const LOAD_TIMEOUT_MS = 30000;

function timeout<T>(ms: number): Promise<T | undefined> {
  return new Promise((resolve) => setTimeout(() => resolve(undefined), ms));
}

/**
 * Coalesced workspace auto-refresh.
 *
 * While an agent is actively coding, every file write fires
 * `notifyWorkspaceChanged`. Answering each one with a full recursive
 * `loadWorkspace` scan causes overlapping scans + tree re-renders that
 * starve the "Opening Workspace..." load and freeze the UI.
 * This hook debounces bursts, never overlaps loads, and drops stale results.
 */
export function useWorkspaceAutoRefresh(
  workspaceId: string | undefined,
  onRefreshed: (ws: Workspace) => void
) {
  const idRef = useRef(workspaceId);
  idRef.current = workspaceId;
  const cbRef = useRef(onRefreshed);
  cbRef.current = onRefreshed;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const queuedRef = useRef(false);
  const seqRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!workspaceId) return;

    const run = async () => {
      if (inFlightRef.current) {
        queuedRef.current = true;
        return;
      }
      inFlightRef.current = true;
      const mySeq = ++seqRef.current;
      try {
        const updated = await Promise.race([loadWorkspace(workspaceId), timeout<Workspace>(LOAD_TIMEOUT_MS)]);
        if (updated && mountedRef.current && mySeq === seqRef.current && idRef.current === workspaceId) {
          cbRef.current(updated);
        }
      } catch (_) {}
      inFlightRef.current = false;
      if (queuedRef.current) {
        queuedRef.current = false;
        schedule();
      }
    };

    const schedule = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(run, DEBOUNCE_MS);
    };

    const unsub = subscribeWorkspaceChanges((changedWsId) => {
      if (changedWsId === idRef.current) schedule();
    });

    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
      seqRef.current++;
    };
  }, [workspaceId]);
}
