export interface TerminalTheme {
  id: string;
  name: string;
  background: string;
  foreground: string;
  cursor: string;
  promptUser: string;
  promptPath: string;
  cardBg: string;
  borderColor: string;
  accent: string;
}

export const TERMINAL_THEMES: Record<string, TerminalTheme> = {
  alpine: {
    id: "alpine",
    name: "Dark Onyx",
    background: "#131314",
    foreground: "#f1f3f4",
    cursor: "#8ab4f8",
    promptUser: "#34d399",
    promptPath: "#8ab4f8",
    cardBg: "#16171b",
    borderColor: "#282c35",
    accent: "#8ab4f8",
  },
  onedark: {
    id: "onedark",
    name: "One Dark",
    background: "#1e1e2e",
    foreground: "#cdd6f4",
    cursor: "#f5e0dc",
    promptUser: "#a6e3a1",
    promptPath: "#89b4fa",
    cardBg: "#181825",
    borderColor: "#313244",
    accent: "#cba6f7",
  },
  monokai: {
    id: "monokai",
    name: "Monokai",
    background: "#272822",
    foreground: "#f8f8f2",
    cursor: "#f92672",
    promptUser: "#a6e22e",
    promptPath: "#66d9ef",
    cardBg: "#1e1f1c",
    borderColor: "#3e3d32",
    accent: "#fd971f",
  },
  matrix: {
    id: "matrix",
    name: "Matrix Green",
    background: "#050d08",
    foreground: "#00ff66",
    cursor: "#00ff66",
    promptUser: "#39ff14",
    promptPath: "#00ccff",
    cardBg: "#0b1a0e",
    borderColor: "#123b18",
    accent: "#00ff66",
  },
  light: {
    id: "light",
    name: "Light Clean",
    background: "#f8fafc",
    foreground: "#0f172a",
    cursor: "#2563eb",
    promptUser: "#059669",
    promptPath: "#2563eb",
    cardBg: "#f1f5f9",
    borderColor: "#e2e8f0",
    accent: "#2563eb",
  },
  midnight: {
    id: "midnight",
    name: "Midnight Glow",
    background: "#0b0f19",
    foreground: "#f8fafc",
    cursor: "#38bdf8",
    promptUser: "#34d399",
    promptPath: "#38bdf8",
    cardBg: "#0e1424",
    borderColor: "#1e293b",
    accent: "#38bdf8",
  },
};
