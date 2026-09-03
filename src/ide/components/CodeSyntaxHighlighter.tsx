import React from "react";
import { View, Text, StyleSheet, Platform, ScrollView } from "react-native";
import { TokenizedLine, CodeToken, TOKEN_COLORS } from "../services/syntaxTokenizer";
import { useTheme } from "../../theme/themeContext";

interface CodeSyntaxHighlighterProps {
  tokenizedLines: TokenizedLine[];
  fontSize?: number;
  lineHeight?: number;
  gutterWidth?: number;
  theme?: any;
}

const FONT_FAMILY = Platform.OS === "ios" ? "Menlo" : "monospace";

export function CodeSyntaxHighlighter({
  tokenizedLines,
  fontSize = 13,
  lineHeight = 20,
  gutterWidth = 24,
  theme: themeProp,
}: CodeSyntaxHighlighterProps) {
  const { theme: globalTheme } = useTheme();
  const theme = themeProp || globalTheme;

  return (
    <View style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
      {/* Pinned Gutter with line numbers */}
      <View style={[styles.gutter, { width: gutterWidth, backgroundColor: theme.bgSecondary, borderRightColor: theme.border }]}>
        {tokenizedLines.map((line) => (
          <View key={`num-${line.lineNumber}`} style={[styles.lineBox, { height: lineHeight }]}>
            <Text style={[styles.gutterNum, { fontSize: fontSize - 2, lineHeight, color: theme.textMuted }]}>
              {line.lineNumber}
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
            <View key={`line-${line.lineNumber}`} style={[styles.lineBox, { height: lineHeight }]}>
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
                  const isPlainOp = token.type === "plain" || token.type === "operator";
                  const tokenColor = token.type === "comment"
                    ? theme.textMuted
                    : isPlainOp
                    ? (theme.isDark ? TOKEN_COLORS[token.type] : theme.textPrimary)
                    : (TOKEN_COLORS[token.type] || (theme.isDark ? TOKEN_COLORS.plain : theme.textPrimary));
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
