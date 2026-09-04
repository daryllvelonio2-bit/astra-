import {
  executeCommand,
  executeCommandStream,
  addCommandOutputListener,
  startPtySession,
  stopTerminalSession,
  writeTerminalInput,
  addTerminalDataListener,
} from "../../../modules/linux-runner/src";

export const DESKTOP_VNC_PORT = 5900;
export const DESKTOP_WEB_PORT = 6080;
export const DEFAULT_GEOMETRY = "1280x720";

/**
 * Fits the VNC framebuffer to the device screen so noVNC's scaled view has
 * no letterbox bars. Caps the long edge (perf) and keeps numbers even.
 */
export function fitDesktopGeometry(winW: number, winH: number): string {
  const MAX_EDGE = 1920;
  const w = Math.max(320, Math.round(winW));
  const h = Math.max(320, Math.round(winH));
  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  const gw = Math.max(320, Math.round((w * scale) / 2) * 2);
  const gh = Math.max(320, Math.round((h * scale) / 2) * 2);
  return `${gw}x${gh}`;
}

function sanitizeGeometry(g: string | undefined): string {
  if (g && /^\d{3,4}x\d{3,4}$/.test(g)) {
    const [w, h] = g.split("x").map(Number);
    if (w >= 320 && w <= 4096 && h >= 320 && h <= 4096) return g;
  }
  return DEFAULT_GEOMETRY;
}
const NOVNC_VERSION = "v1.5.0";
const PROVISION_MARKER = "/root/.desktop-provisioned";

const ENV_PREFIX =
  "export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin; export HOME=/root; ";

/**
 * One-shot desktop provisioning. Heavy (~1GB: Xvnc + XFCE + fonts + noVNC),
 * so it runs on demand from the Desktop tab — never as part of base
 * toolchain setup. Streams progress lines to onLog.
 */
export async function provisionDesktop(
  onLog: (line: string) => void
): Promise<boolean> {
  const cmd = `${ENV_PREFIX}set -x; ` +
    `VER=$(cut -d. -f1,2 /etc/alpine-release 2>/dev/null || echo "3.23"); ` +
    `grep -q "/alpine/v$VER/community" /etc/apk/repositories 2>/dev/null || echo "https://dl-cdn.alpinelinux.org/alpine/v$VER/community" >> /etc/apk/repositories; ` +
    `apk update && apk add --no-cache tigervnc xfce4 xfce4-terminal ttf-dejavu dbus dbus-x11 xkeyboard-config && ` +
    `pip install --break-system-packages --quiet websockify && ` +
    `mkdir -p /root/noVNC && curl -fsSL https://github.com/novnc/noVNC/archive/refs/tags/${NOVNC_VERSION}.tar.gz | tar -xz -C /root/noVNC --strip-components=1 && ` +
    `touch ${PROVISION_MARKER} && echo DESKTOP_PROVISION_OK`;
  const commandId = `desktop-provision-${Date.now()}`;
  const listener = addCommandOutputListener(commandId, (chunk: string) => {
    if (!chunk) return;
    for (const line of chunk.split(/\r?\n/)) {
      if (line.trim()) onLog(line);
    }
  });
  try {
    const res = await executeCommandStream(commandId, cmd);
    const out = res.stdout || "";
    return out.includes("DESKTOP_PROVISION_OK");
  } catch (e: any) {
    onLog(`Provision failed: ${e?.message || e}`);
    return false;
  } finally {
    listener?.remove();
  }
}

export async function isDesktopProvisioned(): Promise<boolean> {
  try {
    // NOTE: busybox `command -v` only honors its FIRST argument — check each
    // binary separately or a partial install reads as complete.
    const res = await executeCommand(
      `${ENV_PREFIX}for b in Xvnc startxfce4 websockify; do command -v $b >/dev/null 2>&1 || { echo NO; exit 0; }; done; [ -f /root/noVNC/vnc.html ] && [ -f ${PROVISION_MARKER} ] && echo YES || echo NO`
    );
    return (res.stdout || "").includes("YES");
  } catch (_) {
    return false;
  }
}

