import JSZip from "jszip";
import * as FileSystem from "expo-file-system/legacy";
import {
  ExtensionMarketplaceItem,
  InstalledExtension,
  ExtensionTheme,
  ExtensionLanguageConfig,
} from "./types";
import { writeFileText, makeDir } from "../nativeFs";
import { executeCommand } from "../../../../modules/linux-runner/src";


function getBaseExtensionDir(): string {
  const base = FileSystem.documentDirectory || "/data/user/0/com.janelle.aicoder/files/";
  return `${base.replace(/\/+$/, "")}/extensions`;
}

/**
 * Downloads a .vsix binary file and extracts its declarative assets (themes, snippets, grammars).
 */
export async function downloadAndExtractVsix(
  item: ExtensionMarketplaceItem,
  onProgress?: (percent: number, status: string) => void
): Promise<InstalledExtension> {
  onProgress?.(10, "Downloading extension package...");

  const response = await fetch(item.downloadUrl, {
    headers: { "User-Agent": "Astra-Mobile-IDE/1.0" },
  });

  if (!response.ok) {
    throw new Error(`Failed to download ${item.displayName}: HTTP ${response.status}`);
  }

  onProgress?.(40, "Reading package binary...");
  const arrayBuffer = await response.arrayBuffer();

  onProgress?.(60, "Unpacking VSIX archive...");
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Look for extension/package.json
  const pkgFile = zip.file("extension/package.json") || zip.file("package.json");
  if (!pkgFile) {
    throw new Error("Invalid VSIX: package.json not found in archive");
  }

  const pkgJsonStr = await pkgFile.async("string");
  const pkg = JSON.parse(pkgJsonStr);

  const baseDir = getBaseExtensionDir();
  const installDir = `${baseDir}/${item.id}`;
  await makeDir(installDir);

  const contributes = pkg.contributes || {};

  // 1. Process Themes
  const rawThemes: any[] = Array.isArray(contributes.themes) ? contributes.themes : [];
  const themes: ExtensionTheme[] = [];
  for (const t of rawThemes) {
    const themePath = (t.path || "").replace(/^\.\//, "");
    const zipPath = zip.file(`extension/${themePath}`)
      ? `extension/${themePath}`
      : zip.file(themePath)
      ? themePath
      : null;

    if (zipPath) {
      const content = await zip.file(zipPath)!.async("string");
      const targetFile = `${installDir}/${themePath}`;
      await writeFileText(targetFile, content);

      themes.push({
        id: `${item.id}.${t.label || t.id || "theme"}`,
        label: t.label || t.id || "Custom Theme",
        uiTheme: t.uiTheme || "vs-dark",
        path: themePath,
      });
    }
  }

  // 2. Process Snippets
  const rawSnippets: any[] = Array.isArray(contributes.snippets) ? contributes.snippets : [];
  const snippets: Array<{ language?: string; path: string }> = [];
  for (const s of rawSnippets) {
    const snipPath = (s.path || "").replace(/^\.\//, "");
    const zipPath = zip.file(`extension/${snipPath}`)
      ? `extension/${snipPath}`
      : zip.file(snipPath)
      ? snipPath
      : null;

    if (zipPath) {
      const content = await zip.file(zipPath)!.async("string");
      const targetFile = `${installDir}/${snipPath}`;
      await writeFileText(targetFile, content);

      snippets.push({
        language: s.language,
        path: snipPath,
      });
    }
  }

  // 3. Process Languages
  const rawLanguages: any[] = Array.isArray(contributes.languages) ? contributes.languages : [];
  const languages: ExtensionLanguageConfig[] = rawLanguages.map((l: any) => ({
    id: l.id,
    extensions: l.extensions,
    aliases: l.aliases,
    filenames: l.filenames,
    configuration: l.configuration,
  }));

  // 4. Process Binaries & Executable Tools (e.g. extension/bin/pyrefly)
  const binaries: string[] = [];
  const binDir = `${installDir}/bin`;
  let hasBinDir = false;

  const fileKeys = Object.keys(zip.files);
  for (const k of fileKeys) {
    if (k.startsWith("extension/bin/") && !zip.files[k].dir) {
      const fileName = k.replace(/^extension\/bin\//, "");
      if (!hasBinDir) {
        await makeDir(binDir);
        hasBinDir = true;
      }
      const b64 = await zip.files[k].async("base64");
      const targetBin = `${binDir}/${fileName}`;
      await FileSystem.writeAsStringAsync(targetBin, b64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      binaries.push(fileName);

      // Deploy binary directly to Linux PRoot environment
      try {
        // 1. Place in tmp/ so PRoot's /tmp mount can access it directly
        const tmpBin = `${FileSystem.documentDirectory}tmp/${fileName}`;
        await FileSystem.writeAsStringAsync(tmpBin, b64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // 2. Also write directly to alpine rootfs usr/local/bin if it exists
        const alpineBin = `${FileSystem.documentDirectory}alpine/usr/local/bin/${fileName}`;
        try {
          await FileSystem.writeAsStringAsync(alpineBin, b64, {
            encoding: FileSystem.EncodingType.Base64,
          });
        } catch {}

        // 3. Ensure permissions and path in PRoot
        await executeCommand(
          `cp -f "/tmp/${fileName}" "/usr/local/bin/${fileName}" 2>/dev/null || true; ` +
          `chmod +x "/usr/local/bin/${fileName}" 2>/dev/null || true; ` +
          `mkdir -p "/root/.local/bin" 2>/dev/null || true; ` +
          `cp -f "/usr/local/bin/${fileName}" "/root/.local/bin/${fileName}" 2>/dev/null || true; ` +
          `chmod +x "/root/.local/bin/${fileName}" 2>/dev/null || true; ` +
          `rm -f "/tmp/${fileName}" 2>/dev/null || true`
        );
      } catch {}
    }
  }

  // Mirror into code-server extensions dir so VS Code Web also recognizes it
  try {
    const codeServerExtDir = `/root/.local/share/code-server/extensions/${item.id}`;
    await executeCommand(
      `mkdir -p "${codeServerExtDir}" && cp -rf "${installDir}/"* "${codeServerExtDir}/" 2>/dev/null || true`
    );
  } catch {}

  // Save extension manifest to disk
  await writeFileText(`${installDir}/package.json`, pkgJsonStr);

  onProgress?.(100, "Installation complete!");

  return {
    id: item.id,
    displayName: item.displayName || pkg.displayName || item.name,
    description: item.description || pkg.description || "",
    version: item.version || pkg.version || "1.0.0",
    publisher: item.publisher || item.namespace,
    iconUrl: item.iconUrl,
    enabled: true,
    installedAt: Date.now(),
    installDir,
    themes,
    snippets,
    languages,
    binaries,
  };
}


/**
 * Reads a JSON file from an installed extension directory.
 */
export async function readExtensionJson<T = any>(filePath: string): Promise<T | null> {
  try {
    const exists = await FileSystem.getInfoAsync(filePath);
    if (!exists.exists) return null;
    const content = await FileSystem.readAsStringAsync(filePath);
    // Strip possible comments from jsonc
    const cleaned = content.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}
