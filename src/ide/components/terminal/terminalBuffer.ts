/**
 * Pure terminal-buffer helpers (headlessly testable).
 *
 * Rules that keep the terminal honest:
 * - The buffer NEVER contains a fake shell prompt. The banner is a title
 *   line only; the real prompt always comes from the shell stream, so `cd`
 *   directory changes always display.
 * - Native history merges are delta-only appends. Replacing the buffer with
 *   native history wipes locally-echoed command lines (the shell has no tty
 *   echo on pipes) and resurrects stale text — both made output "disappear".
 */

export const TERMINAL_BUFFER_CAP = 100000;
export const TERMINAL_BUFFER_KEEP = 80000;
// A native history shorter than this after a shrink means "session restarted"
// rather than "native buffer trimmed".
const RESTART_CEILING = 4096;

export function getBannerTitle(workspaceId?: string): string {
  const dir = workspaceId ? `/workspaces/${workspaceId}` : "/workspace";
  return "\u001b[1;34m\u26a1 Astra Embedded Alpine Linux & PRoot Terminal \u2014 " + dir + "\u001b[0m\r\n";
}
export function appendCapped(current: string, chunk: string): string {
  if (!chunk) return current;
  const updated = current + chunk;
  return updated.length > TERMINAL_BUFFER_CAP ? updated.slice(-TERMINAL_BUFFER_KEEP) : updated;
}

export interface HistoryMerge {
  text: string;
  seen: number;
}

/**
 * Fold a native full-history snapshot into the local buffer, appending only
 * unseen tail bytes. Never deletes local content (typed echoes, banner).
 */
export function mergeNativeHistory(current: string, hist: string, seen: number): HistoryMerge {
  if (!hist) return { text: current, seen };
  if (hist.length < seen) {
    // Native buffer shrank: trim-resync (stay quiet) or restarted (adopt).
    if (hist.length > RESTART_CEILING) return { text: current, seen: hist.length };
    seen = 0;
  }
  if (hist.length <= seen) return { text: current, seen };
  return { text: appendCapped(current, hist.slice(seen)), seen: hist.length };
}
