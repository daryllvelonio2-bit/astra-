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
  if (isExternalPath(cleanPath)) {
    const nativeList = readDirectoryNative(cleanPath);
    return nativeList.map((e) => e.name);
  }

  try {
    const res = await FileSystem.readDirectoryAsync(cleanPath);
    return res || [];
  } catch (_) {
    const nativeList = readDirectoryNative(cleanPath);
    return nativeList.map((e) => e.name);
  }
}

export async function readDirEntries(dirPath: string): Promise<NativeDirEntry[]> {
  const cleanPath = dirPath.endsWith("/") ? dirPath : `${dirPath}/`;
  const nativeList = readDirectoryNative(cleanPath);
  if (nativeList && nativeList.length > 0) {
    return nativeList;
  }

  if (!isExternalPath(cleanPath)) {
    try {
      const files = await FileSystem.readDirectoryAsync(cleanPath);
      const entries: NativeDirEntry[] = [];
      for (const item of files) {
        try {
          const itemPath = `${cleanPath}${item}`;
          const info = await FileSystem.getInfoAsync(itemPath);
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
  if (isExternalPath(filePath)) {
    return getFileInfoNative(filePath);
  }

  try {
    const info = await FileSystem.getInfoAsync(filePath);
    if (info.exists) {
      return {
        exists: true,
        isDirectory: !!info.isDirectory,
        size: info.size || 0,
        path: filePath,
        lastModified: info.modificationTime ? info.modificationTime * 1000 : undefined,
      };
    }
    return {
      exists: false,
      isDirectory: false,
      size: 0,
      path: filePath,
    };
  } catch (_) {
    return getFileInfoNative(filePath);
  }
}

export async function readFileText(filePath: string): Promise<string> {
  if (isExternalPath(filePath)) {
    return readFileNative(filePath);
  }

  try {
    return await FileSystem.readAsStringAsync(filePath);
  } catch (_) {
    return readFileNative(filePath);
  }
}

export async function writeFileText(filePath: string, content: string): Promise<boolean> {
  if (isExternalPath(filePath)) {
    return writeFileNative(filePath, content);
  }

  try {
    const parentDir = filePath.substring(0, filePath.lastIndexOf("/"));
    if (parentDir) {
      await FileSystem.makeDirectoryAsync(parentDir, { intermediates: true });
    }
    await FileSystem.writeAsStringAsync(filePath, content);
    return true;
  } catch (_) {
    return writeFileNative(filePath, content);
  }
}

export async function makeDir(dirPath: string): Promise<boolean> {
  if (isExternalPath(dirPath)) {
    return makeDirectoryNative(dirPath);
  }

  try {
    await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
    return true;
  } catch (_) {
    return makeDirectoryNative(dirPath);
  }
}

export async function deletePath(targetPath: string): Promise<boolean> {
  if (isExternalPath(targetPath)) {
    return deletePathNative(targetPath);
  }

  try {
    await FileSystem.deleteAsync(targetPath, { idempotent: true });
    return true;
  } catch (_) {
    return deletePathNative(targetPath);
  }
}

export async function movePath(fromPath: string, toPath: string): Promise<boolean> {
  if (isExternalPath(fromPath) || isExternalPath(toPath)) {
    return movePathNative(fromPath, toPath);
  }

  try {
    const parentTargetDir = toPath.substring(0, toPath.lastIndexOf("/"));
    if (parentTargetDir) {
      await FileSystem.makeDirectoryAsync(parentTargetDir, { intermediates: true });
    }
    await FileSystem.moveAsync({ from: fromPath, to: toPath });
    return true;
  } catch (_) {
    return movePathNative(fromPath, toPath);
  }
}
