import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  View, TextInput, StyleSheet, ScrollView, Platform,
  Keyboard, GestureResponderEvent, NativeSyntheticEvent, NativeScrollEvent,
} from "react-native";
import { EditorTabBar } from "./EditorTabBar";
import { ProblemsPanel } from "./ProblemsPanel";
import { useEditorAssists } from "./useEditorAssists";
import { firstErrorLine } from "../services/codeDiagnosticsService";
import { EditorEditRow } from "./EditorEditRow";
import { useEditorCursorScroll } from "./useEditorCursorScroll";
import {
  getGutterWidth,
  computeTappedLine,
  computeCursorOffset,
  computeGutterColor,
  computeChunkStartOffset,
  buildLineStartOffsets,
  offsetToLine,
  maxLineLengthFromOffsets,
} from "./editorCursorUtils";
import { useEditorConfig } from "./editor/useEditorConfig";
import { useEditorCompletions } from "./editor/useEditorCompletions";
import { CompletionBar } from "./editor/CompletionBar";
import { EditorEmptyState } from "./editor/EditorEmptyState";
import { useEditorKeyboardPad } from "./editor/useEditorKeyboardPad";
import { useEditorFormatting } from "./editor/useEditorFormatting";
import { useEditorGestures } from "./editor/useEditorGestures";
import { ContinuationSplitView } from "./editor/ContinuationSplitView";
import { EditorStatusBar } from "./editor/EditorStatusBar";
import { EditorFloatingHud } from "./editor/EditorFloatingHud";
import { useEditorTextPipeline } from "./editor/useEditorTextPipeline";
import { useDebouncedTokens } from "./editor/useDebouncedTokens";
import { saveEditorSettings } from "../services/configService";
import { useTheme } from "../../theme/themeContext";
import { RecentFileItem } from "./editor/useRecentFiles";

interface EditorViewProps {
  fileName?: string;
  activeFilePath?: string;
  content: string;
  onChangeContent: (text: string) => void;
  onExitProject?: () => void;
  onToggleSidebar?: () => void;
  onRunFile?: (content: string, fileName: string) => void;
  onEditModeChange?: (isEditing: boolean) => void;
  onOpenSettings?: () => void;
  recentFiles?: RecentFileItem[];
  onSelectRecentFile?: (file: RecentFileItem) => void;
  onCloseRecentFile?: (filePath: string) => void;
}

const LINE_HEIGHT = 20;
const SCROLL_THRESHOLD = 10;

