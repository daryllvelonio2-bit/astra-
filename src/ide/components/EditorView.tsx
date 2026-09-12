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
  Dimensions,
  GestureResponderEvent,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { EditorTabBar } from "./EditorTabBar";
import { ProblemsPanel } from "./ProblemsPanel";
import { useEditorAssists } from "./useEditorAssists";
import { firstErrorLine } from "../services/codeDiagnosticsService";
import { tokenizeCode } from "../services/syntaxTokenizer";
import { useMonacoHighlight } from "./useMonacoHighlight";
import { EditorEditRow } from "./EditorEditRow";
import { useEditorCursorScroll } from "./useEditorCursorScroll";
import { getGutterWidth, computeTappedLine, computeCursorOffset, computeGutterColor, spliceWindowChunk, computeChunkStartOffset } from "./editorCursorUtils";
import { useEditorConfig } from "./editor/useEditorConfig";
import { useEditorCompletions } from "./editor/useEditorCompletions";
import { CompletionBar } from "./editor/CompletionBar";
import { EditorEmptyState } from "./editor/EditorEmptyState";
import { useEditorKeyboardPad } from "./editor/useEditorKeyboardPad";
import { useTheme } from "../../theme/themeContext";

interface EditorViewProps {
  fileName?: string;
  content: string;
  onChangeContent: (text: string) => void;
  onExitProject?: () => void;
  onToggleSidebar?: () => void;
  onRunFile?: (content: string, fileName: string) => void;
  onEditModeChange?: (isEditing: boolean) => void;
  onOpenSettings?: () => void;
}

const LINE_HEIGHT = 20;
const FONT_SIZE = 13;
const GUTTER_FONT_SIZE = 11;
const FONT_FAMILY = Platform.OS === "ios" ? "Menlo" : "monospace";
const WINDOW_SIZE = 60;
const SCROLL_THRESHOLD = 10;

