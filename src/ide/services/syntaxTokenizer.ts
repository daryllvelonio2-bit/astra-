export interface LanguageGrammar {
  id: string;
  name: string;
  extensions: string[];
  keywords: Set<string>;
  types?: Set<string>;
  specialTokens?: Set<string>;
  lineComment: string;
}

const BUILTIN_GRAMMARS: LanguageGrammar[] = [
  {
    id: "rust",
    name: "Rust",
    extensions: ["rs"],
    lineComment: "//",
    keywords: new Set([
      "as", "async", "await", "break", "const", "continue", "crate", "dyn",
      "else", "enum", "extern", "false", "fn", "for", "if", "impl", "in",
      "let", "loop", "match", "mod", "move", "mut", "pub", "ref", "return",
      "self", "Self", "static", "struct", "super", "trait", "true", "type",
      "unsafe", "use", "where", "while",
    ]),
    types: new Set([
      "i8", "i16", "i32", "i64", "i128", "isize", "u8", "u16", "u32", "u64", "u128", "usize",
      "f32", "f64", "bool", "char", "str", "String", "Vec", "Option", "Result", "Some", "None", "Ok", "Err",
      "Box", "Rc", "Arc", "RefCell", "Mutex",
    ]),
  },
  {
    id: "go",
    name: "Go",
    extensions: ["go"],
    lineComment: "//",
    keywords: new Set([
      "break", "case", "chan", "const", "continue", "default", "defer", "else",
      "fallthrough", "for", "func", "go", "goto", "if", "import", "interface",
      "map", "package", "range", "return", "select", "struct", "switch", "type", "var",
    ]),
    types: new Set([
      "bool", "byte", "complex64", "complex128", "error", "float32", "float64",
      "int", "int8", "int16", "int32", "int64", "rune", "string", "uint", "uint8", "uint16", "uint32", "uint64", "uintptr",
    ]),
  },
  {
    id: "cpp",
    name: "C/C++",
    extensions: ["c", "cpp", "cc", "cxx", "h", "hpp"],
    lineComment: "//",
    keywords: new Set([
      "auto", "break", "case", "char", "const", "continue", "default", "do",
      "double", "else", "enum", "extern", "float", "for", "goto", "if", "int",
      "long", "register", "return", "short", "signed", "sizeof", "static",
      "struct", "switch", "typedef", "union", "unsigned", "void", "volatile", "while",
      "class", "public", "private", "protected", "namespace", "using", "template",
      "typename", "this", "new", "delete", "throw", "try", "catch", "virtual",
      "constexpr", "nullptr", "override",
    ]),
  },
  {
    id: "java",
    name: "Java & Kotlin",
    extensions: ["java", "kt", "kts"],
    lineComment: "//",
    keywords: new Set([
      "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char", "class",
      "const", "continue", "default", "do", "double", "else", "enum", "extends", "final",
      "finally", "float", "for", "goto", "if", "implements", "import", "instanceof", "int",
      "interface", "long", "native", "new", "package", "private", "protected", "public",
      "return", "short", "static", "strictfp", "super", "switch", "synchronized", "this",
      "throw", "throws", "transient", "try", "void", "volatile", "while",
      "fun", "val", "var", "when", "is", "in", "object", "companion",
    ]),
  },
  {
    id: "sql",
    name: "SQL",
    extensions: ["sql"],
    lineComment: "--",
    keywords: new Set([
      "select", "from", "where", "join", "left", "right", "inner", "outer",
      "on", "group", "by", "order", "having", "limit", "offset", "insert",
      "into", "values", "update", "set", "delete", "create", "table", "drop",
      "alter", "index", "primary", "key", "foreign", "not", "null", "and",
      "or", "in", "like", "as", "distinct", "union", "all", "case", "when", "then", "end",
    ]),
  },
  {
    id: "yaml",
    name: "YAML",
    extensions: ["yaml", "yml"],
    lineComment: "#",
    keywords: new Set(["true", "false", "yes", "no", "null", "on", "off"]),
  },
  {
    id: "python",
    name: "Python",
    extensions: ["py", "pyw"],
    lineComment: "#",
    keywords: new Set([
      "def", "return", "if", "elif", "else", "for", "while", "in",
      "import", "from", "as", "class", "try", "except", "finally",
      "raise", "with", "lambda", "yield", "pass", "break", "continue",
      "global", "nonlocal", "async", "await", "assert", "del", "is", "not",
    ]),
    types: new Set(["int", "str", "float", "bool", "list", "dict", "set", "tuple", "bytes"]),
  },
  {
    id: "html",
    name: "HTML & XML",
    extensions: ["html", "htm", "xml", "svg", "plist"],
    lineComment: "<!--",
    keywords: new Set([
      "html", "head", "body", "div", "span", "p", "a", "img", "script", "style",
      "meta", "link", "title", "button", "input", "form", "textarea", "select",
      "option", "table", "tr", "td", "th", "ul", "ol", "li", "h1", "h2", "h3",
      "h4", "h5", "h6", "section", "article", "nav", "header", "footer", "main",
      "class", "id", "src", "href", "type", "rel", "name", "value", "target",
    ]),
  },
  {
    id: "css",
    name: "CSS & SCSS",
    extensions: ["css", "scss", "less"],
    lineComment: "/*",
    keywords: new Set([
      "color", "background", "margin", "padding", "border", "font", "display",
      "position", "width", "height", "top", "bottom", "left", "right", "flex",
      "grid", "align", "justify", "transform", "transition", "animation", "opacity",
      "important", "media", "keyframes", "hover", "active", "focus", "before", "after",
    ]),
  },
  {
    id: "json",
    name: "JSON",
    extensions: ["json", "jsonc"],
    lineComment: "//",
    keywords: new Set(["true", "false", "null"]),
  },
  {
    id: "shell",
    name: "Shell & Bash",
    extensions: ["sh", "bash", "zsh"],
    lineComment: "#",
    keywords: new Set([
      "if", "then", "else", "elif", "fi", "case", "esac", "for", "while", "until",
      "do", "done", "in", "function", "select", "time", "export", "source", "alias",
      "echo", "read", "exit", "return", "local", "set", "unset", "cd", "pwd",
    ]),
  },
  {
    id: "markdown",
    name: "Markdown",
    extensions: ["md", "markdown"],
    lineComment: "<!--",
    keywords: new Set(["http", "https", "link", "image"]),
  },
  {
    id: "php",
    name: "PHP",
    extensions: ["php"],
    lineComment: "//",
    keywords: new Set([
      "php", "echo", "print", "function", "class", "public", "private", "protected",
      "static", "return", "if", "else", "elseif", "while", "for", "foreach", "as",
      "switch", "case", "break", "continue", "try", "catch", "finally", "throw",
      "new", "namespace", "use", "extends", "implements", "var", "const",
    ]),
  },
  {
    id: "dart",
    name: "Dart",
    extensions: ["dart"],
    lineComment: "//",
    keywords: new Set([
      "class", "enum", "extends", "implements", "mixin", "with", "abstract",
      "factory", "final", "const", "var", "void", "import", "export", "library",
      "part", "async", "await", "yield", "if", "else", "for", "while", "do",
      "switch", "case", "break", "continue", "return", "try", "catch", "finally",
      "throw", "new", "this", "super", "is", "as", "get", "set", "late", "required",
    ]),
  },
  {
    id: "csharp",
    name: "C#",
    extensions: ["cs"],
    lineComment: "//",
    keywords: new Set([
      "abstract", "as", "async", "await", "base", "bool", "break", "byte", "case",
      "catch", "char", "checked", "class", "const", "continue", "decimal", "default",
      "delegate", "do", "double", "else", "enum", "event", "explicit", "extern",
      "false", "finally", "fixed", "float", "for", "foreach", "goto", "if",
      "implicit", "in", "int", "interface", "internal", "is", "lock", "long",
      "namespace", "new", "null", "object", "operator", "out", "override", "params",
      "private", "protected", "public", "readonly", "ref", "return", "sbyte",
      "sealed", "short", "sizeof", "stackalloc", "static", "string", "struct",
      "switch", "this", "throw", "true", "try", "typeof", "uint", "ulong",
      "unchecked", "unsafe", "ushort", "using", "virtual", "void", "volatile", "while",
    ]),
  },
];