export function EditorView({
  fileName,
  activeFilePath,
  content,
  onChangeContent,
  onExitProject,
  onToggleSidebar,
  onRunFile,
  onEditModeChange,
  onOpenSettings,
  recentFiles,
  onSelectRecentFile,
  onCloseRecentFile,
}: EditorViewProps) {
  const { theme } = useTheme();
  const { editorSettings, keyboardMouseMode, keyboardMouseModeRef } = useEditorConfig();
  const gestures = useEditorGestures({
    initialFontSize: editorSettings.fontSize || 13,
    onSaveFontSize: (size) => saveEditorSettings({ fontSize: size }).catch(() => {}),
  });
  const fontSize = gestures.fontSize;
  const lineHeight = gestures.lineHeight;

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

  // Precomputed line offset index: O(N) once, enables O(log N) line lookups.
  const lineStartOffsets = useMemo(
    () => buildLineStartOffsets(content || ""),
    [content]
  );

  // Longest line length — passed to EditorEditRow to avoid redundant split.
  const maxLineLen = useMemo(
    () => maxLineLengthFromOffsets(lineStartOffsets, (content || "").length),
    [lineStartOffsets, content]
  );

  // In edit mode (or files <= 300 lines), render the entire document so pasted blocks
  // are never truncated into blank spacer views, avoiding ghost whitespace and text splicing bugs.
  const isWindowed = !isEditing && totalLines > 300;
  const effectiveStartIndex = isWindowed ? startIndex : 0;
  const effectiveWindowSize = isWindowed ? 120 : totalLines;
  const endIndex = isWindowed ? Math.min(effectiveStartIndex + effectiveWindowSize, totalLines) : totalLines;

  const topSpacerHeight = isWindowed ? effectiveStartIndex * lineHeight : 0;
  const bottomSpacerHeight = isWindowed ? Math.max(0, (totalLines - endIndex) * lineHeight) : 0;

  const visibleCodeChunk = useMemo(() => {
    if (!isWindowed) return content || "";
    return rawLines.slice(effectiveStartIndex, endIndex).join("\n");
  }, [content, rawLines, isWindowed, effectiveStartIndex, endIndex]);

  // Debounced tokenization: in edit mode, tokenizer runs after an idle gap
  // instead of synchronously on every keystroke / paste.
  const { tokenizedLines: displayLines, isPasting } = useDebouncedTokens(
    visibleCodeChunk,
    fileName,
    effectiveStartIndex + 1,
    isEditing
  );

  // Char offset of the visible chunk within the full file (for cursor mapping).
  const chunkStartOffset = useMemo(
    () => computeChunkStartOffset(rawLines, effectiveStartIndex),
    [rawLines, effectiveStartIndex]
  );

  const assists = useEditorAssists(content, fileName, chunkStartOffset, editorSettings);

  const {
    contentRef,
    controlledSelection,
    enterEditModeAtOffset,
    handleEditChange,
    handleApplyCompletionChunk,
    handleSelectionChange,
  } = useEditorTextPipeline({
    content,
    visibleCodeChunk,
    fileName,
    assists,
    startIndexRef,
    windowSize: effectiveWindowSize,
    textInputRef,
    onChangeContent,
    setIsEditing,
  });

  // 0-based full-file line index of the cursor (edit mode).
  // Uses O(log N) binary search instead of O(N) slice+split.
  const selectionLineIdx = useMemo(() => {
    const fullOffset = chunkStartOffset + Math.min(assists.selection.start, visibleCodeChunk.length);
    return offsetToLine(lineStartOffsets, Math.max(0, fullOffset));
  }, [lineStartOffsets, chunkStartOffset, assists.selection.start, visibleCodeChunk.length]);
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
      if (!isWindowed || totalLines <= effectiveWindowSize) return;
      const approxLine = Math.floor(scrollY / LINE_HEIGHT);
      const targetStart = Math.max(0, Math.min(approxLine - 10, totalLines - effectiveWindowSize));
      if (Math.abs(targetStart - startIndexRef.current) >= SCROLL_THRESHOLD) {
        setStartIndex(targetStart);
      }
    },
    [isWindowed, totalLines, effectiveWindowSize]
  );

  const handleTouchStart = (e: GestureResponderEvent) => {
    gestures.handleTouchStart(e);
    startPosRef.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
  };

  const handleTouchMove = (e: GestureResponderEvent) => {
    gestures.handleTouchMove(e);
  };

  const handleTouchEnd = (e: GestureResponderEvent) => {
    gestures.handleTouchEnd(e);
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
        lineHeight,
        totalLines
      );

      const codeStartX = gutterWidth + 6;
      const locX = e.nativeEvent.locationX;
      const approxCol = locX > codeStartX ? Math.floor((locX - codeStartX) / gestures.charWidth) : 0;
      const charOffset = computeCursorOffset(visibleCodeChunk, fullLineIdx, startIndexRef.current, approxCol);
      enterEditModeAtOffset(charOffset);
    }
    lastTapRef.current = now;
  };

  const { isFormatting, formatToast, format, onDoneEditing: onDoneWithFormat } = useEditorFormatting({
    contentRef,
    fileName,
    tabSize: editorSettings.tabSize,
    formatOnSave: editorSettings.formatOnSave,
    onChangeContent,
  });

  const handleDoneEditing = () => {
    setIsEditing(false);
    onDoneWithFormat(() => Keyboard.dismiss());
  };

  const completions = useEditorCompletions({
    visibleChunk: visibleCodeChunk,
    cursorOffset: assists.selection.start,
    fileName,
    enabled: isEditing && editorSettings.enableCompletions !== false,
    onApplyChunk: handleApplyCompletionChunk,
  });

  const jumpToLine = useCallback(
    (line: number) => {
      const clamped = Math.max(1, Math.min(line, totalLines));
      if (isWindowed && totalLines > effectiveWindowSize) {
        setStartIndex(Math.max(0, Math.min(clamped - 9, totalLines - effectiveWindowSize)));
      }
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: Math.max(0, (clamped - 1) * LINE_HEIGHT - 60), animated: true });
      }, 80);
    },
    [totalLines, isWindowed, effectiveWindowSize]
  );

  const handleShowProblems = useCallback(() => {
    setShowProblems((prev) => !prev);
    const first = firstErrorLine(assists.diagnostics);
    if (first > 0) {
      jumpToLine(first);
    }
  }, [assists.diagnostics, jumpToLine]);

  // Cursor line in full-file coordinates (edit mode only).
  // Uses O(log N) binary search on lineStartOffsets instead of O(N) slice+split.
  const cursorFullLine = isEditing
    ? offsetToLine(lineStartOffsets, chunkStartOffset + Math.min(assists.selection.start, visibleCodeChunk.length)) + 1
    : undefined;

  const currentLineDiag = useMemo(() => {
    if (!cursorFullLine || !assists.diagnostics.length) return null;
    return assists.diagnostics.find((d) => d.line === cursorFullLine) || null;
  }, [cursorFullLine, assists.diagnostics]);

  const editGutterColor = useCallback(
    (ln: number) => computeGutterColor(ln, assists, cursorFullLine, theme),
    [assists.errorLines, assists.match, assists.matchLines, cursorFullLine, theme.accentRed, theme.accent, theme.textPrimary, theme.textMuted]
  );

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
        activeFilePath={activeFilePath}
        recentFiles={recentFiles}
        onSelectRecentFile={onSelectRecentFile}
        onCloseRecentFile={onCloseRecentFile}
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
        onFormat={format}
        isFormatting={isFormatting}
        errorCount={assists.errorCount}
        warningCount={assists.warningCount}
        onShowProblems={handleShowProblems}
        isLandscape={gestures.isLandscape}
        isSplitScreen={gestures.isSplitScreen}
        onToggleSplitScreen={gestures.toggleSplitScreen}
      />

      {/* Floating HUD: Zoom badge, Split toast, Format banner */}
      <EditorFloatingHud
        theme={theme}
        splitToast={gestures.splitToast}
        zoomBadge={gestures.zoomBadge}
        formatToast={formatToast}
      />

      {/* Editor Body: Continuation Split-Screen in Landscape or Sliding Window Single Pane */}
      {gestures.isLandscape && gestures.isSplitScreen ? (
        <ContinuationSplitView
          content={content}
          fileName={fileName}
          theme={theme}
          fontSize={fontSize}
          lineHeight={lineHeight}
          gutterWidth={gutterWidth}
          isEditing={isEditing}
          keyboardMouseMode={keyboardMouseMode}
          textInputRef={textInputRef}
          onEditChange={handleEditChange}
          selection={controlledSelection}
          onSelectionChange={handleSelectionChange}
          editGutterColor={editGutterColor}
          cursorLine={cursorFullLine}
          showIndentGuides={editorSettings.showIndentGuides !== false}
          tabSize={editorSettings.tabSize}
          onCloseSplit={() => gestures.setIsSplitScreen(false)}
          onEnterEditMode={enterEditModeAtOffset}
          tokenizedLines={displayLines}
          maxLineLength={maxLineLen}
          isPasting={isPasting}
        />
      ) : (
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
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {topSpacerHeight > 0 && <View style={{ height: topSpacerHeight }} />}
          <EditorEditRow
            isEditing={isEditing}
            keyboardMouseMode={keyboardMouseMode}
            tokenizedLines={displayLines}
            chunkText={visibleCodeChunk}
            gutterWidth={gutterWidth}
            editGutterColor={editGutterColor}
            cursorLine={cursorFullLine}
            textInputRef={textInputRef}
            theme={theme}
            onEditChange={handleEditChange}
            selection={controlledSelection}
            onSelectionChange={handleSelectionChange}
            showIndentGuides={editorSettings.showIndentGuides !== false}
            tabSize={editorSettings.tabSize}
            fontSize={fontSize}
            lineHeight={lineHeight}
            maxLineLength={maxLineLen}
            isPasting={isPasting}
          />
          {bottomSpacerHeight > 0 && <View style={{ height: bottomSpacerHeight }} />}
        </ScrollView>
      )}

      {/* Autocomplete / IntelliSense Suggestion Bar */}
      {isEditing && completions.items.length > 0 && (
        <CompletionBar
          items={completions.items}
          onSelect={completions.applyCompletion}
          theme={theme}
          bottomOffset={
            (keyboardBottomPadding > 0 ? keyboardBottomPadding : 0) +
            (currentLineDiag || assists.matchStatus ? 28 : 6)
          }
        />
      )}

      {/* Status bar: Bracket match and line diagnostics */}
      <EditorStatusBar
        isEditing={isEditing}
        matchStatus={assists.matchStatus}
        matchKind={assists.match?.kind}
        currentLineDiag={currentLineDiag}
        showProblems={showProblems}
        onShowProblems={handleShowProblems}
        theme={theme}
      />

      {/* Problems: error/warning list with tap-to-jump */}
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
  container: { flex: 1, position: "relative" },
  editorScroll: { flex: 1 },
  editorScrollContent: { flexGrow: 1 },
});