export function EditorView({
  fileName,
  content,
  onChangeContent,
  onExitProject,
  onToggleSidebar,
  onRunFile,
  onEditModeChange,
  onOpenSettings,
}: EditorViewProps) {
  const { theme } = useTheme();
  const { editorSettings, keyboardMouseMode, keyboardMouseModeRef } = useEditorConfig();
  const [isEditing, setIsEditing] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  useEffect(() => {
    onEditModeChange?.(isEditing);
  }, [isEditing, onEditModeChange]);
  const [showProblems, setShowProblems] = useState(false);
  const textInputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const lastTapRef = useRef<number>(0);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startIndexRef = useRef(0);
  const { isKeyboardVisible, effectiveKeyboardHeight, keyboardBottomPadding, setContainerHeight } =
    useEditorKeyboardPad(keyboardMouseMode);
  const scrollYRef = useRef(0);
  const scrollViewHeightRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  keyboardHeightRef.current = effectiveKeyboardHeight;
  const lockSelectionUntilRef = useRef<number>(0);

  useEffect(() => {
    startIndexRef.current = startIndex;
  }, [startIndex]);

  // Reset sliding window when switching files
  useEffect(() => {
    setStartIndex(0);
    setIsEditing(false);
    setShowProblems(false);
  }, [fileName]);

  useEffect(() => {
    if (isKeyboardVisible && keyboardMouseModeRef.current) {
      Keyboard.dismiss();
    }
  }, [isKeyboardVisible, keyboardMouseModeRef]);

  const rawLines = useMemo(() => (content || "").split("\n"), [content]);
  const totalLines = Math.max(rawLines.length, 1);

  const endIndex = Math.min(startIndex + WINDOW_SIZE, totalLines);
  const topSpacerHeight = startIndex * LINE_HEIGHT;
  const bottomSpacerHeight = Math.max(0, (totalLines - endIndex) * LINE_HEIGHT);

  const visibleCodeChunk = useMemo(() => {
    if (totalLines <= WINDOW_SIZE) return content || "";
    return rawLines.slice(startIndex, endIndex).join("\n");
  }, [content, rawLines, startIndex, endIndex, totalLines]);

  const tokenizedLines = useMemo(
    () => tokenizeCode(visibleCodeChunk, fileName, startIndex + 1),
    [visibleCodeChunk, fileName, startIndex]
  );

  // Phase 4: hidden Monaco correction overlays the regex first paint.
  // Null while pending/failed -> regex output stays on screen.
  const monacoLines = useMonacoHighlight(visibleCodeChunk, fileName, startIndex + 1);
  const displayLines = monacoLines ?? tokenizedLines;

  // Char offset of the visible chunk within the full file (for cursor mapping).
  const chunkStartOffset = useMemo(
    () => computeChunkStartOffset(rawLines, startIndex),
    [rawLines, startIndex]
  );

  const assists = useEditorAssists(content, fileName, chunkStartOffset, editorSettings);

  // Sync mirrors for the typing path: rapid onChangeText bursts arrive before
  // re-render, so diff/rebuild against refs (updated synchronously on every
  // own edit), never stale render state. Effects re-sync on external changes
  // (scroll, file switch, parent updates).
  const contentRef = useRef(content);
  const chunkRef = useRef(visibleCodeChunk);
  const selectionMirrorRef = useRef(assists.selection);
  useEffect(() => {
    contentRef.current = content;
    chunkRef.current = visibleCodeChunk;
    selectionMirrorRef.current = assists.selection;
  }, [content, visibleCodeChunk, assists.selection]);

  useEffect(() => {
    assists.setSelection({ start: 0, end: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileName]);

  // 0-based full-file line index of the cursor (edit mode).
  const selectionLineIdx = useMemo(() => {
    const fullOffset = chunkStartOffset + Math.min(assists.selection.start, visibleCodeChunk.length);
    return Math.max(0, (content || "").slice(0, fullOffset).split("\n").length - 1);
  }, [content, chunkStartOffset, assists.selection.start, visibleCodeChunk.length]);
  const selectionLineIdxRef = useRef(0);
  selectionLineIdxRef.current = selectionLineIdx;

  useEditorCursorScroll({
    scrollRef,
    keyboardHeight: effectiveKeyboardHeight,
    keyboardHeightRef,
    scrollYRef,
    scrollViewHeightRef,
    isEditing,
    selectionLineIdx,
    selectionLineIdxRef,
    lineHeight: LINE_HEIGHT,
  });

  const gutterWidth = getGutterWidth(totalLines);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const scrollY = e.nativeEvent.contentOffset.y;
      scrollYRef.current = scrollY;
      if (totalLines <= WINDOW_SIZE) return;
      const approxLine = Math.floor(scrollY / LINE_HEIGHT);
      const targetStart = Math.max(0, Math.min(approxLine - 10, totalLines - WINDOW_SIZE));
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
      const fullLineIdx = computeTappedLine(
        e.nativeEvent.locationY,
        scrollYRef.current,
        scrollViewHeightRef.current,
        LINE_HEIGHT,
        totalLines
      );

      const codeStartX = gutterWidth + 6;
      const locX = e.nativeEvent.locationX;
      const approxCol = locX > codeStartX ? Math.floor((locX - codeStartX) / 8.5) : 0;
      const charOffset = computeCursorOffset(visibleCodeChunk, fullLineIdx, startIndexRef.current, approxCol);
      enterEditModeAtOffset(charOffset);
    }
    lastTapRef.current = now;
  };

  const enterEditModeAtOffset = (charOffset: number) => {
    const targetSel = { start: charOffset, end: charOffset };
    lockSelectionUntilRef.current = Date.now() + 500;
    selectionMirrorRef.current = targetSel;
    assists.setSelectionSync(targetSel);
    setIsEditing(true);
    textInputRef.current?.focus();
  };

  const handleDoneEditing = () => {
    setIsEditing(false);
    Keyboard.dismiss();
  };

  const handleTextChangeInWindow = (newChunkText: string) => {
    const updated = spliceWindowChunk(contentRef.current, newChunkText, startIndexRef.current, WINDOW_SIZE);
    contentRef.current = updated;
    onChangeContent(updated);
  };

  // Typing pipeline: diff → auto-close / skip / smart-indent → content + cursor.
  // NOTE: TextInput stays children-driven (no `value` prop) so token colors keep
  // rendering while typing; the explicit `selection` prop steers only the cursor.
  const handleEditChange = (newChunkText: string) => {
    if (newChunkText === chunkRef.current) return; // native echo, no-op
    const { chunk, cursor } = assists.assistEdit(chunkRef.current, newChunkText);
    chunkRef.current = chunk;
    const sel = { start: cursor, end: cursor };
    selectionMirrorRef.current = sel;
    assists.setSelectionSync(sel);
    handleTextChangeInWindow(chunk);
  };

  const handleApplyCompletionChunk = (newChunkText: string, newCursor: number) => {
    chunkRef.current = newChunkText;
    const sel = { start: newCursor, end: newCursor };
    selectionMirrorRef.current = sel;
    assists.setSelectionSync(sel);
    handleTextChangeInWindow(newChunkText);
  };

  const completions = useEditorCompletions({
    visibleChunk: visibleCodeChunk,
    cursorOffset: assists.selection.start,
    fileName,
    enabled: isEditing && editorSettings.enableCompletions !== false,
    onApplyChunk: handleApplyCompletionChunk,
  });


  // Native echoes programmatic cursor sets back as selection events; ignore
  // echoes so each keystroke costs one render instead of a ping-pong loop.
  const handleSelectionChange = (sel: { start: number; end: number }) => {
    if (Date.now() < lockSelectionUntilRef.current) return;
    const cur = selectionMirrorRef.current;
    if (sel.start === cur.start && sel.end === cur.end) return;
    selectionMirrorRef.current = sel;
    assists.setSelection(sel);
  };

  const jumpToLine = useCallback(
    (line: number) => {
      const clamped = Math.max(1, Math.min(line, totalLines));
      if (totalLines > WINDOW_SIZE) {
        setStartIndex(Math.max(0, Math.min(clamped - 9, totalLines - WINDOW_SIZE)));
      }
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: Math.max(0, (clamped - 1) * LINE_HEIGHT - 60), animated: true });
      }, 80);
    },
    [totalLines]
  );

  const handleShowProblems = useCallback(() => {
    setShowProblems((prev) => !prev);
    const first = firstErrorLine(assists.diagnostics);
    if (first > 0) {
      jumpToLine(first);
    }
  }, [assists.diagnostics, jumpToLine]);

  // Cursor line in full-file coordinates (edit mode only).
  const cursorFullLine = isEditing
    ? startIndex + visibleCodeChunk.slice(0, Math.min(assists.selection.start, visibleCodeChunk.length)).split("\n").length
    : undefined;

  const currentLineDiag = useMemo(() => {
    if (!cursorFullLine || !assists.diagnostics.length) return null;
    return assists.diagnostics.find((d) => d.line === cursorFullLine) || null;
  }, [cursorFullLine, assists.diagnostics]);

  if (!fileName) {
    return (
      <EditorEmptyState
        theme={theme}
        onExitProject={onExitProject}
        onToggleSidebar={onToggleSidebar}
        onOpenSettings={onOpenSettings}
      />
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.bgPrimary },
        keyboardBottomPadding > 0 && { paddingBottom: keyboardBottomPadding },
      ]}
      onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
    >
      <EditorTabBar
        fileName={fileName}
        isEditing={isEditing}
        onToggleEdit={() => {
          if (isEditing) {
            handleDoneEditing();
          } else {
            const approxLine = Math.max(0, Math.min(Math.floor(scrollYRef.current / LINE_HEIGHT), totalLines - 1));
            const charOffset = computeCursorOffset(visibleCodeChunk, approxLine, startIndexRef.current);
            enterEditModeAtOffset(charOffset);
          }
        }}
        onDoneEdit={handleDoneEditing}
        onRunFile={
          onRunFile
            ? () => {
                onRunFile(contentRef.current, fileName || "");
              }
            : undefined
        }
        onExitProject={onExitProject}
        onToggleSidebar={onToggleSidebar}
        onOpenSettings={onOpenSettings}
        errorCount={assists.errorCount}
        warningCount={assists.warningCount}
        onShowProblems={handleShowProblems}
      />

      {/* Editor Body with Strict Sliding Window Virtualization */}
      <ScrollView
        ref={scrollRef}
        style={[styles.editorScroll, { backgroundColor: theme.bgPrimary }]}
        contentContainerStyle={[
          styles.editorScrollContent,
          { backgroundColor: theme.bgPrimary, paddingBottom: 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        onScroll={handleScroll}
        scrollEventThrottle={80}
        onLayout={(e) => {
          scrollViewHeightRef.current = e.nativeEvent.layout.height;
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Top Spacer: Virtualizes unrendered lines above window */}
        {topSpacerHeight > 0 && <View style={{ height: topSpacerHeight }} />}

        <EditorEditRow
          isEditing={isEditing}
          keyboardMouseMode={keyboardMouseMode}
          tokenizedLines={displayLines}
          chunkText={visibleCodeChunk}
          gutterWidth={gutterWidth}
          editGutterColor={(ln) => computeGutterColor(ln, assists, cursorFullLine, theme)}
          textInputRef={textInputRef}
          theme={theme}
          onEditChange={handleEditChange}
          selection={assists.selection}
          onSelectionChange={handleSelectionChange}
        />

        {/* Bottom Spacer: Virtualizes unrendered lines below window */}
        {bottomSpacerHeight > 0 && <View style={{ height: bottomSpacerHeight }} />}
      </ScrollView>

      {/* Autocomplete / IntelliSense Suggestion Bar */}
      {isEditing && completions.items.length > 0 && (
        <CompletionBar
          items={completions.items}
          onSelect={completions.applyCompletion}
          theme={theme}
        />
      )}

      {/* Bracket partner status (edit mode, cursor on a bracket) */}
      {isEditing && assists.matchStatus && (
        <View style={[styles.bracketBar, { backgroundColor: theme.bgSecondary, borderTopColor: theme.border }]}>
          <Text
            style={[
              styles.bracketBarText,
              { color: assists.match.kind === "unmatched" ? theme.accentRed : theme.accent },
            ]}
          >
            {assists.match.kind === "unmatched" ? "⚠ " : "{ }  "}
            {assists.matchStatus}
          </Text>
        </View>
      )}

      {/* Current line diagnostic error (edit mode, leveled above keyboard) */}
      {isEditing && !showProblems && currentLineDiag && (
        <TouchableOpacity
          style={[styles.errorBar, { backgroundColor: theme.bgSecondary, borderTopColor: theme.border }]}
          onPress={handleShowProblems}
          activeOpacity={0.7}
        >
          <Ionicons
            name={currentLineDiag.severity === "error" ? "alert-circle" : "warning-outline"}
            size={13}
            color={currentLineDiag.severity === "error" ? theme.accentRed : theme.accentGold}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.errorBarText,
              { color: currentLineDiag.severity === "error" ? theme.accentRed : theme.accentGold },
            ]}
            numberOfLines={1}
          >
            Line {currentLineDiag.line}: {currentLineDiag.message}
          </Text>
          <Text style={[styles.errorBarHint, { color: theme.textMuted }]}>View all</Text>
        </TouchableOpacity>
      )}

      {/* Problems: error/warning list with tap-to-jump (badge opens it, leveled above keyboard) */}
      {showProblems && (
        <ProblemsPanel
          diagnostics={assists.diagnostics}
          onJumpToLine={jumpToLine}
          onClose={() => setShowProblems(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  editorScroll: {
    flex: 1,
  },
  editorScrollContent: {
    flexGrow: 1,
  },
  bracketBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 3,
    borderTopWidth: 1,
  },
  bracketBarText: {
    fontFamily: FONT_FAMILY,
    fontSize: 10.5,
    fontWeight: "600",
  },
  errorBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderTopWidth: 1,
  },
  errorBarText: {
    flex: 1,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    fontWeight: "600",
  },
  errorBarHint: {
    fontSize: 10,
    marginLeft: 8,
  },
});
