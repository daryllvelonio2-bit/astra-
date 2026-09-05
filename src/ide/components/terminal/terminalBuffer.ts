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

const ASTRA_ART = [
  "    _    ____ _____ ____      _    ",
  "   / \\  / ___|_   _|  _ \\    / \\   ",
  "  / _ \\ \\___ \\ | | | |_) |  / _ \\  ",
  " / ___ \\ ___) || | |  _ <  / ___ \\ ",
  "/_/   \\_\\____/ |_| |_| \\_\\/_/   \\_\\",
];

const SEP = "-----------------------------------";

export function getBannerTitle(workspaceId?: string): string {
  const dir = workspaceId ? `/workspaces/${workspaceId}` : "/workspace";
  const P = "\u001b[1;35m"; // pink / magenta (icons, art, user@host) — visible on dark + light
  const D = "\u001b[2m"; // dim default foreground (separator) — adapts to theme
  const R = "\u001b[0m";
  // NOTE: detail values intentionally use the terminal default foreground
  // (no hardcoded white) so they stay readable in light mode (#0f172a)
  // and dark mode (#f1f3f4) alike.
  const lines = [
    `${P}${ASTRA_ART[0]}${R}`,
    `${P}${ASTRA_ART[1]}${R}`,
    `${P}${ASTRA_ART[2]}${R}`,
    `${P}${ASTRA_ART[3]}${R}`,
    `${P}${ASTRA_ART[4]}${R}`,
    ``,
    `${P}astra@alpine${R}`,
    `${D}${SEP}${R}`,
    `${P}  ▲  ${R}OS:        Alpine Linux (PRoot)`,
    `${P}  ◉  ${R}Kernel:     Linux (embedded userland)`,
    `${P}  >- ${R}Shell:      busybox ash`,
    `${P}  ⬢  ${R}Workspace:  ${dir}`,
    `${P}  ⚙  ${R}Terminal:   xterm pty`,
    `${P}  ●  ${R}Engine:     PRoot + busybox`,
    ``,
    `  \u001b[31m●\u001b[32m●\u001b[33m●\u001b[34m●\u001b[35m●\u001b[36m●\u001b[37m●\u001b[90m●${R}`,
  ];
  return lines.join("\r\n") + "\r\n";
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
