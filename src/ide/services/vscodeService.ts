import * as FileSystem from "expo-file-system/legacy";
import {
  executeCommand,
  executeCommandStream,
  addCommandOutputListener,
  addTerminalDataListener,
  startPtySession,
  stopTerminalSession,
  writeTerminalInput,
  isEnvironmentReady,
  getFileInfoNative,
} from "../../../modules/linux-runner/src";

export const VSCODE_PORT = 8082;
const SVC_ID = "vscode-svc";
const PROVISION_MARKER = "/root/.vscode-provisioned";
const PASS_FILE = "/root/.vscode/pass";
const PID_FILE = "/root/.vscode/code-server.pid";
const LOG_FILE = "/root/.vscode/code-server.log";

const ENV_PREFIX =
  "export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/root/.local/bin:/root/.npm-global/bin; export HOME=/root; " +
  // Android leaks SHELL=/system/bin/sh into the guest env; code-server then
  // tries to spawn it for env resolution AND the integrated terminal, which
  // does not exist inside Alpine (-> ENOENT + dead terminals). Pin real values.
  "export SHELL=/bin/bash; export TERM=xterm-256color; ";

/**
 * Race a promise against a timeout with a safe fallback value.
 * Prevents PRoot commands from indefinitely hanging React state checks.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), timeoutMs);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timer);
      return res;
    }),
    timeoutPromise,
  ]).catch(() => {
    clearTimeout(timer);
    return fallback;
  });
}

export interface VSCodeProvisionProgress {
  stage: string;
  percent: number;
  downloadedMb?: number;
  totalMb?: number;
}

/**
 * One-shot code-server provisioning.
 * Directly downloads the standalone linux-arm64 release, symlinks Alpine's native
 * musl node binary (resolving the glibc fcntl64 symbol mismatch), and emits
 * real-time download and extraction progress events.
 */
