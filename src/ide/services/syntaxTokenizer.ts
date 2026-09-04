export type TokenType =
  | "keyword"
  | "string"
  | "comment"
  | "function"
  | "jsx_tag"
  | "number"
  | "property"
  | "operator"
  | "boolean"
  | "plain";

export interface CodeToken {
  text: string;
  type: TokenType;
}

export interface TokenizedLine {
  lineNumber: number;
  tokens: CodeToken[];
  indentWidth: number;
}

export const TOKEN_COLORS_DARK: Record<TokenType, string> = {
  keyword: "#c678dd",   // Vibrant Purple
  string: "#98c379",    // Mint Green
  comment: "#5c6370",   // Slate Italic
  function: "#61afef",  // Sky Blue
  jsx_tag: "#e06c75",   // Coral Red
  number: "#d19a66",    // Warm Orange
  property: "#e5c07b",  // Golden Sand
  boolean: "#d19a66",   // Warm Orange
  operator: "#abb2bf",  // Silver
  plain: "#abb2bf",     // Default Text
};

// Light-mode palette tuned for readability on near-white backgrounds.
// Keeps the same hues, darkened for WCAG-friendly contrast.
export const TOKEN_COLORS_LIGHT: Record<TokenType, string> = {
  keyword: "#7c3aed",   // Deep Purple
  string: "#15803d",    // Forest Green
  comment: "#94a3b8",   // Slate
  function: "#1d4ed8",  // Royal Blue
  jsx_tag: "#be123c",   // Crimson
  number: "#b45309",    // Burnt Orange
  property: "#92400e",  // Saddle Brown
  boolean: "#b45309",   // Burnt Orange
  operator: "#475569",  // Slate Gray
  plain: "#0f172a",     // Near-black
};

/** @deprecated Use getTokenColors(isDark) for theme-aware highlighting. */
export const TOKEN_COLORS: Record<TokenType, string> = TOKEN_COLORS_DARK;

export function getTokenColors(isDark: boolean): Record<TokenType, string> {
  return isDark ? TOKEN_COLORS_DARK : TOKEN_COLORS_LIGHT;
}

const JS_KEYWORDS = new Set([
  "const", "let", "var", "function", "return", "import", "export", "default",
  "from", "if", "else", "for", "while", "do", "switch", "case", "break",
  "continue", "async", "await", "try", "catch", "finally", "throw", "new",
  "class", "extends", "super", "this", "typeof", "instanceof", "in", "of",
  "interface", "type", "enum", "namespace", "as", "is", "implements"
]);

const BOOLEANS_AND_SPECIAL = new Set([
  "true", "false", "null", "undefined", "NaN", "Infinity"
]);

const MAX_TOKENIZE_LINES = 800;
// Long minified lines explode into tens of thousands of <Text> nodes and can
// stall slower regex engines — render them as a single plain token instead.
const MAX_TOKENIZE_LINE_CHARS = 1500;
const MAX_TOKENS_PER_LINE = 250;

