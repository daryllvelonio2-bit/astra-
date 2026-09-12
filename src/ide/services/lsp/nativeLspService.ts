import * as FileSystem from "expo-file-system/legacy";
import { executeCommand } from "../../../../modules/linux-runner/src";
import { CodeDiagnostic } from "../codeDiagnosticsService";

const DIAG_TIMEOUT_MS = 4000;

let pyreflyCheckedAt = 0;
let hasPyreflyCached = false;

async function isPyreflyInstalled(workspaceId?: string): Promise<boolean> {
  const now = Date.now();
  if (now - pyreflyCheckedAt < 20000) return hasPyreflyCached;
  try {
    const res = await executeCommand("command -v pyrefly || test -f /usr/local/bin/pyrefly", workspaceId);
    hasPyreflyCached = res.exitCode === 0;
    pyreflyCheckedAt = now;
    return hasPyreflyCached;
  } catch {
    return false;
  }
}

/**
 * Runs real background compiler / linter diagnostics via Alpine Linux PRoot
 * without launching or relying on VS Code Web.
 */
export async function runBackgroundDiagnostics(
  filePath: string,
  content: string,
  workspaceId?: string
): Promise<CodeDiagnostic[] | null> {
  const ext = (filePath.split(".").pop() || "").toLowerCase();

  if (ext === "py" || ext === "pyw") {
    return runPythonDiagnostics(filePath, content, workspaceId);
  }

  return null;
}

/**
 * Runs Python diagnostics using Pyrefly (if installed from marketplace)
 * or built-in python3 compile syntax validation.
 */
async function runPythonDiagnostics(
  filePath: string,
  content: string,
  workspaceId?: string
): Promise<CodeDiagnostic[] | null> {
  try {
    if (await isPyreflyInstalled(workspaceId)) {
      const pyreflyDiags = await runPyreflyDiagnostics(filePath, content, workspaceId);
      if (pyreflyDiags !== null) {
        return pyreflyDiags;
      }
    }

    return runPythonSyntaxCompile(filePath, content, workspaceId);
  } catch {
    return null;
  }
}

/**
 * Executes Pyrefly CLI check on file content in Alpine PRoot.
 */
async function runPyreflyDiagnostics(
  _filePath: string,
  content: string,
  workspaceId?: string
): Promise<CodeDiagnostic[] | null> {
  try {
    const base = FileSystem.documentDirectory || "/data/user/0/com.janelle.aicoder/files/";
    const tmpFileUri = `${base.replace(/\/+$/, "")}/tmp/.diag_pyrefly.py`;
    await FileSystem.writeAsStringAsync(tmpFileUri, content);

    const checkCmd = `pyrefly check /tmp/.diag_pyrefly.py 2>&1`;
    const res = await Promise.race([
      executeCommand(checkCmd, workspaceId),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), DIAG_TIMEOUT_MS)),
    ]);

    if (!res || !res.stdout) return null;
    const output = res.stdout.trim();
    if (!output || output.toLowerCase().includes("no errors found") || output === "OK") {
      return [];
    }

    const diagnostics: CodeDiagnostic[] = [];
    const lines = output.split("\n");
    const diagRegex = /(?:.*?:)?(\d+):(\d+)(?::\s*|\s+)(?:\[(\d+)\]\s*)?(?:(error|warning|info|note):?\s*)?(.*)/i;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("Checked ") || trimmed.startsWith("Summary:")) continue;
      const match = trimmed.match(diagRegex);
      if (match) {
        const lineNum = parseInt(match[1], 10) || 1;
        const colNum = parseInt(match[2], 10) || 1;
        const rawSev = (match[4] || "error").toLowerCase();
        const sev: "error" | "warning" = rawSev.includes("warn") ? "warning" : "error";
        const message = match[5]?.trim() || "Type error";

        diagnostics.push({
          line: lineNum,
          col: colNum,
          message,
          severity: sev,
          source: "python",
        });
      }
    }

    return diagnostics;
  } catch {
    return null;
  }
}

/**
 * Runs Python's built-in compile() syntax validation.
 */
async function runPythonSyntaxCompile(
  filePath: string,
  content: string,
  workspaceId?: string
): Promise<CodeDiagnostic[] | null> {
  try {
    const pyCmd = `python3 -c "
import sys, traceback
try:
    code = sys.stdin.read()
    compile(code, '${filePath.replace(/'/g, "\\'")}', 'exec')
    print('OK')
except SyntaxError as err:
    print(f'SYNTAX_ERROR:{err.lineno}:{err.offset or 1}:{err.msg}')
except Exception as err:
    print(f'ERROR:1:1:{str(err)}')
"`;

    const res = await Promise.race([
      executeCommand(`printf '%s' ${escapeForShell(content)} | ${pyCmd}`, workspaceId),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), DIAG_TIMEOUT_MS)),
    ]);

    if (!res || !res.stdout) return null;

    const output = res.stdout.trim();
    if (output === "OK") return [];

    const diagnostics: CodeDiagnostic[] = [];
    const lines = output.split("\n");

    for (const line of lines) {
      if (line.startsWith("SYNTAX_ERROR:") || line.startsWith("ERROR:")) {
        const parts = line.split(":");
        const lineNum = parseInt(parts[1], 10) || 1;
        const colNum = parseInt(parts[2], 10) || 1;
        const msg = parts.slice(3).join(":").trim() || "Syntax error";

        diagnostics.push({
          line: lineNum,
          col: colNum,
          message: msg,
          severity: "error",
          source: "python",
        });
      }
    }

    return diagnostics;
  } catch {
    return null;
  }
}

function escapeForShell(str: string): string {
  return "'" + str.replace(/'/g, "'\\''") + "'";
}
