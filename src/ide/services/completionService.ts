import { ExtensionSnippet } from "./extensions/types";

export interface CompletionItem {

  label: string;
  kind: "function" | "variable" | "class" | "type" | "keyword" | "module" | "snippet";
  insertText: string;
  detail?: string;
  isSnippet?: boolean;
}

export interface CompletionResult {
  prefix: string;
  items: CompletionItem[];
}

const JS_TS_KEYWORDS = [
  "const", "let", "var", "function", "return", "if", "else",
  "for", "while", "import", "from", "export", "default", "class",
  "extends", "interface", "type", "async", "await", "try",
  "catch", "finally", "throw", "new", "this", "typeof",
  "switch", "case", "break", "continue",
];

const PYTHON_KEYWORDS = [
  "def", "return", "if", "elif", "else", "for", "while", "in",
  "import", "from", "as", "class", "try", "except", "finally",
  "raise", "with", "lambda", "yield", "pass", "break", "continue",
  "global", "async", "await", "True", "False", "None",
];

function getFileLanguage(fileName?: string): "typescript" | "javascript" | "python" | "other" {
  if (!fileName) return "typescript";
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (ext === "ts" || ext === "tsx") return "typescript";
  if (ext === "js" || ext === "jsx" || ext === "mjs") return "javascript";
  if (ext === "py" || ext === "pyw") return "python";
  return "other";
}

/**
 * Harvest local identifier tokens declared or used in the active code buffer.
 */
function harvestLocalSymbols(text: string, currentWord: string): string[] {
  const matches = text.match(/[a-zA-Z_$][a-zA-Z0-9_$]{2,}/g) || [];
  const set = new Set<string>();
  const currLower = currentWord.toLowerCase();

  for (const m of matches) {
    if (m === currentWord) continue;
    if (m.length > 32) continue;
    if (m.toLowerCase().startsWith(currLower)) {
      set.add(m);
      if (set.size >= 30) break;
    }
  }

  return Array.from(set);
}

/**
 * Query intelligent completions for the given cursor position.
 */
export function getCompletions(
  code: string,
  cursorOffset: number,
  fileName?: string,
  _activePackIds?: string[],
  extensionSnippets: ExtensionSnippet[] = []
): CompletionResult {
  if (!code || cursorOffset < 0 || cursorOffset > code.length) {
    return { prefix: "", items: [] };
  }

  const beforeCursor = code.slice(0, cursorOffset);
  const wordMatch = beforeCursor.match(/[a-zA-Z0-9_$]+$/);
  const prefix = wordMatch ? wordMatch[0] : "";

  // Require at least 1 character typed
  if (!prefix || prefix.length < 1) {
    return { prefix: "", items: [] };
  }

  const lang = getFileLanguage(fileName);
  const pLower = prefix.toLowerCase();

  const candidates: Array<{ item: CompletionItem; score: number }> = [];
  const seenLabels = new Set<string>();

  // 1. Real extension snippets from installed VS Code extensions (highest priority)
  for (const snip of extensionSnippets) {
    const sLower = snip.prefix.toLowerCase();
    if (sLower.startsWith(pLower)) {
      if (seenLabels.has(snip.prefix)) continue;
      seenLabels.add(snip.prefix);
      const rawBody = Array.isArray(snip.body) ? snip.body.join("\n") : snip.body;
      const cleanBody = rawBody.replace(/\$\{\d+:([^}]+)\}/g, "$1").replace(/\$\d+/g, "");
      const score = (snip.prefix.startsWith(prefix) ? 120 : 90) + (snip.prefix.length === prefix.length ? 50 : 0);
      candidates.push({
        item: {
          label: snip.prefix,
          kind: "snippet",
          insertText: cleanBody,
          detail: snip.description || "Snippet",
          isSnippet: true,
        },
        score,
      });
    }
  }

  // 2. Local harvested symbols from current buffer
  const localSymbols = harvestLocalSymbols(code, prefix);

  for (const sym of localSymbols) {
    if (seenLabels.has(sym)) continue;
    seenLabels.add(sym);
    const score = (sym.startsWith(prefix) ? 60 : 40);
    candidates.push({
      item: {
        label: sym,
        kind: "variable",
        insertText: sym,
        detail: "local",
      },
      score,
    });
  }

  // 3. Check language keywords
  const keywords = lang === "python" ? PYTHON_KEYWORDS : JS_TS_KEYWORDS;
  for (const kw of keywords) {
    const kLower = kw.toLowerCase();
    if (kLower.startsWith(pLower)) {
      if (seenLabels.has(kw)) continue;
      seenLabels.add(kw);
      const score = (kw.startsWith(prefix) ? 30 : 20);
      candidates.push({
        item: {
          label: kw,
          kind: "keyword",
          insertText: kw,
          detail: "keyword",
        },
        score,
      });
    }
  }

  // Sort by score descending, then by length ascending
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.item.label.length - b.item.label.length;
  });

  return {
    prefix,
    items: candidates.slice(0, 15).map((c) => c.item),
  };
}
