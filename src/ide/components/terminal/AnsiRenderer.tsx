import React, { memo } from "react";
import { Text, TextStyle, StyleSheet } from "react-native";
import { TerminalTheme, TERMINAL_THEMES } from "./terminalThemes";

interface AnsiRendererProps {
  rawText: string;
  isFocused?: boolean;
  fontSize?: number;
  theme?: TerminalTheme;
}

interface TextSpan {
  text: string;
  style: TextStyle;
}

const ANSI_COLORS: Record<number, string> = {
  30: "#484f58", // black
  31: "#ff7b72", // red
  32: "#7ee787", // green
  33: "#d29922", // yellow
  34: "#79c0ff", // blue
  35: "#d2a8ff", // magenta
  36: "#56d4dd", // cyan
  37: "#f0f6fc", // white
  90: "#8b949e", // bright black (gray)
  91: "#ffa198", // bright red
  92: "#56d364", // bright green
  93: "#e3b341", // bright yellow
  94: "#a5d6ff", // bright blue
  95: "#e2c5ff", // bright magenta
  96: "#79e6ec", // bright cyan
  97: "#ffffff", // bright white
};

const ANSI_BG_COLORS: Record<number, string> = {
  40: "#0d1117",
  41: "#b62324",
  42: "#238636",
  43: "#9e6a03",
  44: "#1f6feb",
  45: "#8957e5",
  46: "#1b7c83",
  47: "#f0f6fc",
  100: "#30363d",
  101: "#da3633",
  102: "#2ea043",
  103: "#bb8009",
  104: "#388bfd",
  105: "#a371f7",
  106: "#3192aa",
  107: "#ffffff",
};

/**
 * Parses raw terminal text with ANSI escape codes into React Native TextSpans
 */
function parseAnsiToSpans(raw: string, defaultColor: string): TextSpan[] {
  if (!raw) return [];

  // Strip non-color control sequences and tty warning messages
  const cleaned = raw
    .replace(/\/bin\/sh:\s*can't access tty;\s*job control turned off\r?\n?/g, "")
    .replace(/\x1b\[\?2004[hl]/g, "")
    .replace(/\x1b\[\?[0-9]+[hl]/g, "")
    .replace(/\x1b\[[0-9]*[A-Za-z]/g, (match) => {
      return match.endsWith("m") ? match : "";
    })
    .replace(/\x1b[=>]/g, "");

  const spans: TextSpan[] = [];
  const regex = /\x1b\[([0-9;]*)m/g;
  let lastIndex = 0;
  let currentStyle: TextStyle = { color: defaultColor };
  let match: RegExpExecArray | null;

  while ((match = regex.exec(cleaned)) !== null) {
    const textChunk = cleaned.slice(lastIndex, match.index);
    if (textChunk.length > 0) {
      spans.push({ text: textChunk, style: { ...currentStyle } });
    }

    const codeStr = match[1] || "0";
    const codes = codeStr.split(";").map((c) => parseInt(c, 10) || 0);

    for (let i = 0; i < codes.length; i++) {
      const code = codes[i];
      if (code === 0) {
        currentStyle = { color: defaultColor };
      } else if (code === 1) {
        currentStyle = { ...currentStyle, fontWeight: "bold" };
      } else if (code === 2) {
        currentStyle = { ...currentStyle, opacity: 0.7 };
      } else if (code === 4) {
        currentStyle = { ...currentStyle, textDecorationLine: "underline" };
      } else if (code === 22) {
        currentStyle = { ...currentStyle, fontWeight: "normal", opacity: 1 };
      } else if (code === 24) {
        currentStyle = { ...currentStyle, textDecorationLine: "none" };
      } else if (ANSI_COLORS[code]) {
        currentStyle = { ...currentStyle, color: ANSI_COLORS[code] };
      } else if (ANSI_BG_COLORS[code]) {
        currentStyle = { ...currentStyle, backgroundColor: ANSI_BG_COLORS[code] };
      } else if (code === 38 && codes[i + 1] === 5 && codes[i + 2] !== undefined) {
        const colorIdx = codes[i + 2];
        if (ANSI_COLORS[30 + (colorIdx % 8)]) {
          currentStyle = { ...currentStyle, color: ANSI_COLORS[30 + (colorIdx % 8)] };
        }
        i += 2;
      } else if (code === 48 && codes[i + 1] === 5 && codes[i + 2] !== undefined) {
        const bgIdx = codes[i + 2];
        if (ANSI_BG_COLORS[40 + (bgIdx % 8)]) {
          currentStyle = { ...currentStyle, backgroundColor: ANSI_BG_COLORS[40 + (bgIdx % 8)] };
        }
        i += 2;
      } else if (code === 39) {
        currentStyle = { ...currentStyle, color: defaultColor };
      } else if (code === 49) {
        currentStyle = { ...currentStyle, backgroundColor: undefined };
      }
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < cleaned.length) {
    spans.push({ text: cleaned.slice(lastIndex), style: { ...currentStyle } });
  }

  return spans;
}

export const AnsiRenderer = memo(function AnsiRenderer({
  rawText,
  isFocused = true,
  fontSize = 12.5,
  theme = TERMINAL_THEMES.alpine,
}: AnsiRendererProps) {
  const displayText = rawText || "\u001b[1;32mastra\u001b[0m:\u001b[1;34m/workspace\u001b[0m# ";
  const spans = parseAnsiToSpans(displayText, theme.foreground);
  const dynamicFontSize = {
    fontSize,
    lineHeight: Math.round(fontSize * 1.45),
  };

  return (
    <Text style={[styles.baseText, dynamicFontSize, { color: theme.foreground }]}>
      {spans.map((span, index) => (
        <Text key={index} style={[styles.baseText, dynamicFontSize, span.style]}>
          {span.text}
        </Text>
      ))}
      {isFocused && (
        <Text style={[styles.cursor, dynamicFontSize, { color: theme.cursor }]}>
          █
        </Text>
      )}
    </Text>
  );
});

const styles = StyleSheet.create({
  baseText: {
    fontFamily: "monospace",
  },
  cursor: {
    fontFamily: "monospace",
  },
});

