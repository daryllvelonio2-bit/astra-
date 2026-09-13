import { useRef, useEffect, useCallback } from "react";
import { TextInput } from "react-native";
import { useEditorAssists } from "../useEditorAssists";
import { spliceWindowChunk } from "../editorCursorUtils";

interface UseEditorTextPipelineParams {
  content: string;
  visibleCodeChunk: string;
  fileName?: string;
  assists: ReturnType<typeof useEditorAssists>;
  startIndexRef: React.MutableRefObject<number>;
  windowSize: number;
  textInputRef: React.RefObject<TextInput | null>;
  onChangeContent: (text: string) => void;
  setIsEditing: (editing: boolean) => void;
}

function countNewlinesFast(text: string): number {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) count++;
  }
  return count;
}

export function useEditorTextPipeline({
  content,
  visibleCodeChunk,
  fileName,
  assists,
  startIndexRef,
  windowSize,
  textInputRef,
  onChangeContent,
  setIsEditing,
}: UseEditorTextPipelineParams) {
  const contentRef = useRef(content);
  const chunkRef = useRef(visibleCodeChunk);
  const selectionMirrorRef = useRef(assists.selection);
  const lockSelectionUntilRef = useRef<number>(0);

  useEffect(() => {
    contentRef.current = content;
    chunkRef.current = visibleCodeChunk;
    selectionMirrorRef.current = assists.selection;
  }, [content, visibleCodeChunk, assists.selection]);

  useEffect(() => {
    assists.setSelection({ start: 0, end: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileName]);

  const enterEditModeAtOffset = useCallback(
    (charOffset: number) => {
      const targetSel = { start: charOffset, end: charOffset };
      lockSelectionUntilRef.current = Date.now() + 500;
      selectionMirrorRef.current = targetSel;
      assists.setSelectionSync(targetSel);
      setIsEditing(true);
      textInputRef.current?.focus();
    },
    [assists, setIsEditing, textInputRef]
  );

  const handleTextChangeInWindow = useCallback(
    (newChunkText: string) => {
      if (
        startIndexRef.current === 0 &&
        (!windowSize || windowSize >= countNewlinesFast(contentRef.current) + 1)
      ) {
        contentRef.current = newChunkText;
        onChangeContent(newChunkText);
        return;
      }
      const updated = spliceWindowChunk(
        contentRef.current,
        newChunkText,
        startIndexRef.current,
        windowSize
      );
      contentRef.current = updated;
      onChangeContent(updated);
    },
    [onChangeContent, startIndexRef, windowSize]
  );

  // Typing pipeline: diff -> auto-close / skip / smart-indent -> content + cursor.
  const handleEditChange = useCallback(
    (newChunkText: string) => {
      if (newChunkText === chunkRef.current) return; // native echo, no-op
      const delta = Math.abs(newChunkText.length - chunkRef.current.length);
      // Fast path for large paste (delta > 200 chars): skip expensive assist diffs
      let chunk: string;
      let cursor: number;
      if (delta > 200) {
        chunk = newChunkText;
        cursor = newChunkText.length;
      } else {
        const res = assists.assistEdit(chunkRef.current, newChunkText);
        chunk = res.chunk;
        cursor = res.cursor;
      }
      chunkRef.current = chunk;
      const sel = { start: cursor, end: cursor };
      selectionMirrorRef.current = sel;
      assists.setSelectionSync(sel);
      handleTextChangeInWindow(chunk);
    },
    [assists, handleTextChangeInWindow]
  );

  const handleApplyCompletionChunk = useCallback(
    (newChunkText: string, newCursor: number) => {
      chunkRef.current = newChunkText;
      const sel = { start: newCursor, end: newCursor };
      selectionMirrorRef.current = sel;
      assists.setSelectionSync(sel);
      handleTextChangeInWindow(newChunkText);
    },
    [assists, handleTextChangeInWindow]
  );

  // Native echoes programmatic cursor sets back as selection events; ignore echoes
  const handleSelectionChange = useCallback(
    (sel: { start: number; end: number }) => {
      if (Date.now() < lockSelectionUntilRef.current) return;
      const cur = selectionMirrorRef.current;
      if (sel.start === cur.start && sel.end === cur.end) return;
      selectionMirrorRef.current = sel;
      assists.setSelection(sel);
    },
    [assists]
  );

  return {
    contentRef,
    chunkRef,
    selectionMirrorRef,
    enterEditModeAtOffset,
    handleEditChange,
    handleApplyCompletionChunk,
    handleSelectionChange,
    handleTextChangeInWindow,
  };
}
