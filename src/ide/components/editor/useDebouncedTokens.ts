import { useState, useEffect, useRef, useMemo } from "react";
import { tokenizeCode, TokenizedLine } from "../../services/syntaxTokenizer";

/**
 * Debounced tokenization hook for edit mode.
 *
 * All React hooks are called unconditionally to strictly obey the Rules of Hooks.
 * - In view mode (isEditing=false): uses synchronous memoized tokenization.
 * - In edit mode (isEditing=true): debounces tokenization (150ms for typing, 300ms for large paste)
 *   so the JS thread remains completely responsive during rapid typing and huge pastes.
 */

const TYPING_DEBOUNCE_MS = 150;
const PASTE_DEBOUNCE_MS = 300;
/** Delta threshold to detect a paste vs normal typing. */
const PASTE_CHAR_THRESHOLD = 20;

export function useDebouncedTokens(
  visibleCodeChunk: string,
  fileName: string | undefined,
  startLineNumber: number,
  isEditing: boolean
): { tokenizedLines: TokenizedLine[]; isPasting: boolean } {
  // Synchronous memoized tokens for view mode
  const syncTokens = useMemo(() => {
    if (isEditing) return null;
    return tokenizeCode(visibleCodeChunk, fileName, startLineNumber);
  }, [visibleCodeChunk, fileName, startLineNumber, isEditing]);

  // Debounced tokens state for edit mode
  const [asyncTokens, setAsyncTokens] = useState<TokenizedLine[]>(() =>
    tokenizeCode(visibleCodeChunk, fileName, startLineNumber)
  );
  const [isPasting, setIsPasting] = useState(false);
  const prevChunkLenRef = useRef(visibleCodeChunk.length);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Unconditional effect: handles debouncing when isEditing is true
  useEffect(() => {
    if (!isEditing) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      setIsPasting(false);
      prevChunkLenRef.current = visibleCodeChunk.length;
      return;
    }

    const delta = Math.abs(visibleCodeChunk.length - prevChunkLenRef.current);
    prevChunkLenRef.current = visibleCodeChunk.length;
    const isLargePaste = delta > PASTE_CHAR_THRESHOLD;

    if (isLargePaste) {
      setIsPasting(true);
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const delay = isLargePaste ? PASTE_DEBOUNCE_MS : TYPING_DEBOUNCE_MS;
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const tokens = tokenizeCode(visibleCodeChunk, fileName, startLineNumber);
      setAsyncTokens(tokens);
      setIsPasting(false);
    }, delay);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [visibleCodeChunk, fileName, startLineNumber, isEditing]);

  // Return synchronous tokens in view mode, or debounced tokens in edit mode
  const tokenizedLines = !isEditing && syncTokens ? syncTokens : asyncTokens;

  return {
    tokenizedLines,
    isPasting: isEditing && isPasting,
  };
}
