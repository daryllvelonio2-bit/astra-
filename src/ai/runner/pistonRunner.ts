import { ExecutionResult } from "./types";

const PISTON_API = "https://emkc.org/api/v2/piston/execute";

const LANGUAGE_MAP: Record<string, { language: string; version: string }> = {
  php: { language: "php", version: "8.2.3" },
  python: { language: "python", version: "3.10.0" },
  py: { language: "python", version: "3.10.0" },
  javascript: { language: "javascript", version: "18.15.0" },
  js: { language: "javascript", version: "18.15.0" },
  node: { language: "javascript", version: "18.15.0" },
  typescript: { language: "typescript", version: "5.0.3" },
  ts: { language: "typescript", version: "5.0.3" },
  ruby: { language: "ruby", version: "3.0.1" },
  rb: { language: "ruby", version: "3.0.1" },
  go: { language: "go", version: "1.16.2" },
  golang: { language: "go", version: "1.16.2" },
  rust: { language: "rust", version: "1.68.2" },
  rs: { language: "rust", version: "1.68.2" },
  cpp: { language: "c++", version: "10.2.0" },
  "c++": { language: "c++", version: "10.2.0" },
  c: { language: "c", version: "10.2.0" },
  java: { language: "java", version: "15.0.2" },
  csharp: { language: "csharp", version: "6.12.0" },
  cs: { language: "csharp", version: "6.12.0" },
  kotlin: { language: "kotlin", version: "1.8.20" },
  kt: { language: "kotlin", version: "1.8.20" },
  swift: { language: "swift", version: "5.3.3" },
  dart: { language: "dart", version: "2.19.6" },
  lua: { language: "lua", version: "5.4.4" },
  perl: { language: "perl", version: "5.36.0" },
  pl: { language: "perl", version: "5.36.0" },
  r: { language: "r", version: "4.1.1" },
  sqlite3: { language: "sqlite3", version: "3.36.0" },
  sql: { language: "sqlite3", version: "3.36.0" },
  bash: { language: "bash", version: "5.2.0" },
  sh: { language: "bash", version: "5.2.0" },
  zig: { language: "zig", version: "0.10.1" },
  elixir: { language: "elixir", version: "1.11.3" },
  scala: { language: "scala", version: "3.2.2" },
  haskell: { language: "haskell", version: "9.0.1" },
  hs: { language: "haskell", version: "9.0.1" },
};

export async function runPistonCode(code: string, rawLang: string): Promise<ExecutionResult> {
  const langKey = (rawLang || "php").toLowerCase();
  const config = LANGUAGE_MAP[langKey] || { language: langKey, version: "*" };

  try {
    const res = await fetch(PISTON_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: config.language,
        version: config.version,
        files: [{ content: code }],
      }),
    });

    if (!res.ok) {
      return {
        stdout: "",
        stderr: `Execution Error: HTTP ${res.status}`,
        exitCode: 1,
      };
    }

    const data = await res.json();
    const run = data.run || {};

    return {
      stdout: run.stdout || (run.output && !run.stderr ? run.output : ""),
      stderr: run.stderr || "",
      exitCode: run.code ?? 0,
    };
  } catch (err: any) {
    return {
      stdout: "",
      stderr: `Execution Network Error: ${err.message || String(err)}`,
      exitCode: 1,
    };
  }
}
