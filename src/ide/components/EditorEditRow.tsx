import React, { useMemo, useRef } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet, Platform, NativeSyntheticEvent, NativeScrollEvent, LayoutChangeEvent } from "react-native";
import { CodeToken, getTokenColors } from "../services/syntaxTokenizer";

interface EditorEditRowProps {
  tokenizedLines: { lineNumber: number; tokens: CodeToken[] }[];
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
}

const LINE_HEIGHT = 20;
const FONT_SIZE = 13;
const GUTTER_FONT_SIZE = 11;
const FONT_FAMILY = Platform.OS === "ios" ? "Menlo" : "monospace";
// Monospace advance at 13px is ~7.8px; deliberately overestimated so the
// input is always at least as wide as its longest line -> never soft-wraps.
const CHAR_WIDTH = 8.5;
// Cap: absurdly long single lines (huge minified blobs) fall back to wrap
// rather than building a view wider than the GPU can rasterize.
const MAX_NOWRAP_CHARS = 1800;

/**
 * Edit Mode row for EditorView: pinned gutter with active cursor/error indicators,
 * horizontal ScrollView, and token-colored multiline TextInput.
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
}: EditorEditRowProps) {
  const tokenPalette = useMemo(() => getTokenColors(theme.isDark), [theme.isDark]);

  // One logical line = exactly one visual row (parity with view mode):
  // width fits the longest line so native never wraps a tail into a bogus
  // "lower block" that desyncs gutter + cursor.
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

  // Keep the cursor horizontally visible while typing long lines. Only
  // scrolls when the cursor is outside the current viewport, so it never
  // fights manual scrolling. Ref-only: no re-render, no loop.
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
        <Text style={[styles.gutterText, { color: theme.textMuted }]}>
          {tokenizedLines.map((line, lIdx) => (
            <Text key={`g-${line.lineNumber}`} style={{ color: editGutterColor(line.lineNumber) }}>
              {line.lineNumber}
              {lIdx < tokenizedLines.length - 1 ? "\n" : ""}
            </Text>
          ))}
        </Text>
      </View>

      {/* Horizontally scrollable TextInput in Edit Mode */}
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
        <TextInput
          ref={textInputRef}
          style={[styles.editorInput, { color: theme.textPrimary, width: contentWidth }]}
          multiline
          scrollEnabled={false}
          editable={isEditing}
          showSoftInputOnFocus={keyboardMouseMode ? false : isEditing}
          pointerEvents={isEditing ? "auto" : "none"}
          onChangeText={onEditChange}
          selection={selection}
          onSelectionChange={(e) => handleSelChange(e.nativeEvent.selection)}
          autoCapitalize="none"
          autoCorrect={false}
          textAlignVertical="top"
          onBlur={onBlur}
        >
          {tokenizedLines.map((line, lIdx) => (
            <Text key={`line-${line.lineNumber}`}>
              {line.tokens.map((token: CodeToken, tIdx: number) => {
                const tokenColor =
                  token.type === "comment"
                    ? theme.textMuted
                    : tokenPalette[token.type] || tokenPalette.plain;
                return (
                  <Text
                    key={`tok-${tIdx}`}
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
              {lIdx < tokenizedLines.length - 1 ? "\n" : ""}
            </Text>
          ))}
        </TextInput>
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
    paddingVertical: 8,
    paddingRight: 2,
    alignItems: "center",
  },
  gutterText: {
    fontFamily: FONT_FAMILY,
    fontSize: GUTTER_FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    textAlign: "center",
    includeFontPadding: false,
  },
  horizontalScroll: {
    flex: 1,
  },
  editHorizontalContent: {
    minWidth: "100%",
  },
  editorInput: {
    fontFamily: FONT_FAMILY,
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    paddingVertical: 8,
    paddingLeft: 6,
    paddingRight: 24,
    minWidth: "100%",
    textAlignVertical: "top",
    includeFontPadding: false,
  },
  tokenText: {
    fontFamily: FONT_FAMILY,
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    includeFontPadding: false,
  },
});
