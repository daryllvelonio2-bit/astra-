import React, { createContext, useContext, useState, useEffect } from "react";
import { AppTheme, loadTheme, saveTheme, subscribeConfigChanges } from "../ide/services/configService";

export interface ThemeColors {
  id: AppTheme;
  name: string;
  isDark: boolean;
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgElevated: string;
  bgInput: string;
  border: string;
  borderLight: string;
  borderGlow: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentCyan: string;
  accentPurple: string;
  accentGold: string;
  accentGreen: string;
  accentRed: string;
  bubbleUser: string;
  bubbleUserText: string;
  bubbleAssistant: string;
  bubbleAssistantBorder: string;
  sendButtonBg: string;
  sendButtonIcon: string;
  statusPillBg: string;
  statusPillBorder: string;
  cardBg: string;
  overlay: string;
}

export const THEMES: Record<AppTheme, ThemeColors> = {
  dark: {
    id: "dark",
    name: "Dark Onyx",
    isDark: true,
    bgPrimary: "#131314",
    bgSecondary: "#16171b",
    bgTertiary: "#1a1d24",
    bgElevated: "#252526",
    bgInput: "#1e1f24",
    border: "#282c35",
    borderLight: "#333842",
    borderGlow: "rgba(138, 180, 248, 0.3)",
    textPrimary: "#f1f3f4",
    textSecondary: "#9aa0a6",
    textMuted: "#6b7280",
    accent: "#8ab4f8",
    accentCyan: "#38bdf8",
    accentPurple: "#c084fc",
    accentGold: "#fdd663",
    accentGreen: "#34d399",
    accentRed: "#f87171",
    bubbleUser: "#1e293b",
    bubbleUserText: "#ffffff",
    bubbleAssistant: "#151619",
    bubbleAssistantBorder: "#22242a",
    sendButtonBg: "#8ab4f8",
    sendButtonIcon: "#131314",
    statusPillBg: "#1e2025",
    statusPillBorder: "#2e323b",
    cardBg: "#17181c",
    overlay: "rgba(0, 0, 0, 0.6)",
  },
  light: {
    id: "light",
    name: "Light Clean",
    isDark: false,
    bgPrimary: "#f8fafc",
    bgSecondary: "#f1f5f9",
    bgTertiary: "#ffffff",
    bgElevated: "#ffffff",
    bgInput: "#ffffff",
    border: "#e2e8f0",
    borderLight: "#cbd5e1",
    borderGlow: "rgba(37, 99, 235, 0.25)",
    textPrimary: "#0f172a",
    textSecondary: "#475569",
    textMuted: "#94a3b8",
    accent: "#2563eb",
    accentCyan: "#0284c7",
    accentPurple: "#7c3aed",
    accentGold: "#d97706",
    accentGreen: "#059669",
    accentRed: "#dc2626",
    bubbleUser: "#2563eb",
    bubbleUserText: "#ffffff",
    bubbleAssistant: "#ffffff",
    bubbleAssistantBorder: "#e2e8f0",
    sendButtonBg: "#2563eb",
    sendButtonIcon: "#ffffff",
    statusPillBg: "#f1f5f9",
    statusPillBorder: "#cbd5e1",
    cardBg: "#ffffff",
    overlay: "rgba(15, 23, 42, 0.45)",
  },
  midnight: {
    id: "midnight",
    name: "Midnight Glow",
    isDark: true,
    bgPrimary: "#0b0f19",
    bgSecondary: "#0e1424",
    bgTertiary: "#131b2e",
    bgElevated: "#162035",
    bgInput: "#0f172a",
    border: "#1e293b",
    borderLight: "#293548",
    borderGlow: "rgba(56, 189, 248, 0.4)",
    textPrimary: "#f8fafc",
    textSecondary: "#94a3b8",
    textMuted: "#64748b",
    accent: "#38bdf8",
    accentCyan: "#06b6d4",
    accentPurple: "#a855f7",
    accentGold: "#fbbf24",
    accentGreen: "#34d399",
    accentRed: "#f87171",
    bubbleUser: "#1e3a8a",
    bubbleUserText: "#ffffff",
    bubbleAssistant: "#0f172a",
    bubbleAssistantBorder: "#1e293b",
    sendButtonBg: "#06b6d4",
    sendButtonIcon: "#ffffff",
    statusPillBg: "#111827",
    statusPillBorder: "#1e293b",
    cardBg: "#111827",
    overlay: "rgba(0, 0, 0, 0.72)",
  },
};

interface ThemeContextType {
  theme: ThemeColors;
  themeMode: AppTheme;
  setTheme: (theme: AppTheme) => void;
  isDark: boolean;
  isLight: boolean;
  isMidnight: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: THEMES.dark,
  themeMode: "dark",
  setTheme: () => {},
  isDark: true,
  isLight: false,
  isMidnight: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<AppTheme>("dark");

  useEffect(() => {
    loadTheme().then(setThemeModeState);
    const unsubscribe = subscribeConfigChanges((cfg) => {
      if (cfg.selectedTheme && cfg.selectedTheme !== themeMode) {
        setThemeModeState(cfg.selectedTheme);
      }
    });
    return unsubscribe;
  }, []);

  const setTheme = (mode: AppTheme) => {
    setThemeModeState(mode);
    saveTheme(mode);
  };

  const theme = THEMES[themeMode] || THEMES.dark;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeMode,
        setTheme,
        isDark: theme.isDark,
        isLight: themeMode === "light",
        isMidnight: themeMode === "midnight",
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