export async function provisionVSCode(
  onLog: (line: string) => void,
  onProgress?: (progress: VSCodeProvisionProgress) => void
): Promise<boolean> {
  const cmd =
    `${ENV_PREFIX}set -e; ` +
    `echo "ASTRAPROGRESS:STAGE:Preparing environment…:5"; ` +
    `apk update && apk add --no-cache bash libstdc++ libc6-compat gcompat curl tar nodejs || true; ` +
    `echo "ASTRAPROGRESS:STAGE:Resolving latest release…:12"; ` +
    `CS_TAG=$(curl -fsSL -o /dev/null -w "%{url_effective}" https://github.com/coder/code-server/releases/latest 2>/dev/null | grep -o 'v[0-9.]*$' || echo "v4.135.0"); ` +
    `[ -n "$CS_TAG" ] || CS_TAG="v4.135.0"; ` +
    `CS_VER="\${CS_TAG#v}"; ` +
    `ARCH=\$(uname -m 2>/dev/null || echo aarch64); ` +
    `if [ "\$ARCH" = "x86_64" ] || [ "\$ARCH" = "amd64" ]; then CS_ARCH="linux-amd64"; else CS_ARCH="linux-arm64"; fi; ` +
    `CS_URL="https://github.com/coder/code-server/releases/download/\${CS_TAG}/code-server-\${CS_VER}-\${CS_ARCH}.tar.gz"; ` +
    `echo "ASTRAPROGRESS:STAGE:Connecting to download server…:15"; ` +
    `TOTAL_BYTES=$(curl -sIL "$CS_URL" 2>/dev/null | grep -i '^content-length:' | tail -n1 | tr -d '\\r' | awk '{print $2}' || echo "229007734"); ` +
    `[ -n "$TOTAL_BYTES" ] && [ "$TOTAL_BYTES" -gt 0 ] 2>/dev/null || TOTAL_BYTES="229007734"; ` +
    `echo "ASTRAPROGRESS:STAGE:Downloading VS Code…:15"; ` +
    `echo "ASTRAPROGRESS:DOWNLOAD:0:$TOTAL_BYTES"; ` +
    `rm -f /tmp/code-server.tar.gz; ` +
    `curl -fL "$CS_URL" -o /tmp/code-server.tar.gz 2>/dev/null & ` +
    `CURL_PID=$!; ` +
    `while kill -0 $CURL_PID 2>/dev/null; do ` +
    `  SZ=$(wc -c < /tmp/code-server.tar.gz 2>/dev/null || echo 0); ` +
    `  echo "ASTRAPROGRESS:DOWNLOAD:$SZ:$TOTAL_BYTES"; ` +
    `  sleep 0.5; ` +
    `done; ` +
    `wait $CURL_PID || { echo "Download failed"; exit 1; }; ` +
    `echo "ASTRAPROGRESS:DOWNLOAD:$TOTAL_BYTES:$TOTAL_BYTES"; ` +
    `echo "ASTRAPROGRESS:STAGE:Extracting files (~650MB)…:75"; ` +
    `rm -rf /root/.vscode-standalone; ` +
    `mkdir -p /root/.vscode-standalone; ` +
    `tar -xzf /tmp/code-server.tar.gz -C /root/.vscode-standalone --strip-components=1; ` +
    `rm -f /tmp/code-server.tar.gz; ` +
    `echo "ASTRAPROGRESS:STAGE:Configuring server…:90"; ` +
    `ln -sf $(which node || echo /usr/bin/node) /root/.vscode-standalone/lib/node; ` +
    `ln -sf /root/.vscode-standalone/bin/code-server /usr/local/bin/code-server; ` +
    // node-pty ships as a glibc binary built for the bundled Node 20; under
    // Alpine's musl Node 22 the pty host SIGSEGVs ("connection to the shell
    // was lost" loop). Recompile it from source against the guest toolchain
    // (one-time; marker lives inside the standalone dir so re-provision
    // re-triggers it). Non-fatal: launch retries when the marker is missing.
    `echo "ASTRAPROGRESS:STAGE:Building terminal backend…:93"; ` +
    `if [ ! -f /root/.vscode-standalone/.pty-rebuilt ]; then ` +
    `  command -v gcc >/dev/null 2>&1 || apk add --no-cache build-base python3 || true; ` +
    `  if (cd /root/.vscode-standalone/lib/vscode && npm rebuild node-pty 2>&1 | tail -n 3); then touch /root/.vscode-standalone/.pty-rebuilt && echo "Terminal backend OK"; ` +
    `  else echo "PTY_REBUILD_FAILED (continuing without working terminal)"; fi; ` +
    `fi; ` +
    `code-server --version || { echo "Verification failed"; exit 1; }; ` +
    `touch ${PROVISION_MARKER}; ` +
    `echo "ASTRAPROGRESS:DONE:100:100"; ` +
    `echo VSCODE_PROVISION_OK`;

  const commandId = `vscode-provision-${Date.now()}`;
  let lastProgress: VSCodeProvisionProgress = {
    stage: "Preparing environment…",
    percent: 0,
  };

  const listener = addCommandOutputListener(commandId, (chunk: string) => {
    if (!chunk) return;
    for (const line of chunk.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith("ASTRAPROGRESS:")) {
        const parts = trimmed.split(":");
        const action = parts[1];
        if (action === "STAGE") {
          const stageName = parts[2] || "";
          const pct = parseInt(parts[3] || "0", 10);
          lastProgress = {
            ...lastProgress,
            stage: stageName,
            percent: isNaN(pct) ? lastProgress.percent : pct,
          };
          onProgress?.(lastProgress);
        } else if (action === "DOWNLOAD") {
          const sz = parseInt(parts[2] || "0", 10);
          const total = parseInt(parts[3] || "0", 10);
          if (!isNaN(sz) && !isNaN(total) && total > 0) {
            const dlRatio = Math.min(1, Math.max(0, sz / total));
            const overallPct = Math.round(15 + dlRatio * 60);
            const downloadedMb = Math.round((sz / (1024 * 1024)) * 10) / 10;
            const totalMb = Math.round((total / (1024 * 1024)) * 10) / 10;
            lastProgress = {
              stage: `Downloading VS Code… (${Math.round(dlRatio * 100)}%)`,
              percent: overallPct,
              downloadedMb,
              totalMb,
            };
            onProgress?.(lastProgress);
          }
        } else if (action === "DONE") {
          lastProgress = {
            stage: "Ready!",
            percent: 100,
            downloadedMb: lastProgress.totalMb,
            totalMb: lastProgress.totalMb,
          };
          onProgress?.(lastProgress);
        }
        continue;
      }

      if (
        trimmed.startsWith("+ ") ||
        trimmed.startsWith("proot warning:") ||
        trimmed.startsWith("kill -0")
      ) {
        continue;
      }

      onLog(trimmed.length > 300 ? trimmed.slice(0, 300) : trimmed);
    }
  });

  try {
    const res = await executeCommandStream(commandId, cmd);
    const out = res.stdout || "";
    return out.includes("VSCODE_PROVISION_OK");
  } catch (e: any) {
    onLog(`Provision failed: ${e?.message || e}`);
    return false;
  } finally {
    listener?.remove();
  }
}