const EXT_TO_GRAMMAR = new Map<string, LanguageGrammar>();
for (const g of BUILTIN_GRAMMARS) {
  for (const ext of g.extensions) {
    EXT_TO_GRAMMAR.set(ext.toLowerCase(), g);
  }
}

export function registerExtensionGrammar(ext: string, grammar: LanguageGrammar) {
  EXT_TO_GRAMMAR.set(ext.toLowerCase().replace(/^\./, ""), grammar);
}

export function getGrammarForExtension(extOrFileName?: string): LanguageGrammar | null {
  if (!extOrFileName) return null;
  const ext = (extOrFileName.includes(".") ? extOrFileName.split(".").pop()! : extOrFileName).toLowerCase().trim();
  return EXT_TO_GRAMMAR.get(ext) || null;
}

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

export function getTokenColors(
  themeOrIsDark: boolean | { isDark?: boolean; tokenColors?: Partial<Record<TokenType, string>> }
): Record<TokenType, string> {
  const isDark = typeof themeOrIsDark === "boolean" ? themeOrIsDark : (themeOrIsDark?.isDark ?? true);
  const base = isDark ? { ...TOKEN_COLORS_DARK } : { ...TOKEN_COLORS_LIGHT };
  if (typeof themeOrIsDark === "object" && themeOrIsDark?.tokenColors) {
    return { ...base, ...themeOrIsDark.tokenColors };
  }
  return base;
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

// Pre-compiled regex patterns to eliminate re-instantiation on every line fragment
const TOKENIZER_REGEX_SLASH = /(\/\/[^\n]*)|(`(?:\\`|[^`])*`|"(?:\\"|[^"])*"|'(?:\\'|[^'])*')|(<\/?[a-zA-Z0-9_\.\-]+>?)|\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*\()|\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*:)|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_$][a-zA-Z0-9_$]*\b)|([=+\-*/%&|^!<>?:;,~]+)|(\s+|[^\s\w]+)/g;
const TOKENIZER_REGEX_DASH = /(--[^\n]*)|(`(?:\\`|[^`])*`|"(?:\\"|[^"])*"|'(?:\\'|[^'])*')|(<\/?[a-zA-Z0-9_\.\-]+>?)|\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*\()|\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*:)|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_$][a-zA-Z0-9_$]*\b)|([=+\-*/%&|^!<>?:;,~]+)|(\s+|[^\s\w]+)/g;
const TOKENIZER_REGEX_HASH = /(#[^\n]*)|(`(?:\\`|[^`])*`|"(?:\\"|[^"])*"|'(?:\\'|[^'])*')|(<\/?[a-zA-Z0-9_\.\-]+>?)|\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*\()|\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*:)|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_$][a-zA-Z0-9_$]*\b)|([=+\-*/%&|^!<>?:;,~]+)|(\s+|[^\s\w]+)/g;
const PASCAL_CASE_WORD_REGEX = /^[A-Z][a-zA-Z0-9_$]*$/;

export function tokenizeCode(
  code: string,
  fileName?: string,
  startLineNumber = 1
): TokenizedLine[] {
  if (!code) return [{ lineNumber: startLineNumber, tokens: [{ text: "", type: "plain" }], indentWidth: 0 }];

  const grammar = fileName ? getGrammarForExtension(fileName) : null;

  let activeRegex = TOKENIZER_REGEX_SLASH;
  if (grammar?.lineComment === "--") {
    activeRegex = TOKENIZER_REGEX_DASH;
  } else if (grammar?.lineComment === "#") {
    activeRegex = TOKENIZER_REGEX_HASH;
  }

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
            ...tokenizeLineFragment(rawLine.slice(endIdx + 2), grammar, activeRegex),
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
      tokens: tokenizeLineFragment(rawLine, grammar, activeRegex),
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

function tokenizeLineFragment(
  line: string,
  grammar?: LanguageGrammar | null,
  regex: RegExp = TOKENIZER_REGEX_SLASH
): CodeToken[] {
  if (!line) return [{ text: "", type: "plain" }];

  const tokens: CodeToken[] = [];
  regex.lastIndex = 0;

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
      if (grammar ? grammar.keywords.has(funcCall) : JS_KEYWORDS.has(funcCall)) {
        tokens.push({ text: funcCall, type: "keyword" });
      } else if (grammar?.types?.has(funcCall)) {
        tokens.push({ text: funcCall, type: "jsx_tag" });
      } else {
        tokens.push({ text: funcCall, type: "function" });
      }
    } else if (propKey) {
      tokens.push({ text: propKey, type: "property" });
    } else if (num) {
      tokens.push({ text: num, type: "number" });
    } else if (word) {
      const isKeyword = grammar ? grammar.keywords.has(word) : JS_KEYWORDS.has(word);
      const isType = grammar?.types?.has(word);
      const isSpecial = grammar?.specialTokens?.has(word);

      if (isKeyword) {
        tokens.push({ text: word, type: "keyword" });
      } else if (isType) {
        tokens.push({ text: word, type: "jsx_tag" }); // Types rendered in type/tag color
      } else if (isSpecial) {
        tokens.push({ text: word, type: "function" });
      } else if (BOOLEANS_AND_SPECIAL.has(word)) {
        tokens.push({ text: word, type: "boolean" });
      } else if (PASCAL_CASE_WORD_REGEX.test(word)) {
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
