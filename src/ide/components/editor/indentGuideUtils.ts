import { CodeToken } from "../../services/syntaxTokenizer";

export const MONO_CHAR_WIDTH = 7.8;

/**
 * Detects whether the file predominantly uses 2-space or 4-space indentation.
 */
export function detectIndentStep(
  lines: { indentWidth?: number }[],
  fallback = 2
): number {
  let has2or6 = false;
  let has4 = false;
  for (const line of lines) {
    const w = line.indentWidth || 0;
    if (w <= 0) continue;
    if (w % 4 !== 0 && w % 2 === 0) {
      has2or6 = true;
      break;
    }
    if (w % 4 === 0) has4 = true;
  }
  if (has2or6) return 2;
  if (has4) return 4;
  return fallback;
}

/**
 * Computes effective indentation for each line, propagating block indent through blank lines.
 */
export function computeEffectiveIndents(
  lines: { lineNumber: number; tokens: CodeToken[]; indentWidth?: number }[]
): number[] {
  const rawIndents = lines.map((l) => {
    const isBlank = !l.tokens.length || l.tokens.every((t) => !t.text.trim());
    return isBlank ? -1 : (l.indentWidth || 0);
  });

  const effective = [...rawIndents];
  for (let i = 0; i < effective.length; i++) {
    if (effective[i] === -1) {
      let prev = 0;
      for (let p = i - 1; p >= 0; p--) {
        if (rawIndents[p] !== -1) {
          prev = rawIndents[p];
          break;
        }
      }
      let next = 0;
      for (let n = i + 1; n < effective.length; n++) {
        if (rawIndents[n] !== -1) {
          next = rawIndents[n];
          break;
        }
      }
      effective[i] = Math.min(prev, next);
    }
  }
  return effective;
}

/**
 * Computes horizontal pixel offsets for indent guides on each line.
 * Guaranteed invariant: Every guide column is strictly less than the line's code column,
 * preventing any collision or overlap with code characters.
 */
export function computeLineGuides(
  lines: { lineNumber: number; tokens: CodeToken[]; indentWidth?: number }[],
  enabled: boolean,
  indentStep: number
): number[][] {
  if (!enabled || indentStep <= 0) return lines.map(() => []);

  const effectiveIndents = computeEffectiveIndents(lines);
  return lines.map((_, idx) => {
    const indentWidth = effectiveIndents[idx] ?? 0;
    const guides: number[] = [];
    if (indentWidth > indentStep) {
      for (let col = indentStep; col < indentWidth; col += indentStep) {
        guides.push(Math.round(col * MONO_CHAR_WIDTH));
      }
    }
    return guides;
  });
}