export async function isVSCodeProvisioned(): Promise<boolean> {
  // Fast path: native direct file existence check (<0.5ms, no PRoot spawn)
  try {
    const docDir = FileSystem.documentDirectory || "";
    if (docDir) {
      const cleanDoc = docDir.replace(/^file:\/\//, "").replace(/\/+$/, "");
      const marker = getFileInfoNative(`${cleanDoc}/alpine/root/.vscode-provisioned`);
      const standaloneBin = getFileInfoNative(`${cleanDoc}/alpine/root/.vscode-standalone/bin/code-server`);
      const usrBin = getFileInfoNative(`${cleanDoc}/alpine/usr/local/bin/code-server`);
      if (marker.exists && (standaloneBin.exists || usrBin.exists)) {
        return true;
      }
    }
  } catch (_) {}

  // Fallback: PRoot command check (warm or non-Android environments)
  try {
    const ready = await withTimeout(isEnvironmentReady(), 3000, false);
    if (!ready) {
      return false;
    }
    const res = await withTimeout(
      executeCommand(
        `${ENV_PREFIX}[ -f ${PROVISION_MARKER} ] || { echo NO; exit 0; }; ` +
        `if [ -d /root/.vscode-standalone ] && [ ! -L /root/.vscode-standalone/lib/node ]; then ln -sf \$(which node || echo /usr/bin/node) /root/.vscode-standalone/lib/node 2>/dev/null; fi; ` +
        `command -v code-server >/dev/null 2>&1 && echo YES || echo NO`
      ),
      6000,
      { stdout: "NO", exitCode: 0 }
    );
    return (res.stdout || "").includes("YES");
  } catch (_) {
    return false;
  }
}

/** Starts code-server (localhost-only, password auth) in the Alpine guest. Idempotent. */
export async function startVSCodeServer(
  onLog: (line: string) => void,
  workspaceDir?: string
): Promise<boolean> {
  // Daemons MUST spawn from a persistent supervisor PTY session, never from
  // executeCommand: PRoot traces forked children, so a blocking call that
  // spawns survivors never returns and wedges the UI in "starting" forever
  // (same trap as the desktop supervisor in desktopService.ts).
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
        if (t.startsWith("export PATH") || t.startsWith("if [ ! -f") || t.startsWith("[ -n \"$CS_PID\" ]")) continue;
        onLog(t.length > 300 ? t.slice(0, 300) : t);
      }
      if (data.includes("VSCODE_RUNNING")) finish(true);
      else if (data.includes("VSCODE_START_FAILED")) finish(false);
    });

    // Dead-man switch: reconcile against reality if events are lost.
    setTimeout(async () => {
      if (done) return;
      onLog("Start timed out waiting for the ready signal — reconciling…");
      try {
        if (await isVSCodeRunning()) finish(true);
        else finish(false);
      } catch (_) {
        finish(false);
      }
    }, 90000);

    (async () => {
      try {
        await startPtySession(SVC_ID, workspaceDir, 24, 80);
        await new Promise((r) => setTimeout(r, 1200));
        writeTerminalInput(SVC_ID, LAUNCH_SCRIPT(workspaceDir) + "\n");
      } catch (e: any) {
        onLog(`Supervisor failed: ${e?.message || e}`);
        finish(false);
      }
    })();
  });
}

