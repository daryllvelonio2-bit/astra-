export type AstraCognitiveMode =
  | "default"
  | "fast"
  | "medium"
  | "slow"
  | "spec"
  | "godot"
  | "godot-mobile"
  | "godot-desktop";

export type AstraEffort = "default" | "low" | "medium" | "high";

export interface AstraModeInfo {
  id: AstraCognitiveMode;
  name: string;
  shortName: string;
  tag: string;
  cliFlag: string;
  icon: string;
  badge: string;
  category: "cognitive" | "gaming" | "general";
  description: string;
  highlightColor: string;
}

export const ASTRA_MODES: AstraModeInfo[] = [
  {
    id: "default",
    name: "Standard Mode",
    shortName: "Standard",
    tag: "",
    cliFlag: "",
    icon: "sparkles",
    badge: "Default",
    category: "general",
    description: "Standard autonomous agentic reasoning with full tool access.",
    highlightColor: "#8ab4f8",
  },
  {
    id: "fast",
    name: "Fast Mode",
    shortName: "Fast",
    tag: "[fast]",
    cliFlag: "--fast",
    icon: "flash",
    badge: "⚡ Instant",
    category: "cognitive",
    description: "Ultra-fast generation, minimal filler, concise production code.",
    highlightColor: "#fbbf24",
  },
  {
    id: "medium",
    name: "Medium Mode",
    shortName: "Medium",
    tag: "[medium]",
    cliFlag: "--medium",
    icon: "scale",
    badge: "⚖️ Balanced",
    category: "cognitive",
    description: "Balanced everyday engineering speed with clear structure.",
    highlightColor: "#60a5fa",
  },
  {
    id: "slow",
    name: "Slow Mode",
    shortName: "Slow",
    tag: "[slow]",
    cliFlag: "--slow",
    icon: "bulb",
    badge: "🧠 Deep",
    category: "cognitive",
    description: "Deep reasoning, complete docstrings, edge cases & unit tests.",
    highlightColor: "#a78bfa",
  },
  {
    id: "spec",
    name: "10X Super Deep (Kiro Spec SDD)",
    shortName: "10X Spec",
    tag: "[spec]",
    cliFlag: "--spec",
    icon: "flask",
    badge: "🔬 10X Spec",
    category: "cognitive",
    description: "Kiro Spec-Driven Planning: Requirements → Design → Tasks → Verification.",
    highlightColor: "#ec4899",
  },
  {
    id: "godot",
    name: "Godot 4.x General",
    shortName: "Godot",
    tag: "[godot]",
    cliFlag: "--godot",
    icon: "game-controller",
    badge: "🕹️ Godot",
    category: "gaming",
    description: "GDScript 2.0 / C#, node lifecycle, Custom Resources, signal decoupling.",
    highlightColor: "#34d399",
  },
  {
    id: "godot-mobile",
    name: "Godot Mobile Optimization",
    shortName: "Godot Mobile",
    tag: "[godot-mobile]",
    cliFlag: "--godot-mobile",
    icon: "phone-portrait",
    badge: "📱 Mobile",
    category: "gaming",
    description: "Lightweight rendering, object pooling, touch gestures & safe area notches.",
    highlightColor: "#10b981",
  },
  {
    id: "godot-desktop",
    name: "Godot Desktop Optimization",
    shortName: "Godot Desktop",
    tag: "[godot-desktop]",
    cliFlag: "--godot-desktop",
    icon: "desktop",
    badge: "🖥️ Desktop",
    category: "gaming",
    description: "Forward+ renderer, exclusive fullscreen, VSync, Gamepad & save systems.",
    highlightColor: "#06b6d4",
  },
];

export function getAstraModeInfo(mode: AstraCognitiveMode): AstraModeInfo {
  return ASTRA_MODES.find((m) => m.id === mode) || ASTRA_MODES[0];
}
