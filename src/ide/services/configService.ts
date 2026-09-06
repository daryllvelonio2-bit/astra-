import * as FileSystem from "expo-file-system/legacy";
import { AstraCognitiveMode, AstraEffort } from "../../ai/astra/astraModes";
import { getFileInfo, readFileText, writeFileText } from "./nativeFs";

export const DEFAULT_MODEL_ID = "gemini-3.5-flash-lite";

export interface ModelOption {
  id: string;
  name: string;
  description?: string;
}

export const SUPPORTED_MODELS: ModelOption[] = [
  { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash Lite", description: "Default ultra-fast & lightweight" },
  { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", description: "High speed multimodal reasoning" },
  { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash", description: "Advanced fast agentic intelligence" },
  { id: "gemini-flash-latest", name: "Gemini Flash Latest", description: "Always latest stable Flash model" },
  { id: "gemini-pro-latest", name: "Gemini Pro Latest", description: "Complex coding & deep reasoning" },
  { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview", description: "Cutting-edge frontier model" },
];

const CONFIG_FILE = `${FileSystem.documentDirectory}config.json`;

export type AppTheme = "dark" | "light" | "midnight";
export type EditorUiType = "native" | "vscode";

export type ToggleableBottomTab = "editor" | "terminal" | "browser" | "git" | "desktop" | "vscode";
export type BottomTabVisibility = Record<ToggleableBottomTab, boolean>;

export const TAB_ORDER: ToggleableBottomTab[] = ["editor", "terminal", "browser", "git", "desktop", "vscode"];

export const DEFAULT_BOTTOM_TABS: BottomTabVisibility = {
  editor: true,
  terminal: true,
  browser: true,
  git: true,
  desktop: true,
  vscode: true,
};

export function normalizeBottomTabs(value?: Partial<BottomTabVisibility> | null): BottomTabVisibility {
  return {
    editor: value?.editor ?? DEFAULT_BOTTOM_TABS.editor,
    terminal: value?.terminal ?? DEFAULT_BOTTOM_TABS.terminal,
    browser: value?.browser ?? DEFAULT_BOTTOM_TABS.browser,
    git: value?.git ?? DEFAULT_BOTTOM_TABS.git,
    desktop: value?.desktop ?? DEFAULT_BOTTOM_TABS.desktop,
    vscode: value?.vscode ?? DEFAULT_BOTTOM_TABS.vscode,
  };
}

export function firstVisibleTab(tabs: BottomTabVisibility): ToggleableBottomTab {
  return TAB_ORDER.find((t) => tabs[t]) ?? "editor";
}

export interface AppConfig {
  apiKey: string;
  apiKeys?: string[];
  activeKeyIndex?: number;
  selectedModel: string;
  selectedCognitiveMode: AstraCognitiveMode;
  selectedEffort: AstraEffort;
  interactiveApproval: boolean;
  selectedTheme: AppTheme;
  bottomTabs: BottomTabVisibility;
  astraEnabled: boolean;
  hasCompletedStartup?: boolean;
  defaultEditorUi?: EditorUiType;
}

const DEFAULT_CONFIG: AppConfig = {
  apiKey: "",
  apiKeys: [],
  activeKeyIndex: 0,
  selectedModel: DEFAULT_MODEL_ID,
  selectedCognitiveMode: "default",
  selectedEffort: "default",
  interactiveApproval: false,
  selectedTheme: "dark",
  bottomTabs: { ...DEFAULT_BOTTOM_TABS },
  astraEnabled: true,
  hasCompletedStartup: false,
  defaultEditorUi: "native",
};

export function normalizeApiKeys(keys?: string[], fallbackKey?: string): string[] {
  const list: string[] = [];
  if (Array.isArray(keys)) {
    for (const k of keys) {
      const trimmed = (k || "").trim();
      if (trimmed && !list.includes(trimmed)) {
        list.push(trimmed);
      }
    }
  }
  if (fallbackKey) {
    const trimmedFallback = fallbackKey.trim();
    if (trimmedFallback && !list.includes(trimmedFallback)) {
      list.unshift(trimmedFallback);
    }
  }
  return list;
}

export function maskApiKey(key: string): string {
  if (!key) return "";
  const trimmed = key.trim();
  if (trimmed.length <= 8) return trimmed.slice(0, 3) + "...";
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

export async function loadConfig(): Promise<AppConfig> {
  try {
    const info = await getFileInfo(CONFIG_FILE);
    if (info.exists) {
      const data = await readFileText(CONFIG_FILE);
      const parsed = JSON.parse(data);
      delete parsed.showAiButton; // legacy key, superseded by astraEnabled
      const normalizedKeys = normalizeApiKeys(parsed.apiKeys, parsed.apiKey);
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        bottomTabs: normalizeBottomTabs(parsed.bottomTabs),
        astraEnabled: parsed.astraEnabled ?? DEFAULT_CONFIG.astraEnabled,
        apiKeys: normalizedKeys,
        apiKey: normalizedKeys[0] || parsed.apiKey || "",
      };
    }
  } catch (e) {
    console.error("Failed to load config, using defaults:", e);
  }
  return DEFAULT_CONFIG;
}

type ConfigChangeListener = (config: AppConfig) => void;
const configChangeListeners = new Set<ConfigChangeListener>();

export function subscribeConfigChanges(listener: ConfigChangeListener): () => void {
  configChangeListeners.add(listener);
  return () => configChangeListeners.delete(listener);
}

export async function saveConfig(config: Partial<AppConfig>): Promise<void> {
  try {
    const current = await loadConfig();
    const updated = { ...current, ...config };
    
    // Synchronize apiKeys and apiKey
    if (config.apiKeys !== undefined) {
      updated.apiKeys = normalizeApiKeys(config.apiKeys);
      updated.apiKey = updated.apiKeys[0] || "";
    } else if (config.apiKey !== undefined) {
      const trimmed = config.apiKey.trim();
      updated.apiKey = trimmed;
      if (trimmed) {
        updated.apiKeys = normalizeApiKeys([trimmed, ...(current.apiKeys || [])]);
      } else {
        updated.apiKeys = [];
      }
    }

    await writeFileText(CONFIG_FILE, JSON.stringify(updated, null, 2));
    configChangeListeners.forEach((listener) => {
      try {
        listener(updated);
      } catch (e) {
        console.error("Config change listener error:", e);
      }
    });
  } catch (e) {
    console.error("Failed to save config:", e);
  }
}

export async function saveApiKeys(keys: string[]): Promise<void> {
  await saveConfig({ apiKeys: keys });
}

export async function loadApiKeys(): Promise<string[]> {
  const config = await loadConfig();
  return config.apiKeys || (config.apiKey ? [config.apiKey] : []);
}

export async function saveApiKey(apiKey: string): Promise<void> {
  await saveConfig({ apiKey: apiKey.trim() });
}

export async function loadApiKey(): Promise<string> {
  const config = await loadConfig();
  const keys = config.apiKeys || [];
  if (keys.length > 0) {
    const idx = (config.activeKeyIndex ?? 0) % keys.length;
    return keys[idx] || keys[0] || "";
  }
  return config.apiKey || "";
}

export async function rollNextApiKey(): Promise<string> {
  const config = await loadConfig();
  const keys = config.apiKeys || [];
  if (keys.length <= 1) {
    return keys[0] || config.apiKey || "";
  }
  const nextIndex = ((config.activeKeyIndex ?? 0) + 1) % keys.length;
  await saveConfig({ activeKeyIndex: nextIndex });
  return keys[nextIndex];
}

export async function saveSelectedModel(model: string): Promise<void> {
  await saveConfig({ selectedModel: model });
}

export async function loadSelectedModel(): Promise<string> {
  const config = await loadConfig();
  return config.selectedModel || DEFAULT_MODEL_ID;
}

export async function saveCognitiveMode(mode: AstraCognitiveMode): Promise<void> {
  await saveConfig({ selectedCognitiveMode: mode });
}

export async function loadCognitiveMode(): Promise<AstraCognitiveMode> {
  const config = await loadConfig();
  return config.selectedCognitiveMode || "default";
}

export async function saveReasoningEffort(effort: AstraEffort): Promise<void> {
  await saveConfig({ selectedEffort: effort });
}

export async function loadReasoningEffort(): Promise<AstraEffort> {
  const config = await loadConfig();
  return config.selectedEffort || "default";
}

export async function saveInteractiveApproval(enabled: boolean): Promise<void> {
  await saveConfig({ interactiveApproval: enabled });
}

export async function loadInteractiveApproval(): Promise<boolean> {
  const config = await loadConfig();
  return !!config.interactiveApproval;
}

export async function saveTheme(theme: AppTheme): Promise<void> {
  await saveConfig({ selectedTheme: theme });
}

export async function loadTheme(): Promise<AppTheme> {
  const config = await loadConfig();
  return config.selectedTheme || "dark";
}

export async function loadBottomTabs(): Promise<BottomTabVisibility> {
  const config = await loadConfig();
  return normalizeBottomTabs(config.bottomTabs);
}

export async function saveBottomTabs(tabs: BottomTabVisibility): Promise<void> {
  await saveConfig({ bottomTabs: normalizeBottomTabs(tabs) });
}

export async function loadAstraEnabled(): Promise<boolean> {
  const config = await loadConfig();
  return config.astraEnabled ?? true;
}

export async function saveAstraEnabled(enabled: boolean): Promise<void> {
  await saveConfig({ astraEnabled: !!enabled });
}

export async function loadHasCompletedStartup(): Promise<boolean> {
  const config = await loadConfig();
  return !!config.hasCompletedStartup;
}

export async function saveHasCompletedStartup(completed: boolean): Promise<void> {
  await saveConfig({ hasCompletedStartup: completed });
}

export async function loadDefaultEditorUi(): Promise<EditorUiType> {
  const config = await loadConfig();
  return config.defaultEditorUi || "native";
}

export async function saveDefaultEditorUi(editor: EditorUiType): Promise<void> {
  await saveConfig({ defaultEditorUi: editor });
}

