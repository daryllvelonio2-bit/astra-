import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  Keyboard,
  GestureResponderEvent,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CodeSyntaxHighlighter } from "./CodeSyntaxHighlighter";
import { EditorTabBar } from "./EditorTabBar";
import { formatCode } from "../services/formatterService";
import { tokenizeCode, TOKEN_COLORS, CodeToken } from "../services/syntaxTokenizer";
import { useTheme } from "../../theme/themeContext";

interface EditorViewProps {
  fileName?: string;
  content: string;
  onChangeContent: (text: string) => void;
  onExitProject?: () => void;
  onToggleSidebar?: () => void;
  onRunFile?: (content: string, fileName: string) => void;
  onAskAiAboutFile?: (content: string, fileName: string) => void;
}

const LINE_HEIGHT = 20;
const FONT_SIZE = 13;
const GUTTER_FONT_SIZE = 11;
const FONT_FAMILY = Platform.OS === "ios" ? "Menlo" : "monospace";
const WINDOW_SIZE = 100;
const SCROLL_THRESHOLD = 15;

export function EditorView({
  fileName,
  content,
  onChangeContent,
  onExitProject,
  onToggleSidebar,
  onRunFile,
  onAskAiAboutFile,
}: EditorViewProps) {
  const { theme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [startIndex, setStartIndex] = useState(0);
  const textInputRef = useRef<TextInput>(null);
  const lastTapRef = useRef<number>(0);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startIndexRef = useRef(0);

  useEffect(() => {
    startIndexRef.current = startIndex;
  }, [startIndex]);

  // Reset sliding window when switching files
  useEffect(() => {
    setStartIndex(0);
    setIsEditing(false);
  }, [fileName]);

  useEffect(() => {
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setIsEditing(false);
    });
    return () => hideSub.remove();
  }, []);

  const rawLines = useMemo(() => (content || "").split("\n"), [content]);
  const totalLines = Math.max(rawLines.length, 1);

  const endIndex = Math.min(startIndex + WINDOW_SIZE, totalLines);
  const topSpacerHeight = startIndex * LINE_HEIGHT;
  const bottomSpacerHeight = Math.max(0, (totalLines - endIndex) * LINE_HEIGHT);

  const visibleCodeChunk = useMemo(() => {
    if (totalLines <= WINDOW_SIZE) return content || "";
    return rawLines.slice(startIndex, endIndex).join("\n");
  }, [content, rawLines, startIndex, endIndex, totalLines]);

  const tokenizedLines = useMemo(() => {
    return tokenizeCode(visibleCodeChunk, fileName, startIndex + 1);
  }, [visibleCodeChunk, fileName, startIndex]);

  const gutterWidth = totalLines >= 1000 ? 32 : totalLines >= 100 ? 26 : totalLines >= 10 ? 20 : 16;

  const lineNumbers = useMemo(() => {
    return tokenizedLines.map((l) => `${l.lineNumber}`).join("\n");
  }, [tokenizedLines]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (totalLines <= WINDOW_SIZE) return;
      const scrollY = e.nativeEvent.contentOffset.y;
      const approxLine = Math.floor(scrollY / LINE_HEIGHT);
      const targetStart = Math.max(
        0,
        Math.min(approxLine - 10, totalLines - WINDOW_SIZE)
      );

      if (Math.abs(targetStart - startIndexRef.current) >= SCROLL_THRESHOLD) {
        setStartIndex(targetStart);
      }
    },
    [totalLines]
  );

  const handleTouchStart = (e: GestureResponderEvent) => {
    startPosRef.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
  };

  const handleTouchEnd = (e: GestureResponderEvent) => {
    if (isEditing) return;
    const dx = Math.abs(e.nativeEvent.pageX - startPosRef.current.x);
    const dy = Math.abs(e.nativeEvent.pageY - startPosRef.current.y);
    if (dx > 10 || dy > 10) return;

    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      setIsEditing(true);
      setTimeout(() => textInputRef.current?.focus(), 40);
    }
    lastTapRef.current = now;
  };

  const handleFormatCode = () => {
    const formatted = formatCode(content, fileName);
    onChangeContent(formatted);
  };

  const handleTextChangeInWindow = (newChunkText: string) => {
    if (totalLines <= WINDOW_SIZE) {
      onChangeContent(newChunkText);
    } else {
      const before = rawLines.slice(0, startIndex);
      const after = rawLines.slice(endIndex);
      const newChunkLines = newChunkText.split("\n");
      const updated = [...before, ...newChunkLines, ...after].join("\n");
      onChangeContent(updated);
    }
  };

  if (!fileName) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.bgPrimary }]}>
        {onToggleSidebar && (
          <TouchableOpacity onPress={onToggleSidebar} style={styles.emptyHamburgerBtn}>
            <Ionicons name="menu" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
        <Ionicons name="code-working-outline" size={48} color={theme.textMuted} />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Select a file from the explorer to begin editing</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
      <EditorTabBar
        fileName={fileName}
        isEditing={isEditing}
        onToggleEdit={() => {
          if (isEditing) {
            setIsEditing(false);
            Keyboard.dismiss();
          } else {
            setIsEditing(true);
            setTimeout(() => textInputRef.current?.focus(), 40);
          }
        }}
        onDoneEdit={() => {
          setIsEditing(false);
          Keyboard.dismiss();
        }}
        onFormatCode={handleFormatCode}
        onRunFile={onRunFile ? () => onRunFile(content, fileName) : undefined}
        onAskAi={onAskAiAboutFile ? () => onAskAiAboutFile(content, fileName) : undefined}
        onExitProject={onExitProject}
        onToggleSidebar={onToggleSidebar}
      />

      {/* Editor Body with Strict Sliding Window Virtualization */}
      <ScrollView
        style={[styles.editorScroll, { backgroundColor: theme.bgPrimary }]}
        contentContainerStyle={[styles.editorScrollContent, { backgroundColor: theme.bgPrimary }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        onScroll={handleScroll}
        scrollEventThrottle={80}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Top Spacer: Virtualizes unrendered lines above window */}
        {topSpacerHeight > 0 && <View style={{ height: topSpacerHeight }} />}

        {!isEditing ? (
          <CodeSyntaxHighlighter
            tokenizedLines={tokenizedLines}
            fontSize={FONT_SIZE}
            lineHeight={LINE_HEIGHT}
            gutterWidth={gutterWidth}
            theme={theme}
          />
        ) : (
          <View style={[styles.editorRow, { backgroundColor: theme.bgPrimary }]}>
            {/* Pinned Gutter on the left */}
            <View style={[styles.gutterContainer, { width: gutterWidth, backgroundColor: theme.bgSecondary, borderRightColor: theme.border }]}>
              <Text style={[styles.gutterText, { color: theme.textMuted }]}>{lineNumbers}</Text>
            </View>

            {/* Horizontally scrollable TextInput in Edit Mode */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              style={styles.horizontalScroll}
              contentContainerStyle={styles.editHorizontalContent}
            >
              <TextInput
                ref={textInputRef}
                style={[styles.editorInput, { color: theme.textPrimary }]}
                multiline
                scrollEnabled={false}
                onChangeText={handleTextChangeInWindow}
                autoCapitalize="none"
                autoCorrect={false}
                textAlignVertical="top"
                onBlur={() => setIsEditing(false)}
              >
                {tokenizedLines.map((line, lIdx) => (
                  <Text key={`line-${line.lineNumber}`}>
                    {line.tokens.map((token: CodeToken, tIdx: number) => {
                      const isPlainOp = token.type === "plain" || token.type === "operator";
                      const tokenColor = token.type === "comment"
                        ? theme.textMuted
                        : isPlainOp
                        ? (theme.isDark ? TOKEN_COLORS[token.type] : theme.textPrimary)
                        : (TOKEN_COLORS[token.type] || (theme.isDark ? TOKEN_COLORS.plain : theme.textPrimary));
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
        )}

        {/* Bottom Spacer: Virtualizes unrendered lines below window */}
        {bottomSpacerHeight > 0 && <View style={{ height: bottomSpacerHeight }} />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    gap: 12,
  },
  emptyHamburgerBtn: {
    position: "absolute",
    top: 8,
    left: 8,
    padding: 8,
    zIndex: 10,
  },
  emptyText: {
    fontSize: 14,
  },
  editorScroll: {
    flex: 1,
  },
  editorScrollContent: {
    flexGrow: 1,
  },
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
