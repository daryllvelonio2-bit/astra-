import { useCallback, useEffect } from "react";
import { Dimensions, ScrollView } from "react-native";

interface UseEditorCursorScrollProps {
  scrollRef: React.RefObject<ScrollView | null>;
  keyboardHeight: number;
  keyboardHeightRef: React.MutableRefObject<number>;
  scrollYRef: React.MutableRefObject<number>;
  scrollViewHeightRef: React.MutableRefObject<number>;
  isEditing: boolean;
  selectionLineIdx: number;
  selectionLineIdxRef: React.MutableRefObject<number>;
  lineHeight?: number;
}

/**
 * Handles keeping the active cursor line visible inside the ScrollView
 * when the software keyboard opens or when typing across lines.
 */
export function useEditorCursorScroll({
  scrollRef,
  keyboardHeight,
  keyboardHeightRef,
  scrollYRef,
  scrollViewHeightRef,
  isEditing,
  selectionLineIdx,
  selectionLineIdxRef,
  lineHeight = 20,
}: UseEditorCursorScrollProps) {
  const getVisibleHeight = useCallback(() => {
    if (scrollViewHeightRef.current && scrollViewHeightRef.current > 0) {
      return Math.max(160, scrollViewHeightRef.current);
    }
    const winH = Dimensions.get("window").height;
    return Math.max(160, winH - keyboardHeightRef.current);
  }, [keyboardHeightRef, scrollViewHeightRef]);

  const centerCursorLine = useCallback(
    (fullLineIdx: number) => {
      const cursorY = fullLineIdx * lineHeight + 8;
      const visibleH = getVisibleHeight();
      scrollRef.current?.scrollTo({ y: Math.max(0, cursorY - visibleH / 2), animated: true });
    },
    [lineHeight, getVisibleHeight, scrollRef]
  );

  const ensureCursorVisible = useCallback(
    (fullLineIdx: number) => {
      const kbH = keyboardHeightRef.current;
      if (kbH <= 0) return;
      const cursorY = fullLineIdx * lineHeight + 8;
      const visibleH = getVisibleHeight();
      const top = scrollYRef.current;
      if (cursorY < top + 48 || cursorY + lineHeight > top + visibleH - 48) {
        centerCursorLine(fullLineIdx);
      }
    },
    [centerCursorLine, lineHeight, keyboardHeightRef, getVisibleHeight, scrollYRef]
  );

  // When the keyboard opens, lift the cursor line into view only if hidden.
  useEffect(() => {
    if (keyboardHeight <= 0 || !isEditing) return;
    const t = setTimeout(() => ensureCursorVisible(selectionLineIdxRef.current), 120);
    return () => clearTimeout(t);
  }, [keyboardHeight, isEditing, ensureCursorVisible, selectionLineIdxRef]);

  // While editing (taps, Enter, typing near the edges), keep the cursor visible.
  useEffect(() => {
    if (!isEditing || keyboardHeight <= 0) return;
    ensureCursorVisible(selectionLineIdx);
  }, [selectionLineIdx, isEditing, keyboardHeight, ensureCursorVisible]);

  return { centerCursorLine, ensureCursorVisible };
}