/** Starts Xvnc + XFCE + websockify (all localhost-only). Idempotent. */
export async function startDesktop(
  onLog: (line: string) => void,
  geometry?: string
): Promise<boolean> {
  const geo = sanitizeGeometry(geometry);
  // Architecture note: daemons MUST be spawned from a persistent supervisor
  // PTY session, never from executeCommand. PRoot keeps tracing forked
  // children, so a blocking executeCommand that spawns survivors never
  // returns (proot waits for the last descendant) and wedges the UI in
  // "starting" forever. Here the supervisor shell outlives the call by
  // design; readiness arrives as terminal data events.
  const SVC_ID = "desktop-svc";
  try {
    await stopTerminalSession(SVC_ID);
  } catch (_) {}
  await new Promise((r) => setTimeout(r, 500));

  return new Promise<boolean>((resolve) => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      try {
        sub?.remove();
      } catch (_) {}
      resolve(ok);
    };
    const sub = addTerminalDataListener(SVC_ID, (data: string) => {
      for (const line of data.split(/\r?\n/)) {
        const t = line.trim();
        if (!t) continue;
        // Skip echoing our own script lines back (they contain no markers).
        if (t.startsWith("export DISPLAY") || t.startsWith("if [ ! -f") || t.startsWith("for p in") || t.startsWith("pkill -f '[x]")) continue;
        onLog(t.length > 300 ? t.slice(0, 300) : t);
      }
      if (data.includes("DESKTOP_RUNNING")) finish(true);
      else if (data.includes("DESKTOP_START_FAILED")) finish(false);
    });

    // Dead-man switch: even if events are lost, reconcile against reality.
    setTimeout(async () => {
      if (done) return;
      onLog("Start timed out waiting for the ready signal — reconciling…");
      try {
        if (await isDesktopRunning()) finish(true);
        else finish(false);
      } catch (_) {
        finish(false);
      }
    }, 60000);

    (async () => {
      try {
        await startPtySession(SVC_ID, undefined, 24, 80);
        await new Promise((r) => setTimeout(r, 1200));
        writeTerminalInput(SVC_ID, LAUNCH_SCRIPT(geo) + "\n");
      } catch (e: any) {
        onLog(`Supervisor failed: ${e?.message || e}`);
        finish(false);
      }
    })();
  });
}

export async function stopDesktop(): Promise<void> {
  // Stop the supervisor first (its whole guest tree — including the daemons
  // — gets SIGTERM'd with it), then sweep strays by pidfile. The sweep's
  // pkill fallbacks can't suicide: this command contains no literal
  // "Xvnc :0" / "websockify 6080", only [X]-style patterns.
  try {
    await stopTerminalSession("desktop-svc");
  } catch (_) {}
  try {
    await executeCommand(
      `${ENV_PREFIX}for p in Xvnc websockify; do f=/root/.vnc/$p.pid; if [ -f "$f" ]; then pid=$(cat $f); if tr '\\0' ' ' </proc/$pid/cmdline 2>/dev/null | grep -qi "$p"; then kill "$pid" 2>/dev/null; fi; rm -f "$f"; fi; done; ` +
      `pkill -f '[x]fce4-session' 2>/dev/null; pkill -f '[X]vnc :0' 2>/dev/null; pkill -f '[w]ebsockify ${DESKTOP_WEB_PORT}' 2>/dev/null; rm -f /tmp/.X0-lock /tmp/.X11-unix/X0; echo stopped`
    );
  } catch (_) {}
}

export async function isDesktopRunning(): Promise<boolean> {
  try {
    const res = await executeCommand(
      `${ENV_PREFIX}XVNC_PID=$(cat /root/.vnc/Xvnc.pid 2>/dev/null); WS_PID=$(cat /root/.vnc/websockify.pid 2>/dev/null); ` +
      `[ -n "$XVNC_PID" ] && tr '\\0' ' ' </proc/$XVNC_PID/cmdline 2>/dev/null | grep -q Xvnc && [ -n "$WS_PID" ] && tr '\\0' ' ' </proc/$WS_PID/cmdline 2>/dev/null | grep -q websockify && python3 -c "import socket;socket.create_connection(('127.0.0.1',${DESKTOP_WEB_PORT}),timeout=3)" 2>/dev/null && echo YES || echo NO`
    );
    return (res.stdout || "").includes("YES");
  } catch (_) {
    return false;
  }
}

