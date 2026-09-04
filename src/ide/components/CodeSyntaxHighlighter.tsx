import React from "react";
import { View, Text, StyleSheet, Platform, ScrollView } from "react-native";
import { TokenizedLine, CodeToken, getTokenColors } from "../services/syntaxTokenizer";
import { CodeDiagnostic } from "../services/codeDiagnosticsService";
import { useTheme } from "../../theme/themeContext";

interface CodeSyntaxHighlighterProps {
  tokenizedLines: TokenizedLine[];
  fontSize?: number;
  lineHeight?: number;
  gutterWidth?: number;
  theme?: any;
  errorLines?: Map<number, CodeDiagnostic>;
  matchLines?: Set<number>;
  matchUnmatched?: boolean;
  activeLine?: number;
}

const FONT_FAMILY = Platform.OS === "ios" ? "Menlo" : "monospace";

export function CodeSyntaxHighlighter({
  tokenizedLines,
  fontSize = 13,
  lineHeight = 20,
  gutterWidth = 24,
  theme: themeProp,
  errorLines,
  matchLines,
  matchUnmatched = false,
  activeLine,
}: CodeSyntaxHighlighterProps) {
  const { theme: globalTheme } = useTheme();
  const theme = themeProp || globalTheme;
  const tokenPalette = getTokenColors(theme.isDark);

  const gutterColorFor = (lineNumber: number): string => {
    if (errorLines?.has(lineNumber)) return theme.accentRed;
    if (matchUnmatched && matchLines?.has(lineNumber)) return theme.accentRed;
    if (matchLines?.has(lineNumber)) return theme.accent;
    if (activeLine === lineNumber) return theme.textPrimary;
    return theme.textMuted;
  };

  const lineBgFor = (lineNumber: number): string | undefined => {
    if (errorLines?.has(lineNumber)) return `${theme.accentRed}14`;
    if (matchUnmatched && matchLines?.has(lineNumber)) return `${theme.accentRed}14`;
    if (matchLines?.has(lineNumber)) return `${theme.accent}10`;
    return undefined;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
      {/* Pinned Gutter with line numbers */}
      <View style={[styles.gutter, { width: gutterWidth, backgroundColor: theme.bgSecondary, borderRightColor: theme.border }]}>
        {tokenizedLines.map((line) => (
          <View key={`num-${line.lineNumber}`} style={[styles.lineBox, { height: lineHeight }]}>
            <Text style={[styles.gutterNum, { fontSize: fontSize - 2, lineHeight, color: gutterColorFor(line.lineNumber) }]}>
              {errorLines?.has(line.lineNumber) && line.lineNumber < 1000 ? `●${line.lineNumber}` : line.lineNumber}
            </Text>
          </View>
        ))}
      </View>

      {/* Code Text with Horizontal Scroll for Long Lines */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        style={styles.horizontalScroll}
        contentContainerStyle={styles.codeBodyContent}
      >
        <View style={[styles.codeBody, { backgroundColor: theme.bgPrimary }]}>
          {tokenizedLines.map((line) => (
            <View
              key={`line-${line.lineNumber}`}
              style={[styles.lineBox, { height: lineHeight }, lineBgFor(line.lineNumber) && { backgroundColor: lineBgFor(line.lineNumber) }]}
            >
              {/* Indent Guide Line */}
              {line.indentWidth >= 2 && (
                <View
                  style={[
                    styles.indentGuide,
                    { left: Math.min(line.indentWidth * 7.2, 120), height: lineHeight, backgroundColor: theme.border },
                  ]}
                />
              )}
              <Text style={[styles.codeLineText, { fontSize, lineHeight, color: theme.textPrimary }]}>
                {line.tokens.map((token: CodeToken, idx: number) => {
                  const tokenColor =
                    token.type === "comment"
                      ? theme.textMuted
                      : (tokenPalette[token.type] || tokenPalette.plain);
                  return (
                    <Text
                      key={idx}
                      style={[
                        styles.tokenText,
                        { color: tokenColor },
                        token.type === "comment" && { fontStyle: "italic", color: theme.textMuted },
                      ]}
                    >
                      {token.text}
                    </Text>
                  );
                })}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    minHeight: "100%",
    paddingVertical: 8,
  },
  gutter: {
    borderRightWidth: 1,
    alignItems: "center",
    paddingRight: 2,
  },
  horizontalScroll: {
    flex: 1,
  },
  codeBodyContent: {
    minWidth: "100%",
  },
  lineBox: {
    justifyContent: "center",
    position: "relative",
  },
  gutterNum: {
    fontFamily: FONT_FAMILY,
    textAlign: "center",
    includeFontPadding: false,
  },
  codeBody: {
    paddingLeft: 6,
    paddingRight: 24,
  },
  indentGuide: {
    position: "absolute",
    width: 1,
    top: 0,
    bottom: 0,
    zIndex: 1,
  },
  codeLineText: {
    fontFamily: FONT_FAMILY,
    includeFontPadding: false,
  },
  tokenText: {
    fontFamily: FONT_FAMILY,
    includeFontPadding: false,
  },
});