export function tokenizeCode(
  code: string,
  fileName?: string,
  startLineNumber = 1
): TokenizedLine[] {
  if (!code) return [{ lineNumber: startLineNumber, tokens: [{ text: "", type: "plain" }], indentWidth: 0 }];

  const rawLines = code.split("\n");
  const totalLines = rawLines.length;
  const processCount = Math.min(totalLines, MAX_TOKENIZE_LINES);
  const result: TokenizedLine[] = [];

  let inMultiComment = false;

  for (let i = 0; i < processCount; i++) {
    const rawLine = rawLines[i];
    const lineNumber = startLineNumber + i;

    // Detect indentation
    const indentMatch = rawLine.match(/^(\s+)/);
    const indentWidth = indentMatch ? indentMatch[1].length : 0;

    // Long-line guard: skip regex tokenizing, keep the line as one plain token.
    if (rawLine.length > MAX_TOKENIZE_LINE_CHARS) {
      result.push({ lineNumber, tokens: [{ text: rawLine, type: "plain" }], indentWidth });
      continue;
    }

    if (inMultiComment) {
      const endIdx = rawLine.indexOf("*/");
      if (endIdx !== -1) {
        inMultiComment = false;
        result.push({
          lineNumber,
          tokens: [
            { text: rawLine.slice(0, endIdx + 2), type: "comment" },
            ...tokenizeLineFragment(rawLine.slice(endIdx + 2)),
          ],
          indentWidth,
        });
      } else {
        result.push({
          lineNumber,
          tokens: [{ text: rawLine, type: "comment" }],
          indentWidth,
        });
      }
      continue;
    }

    if (rawLine.trim().startsWith("/*")) {
      const endIdx = rawLine.indexOf("*/");
      if (endIdx === -1) {
        inMultiComment = true;
        result.push({
          lineNumber,
          tokens: [{ text: rawLine, type: "comment" }],
          indentWidth,
        });
        continue;
      }
    }

    result.push({
      lineNumber,
      tokens: tokenizeLineFragment(rawLine),
      indentWidth,
    });
  }

  // Efficient fast plain rendering for lines beyond threshold to prevent freezes
  for (let i = processCount; i < totalLines; i++) {
    const rawLine = rawLines[i];
    const indentMatch = rawLine.match(/^(\s+)/);
    result.push({
      lineNumber: startLineNumber + i,
      tokens: [{ text: rawLine, type: "plain" }],
      indentWidth: indentMatch ? indentMatch[1].length : 0,
    });
  }

  return result;
}

function tokenizeLineFragment(line: string): CodeToken[] {
  if (!line) return [{ text: "", type: "plain" }];

  const tokens: CodeToken[] = [];
  // Tokenizer regex matching strings, comments, JSX tags, function calls, words, numbers, and symbols
  const regex = /(\/\/[^\n]*)|(`(?:\\`|[^`])*`|"(?:\\"|[^"])*"|'(?:\\'|[^'])*')|(<\/?[a-zA-Z0-9_\.\-]+>?)|\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*\()|\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*:)|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_$][a-zA-Z0-9_$]*\b)|([=+\-*/%&|^!<>?:;,~]+)|(\s+|[^\s\w]+)/g;

  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = regex.exec(line)) !== null) {
    // Token-count guard: collapse the unread remainder into one plain token
    // so pathological lines can't create thousands of views.
    if (tokens.length >= MAX_TOKENS_PER_LINE) {
      tokens.push({ text: line.slice(lastIndex), type: "plain" });
      lastIndex = line.length;
      break;
    }
    if (match.index > lastIndex) {
      tokens.push({ text: line.slice(lastIndex, match.index), type: "plain" });
    }

    const [
      full,
      comment,
      str,
      jsxTag,
      funcCall,
      propKey,
      num,
      word,
      operator,
    ] = match;

    if (comment) {
      tokens.push({ text: comment, type: "comment" });
    } else if (str) {
      tokens.push({ text: str, type: "string" });
    } else if (jsxTag) {
      tokens.push({ text: jsxTag, type: "jsx_tag" });
    } else if (funcCall) {
      if (JS_KEYWORDS.has(funcCall)) {
        tokens.push({ text: funcCall, type: "keyword" });
      } else {
        tokens.push({ text: funcCall, type: "function" });
      }
    } else if (propKey) {
      tokens.push({ text: propKey, type: "property" });
    } else if (num) {
      tokens.push({ text: num, type: "number" });
    } else if (word) {
      if (JS_KEYWORDS.has(word)) {
        tokens.push({ text: word, type: "keyword" });
      } else if (BOOLEANS_AND_SPECIAL.has(word)) {
        tokens.push({ text: word, type: "boolean" });
      } else if (/^[A-Z][a-zA-Z0-9_$]*$/.test(word)) {
        tokens.push({ text: word, type: "jsx_tag" }); // Component / Type name
      } else {
        tokens.push({ text: word, type: "plain" });
      }
    } else if (operator) {
      tokens.push({ text: operator, type: "operator" });
    } else {
      tokens.push({ text: full, type: "plain" });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < line.length) {
    tokens.push({ text: line.slice(lastIndex), type: "plain" });
  }

  return tokens;
}
