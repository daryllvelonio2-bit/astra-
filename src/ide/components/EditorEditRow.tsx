import React, { useMemo, useRef } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet, Platform, NativeSyntheticEvent, NativeScrollEvent, LayoutChangeEvent } from "react-native";
import { CodeToken, getTokenColors } from "../services/syntaxTokenizer";
import { detectIndentStep, computeLineGuides } from "./editor/indentGuideUtils";

interface EditorEditRowProps {
  tokenizedLines: { lineNumber: number; tokens: CodeToken[]; indentWidth?: number }[];
  chunkText: string;
  gutterWidth: number;
  editGutterColor: (lineNum: number) => string;
  textInputRef: React.RefObject<TextInput | null>;
  theme: any;
  onEditChange: (newText: string) => void;
  selection: { start: number; end: number };
  onSelectionChange: (sel: { start: number; end: number }) => void;
  onBlur?: () => void;
  isEditing?: boolean;
  keyboardMouseMode?: boolean;
  cursorLine?: number;
  showIndentGuides?: boolean;
  tabSize?: number;
}

const LINE_HEIGHT = 20;
const FONT_SIZE = 13;
const GUTTER_FONT_SIZE = 11;
const FONT_FAMILY = Platform.OS === "ios" ? "Menlo" : "monospace";
// Monospace advance at 13px is ~7.8px; deliberately overestimated so the
// input is always at least as wide as its longest line -> never soft-wraps.
const CHAR_WIDTH = 8.5;
// Cap: absurdly long single lines fall back to wrap rather than GPU crash.
const MAX_NOWRAP_CHARS = 1800;

/**
 * Dual-Layer Editor Row for EditorView:
 * 1. Pinned gutter on the left with line numbers and error indicators.
 * 2. Syntax Highlight Layer: Renders tokens in full color via native Text
 *    components (bypassing Android ReactEditText child styling limitations).
 * 3. Transparent TextInput Overlay (in Edit Mode): Handles keyboard input,
 *    cursor positioning, and selection without overriding token colors.
 */
