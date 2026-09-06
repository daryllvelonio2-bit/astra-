import { readFileContent } from "./workspaceService";
import { runningTasksService } from "../../ai/services/runningTasksService";
import {
  executeCommand,
  isEnvironmentReady,
  startTerminalSession,
  writeTerminalInput,
} from "../../../modules/linux-runner/src";
import { ideActionService } from "./ideActionService";

/**
 * Universal Run service: executes the active file (or a detected project
 * entry point) inside the on-device Alpine guest and shows output in the
 * Terminal tab's Run session. HTML / server projects open in the Browser tab.
 *
 * Policy: never auto-install anything. A missing runtime surfaces the real
 * shell error plus a pointer to Settings → Linux → Optional Extras, and the
 * user installs it themselves.
 */

export const RUN_SESSION_ID = "run-session";

const EXTRAS_HINT =
  "Tip: missing runtimes can be installed in Settings → Linux → Optional Extras.";

export type RunKind = "terminal" | "browser" | "unsupported";

export interface RunPlan {
  kind: RunKind;
  /** Shell command executed in the guest (cwd = workspace or file dir). */
  command: string;
  /** Short label echoed above the output, e.g. "node server.js". */
  displayName: string;
  /** Runtime binary probed with `command -v` before running (terminal plans). */
  runtime?: string;
  /** Browser preview URL (browser plans). */
  url?: string;
  port?: number;
  /** Message shown instead of running anything (unsupported plans). */
  message?: string;
}

export interface RunCallbacks {
  onOpenTerminal: () => void;
  onOpenBrowser: (url: string) => void;
}

