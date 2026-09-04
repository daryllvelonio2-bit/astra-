import { useState, useEffect, useMemo, useRef } from "react";
import {
  analyzeCode,
  findMatchingBracket,
  CodeDiagnostic,
  BracketMatch,
} from "../services/codeDiagnosticsService";

export interface EditorSelection {
  start: number;
  end: number;
}

interface AssistEditResult {
  chunk: string;
  cursor: number;
}

const DIAGNOSTIC_DEBOUNCE_MS = 500;
const CLOSE_FOR: Record<string, string> = {
  "(": ")",
  "[": "]",
  "{": "}",
  '"': '"',
  "'": "'",
  "`": "`",
};

function diffStrings(oldS: string, newS: string): { at: number; removed: string; inserted: string } {
  let at = 0;
  while (at < oldS.length && at < newS.length && oldS[at] === newS[at]) at++;
  let endOld = oldS.length;
  let endNew = newS.length;
  while (endOld > at && endNew > at && oldS[endOld - 1] === newS[endNew - 1]) {
    endOld--;
    endNew--;
  }
  return { at, removed: oldS.slice(at, endOld), inserted: newS.slice(at, endNew) };
}

function indentOfLine(lineText: string): string {
  return lineText.match(/^[ \t]*/)?.[0] || "";
}

function isPythonFile(fileName?: string): boolean {
  const ext = fileName ? (fileName.split(".").pop() || "").toLowerCase() : "";
  return ext === "py" || ext === "pyw";
}

/**
 * Typing assists (auto-close, skip-over, smart indent, pair delete) plus
 * debounced diagnostics and cursor bracket matching for the manual editor.
 * Operates on the visible chunk; EditorView maps chunk offsets to full text.
 */