export const EditorEditRow = React.memo(function EditorEditRow({
  tokenizedLines,
  chunkText,
  gutterWidth,
  editGutterColor,
  textInputRef,
  theme,
  onEditChange,
  selection,
  onSelectionChange,
  onBlur,
  isEditing = true,
  keyboardMouseMode = false,
  cursorLine,
  showIndentGuides = true,
  tabSize = 2,
}: EditorEditRowProps) {
  const tokenPalette = useMemo(() => getTokenColors(theme), [theme]);

  const indentStep = useMemo(
    () => detectIndentStep(tokenizedLines, tabSize),
    [tokenizedLines, tabSize]
  );

  const lineGuides = useMemo(
    () => computeLineGuides(tokenizedLines, showIndentGuides, indentStep),
    [tokenizedLines, showIndentGuides, indentStep]
  );

  const guideColor =
    theme.editorIndentGuide ||
    (theme.isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.09)");

  const renderToken = (token: CodeToken, tIdx: number) => {
    const tokenColor =
      token.type === "comment"
        ? tokenPalette.comment || theme.textMuted
        : tokenPalette[token.type] || tokenPalette.plain || theme.textPrimary;
    return (
      <Text
        key={`tok-${tIdx}`}
        style={[
          styles.tokenText,
          { color: tokenColor },
          token.type === "comment" && styles.commentText,
        ]}
      >
        {token.text}
      </Text>
    );
  };

  // Width fits the longest line so native never wraps a tail
  const contentWidth = useMemo(() => {
    let max = 0;
    for (const line of tokenizedLines) {
      let n = 0;
      for (const t of line.tokens) n += t.text.length;
      if (n > max) max = n;
    }
    return Math.ceil(Math.min(max, MAX_NOWRAP_CHARS) * CHAR_WIDTH) + 6 + 24 + 20;
  }, [tokenizedLines]);

  const hScrollRef = useRef<ScrollView | null>(null);
  const hViewWRef = useRef(0);
  const hScrollXRef = useRef(0);

  // Keep the cursor horizontally visible while typing long lines.
  const followCursorX = (offset: number) => {
    const vw = hViewWRef.current;
    if (!vw) return;
    const upto = chunkText.slice(0, Math.max(0, Math.min(offset, chunkText.length)));
    const col = upto.length - (upto.lastIndexOf("\n") + 1);
    const x = col * CHAR_WIDTH + 6;
    const sx = hScrollXRef.current;
    if (x < sx + 4) {
      hScrollRef.current?.scrollTo({ x: Math.max(0, x - 40), animated: false });
    } else if (x > sx + vw - 60) {
      hScrollRef.current?.scrollTo({ x: x - vw + 80, animated: false });
    }
  };

  const handleSelChange = (sel: { start: number; end: number }) => {
    followCursorX(sel.start);
    onSelectionChange(sel);
  };

  const handleHLayout = (e: LayoutChangeEvent) => {
    hViewWRef.current = e.nativeEvent.layout.width;
  };

  const handleHScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    hScrollXRef.current = e.nativeEvent.contentOffset.x;
  };

  return (
    <View style={[styles.editorRow, { backgroundColor: theme.bgPrimary }]}>
      {/* Pinned Gutter on the left */}
      <View
        style={[
          styles.gutterContainer,
          { width: gutterWidth, backgroundColor: theme.bgSecondary, borderRightColor: theme.border },
        ]}
      >
        {tokenizedLines.map((line) => {
          const color = editGutterColor(line.lineNumber);
          const isError = color === theme.accentRed;
          return (
            <View key={`g-${line.lineNumber}`} style={styles.gutterLineBox}>
              <Text
                style={[
                  styles.gutterText,
                  { color },
                  isError && styles.gutterTextBold,
                ]}
                numberOfLines={1}
              >
                {isError && line.lineNumber < 1000 ? `●${line.lineNumber}` : line.lineNumber}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Horizontally scrollable code area */}
      <ScrollView
        horizontal
        ref={hScrollRef}
        showsHorizontalScrollIndicator={true}
        style={styles.horizontalScroll}
        contentContainerStyle={styles.editHorizontalContent}
        onLayout={handleHLayout}
        onScroll={handleHScroll}
        scrollEventThrottle={16}
      >
        <View style={[styles.codeContainer, { width: contentWidth }]}>
          {/* Indent Guide Background Underlay (renders consistently in View Mode and Edit Mode without blocking touches) */}
          {showIndentGuides && (
            <View style={[StyleSheet.absoluteFill, styles.guideUnderlay]} pointerEvents="none">
              {tokenizedLines.map((line, idx) => {
                const guides = lineGuides[idx];
                if (!guides || guides.length === 0) {
                  return <View key={`g-${line.lineNumber}`} style={styles.guideLineBox} />;
                }
                return (
                  <View key={`g-${line.lineNumber}`} style={styles.guideLineBox}>
                    {guides.map((gLeft) => (
                      <View
                        key={`gl-${gLeft}`}
                        style={[styles.indentGuide, { left: gLeft, backgroundColor: guideColor }]}
                      />
                    ))}
                  </View>
                );
              })}
            </View>
          )}

          {!isEditing ? (
            /* View Mode: Vibrant Syntax Highlighted Code (rendered with full native Text colors) */
            <View style={styles.syntaxLayer}>
              {tokenizedLines.map((line) => (
                <View key={`line-${line.lineNumber}`} style={styles.codeLineBox}>
                  <Text style={styles.codeLineText} numberOfLines={1}>
                    {line.tokens.length === 0 ? " " : line.tokens.map(renderToken)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            /* Edit Mode: Single-layer TextInput with native colored token children (zero ghosting, zero double text) */
            <TextInput
              ref={textInputRef}
              style={[
                styles.editorInput,
                {
                  width: contentWidth,
                },
              ]}
              multiline
              scrollEnabled={false}
              editable={true}
              showSoftInputOnFocus={!keyboardMouseMode}
              onChangeText={onEditChange}
              selection={selection}
              onSelectionChange={(e) => handleSelChange(e.nativeEvent.selection)}
              autoCapitalize="none"
              autoCorrect={false}
              textAlignVertical="top"
              onBlur={onBlur}
              cursorColor={theme.accent}
              selectionColor={Platform.OS === "android" ? `${theme.accent}45` : undefined}
            >
              <Text key="editor-tokens">
                {tokenizedLines.map((line, lIdx) => (
                  <Text key={`line-${line.lineNumber}`}>
                    {line.tokens.length === 0 ? null : line.tokens.map(renderToken)}
                    {lIdx < tokenizedLines.length - 1 ? "\n" : ""}
                  </Text>
                ))}
              </Text>
            </TextInput>
          )}
        </View>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  editorRow: {
    flexDirection: "row",
    minHeight: "100%",
  },
  gutterContainer: {
    borderRightWidth: 1,
    paddingTop: 8,
    paddingBottom: 8,
    paddingRight: 2,
    alignItems: "center",
  },
  gutterLineBox: {
    height: LINE_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  gutterText: {
    fontFamily: FONT_FAMILY,
    fontSize: GUTTER_FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    textAlign: "center",
    includeFontPadding: false,
  },
  gutterTextBold: {
    fontWeight: "700",
  },
  horizontalScroll: {
    flex: 1,
  },
  editHorizontalContent: {
    minWidth: "100%",
  },
  codeContainer: {
    position: "relative",
  },
  syntaxLayer: {
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 6,
    paddingRight: 24,
  },
  codeLineBox: {
    height: LINE_HEIGHT,
    justifyContent: "center",
    position: "relative",
  },
  guideUnderlay: {
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 6,
    paddingRight: 24,
  },
  guideLineBox: {
    height: LINE_HEIGHT,
    position: "relative",
  },
  indentGuide: {
    position: "absolute",
    width: 1,
    top: 0,
    bottom: 0,
  },
  codeLineText: {
    fontFamily: FONT_FAMILY,
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    includeFontPadding: false,
  },
  tokenText: {
    fontFamily: FONT_FAMILY,
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    includeFontPadding: false,
  },
  commentText: {
    fontStyle: "italic",
  },
  editorInput: {
    fontFamily: FONT_FAMILY,
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 6,
    paddingRight: 24,
    minWidth: "100%",
    margin: 0,
    borderWidth: 0,
    textAlignVertical: "top",
    includeFontPadding: false,
  },
});