// Typed into the supervisor shell (one blob; the shell executes line by
// line). pkill is used ONLY for xfce4-session here — the pattern can't match
// this script's own lines, and the supervisor shell's cmdline is bare
// `/bin/sh`, so nothing suicides. Xvnc/websockify cleanup is pidfile-based.
const LAUNCH_SCRIPT = (geo: string) => `export DISPLAY=:0; mkdir -p /root/.vnc /tmp/.X11-unix
if [ ! -f /root/.vnc/viewer-pass ] || [ ! -f /root/.vnc/passwd ]; then head -c 12 /dev/urandom | base64 | head -c 16 > /root/.vnc/viewer-pass; chmod 600 /root/.vnc/viewer-pass; vncpasswd -f < /root/.vnc/viewer-pass > /root/.vnc/passwd; chmod 600 /root/.vnc/passwd; fi
echo STEP_CLEANUP
for p in Xvnc websockify; do f=/root/.vnc/$p.pid; if [ -f "$f" ]; then pid=$(cat $f); if tr '\\0' ' ' </proc/$pid/cmdline 2>/dev/null | grep -qi "$p"; then kill "$pid" 2>/dev/null; fi; rm -f "$f"; fi; done
pkill -f '[x]fce4-session' 2>/dev/null; sleep 1; rm -f /tmp/.X0-lock /tmp/.X11-unix/X0
echo STEP_XVNC
Xvnc :0 -geometry ${geo} -depth 24 -dpi 96 -rfbport ${DESKTOP_VNC_PORT} -localhost -SecurityTypes VncAuth -PasswordFile /root/.vnc/passwd -AlwaysShared > /root/.vnc/Xvnc.log 2>&1 & echo $! > /root/.vnc/Xvnc.pid
sleep 2
echo STEP_XFCE
DISPLAY=:0 dbus-launch --exit-with-session startxfce4 > /root/.vnc/xfce.log 2>&1 &
echo STEP_WEBSOCKIFY
websockify --web /root/noVNC ${DESKTOP_WEB_PORT} localhost:${DESKTOP_VNC_PORT} > /root/.vnc/websockify.log 2>&1 & echo $! > /root/.vnc/websockify.pid
sleep 3
XVNC_PID=$(cat /root/.vnc/Xvnc.pid 2>/dev/null); WS_PID=$(cat /root/.vnc/websockify.pid 2>/dev/null)
if [ -n "$XVNC_PID" ] && tr '\\0' ' ' </proc/$XVNC_PID/cmdline 2>/dev/null | grep -q Xvnc && [ -n "$WS_PID" ] && tr '\\0' ' ' </proc/$WS_PID/cmdline 2>/dev/null | grep -q websockify && python3 -c "import socket;socket.create_connection(('127.0.0.1',${DESKTOP_WEB_PORT}),timeout=3)" 2>/dev/null; then echo DESKTOP_RUNNING; else echo DESKTOP_START_FAILED; echo '--- Xvnc.log:'; tail -n 15 /root/.vnc/Xvnc.log 2>/dev/null; echo '--- websockify.log:'; tail -n 15 /root/.vnc/websockify.log 2>/dev/null; echo '--- xfce.log:'; tail -n 10 /root/.vnc/xfce.log 2>/dev/null; fi`;

/** Full diagnostics bundle for the error view: binaries, procs, log tails. */
export async function getDesktopDiagnostics(): Promise<string> {
  try {
    const res = await executeCommand(
      `${ENV_PREFIX}echo '== binaries:'; for b in Xvnc startxfce4 websockify dbus-launch vncpasswd; do printf '%s: ' "$b"; command -v $b 2>/dev/null || echo '(missing)'; done; ` +
      `echo '== daemons (pidfile + cmdline):'; for p in Xvnc websockify; do f=/root/.vnc/$p.pid; if [ -f $f ]; then echo "$p pid $(cat $f): $(tr '\\0' ' ' </proc/$(cat $f)/cmdline 2>/dev/null || echo '(dead)')"; else echo "$p pid: (none)"; fi; done; ` +
      `echo '== Xvnc.log:'; tail -n 20 /root/.vnc/Xvnc.log 2>/dev/null || echo '(missing)'; ` +
      `echo '== websockify.log:'; tail -n 20 /root/.vnc/websockify.log 2>/dev/null || echo '(missing)'; ` +
      `echo '== xfce.log:'; tail -n 15 /root/.vnc/xfce.log 2>/dev/null || echo '(missing)'`
    );
    return (res.stdout || "").trim() || "(no output)";
  } catch (e: any) {
    return `Diagnostics failed: ${e?.message || e}`;
  }
}

/** Plaintext VNC password for the noVNC URL (localhost-only session). */
export async function getDesktopViewerPassword(): Promise<string> {
  try {
    const res = await executeCommand(`${ENV_PREFIX}cat /root/.vnc/viewer-pass 2>/dev/null`);
    return (res.stdout || "").trim();
  } catch (_) {
    return "";
  }
}

export function buildViewerUrl(password: string): string {
  return `http://127.0.0.1:${DESKTOP_WEB_PORT}/vnc.html?autoconnect=true&reconnect=true&resize=scale&password=${encodeURIComponent(password)}`;
}
