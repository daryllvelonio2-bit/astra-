import { useEffect } from "react";
import {
  startTerminalSession,
  startPtySession,
  writeTerminalInput,
} from "../../../../modules/linux-runner/src";
import { PTY_XTERM_ENABLED } from "./ptyConfig";
import { ideActionService } from "../../services/ideActionService";
import { RUN_SESSION_ID } from "../../services/runService";
import type { TerminalTab } from "./useTerminalSession";

interface RunSessionHost {
  workspaceId?: string;
  setSessions: React.Dispatch<React.SetStateAction<TerminalTab[]>>;
  setSessionOutputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setActiveSessionId: (id: string) => void;
  scrollRef: { current: { scrollToEnd: (opts?: object) => void } | null };
  shellIdsRef: { current: string[] };
  bannerFor: (workspaceId?: string) => string;
}

async function startRunShell(sessionId: string, workspaceId?: string) {
  if (PTY_XTERM_ENABLED) {
    await startPtySession(sessionId, workspaceId);
  } else {
    await startTerminalSession(sessionId, workspaceId);
  }
}

/**
 * Dedicated Run session for the editor Run button. The tab is created once
 * and reused across runs; each RUN_IN_TERMINAL event focuses it and appends
 * the header + command to the live guest shell.
 */
export function useRunSessionEffect(host: RunSessionHost) {
  const { workspaceId } = host;
  useEffect(() => {
    const unsub = ideActionService.subscribe(
      "RUN_IN_TERMINAL",
      async ({ command, header, workspaceId: ws }) => {
        const targetWs = ws ?? host.workspaceId;
        host.setSessions((prev) =>
          prev.some((s) => s.id === RUN_SESSION_ID)
            ? prev
            : [...prev, { id: RUN_SESSION_ID, name: "▶ Run" }]
        );
        host.setSessionOutputs((prev) =>
          prev[RUN_SESSION_ID]
            ? prev
            : { ...prev, [RUN_SESSION_ID]: host.bannerFor(targetWs) }
        );
        if (!host.shellIdsRef.current.includes(RUN_SESSION_ID)) {
          host.shellIdsRef.current.push(RUN_SESSION_ID);
        }
        host.setActiveSessionId(RUN_SESSION_ID);
        try {
          await startRunShell(RUN_SESSION_ID, targetWs);
        } catch (_) {}
        try {
          const safeHeader = (header || "").replace(/'/g, `'\\''`);
          writeTerminalInput(
            RUN_SESSION_ID,
            `${header ? `echo '${safeHeader}'\n` : ""}${command}\n`
          );
        } catch (_) {}
        setTimeout(() => host.scrollRef.current?.scrollToEnd({ animated: true }), 50);
      }
    );
    return () => {
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);
}
