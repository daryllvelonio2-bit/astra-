import * as FileSystem from "expo-file-system/legacy";
import { executeCommand } from "../../../../modules/linux-runner/src";
import { CodeDiagnostic } from "../codeDiagnosticsService";
import { loadExtensionRegistry } from "../extensions/extensionRegistry";
import { InstalledExtension } from "../extensions/types";

const DIAG_TIMEOUT_MS = 4000;

// Tool availability cache (25s TTL per tool)
const toolCache = new Map<string, { available: boolean; timestamp: number }>();

async function isToolAvailable(toolName: string, workspaceId?: string): Promise<boolean> {
  const cached = toolCache.get(toolName);
  const now = Date.now();
  if (cached && now - cached.timestamp < 25000) return cached.available;

  try {
    const res = await executeCommand(
      `command -v "${toolName}" >/dev/null 2>&1 || test -f "/usr/local/bin/${toolName}" || test -f "/root/.local/bin/${toolName}"`,
      workspaceId
    );
    const available = res.exitCode === 0;
    toolCache.set(toolName, { available, timestamp: now });
    return available;
  } catch {
    return false;
  }
}

/**
 * Runs background compiler / linter diagnostics via Alpine Linux PRoot.
 * Completely dynamic: runs whatever tools/binaries were provided by installed extensions.
 * Zero hardcoded tool catalogs.
 */
export async function runBackgroundDiagnostics(
  filePath: string,
  content: string,
  workspaceId?: string
): Promise<CodeDiagnostic[] | null> {
  const ext = (filePath.split(".").pop() || "").toLowerCase();
  if (!ext) return null;

  try {
    // 1. Discover tools provided by currently installed and enabled extensions
    const reg = await loadExtensionRegistry();
    const installedList = Object.values(reg.installed) as InstalledExtension[];

    const candidateTools: string[] = [];
    for (const item of installedList) {
      if (!item.enabled || !item.binaries) continue;
      for (const b of item.binaries) {
        if (b && !candidateTools.includes(b)) {
          candidateTools.push(b);
        }
      }
    }

    const defaultLanguageTools: Record<string, string[]> = {
      py: ["python3", "flake8", "ruff"],
      php: ["php"],
      sh: ["bash"],
      c: ["gcc", "clang"],
      cpp: ["g++", "clang++"],
      rs: ["rustc"],
    };
    for (const t of defaultLanguageTools[ext] || []) {
      if (!candidateTools.includes(t)) candidateTools.push(t);
    }

    if (candidateTools.length === 0) {
      return null;
    }

    // 2. Prepare temporary file for checking in Linux
    const base = FileSystem.documentDirectory || "/data/user/0/com.janelle.aicoder/files/";
    const tmpFileName = `.astra_diag_${ext}`;
    const tmpFileUri = `${base.replace(/\/+$/, "")}/tmp/${tmpFileName}`;
    await FileSystem.writeAsStringAsync(tmpFileUri, content);
    const linuxPath = `/tmp/${tmpFileName}`;

    // 3. Find and run the active extension tool in Linux PRoot
    for (const tool of candidateTools) {
      if (!(await isToolAvailable(tool, workspaceId))) continue;

      let checkCmd = `"${tool}" check "${linuxPath}" 2>&1 || "${tool}" "${linuxPath}" 2>&1`;
      if (tool === "python3") {
        checkCmd = `python3 -m py_compile "${linuxPath}" 2>&1`;
      } else if (tool === "php") {
        checkCmd = `php -l "${linuxPath}" 2>&1`;
      } else if (tool === "bash") {
        checkCmd = `bash -n "${linuxPath}" 2>&1`;
      } else if (tool === "gcc" || tool === "clang" || tool === "g++" || tool === "clang++") {
        checkCmd = `${tool} -fsyntax-only "${linuxPath}" 2>&1`;
      } else if (tool === "rustc") {
        checkCmd = `rustc --emit=metadata "${linuxPath}" 2>&1`;
      }

      const res = await Promise.race([
        executeCommand(checkCmd, workspaceId),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), DIAG_TIMEOUT_MS)),
      ]);

      if (res && res.stdout) {
        const diagnostics = parseUniversalDiagnostics(res.stdout, tool);
        if (diagnostics.length > 0) {
          return diagnostics;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Universal Unix / GCC / Clang / Linter diagnostic parser.
 * Handles standard Unix output formats across all languages dynamically.
 */
export function parseUniversalDiagnostics(
  rawOutput: string,
  sourceName: string
): CodeDiagnostic[] {
  if (!rawOutput) return [];
  const trimmed = rawOutput.trim();
  if (
    !trimmed ||
    trimmed === "OK" ||
    trimmed.toLowerCase().includes("no errors found") ||
    trimmed.toLowerCase().includes("no syntax errors detected") ||
    trimmed.toLowerCase().includes("all checks passed")
  ) {
    return [];
  }

  const diagnostics: CodeDiagnostic[] = [];
  const lines = rawOutput.split(/\r?\n/);

  // Standard unix format: [path:]line:col: [code] [severity:] message
  const standardRegex = /(?:^|[\r\n])(?:[^\r\n:]+:)?(\d+):(?:(\d+):?)?\s*(?:\[([^\]]+)\]\s*)?(?:(error|warning|warn|info|note|fatal|syntax error):?\s*)?(.+)/i;
  // PHP format: Parse error: syntax error... in path on line 12
  const phpRegex = /(?:Parse error|Fatal error):\s*(.*?)\s+in\s+.*?\s+on\s+line\s+(\d+)/i;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("Checked ") || line.startsWith("Summary:") || line.startsWith("Found 0")) {
      continue;
    }

    const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, "");

    const phpMatch = cleanLine.match(phpRegex);
    if (phpMatch) {
      diagnostics.push({
        line: parseInt(phpMatch[2], 10) || 1,
        col: 1,
        message: phpMatch[1]?.trim() || "Syntax Error",
        severity: "error",
        source: sourceName,
      });
      continue;
    }

    const match = cleanLine.match(standardRegex);
    if (match) {
      const lineNum = parseInt(match[1], 10);
      const colNum = match[2] ? parseInt(match[2], 10) : 1;
      const rawSev = (match[4] || "error").toLowerCase();
      const sev: "error" | "warning" = rawSev.includes("warn") ? "warning" : "error";
      let msg = match[5]?.trim() || cleanLine;
      if (match[3]) {
        msg = `[${match[3]}] ${msg}`;
      }

      if (!isNaN(lineNum) && lineNum > 0) {
        diagnostics.push({
          line: lineNum,
          col: colNum || 1,
          message: msg,
          severity: sev,
          source: sourceName,
        });
      }
    }
  }

  return diagnostics;
}
