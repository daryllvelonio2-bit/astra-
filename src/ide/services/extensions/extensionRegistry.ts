import * as FileSystem from "expo-file-system/legacy";
import {
  ExtensionMarketplaceItem,
  ExtensionRegistryState,
  ExtensionSnippet,
  ExtensionTheme,
  InstalledExtension,
} from "./types";
import { downloadAndExtractVsix, readExtensionJson } from "./vsixExtractor";
import { deletePath, makeDir, writeFileText } from "../nativeFs";

function getRegistryFilePath(): string {
  const base = FileSystem.documentDirectory || "/data/user/0/com.janelle.aicoder/files/";
  return `${base.replace(/\/+$/, "")}/extensions/registry.json`;
}

let cachedState: ExtensionRegistryState | null = null;
const listeners = new Set<(state: ExtensionRegistryState) => void>();

export function subscribeExtensionRegistry(fn: (state: ExtensionRegistryState) => void) {
  listeners.add(fn);
  if (cachedState) fn(cachedState);
  return () => listeners.delete(fn);
}

function notifyListeners(state: ExtensionRegistryState) {
  cachedState = state;
  listeners.forEach((fn) => {
    try {
      fn(state);
    } catch {}
  });
}

/**
 * Loads registry state from storage.
 */
export async function loadExtensionRegistry(): Promise<ExtensionRegistryState> {
  if (cachedState) return cachedState;

  const regPath = getRegistryFilePath();
  try {
    const info = await FileSystem.getInfoAsync(regPath);
    if (info.exists) {
      const content = await FileSystem.readAsStringAsync(regPath);
      const parsed = JSON.parse(content);
      cachedState = {
        installed: parsed.installed || {},
        activeThemeId: parsed.activeThemeId,
      };
      return cachedState;
    }
  } catch {}

  cachedState = { installed: {} };
  return cachedState;
}

/**
 * Persists registry state to storage.
 */
async function saveExtensionRegistry(state: ExtensionRegistryState): Promise<void> {
  const regPath = getRegistryFilePath();
  const dir = regPath.substring(0, regPath.lastIndexOf("/"));
  await makeDir(dir);
  await writeFileText(regPath, JSON.stringify(state, null, 2));
  notifyListeners(state);
}

/**
 * Installs a new extension from marketplace.
 */
export async function installExtension(
  item: ExtensionMarketplaceItem,
  onProgress?: (percent: number, status: string) => void
): Promise<InstalledExtension> {
  const installed = await downloadAndExtractVsix(item, onProgress);
  const state = await loadExtensionRegistry();
  state.installed[installed.id] = installed;
  await saveExtensionRegistry(state);
  return installed;
}

/**
 * Uninstalls an extension and removes its local assets.
 */
export async function uninstallExtension(id: string): Promise<boolean> {
  const state = await loadExtensionRegistry();
  const ext = state.installed[id];
  if (!ext) return false;

  try {
    await deletePath(ext.installDir);
  } catch {}

  delete state.installed[id];
  if (state.activeThemeId?.startsWith(id)) {
    delete state.activeThemeId;
  }
  await saveExtensionRegistry(state);
  return true;
}

/**
 * Toggles an extension on/off.
 */
export async function toggleExtension(id: string): Promise<boolean> {
  const state = await loadExtensionRegistry();
  const ext = state.installed[id];
  if (!ext) return false;

  ext.enabled = !ext.enabled;
  await saveExtensionRegistry(state);
  return ext.enabled;
}

/**
 * Collects all snippets from enabled extensions matching a given language or file extension.
 */
export async function getInstalledSnippets(fileExtension?: string): Promise<ExtensionSnippet[]> {
  const state = await loadExtensionRegistry();
  const allSnippets: ExtensionSnippet[] = [];

  const extNorm = (fileExtension || "").replace(/^\./, "").toLowerCase();

  for (const ext of Object.values(state.installed)) {
    if (!ext.enabled || !ext.snippets) continue;

    for (const snip of ext.snippets) {
      const fullPath = `${ext.installDir}/${snip.path}`;
      const data = await readExtensionJson<Record<string, any>>(fullPath);
      if (!data) continue;

      for (const [key, val] of Object.entries(data)) {
        if (!val || !val.prefix) continue;

        // Check if snippet matches file extension / language if specified
        if (snip.language) {
          const lang = snip.language.toLowerCase();
          if (extNorm && !isLanguageMatch(lang, extNorm)) {
            continue;
          }
        }

        allSnippets.push({
          prefix: Array.isArray(val.prefix) ? val.prefix[0] : val.prefix,
          body: val.body,
          description: val.description || key,
          scope: val.scope,
        });
      }
    }
  }

  return allSnippets;
}

function isLanguageMatch(snippetLang: string, fileExt: string): boolean {
  const map: Record<string, string[]> = {
    javascript: ["js", "jsx", "mjs"],
    typescript: ["ts", "tsx"],
    javascriptreact: ["jsx", "tsx", "js"],
    typescriptreact: ["tsx", "ts"],
    python: ["py"],
    rust: ["rs"],
    go: ["go"],
    c: ["c", "h"],
    cpp: ["cpp", "hpp", "cc", "cxx"],
    html: ["html", "htm"],
    css: ["css", "scss", "less"],
    json: ["json"],
  };

  const matches = map[snippetLang] || [snippetLang];
  return matches.includes(fileExt);
}

/**
 * Retrieves all themes from all enabled extensions.
 */
export async function getInstalledThemes(): Promise<
  Array<{ id: string; label: string; theme: ExtensionTheme; themeData: any }>
> {
  const state = await loadExtensionRegistry();
  const results: Array<{ id: string; label: string; theme: ExtensionTheme; themeData: any }> = [];

  for (const ext of Object.values(state.installed)) {
    if (!ext.enabled || !ext.themes) continue;

    for (const t of ext.themes) {
      const fullPath = `${ext.installDir}/${t.path}`;
      const data = await readExtensionJson(fullPath);
      if (data) {
        results.push({
          id: t.id,
          label: `${t.label} (${ext.displayName})`,
          theme: t,
          themeData: data,
        });
      }
    }
  }

  return results;
}