export function useEditorAssists(content: string, fileName?: string, chunkStartOffset = 0) {
  const [selection, setSelection] = useState<EditorSelection>({ start: 0, end: 0 });
  const [diagnostics, setDiagnostics] = useState<CodeDiagnostic[]>([]);
  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        setDiagnostics(analyzeCode(content, fileName));
      } catch (_) {
        setDiagnostics([]);
      }
    }, DIAGNOSTIC_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [content, fileName]);

  const match: BracketMatch = useMemo(() => {
    try {
      const cursorFull = chunkStartOffset + selection.start;
      if (selection.start !== selection.end) return { kind: "none" };
      return findMatchingBracket(content, cursorFull, fileName);
    } catch (_) {
      return { kind: "none" };
    }
  }, [content, fileName, selection, chunkStartOffset]);

  const matchStatus: string | null = useMemo(() => {
    if (match.kind === "pair") {
      const sameLine = match.openLine === match.closeLine;
      return sameLine
        ? `{ }  line ${match.openLine}`
        : `{ }  L${match.openLine} ↔ L${match.closeLine}`;
    }
    if (match.kind === "unmatched") return `Unmatched bracket · L${match.line}`;
    return null;
  }, [match]);

  const errorCount = useMemo(() => diagnostics.filter((d) => d.severity === "error").length, [diagnostics]);
  const warningCount = useMemo(() => diagnostics.filter((d) => d.severity === "warning").length, [diagnostics]);

  const errorLines = useMemo(() => {
    const map = new Map<number, CodeDiagnostic>();
    for (const d of diagnostics) {
      const prev = map.get(d.line);
      if (!prev || (prev.severity === "warning" && d.severity === "error")) map.set(d.line, d);
    }
    return map;
  }, [diagnostics]);

  const matchLines = useMemo(() => {
    const set = new Set<number>();
    if (match.kind === "pair") {
      set.add(match.openLine);
      set.add(match.closeLine);
    } else if (match.kind === "unmatched") {
      set.add(match.line);
    }
    return set;
  }, [match]);

  const assistEdit = (oldChunk: string, newChunk: string): AssistEditResult => {
    const d = diffStrings(oldChunk, newChunk);
    const sel = selectionRef.current;
    const collapsed = sel.start === sel.end;

    // Anchor the edit at the known cursor when it explains the diff. Pure
    // prefix/suffix diffing misplaces insertions next to identical chars
    // (e.g. typing ) between () looks like an append at the end).
    let at = d.at;
    if (collapsed) {
      const pos = Math.max(0, Math.min(sel.start, oldChunk.length));
      if (d.removed === "" && oldChunk.slice(0, pos) + d.inserted + oldChunk.slice(pos) === newChunk) {
        at = pos;
      } else if (d.inserted === "" && pos > 0 && oldChunk.slice(0, pos - 1) + oldChunk.slice(pos) === newChunk) {
        at = pos - 1;
      }
    }

    // Single-char insertion with collapsed cursor: auto-close / skip / indent.
    if (d.inserted.length === 1 && d.removed === "" && collapsed) {
      const typed = d.inserted;
      const cursor = at + 1;

      if (typed === "\n") {
        return handleEnter(oldChunk, at);
      }
      if (CLOSE_FOR[typed] && (typed === "(" || typed === "[" || typed === "{")) {
        const chunk = newChunk.slice(0, cursor) + CLOSE_FOR[typed] + newChunk.slice(cursor);
        return { chunk, cursor };
      }
      if (typed === '"' || typed === "'" || typed === "`") {
        // Skip over an identical closing quote instead of doubling it.
        if (newChunk[cursor] === typed) {
          const chunk = newChunk.slice(0, at) + newChunk.slice(cursor);
          return { chunk, cursor: at + 1 };
        }
        const chunk = newChunk.slice(0, cursor) + typed + newChunk.slice(cursor);
        return { chunk, cursor };
      }
      if (typed === ")" || typed === "]" || typed === "}") {
        if (newChunk[cursor] === typed) {
          // Skip over the auto-inserted closer.
          const chunk = newChunk.slice(0, at) + newChunk.slice(cursor);
          return { chunk, cursor };
        }
      }
      return { chunk: newChunk, cursor };
    }

    // Single-char backspace: delete an auto-inserted pair together.
    if (d.removed.length === 1 && d.inserted === "") {
      const gone = d.removed;
      const pair = CLOSE_FOR[gone];
      if (pair && newChunk[at] === pair && (gone === "(" || gone === "[" || gone === "{" || gone === '"' || gone === "'" || gone === "`")) {
        const chunk = newChunk.slice(0, at) + newChunk.slice(at + 1);
        return { chunk, cursor: at };
      }
      return { chunk: newChunk, cursor: at };
    }

    return { chunk: newChunk, cursor: at + d.inserted.length };
  };

  const handleEnter = (oldChunk: string, at: number): AssistEditResult => {
    const lineStart = oldChunk.lastIndexOf("\n", at - 1) + 1;
    const lineSoFar = oldChunk.slice(lineStart, at);
    const base = indentOfLine(lineSoFar);
    const trimmed = lineSoFar.trimEnd();
    const lastCh = trimmed.slice(-1);
    const opener = lastCh === "{" || lastCh === "(" || lastCh === "[";
    const pyColon = isPythonFile(fileName) && trimmed.endsWith(":");
    const extra = opener || pyColon ? "  " : "";
    const after = oldChunk.slice(at);
    const afterTrimmed = after.trimStart();

    // VSCode-style: |}  →  {\n  |\n}
    if (opener && (afterTrimmed.startsWith("}") || afterTrimmed.startsWith("]") || afterTrimmed.startsWith(")"))) {
      const chunk =
        oldChunk.slice(0, at) + "\n" + base + extra + "\n" + base + oldChunk.slice(at).replace(/^[ \t]*/, "");
      return { chunk, cursor: at + 1 + base.length + extra.length };
    }
    const chunk = oldChunk.slice(0, at) + "\n" + base + extra + oldChunk.slice(at);
    return { chunk, cursor: at + 1 + base.length + extra.length };
  };

  return {
    selection,
    setSelection,
    diagnostics,
    errorLines,
    matchLines,
    match,
    matchStatus,
    errorCount,
    warningCount,
    assistEdit,
  };
}