/** POSIX single-quote a path for the guest shell. */
function q(p: string): string {
  return `'${p.replace(/'/g, `'\\''`)}'`;
}

function basename(p: string): string {
  const clean = p.replace(/\\/g, "/");
  const i = clean.lastIndexOf("/");
  return i >= 0 ? clean.slice(i + 1) : clean;
}

function dirname(p: string): string {
  const clean = p.replace(/\\/g, "/");
  const i = clean.lastIndexOf("/");
  return i > 0 ? clean.slice(0, i) : "";
}

function extOf(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  return i >= 0 ? fileName.slice(i + 1).toLowerCase() : "";
}

/** Guest absolute dir for a workspace-relative path. */
function guestDir(workspaceId: string, relPath: string): string {
  const dir = dirname(relPath);
  return dir ? `/workspaces/${workspaceId}/${dir}` : `/workspaces/${workspaceId}`;
}

/** First free port in 8080..8099 given ports already tracked. */
function pickPort(): number {
  const used = new Set(
    runningTasksService
      .getRunningTasks()
      .map((t) => t.port)
      .filter((p): p is number => typeof p === "number")
  );
  for (let p = 8080; p < 8100; p++) {
    if (!used.has(p)) return p;
  }
  return 8080;
}

interface DirectRunner {
  runtime: string;
  build: (file: string) => string;
  browser?: false;
}

// Extension → guest command. `node_modules`, pip packages etc. resolve
// because commands run in the file's own directory inside the guest.
const DIRECT_RUNNERS: Record<string, DirectRunner> = {
  js: { runtime: "node", build: (f) => `node ${q(f)}` },
  mjs: { runtime: "node", build: (f) => `node ${q(f)}` },
  cjs: { runtime: "node", build: (f) => `node ${q(f)}` },
  py: { runtime: "python3", build: (f) => `python3 ${q(f)}` },
  php: { runtime: "php", build: (f) => `php ${q(f)}` },
  ts: {
    runtime: "node",
    build: (f) => {
      const base = basename(f).replace(/\.(mts|cts|ts)$/i, "");
      return `npx --yes -p typescript tsc ${q(f)} --outDir /tmp/astrun --module commonjs --target es2020 && node /tmp/astrun/${q(base)}.js`;
    },
  },
  mts: {
    runtime: "node",
    build: (f) => {
      const base = basename(f).replace(/\.(mts|cts|ts)$/i, "");
      return `npx --yes -p typescript tsc ${q(f)} --outDir /tmp/astrun --module commonjs --target es2020 && node /tmp/astrun/${q(base)}.js`;
    },
  },
  cts: {
    runtime: "node",
    build: (f) => {
      const base = basename(f).replace(/\.(mts|cts|ts)$/i, "");
      return `npx --yes -p typescript tsc ${q(f)} --outDir /tmp/astrun --module commonjs --target es2020 && node /tmp/astrun/${q(base)}.js`;
    },
  },
  c: { runtime: "gcc", build: (f) => `gcc ${q(f)} -o /tmp/astrun && /tmp/astrun` },
  cpp: { runtime: "g++", build: (f) => `g++ ${q(f)} -o /tmp/astrun && /tmp/astrun` },
  cc: { runtime: "g++", build: (f) => `g++ ${q(f)} -o /tmp/astrun && /tmp/astrun` },
  cxx: { runtime: "g++", build: (f) => `g++ ${q(f)} -o /tmp/astrun && /tmp/astrun` },
  go: { runtime: "go", build: (f) => `go run ${q(f)}` },
  rs: { runtime: "rustc", build: (f) => `rustc ${q(f)} -o /tmp/astrun && /tmp/astrun` },
  java: { runtime: "java", build: (f) => `java ${q(f)}` },
  rb: { runtime: "ruby", build: (f) => `ruby ${q(f)}` },
  lua: { runtime: "lua5.4", build: (f) => `lua5.4 ${q(f)}` },
  sh: { runtime: "sh", build: (f) => `sh ${q(f)}` },
  bash: { runtime: "bash", build: (f) => `bash ${q(f)}` },
  sql: { runtime: "sqlite3", build: (f) => `sqlite3 /tmp/astrun.db < ${q(f)}` },
};

/**
 * Resolve what "Run" means for the given workspace-relative file path.
 * Direct mapping first; otherwise smart project-entry detection at the
 * workspace root (package.json / artisan / manage.py / index.html / ...).
 */
export async function resolveRunPlan(
  workspaceId: string,
  filePath: string,
  rootNames: string[]
): Promise<RunPlan> {
  const name = basename(filePath);
  const ext = extOf(name);
  const lower = rootNames.map((n) => n.toLowerCase());
  const has = (...cands: string[]) => cands.some((c) => lower.includes(c.toLowerCase()));

  // HTML always previews in the Browser tab via a real local server so
  // relative CSS/JS/images and fetch() keep working.
  if (ext === "html" || ext === "htm") {
    const port = pickPort();
    const dir = guestDir(workspaceId, filePath);
    return {
      kind: "browser",
      command: `pkill -f "http.server ${port}" 2>/dev/null; python3 -m http.server ${port} -d ${q(dir)} &`,
      displayName: `serve ${name} :${port}`,
      runtime: "python3",
      url: `http://127.0.0.1:${port}/${name}`,
      port,
    };
  }

  const direct = DIRECT_RUNNERS[ext];
  if (direct) {
    return {
      kind: "terminal",
      command: `cd ${q(guestDir(workspaceId, filePath))} && ${direct.build(name)}`,
      displayName: `${direct.runtime} ${name}`,
      runtime: direct.runtime,
    };
  }

  // --- Smart project detection (open file isn't directly runnable) ---

  // Node project
  if (has("package.json")) {
    try {
      const raw = await readFileContent(workspaceId, "package.json");
      const pkg = raw ? JSON.parse(raw) : {};
      const start = pkg?.scripts?.start;
      const main = pkg?.main;
      const cmd =
        typeof start === "string" && start
          ? "npm start"
          : typeof main === "string" && main
          ? `node ${main}`
          : has("index.js")
          ? "node index.js"
          : has("server.js")
          ? "node server.js"
          : null;
      if (cmd) {
        return {
          kind: "terminal",
          command: `cd ${q(`/workspaces/${workspaceId}`)} && ${cmd}`,
          displayName: cmd,
          runtime: "node",
        };
      }
    } catch (_) {}
  }

  // Laravel / artisan
  if (has("artisan")) {
    const port = pickPort();
    return {
      kind: "browser",
      command: `cd ${q(`/workspaces/${workspaceId}`)} && php artisan serve --host=127.0.0.1 --port=${port} &`,
      displayName: `artisan serve :${port}`,
      runtime: "php",
      url: `http://127.0.0.1:${port}`,
      port,
    };
  }

  // Django
  if (has("manage.py")) {
    const port = pickPort();
    return {
      kind: "browser",
      command: `cd ${q(`/workspaces/${workspaceId}`)} && python3 manage.py runserver 127.0.0.1:${port} &`,
      displayName: `django runserver :${port}`,
      runtime: "python3",
      url: `http://127.0.0.1:${port}`,
      port,
    };
  }

  // Plain Python entry points
  for (const entry of ["app.py", "main.py", "server.py"]) {
    if (has(entry)) {
      return {
        kind: "terminal",
        command: `cd ${q(`/workspaces/${workspaceId}`)} && python3 ${entry}`,
        displayName: `python3 ${entry}`,
        runtime: "python3",
      };
    }
  }

  // Go module / Rust crate
  if (has("go.mod")) {
    return {
      kind: "terminal",
      command: `cd ${q(`/workspaces/${workspaceId}`)} && go run .`,
      displayName: "go run .",
      runtime: "go",
    };
  }
  if (has("Cargo.toml")) {
    return {
      kind: "terminal",
      command: `cd ${q(`/workspaces/${workspaceId}`)} && cargo run`,
      displayName: "cargo run",
      runtime: "cargo",
    };
  }

  // Static site fallback
  if (has("index.html")) {
    const port = pickPort();
    return {
      kind: "browser",
      command: `pkill -f "http.server ${port}" 2>/dev/null; python3 -m http.server ${port} -d ${q(`/workspaces/${workspaceId}`)} &`,
      displayName: `serve index.html :${port}`,
      runtime: "python3",
      url: `http://127.0.0.1:${port}/index.html`,
      port,
    };
  }

  return {
    kind: "unsupported",
    command: "",
    displayName: name,
    message: `No runnable entry found for "${name}". Run supports .html/.js/.py/.php/.ts, C/C++/Go/Rust/Java/Ruby/Lua/shell/SQL directly, plus Node, Laravel, Django, Go and Cargo projects.`,
  };
}

