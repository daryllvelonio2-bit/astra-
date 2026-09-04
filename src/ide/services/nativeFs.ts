import * as FileSystem from "expo-file-system/legacy";
import {
  readDirectoryNative,
  getFileInfoNative,
  readFileNative,
  writeFileNative,
  makeDirectoryNative,
  deletePathNative,
  movePathNative,
  hasAllFilesPermission,
  requestAllFilesPermission,
  NativeDirEntry,
  NativeFileInfo,
} from "../../../modules/linux-runner/src";

export {
  hasAllFilesPermission,
  requestAllFilesPermission,
  NativeDirEntry,
  NativeFileInfo,
};

const FS_OP_TIMEOUT_MS = 3000;

/**
 * Sync native calls settle instantly and can never pend, so they go first;
 * expo is only a fallback raced against a timeout. (expo stalls mid-session
 * while tasks run — expo-first cost ~24s of dead waiting on every open.)
 * expo resolves void for writes: success is `undefined`, timeout is `null`.
 */
function fsRace<T>(promise: Promise<T>, ms = FS_OP_TIMEOUT_MS): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

function isExternalPath(path: string): boolean {
  const clean = path.replace(/^file:\/\//, "");
  if (!clean.startsWith("/")) return false;
  if (FileSystem.documentDirectory) {
    const cleanDocDir = FileSystem.documentDirectory.replace(/^file:\/\//, "");
    if (clean.startsWith(cleanDocDir)) {
      return false;
    }
  }
  return true;
}

export async function readDir(dirPath: string): Promise<string[]> {
  const cleanPath = dirPath.endsWith("/") ? dirPath : `${dirPath}/`;
  const nativeFirst = readDirectoryNative(cleanPath);
  if (nativeFirst.length > 0 || isExternalPath(cleanPath)) {
    return nativeFirst.map((e) => e.name);
  }

  try {
    const res = await fsRace(FileSystem.readDirectoryAsync(cleanPath));
    if (res) return res;
  } catch (_) {}
  return nativeFirst.map((e) => e.name);
}

export async function readDirEntries(dirPath: string): Promise<NativeDirEntry[]> {
  const cleanPath = dirPath.endsWith("/") ? dirPath : `${dirPath}/`;
  const nativeList = readDirectoryNative(cleanPath);
  if (nativeList && nativeList.length > 0) {
    return nativeList;
  }

  if (!isExternalPath(cleanPath)) {
    try {
      const files = await fsRace(FileSystem.readDirectoryAsync(cleanPath));
      if (!files) return [];
      const entries: NativeDirEntry[] = [];
      for (const item of files) {
        try {
          const itemPath = `${cleanPath}${item}`;
          const info = await fsRace(FileSystem.getInfoAsync(itemPath));
          if (!info) continue;
          entries.push({
            name: item,
            path: itemPath,
            isDirectory: info.exists ? !!info.isDirectory : false,
            size: info.exists ? (info.size || 0) : 0,
            lastModified: info.exists && info.modificationTime ? info.modificationTime * 1000 : Date.now(),
          });
        } catch (_) {}
      }
      return entries;
    } catch (_) {}
  }
  return [];
}

export async function getFileInfo(filePath: string): Promise<NativeFileInfo> {
  return getFileInfoNative(filePath);
}

export async function readFileText(filePath: string): Promise<string> {
  if (!isExternalPath(filePath)) {
    const nativeText = readFileNative(filePath);
    if (nativeText) return nativeText;
  } else {
    return readFileNative(filePath);
  }

  try {
    const text = await fsRace(FileSystem.readAsStringAsync(filePath));
    if (text !== null) return text;
  } catch (_) {}
  return readFileNative(filePath);
}

export async function writeFileText(filePath: string, content: string): Promise<boolean> {
  if (!isExternalPath(filePath) && writeFileNative(filePath, content)) return true;

  try {
    const parentDir = filePath.substring(0, filePath.lastIndexOf("/"));
    if (parentDir) {
      await fsRace(FileSystem.makeDirectoryAsync(parentDir, { intermediates: true }));
    }
    if ((await fsRace(FileSystem.writeAsStringAsync(filePath, content))) !== null) return true;
  } catch (_) {}
  return isExternalPath(filePath) ? writeFileNative(filePath, content) : false;
}

export async function makeDir(dirPath: string): Promise<boolean> {
  if (makeDirectoryNative(dirPath)) return true;

  try {
    if ((await fsRace(FileSystem.makeDirectoryAsync(dirPath, { intermediates: true }))) !== null) return true;
  } catch (_) {}
  return false;
}

export async function deletePath(targetPath: string): Promise<boolean> {
  if (deletePathNative(targetPath)) return true;

  try {
    if ((await fsRace(FileSystem.deleteAsync(targetPath, { idempotent: true }))) !== null) return true;
  } catch (_) {}
  return false;
}

export async function movePath(fromPath: string, toPath: string): Promise<boolean> {
  if (movePathNative(fromPath, toPath)) return true;

  try {
    const parentTargetDir = toPath.substring(0, toPath.lastIndexOf("/"));
    if (parentTargetDir) {
      await fsRace(FileSystem.makeDirectoryAsync(parentTargetDir, { intermediates: true }));
    }
    if ((await fsRace(FileSystem.moveAsync({ from: fromPath, to: toPath }))) !== null) return true;
  } catch (_) {}
  return false;
}
