/**
 * Lightweight client-side code formatter / beautifier for JavaScript, TypeScript, JSX, JSON, HTML, CSS.
 */

export function formatCode(code: string, fileName?: string): string {
  if (!code || !code.trim()) return code;

  const ext = fileName ? fileName.split(".").pop()?.toLowerCase() : "js";

  if (ext === "json") {
    try {
      const parsed = JSON.parse(code);
      return JSON.stringify(parsed, null, 2);
    } catch (_) {
      return formatGenericCode(code);
    }
  }

  return formatGenericCode(code);
}

function formatGenericCode(code: string): string {
  const rawLines = code.split("\n");
  const formattedLines: string[] = [];
  let indentLevel = 0;
  const indentStr = "  "; // 2 spaces standard

  for (let i = 0; i < rawLines.length; i++) {
    let line = rawLines[i].trim();

    if (!line) {
      // Prevent more than 1 consecutive empty line
      if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== "") {
        formattedLines.push("");
      }
      continue;
    }

    // Adjust indent down for closing brackets at the start of a line
    if (/^[}\])\>]/.test(line)) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    // Space out keywords and symbols
    line = beautifyLine(line);

    // Apply current indentation
    formattedLines.push(indentStr.repeat(indentLevel) + line);

    // Count open vs close brackets on this line to adjust next line's indent
    const openBrackets = (line.match(/[{\[(]/g) || []).length;
    const closeBrackets = (line.match(/[}\])]/g) || []).length;

    const netChange = openBrackets - closeBrackets;
    if (netChange > 0) {
      indentLevel += netChange;
    } else if (netChange < 0 && !/^[}\])\>]/.test(line)) {
      indentLevel = Math.max(0, indentLevel + netChange);
    }
  }

  return formattedLines.join("\n");
}

function beautifyLine(line: string): string {
  // Preserve strings intact
  const stringLiterals: string[] = [];
  const placeholder = "___STR_LITERAL___";

  const preserved = line.replace(/(`(?:\\`|[^`])*`|"(?:\\"|[^"])*"|'(?:\\'|[^'])*')/g, (match) => {
    stringLiterals.push(match);
    return placeholder;
  });

  let result = preserved
    // Standardize spacing around binary operators
    .replace(/\s*([=+\-*/%&|^!<>]+)\s*/g, " $1 ")
    .replace(/\s*=>\s*/g, " => ")
    .replace(/\s*([,:])\s*/g, "$1 ")
    .replace(/\s*;\s*$/g, ";")
    // Fix multiple spaces
    .replace(/[ \t]{2,}/g, " ");

  // Re-inject string literals
  let strIdx = 0;
  result = result.replace(new RegExp(placeholder, "g"), () => {
    return stringLiterals[strIdx++] || "";
  });

  return result.trim();
}
