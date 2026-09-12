/**
 * Utility helpers for calculating line index, character offset, and gutter width
 * in the built-in IDE editor.
 */

export function getGutterWidth(totalLines: number): number {
  return totalLines >= 1000 ? 32 : totalLines >= 100 ? 26 : totalLines >= 10 ? 20 : 16;
}

export function computeTappedLine(
  locationY: number,
  scrollY: number,
  scrollViewHeight: number,
  lineHeight: number,
  totalLines: number
): number {
  const contentY = locationY > (scrollViewHeight || 500) ? locationY : scrollY + locationY;
  return Math.max(0, Math.min(Math.floor((contentY - 8) / lineHeight), totalLines - 1));
}

export function computeCursorOffset(
  chunkText: string,
  fullLineIdx: number,
  startIndex: number,
  approxCol = 0
): number {
  const chunkLines = chunkText.split("\n");
  const lineInChunk = Math.max(0, Math.min(fullLineIdx - startIndex, chunkLines.length - 1));
  let offset = 0;
  for (let i = 0; i < lineInChunk; i++) {
    offset += chunkLines[i].length + 1;
  }
  const lineLen = chunkLines[lineInChunk]?.length || 0;
  offset += Math.max(0, Math.min(approxCol, lineLen));
  return offset;
}

export function computeGutterColor(
  lineNumber: number,
  assists: {
    errorLines: Map<number, any> | Set<number>;
    match: { kind: string };
    matchLines: Set<number>;
  },
  cursorFullLine: number | undefined,
  theme: { accentRed: string; accent: string; textPrimary: string; textMuted: string }
): string {
  if (assists.errorLines.has(lineNumber)) return theme.accentRed;
  if (assists.match.kind === "unmatched" && assists.matchLines.has(lineNumber)) return theme.accentRed;
  if (assists.matchLines.has(lineNumber)) return theme.accent;
  if (cursorFullLine === lineNumber) return theme.textPrimary;
  return theme.textMuted;
}

export function spliceWindowChunk(
  fullText: string,
  newChunk: string,
  startIndex: number,
  windowSize: number
): string {
  const fullLines = fullText.split("\n");
  if (fullLines.length <= windowSize) return newChunk;
  const ei = Math.min(startIndex + windowSize, fullLines.length);
  return [...fullLines.slice(0, startIndex), ...newChunk.split("\n"), ...fullLines.slice(ei)].join("\n");
}

export function computeChunkStartOffset(rawLines: string[], startIndex: number): number {
  if (startIndex === 0) return 0;
  let off = 0;
  for (let k = 0; k < startIndex && k < rawLines.length; k++) {
    off += rawLines[k].length + 1;
  }
  return off;
}

