// GENERATED — do not hand-edit. Regenerate with: node scripts/build-monaco-html.js
// Headless VS Code core (Monarch tokenize only) for a hidden WebView.
// Background is token-replaced at runtime to avoid any visible flash.
import monacoData from "./monacoEngineHtml.json";

export function buildMonacoHtml(background: string): string {
  return monacoData.html.replaceAll("__BG__", () => background);
}
