/**
 * Guards against machine JSON (serialized agent steps / tool results)
 * leaking into user-visible assistant message text.
 * 1 feature = 1 file per agent.md.
 */

const STEP_MARKERS = [
  "approvalStatus",
  "tool_result",
  "toolOutput",
  "update_topic",
  "set_topic",
  "[!STRATEGY]",
  "## Topic:",
];

const NOISE_LINE_PATTERNS = [
  /^[{}\[\]",]/,
  /^\s*[}\]],?\s*$/,
  /^\s*"(content|toolOutput|timestamp|approvalStatus|toolName|toolArgs|tool_result|type|id|status|isError)"\s*:/,
  /approvalStatus"\s*:\s*"(approved|rejected|pending|expired)"/,
  /"timestamp"\s*:\s*\d{13}/,
];

function unescapeJsonString(s: string): string {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .replace(/\\t/g, "  ");
}

function isHumanContentLine(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (t.startsWith("## Topic:") || t.startsWith("## 📁 Topic:")) return false;
  if (t.startsWith("[!STRATEGY]")) return false;
  if (t.startsWith("[Context:")) return false;
  if (t.startsWith("proot warning:") || t.startsWith("proot info:")) return false;
  if (t.startsWith("[Astra Key Rolling]") || t.startsWith("[Astra RateGuard]")) return false;
  return true;
}

/** True when the text is (or contains) a serialized steps/tool dump, not prose. */
export function isMachineJsonDump(text: string): boolean {
  if (!text) return false;
  const t = text.trim();
  if (t.startsWith("{") || t.startsWith("[")) {
    try {
      const parsed: any = JSON.parse(t);
      const blob = JSON.stringify(parsed);
      return STEP_MARKERS.some((m) => blob.includes(m));
    } catch (_) {
      // Not valid JSON — fall through to fragment checks below.
    }
  }
  let markerHits = 0;
  for (const m of STEP_MARKERS) {
    if (t.includes(`"${m}"`) || t.includes(m)) markerHits++;
    if (markerHits >= 2) return true;
  }
  const lines = t.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length >= 3) {
    const noisy = lines.filter((l) => NOISE_LINE_PATTERNS.some((p) => p.test(l.trim()))).length;
    if (noisy / lines.length > 0.5) return true;
  }
  return false;
}

function extractFromParsedSteps(parsed: any): string[] {
  const out: string[] = [];
  const steps = Array.isArray(parsed) ? parsed : parsed.steps || parsed.messages || [parsed];
  if (!Array.isArray(steps)) return out;
  for (const s of steps) {
    if (!s || typeof s !== "object") {
      if (typeof s === "string" && isHumanContentLine(s)) out.push(s.trim());
      continue;
    }
    const candidates = [s.content, s.text, s.response, s.message];
    for (const c of candidates) {
      if (typeof c !== "string" || !c.trim()) continue;
      const unesc = unescapeJsonString(c);
      if (isMachineJsonDump(unesc)) {
        out.push(...extractFromParsedStepsSafe(unesc));
      } else if (isHumanContentLine(unesc)) {
        out.push(unesc.trim());
      }
    }
  }
  return out;
}

function extractFromParsedStepsSafe(blob: string): string[] {
  try {
    return extractFromParsedSteps(JSON.parse(blob));
  } catch (_) {
    return [];
  }
}

/**
 * Returns human-readable text with machine JSON stripped.
 * Returns "" when nothing human remains (caller shows a collapsed raw view).
 */
export function sanitizeAgentText(text: string): string {
  if (!text || !isMachineJsonDump(text)) return text;
  const t = text.trim();

  // Whole-body JSON (possibly double-encoded).
  try {
    let parsed: any = JSON.parse(t);
    if (typeof parsed === "string" && isMachineJsonDump(parsed)) parsed = JSON.parse(parsed);
    const human = extractFromParsedSteps(parsed);
    if (human.length > 0) return human.join("\n\n").trim();
  } catch (_) {}

  // Fragment dump: harvest "content" string values.
  const harvested: string[] = [];
  const contentRe = /"content"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = contentRe.exec(t)) !== null) {
    const unesc = unescapeJsonString(m[1]);
    if (isHumanContentLine(unesc) && !isMachineJsonDump(unesc)) harvested.push(unesc.trim());
    if (harvested.join("\n").length > 4000) break;
  }
  if (harvested.length > 0) return harvested.join("\n\n").trim();

  // Last resort: keep lines that look human.
  const humanLines = t
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => isHumanContentLine(l) && !NOISE_LINE_PATTERNS.some((p) => p.test(l)));
  return humanLines.join("\n").trim();
}