/** Probe a runtime binary inside the guest. */
async function hasRuntime(bin: string): Promise<boolean> {
  try {
    const res = await executeCommand(`command -v ${bin}`);
    return res.exitCode === 0 && !!res.stdout.trim();
  } catch (_) {
    return false;
  }
}

/**
 * Execute a resolved plan: terminal plans (and the server half of browser
 * plans) run in the Run session; browser plans then open the preview URL.
 */
export async function executeRunPlan(
  workspaceId: string,
  plan: RunPlan,
  cb: RunCallbacks
): Promise<void> {
  if (plan.kind === "unsupported") {
    ideActionService.emit("RUN_IN_TERMINAL", {
      header: `⚡ Run: ${plan.displayName}`,
      command: `echo ${q(plan.message || "Nothing to run.")}`,
      workspaceId,
      userInitiated: true,
    });
    cb.onOpenTerminal();
    return;
  }

  try {
    if (!(await isEnvironmentReady())) {
      ideActionService.emit("RUN_IN_TERMINAL", {
        header: `⚡ Run: ${plan.displayName}`,
        command: `echo 'Linux environment is not ready yet — the toolchain is still provisioning (watch Settings → Linux).'`,
        workspaceId,
        userInitiated: true,
      });
      cb.onOpenTerminal();
      return;
    }
  } catch (_) {}

  if (plan.runtime && !(await hasRuntime(plan.runtime))) {
    ideActionService.emit("RUN_IN_TERMINAL", {
      header: `⚡ Run: ${plan.displayName}`,
      command: `echo ${q(`error: '${plan.runtime}' not found in the Linux environment.`)}\necho ${q(EXTRAS_HINT)}`,
      workspaceId,
      userInitiated: true,
    });
    cb.onOpenTerminal();
    return;
  }

  if (plan.kind === "browser" && plan.url) {
    // Server output stays visible in the Run session; the page opens in Browser.
    // A missing python3/php aborts here with the real error + Extras hint
    // instead of opening a dead preview URL.
    if (plan.runtime && !(await hasRuntime(plan.runtime))) {
      ideActionService.emit("RUN_IN_TERMINAL", {
        header: `⚡ Run: ${plan.displayName}`,
        command: `echo ${q(`error: '${plan.runtime}' not found in the Linux environment.`)}\necho ${q(EXTRAS_HINT)}`,
        workspaceId,
        userInitiated: true,
      });
      cb.onOpenTerminal();
      return;
    }
    try {
      await startTerminalSession(RUN_SESSION_ID, workspaceId);
    } catch (_) {}
    try {
      writeTerminalInput(RUN_SESSION_ID, `echo '⚡ Run: ${plan.displayName}'\n${plan.command}\n`);
    } catch (_) {}
    try {
      runningTasksService.addTask({
        command: plan.command,
        port: plan.port,
        url: plan.url,
        workspaceId,
      });
    } catch (_) {}
    cb.onOpenBrowser(plan.url);
    return;
  }

  ideActionService.emit("RUN_IN_TERMINAL", {
    header: `⚡ Run: ${plan.displayName}`,
    command: plan.command,
    workspaceId,
    userInitiated: true,
  });
  cb.onOpenTerminal();
}