/** Converts host file URI (e.g. file:///.../workspaces/py) to PRoot guest path (/workspaces/py). */
export function toGuestPath(path?: string): string {
  if (!path) return "/workspaces";
  const clean = path.replace(/^file:\/\//, "").replace(/\/+$/, "");
  const wsMatch = clean.match(/\/workspaces\/(.+)$/);
  if (wsMatch) {
    return `/workspaces/${wsMatch[1]}`;
  }
  if (clean.endsWith("/workspace")) {
    return "/workspace";
  }
  if (clean.startsWith("/workspaces/")) {
    return clean;
  }
  return clean.startsWith("/") ? clean : `/workspaces/${clean}`;
}

export async function stopVSCodeServer(): Promise<void> {
  try {
    await stopTerminalSession(SVC_ID);
  } catch (_) {}
  try {
    await executeCommand(
      `${ENV_PREFIX}if [ -f ${PID_FILE} ]; then pid=$(cat ${PID_FILE}); kill -9 "$pid" 2>/dev/null; rm -f ${PID_FILE}; fi; ` +
      `pkill -9 -f -- '--bind-addr.*${VSCODE_PORT}' 2>/dev/null; echo stopped`
    );
  } catch (_) {}
}

export async function isVSCodeRunning(): Promise<boolean> {
  // Fast path: direct loopback HTTP probe from host (~2ms, zero PRoot overhead)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 800);
    try {
      const resp = await fetch(`http://127.0.0.1:${VSCODE_PORT}/`, {
        method: "HEAD",
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (resp.status > 0) return true;
    } catch (_) {
      clearTimeout(timer);
    }
  } catch (_) {}

  // Fallback: in-guest curl check
  try {
    const res = await withTimeout(
      executeCommand(
        `${ENV_PREFIX}curl -sI http://127.0.0.1:${VSCODE_PORT}/ >/dev/null 2>&1 && echo YES || echo NO`
      ),
      2500,
      { stdout: "NO", exitCode: 0 }
    );
    return (res.stdout || "").includes("YES");
  } catch (_) {
    return false;
  }
}

/** Random per-install password for the code-server login page. */
export async function getVSCodePassword(): Promise<string> {
  try {
    const res = await withTimeout(
      executeCommand(`${ENV_PREFIX}[ -f ${PASS_FILE} ] && cat ${PASS_FILE} 2>/dev/null || true`),
      2000,
      { stdout: "", exitCode: 0 }
    );
    return (res.stdout || "").trim();
  } catch (_) {
    return "";
  }
}

export function buildVSCodeUrl(workspaceDir?: string): string {
  const guestDir = toGuestPath(workspaceDir);
  const encodedPath = guestDir
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  return `http://127.0.0.1:${VSCODE_PORT}/?folder=${encodedPath}`;
}

/** Installs an extension by ID (`publisher.name`) from Open VSX. */
export async function installVSCodeExtension(
  extensionId: string,
  onLog: (line: string) => void
): Promise<boolean> {
  if (!/^[A-Za-z0-9_.-]+\.[A-Za-z0-9_.-]+$/.test(extensionId.trim())) {
    onLog("Invalid extension ID — use publisher.name (e.g. esbenp.prettier-vscode).");
    return false;
  }
  const id = extensionId.trim();
  const commandId = `vscode-ext-${Date.now()}`;
  const listener = addCommandOutputListener(commandId, (chunk: string) => {
    if (!chunk) return;
    for (const line of chunk.split(/\r?\n/)) {
      if (line.trim()) onLog(line.length > 300 ? line.slice(0, 300) : line);
    }
  });
  try {
    const res = await executeCommandStream(commandId, `${ENV_PREFIX}code-server --install-extension ${id}`);
    const out = res.stdout || "";
    const ok = /successfully installed/i.test(out) || /already installed/i.test(out);
    onLog(ok ? `Extension installed: ${id}` : `Install finished — check log above for: ${id}`);
    return ok;
  } catch (e: any) {
    onLog(`Extension install failed: ${e?.message || e}`);
    return false;
  } finally {
    listener?.remove();
  }
}

/** Diagnostics bundle for the error view: binaries, version, proc, log tail. */
export async function getVSCodeDiagnostics(): Promise<string> {
  try {
    const res = await withTimeout(
      executeCommand(
        `${ENV_PREFIX}echo '== binaries:'; for b in code-server node npm python3 curl; do printf '%s: ' "$b"; command -v $b 2>/dev/null || echo '(missing)'; done; ` +
        `echo '== version:'; code-server --version 2>&1 | head -3 || echo '(failed)'; ` +
        `echo '== terminal backend:'; node --version 2>&1; echo "SHELL=$SHELL"; ` +
        `[ -f /root/.vscode-standalone/.pty-rebuilt ] && echo 'pty marker: OK' || echo 'pty marker: MISSING (rebuild pending)'; ` +
        `ls /root/.vscode-standalone/lib/vscode/node_modules/node-pty/build/Release/pty.node 2>/dev/null || echo 'pty.node: missing'; ` +
        `[ -f /root/.local/share/code-server/User/settings.json ] && echo 'settings.json: present' || echo 'settings.json: absent'; ` +
        `echo '== http check:'; curl -sI http://127.0.0.1:${VSCODE_PORT}/ 2>&1 | head -5 || echo '(not responding)'; ` +
        `echo '== code-server.log:'; tail -n 25 ${LOG_FILE} 2>/dev/null || echo '(missing)'`
      ),
      6000,
      { stdout: "Diagnostics timed out", exitCode: -1 }
    );
    return (res.stdout || "").trim() || "(no output)";
  } catch (e: any) {
    return `Diagnostics failed: ${e?.message || e}`;
  }
}

// Typed into the supervisor shell (one blob; executes line by line).
const LAUNCH_SCRIPT = (workspaceDir?: string) => {
  const guestDir = toGuestPath(workspaceDir);
  return `${ENV_PREFIX}mkdir -p /root/.vscode /root/.config/code-server "${guestDir}"
if [ ! -f /root/.vscode-standalone/.pty-rebuilt ] && [ -d /root/.vscode-standalone/lib/vscode/node_modules/node-pty ]; then echo 'Terminal backend missing — rebuilding once (~2 min, keep app open)…'; command -v gcc >/dev/null 2>&1 || apk add --no-cache build-base python3 >/dev/null 2>&1 || true; (cd /root/.vscode-standalone/lib/vscode && npm rebuild node-pty 2>&1 | tail -n 3) && touch /root/.vscode-standalone/.pty-rebuilt && echo 'Terminal backend OK' || echo 'pty rebuild failed — terminal may not work'; fi
if [ ! -f /root/.local/share/code-server/User/settings.json ]; then mkdir -p /root/.local/share/code-server/User; printf '%s' '{"terminal.integrated.defaultProfile.linux":"bash","terminal.integrated.profiles.linux":{"bash":{"path":"/bin/bash"}},"terminal.integrated.gpuAcceleration":"off"}' > /root/.local/share/code-server/User/settings.json; fi
if [ -d /root/.vscode-standalone ] && [ ! -L /root/.vscode-standalone/lib/node ]; then ln -sf \$(which node || echo /usr/bin/node) /root/.vscode-standalone/lib/node 2>/dev/null; fi
printf 'bind-addr: 127.0.0.1:${VSCODE_PORT}\\nauth: none\\ncert: false\\n' > /root/.config/code-server/config.yaml
CS_PID=$(cat ${PID_FILE} 2>/dev/null); if [ -n "$CS_PID" ]; then kill -9 "$CS_PID" 2>/dev/null; rm -f ${PID_FILE}; fi
pkill -9 -f -- '--bind-addr.*${VSCODE_PORT}' 2>/dev/null; sleep 1
nohup code-server --bind-addr 127.0.0.1:${VSCODE_PORT} --auth none --disable-telemetry --user-data-dir /root/.local/share/code-server --extensions-dir /root/.local/share/code-server/extensions ${guestDir} > ${LOG_FILE} 2>&1 & echo $! > ${PID_FILE}
READY=0
for i in $(seq 1 30); do
  if curl -sI http://127.0.0.1:${VSCODE_PORT}/ >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 0.5
done
if [ "$READY" = "1" ]; then
  echo VSCODE_RUNNING
else
  echo VSCODE_START_FAILED
  echo '--- code-server.log:'
  tail -n 25 ${LOG_FILE} 2>/dev/null
fi`;
};
