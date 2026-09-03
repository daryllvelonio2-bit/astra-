import * as FileSystem from "expo-file-system/legacy";
import { FileNode } from "../types";
import { PhpEngineService } from "./phpEngineService";
import { PRootService } from "./prootService";
import {
  readDir,
  readDirEntries,
  getFileInfo,
  readFileText,
  writeFileText,
  makeDir,
  deletePath,
  movePath,
} from "./nativeFs";

const WORKSPACES_DIR = `${FileSystem.documentDirectory}workspaces/`;
const REGISTRY_FILE = `${FileSystem.documentDirectory}workspaces_registry.json`;

const IGNORED_FOLDERS = new Set([
  "node_modules",
  "vendor",
  ".git",
  ".next",
  "dist",
  "build",
  ".cache",
  "coverage",
  ".idea",
  ".vscode",
  ".ai",
]);

export interface WorkspaceMeta {
  id: string;
  name: string;
  dirPath?: string;
  template?: string;
  createdAt: number;
}

export interface Workspace {
  id: string;
  name: string;
  root: FileNode;
  dirPath?: string;
}

type WorkspaceChangeListener = (workspaceId: string) => void;
const changeListeners = new Set<WorkspaceChangeListener>();

export function subscribeWorkspaceChanges(listener: WorkspaceChangeListener): () => void {
  changeListeners.add(listener);
  return () => { changeListeners.delete(listener); };
}

export function notifyWorkspaceChanged(workspaceId: string) {
  changeListeners.forEach((l) => {
    try { l(workspaceId); } catch (_) {}
  });
}

export async function ensureWorkspacesDir() {
  try { await makeDir(WORKSPACES_DIR); } catch (e) { console.error("Error ensuring workspaces dir:", e); }
}

export async function loadWorkspaceRegistry(): Promise<Record<string, WorkspaceMeta>> {
  try {
    const text = await readFileText(REGISTRY_FILE);
    if (text) return JSON.parse(text) || {};
  } catch (_) {}
  return {};
}

export async function saveWorkspaceMeta(meta: WorkspaceMeta): Promise<void> {
  try {
    const registry = await loadWorkspaceRegistry();
    registry[meta.id] = meta;
    await writeFileText(REGISTRY_FILE, JSON.stringify(registry, null, 2));
  } catch (_) {}
}

export async function getWorkspaceDirPath(workspaceId: string): Promise<string> {
  const registry = await loadWorkspaceRegistry();
  if (registry[workspaceId]?.dirPath) {
    const p = registry[workspaceId].dirPath!;
    return p.endsWith("/") ? p : `${p}/`;
  }
  return `${WORKSPACES_DIR}${workspaceId}/`;
}

export async function listWorkspaces(): Promise<string[]> {
  await ensureWorkspacesDir();
  const idSet = new Set<string>();
  try { (await readDir(WORKSPACES_DIR)).forEach((d) => idSet.add(d)); } catch (_) {}
  try { Object.keys(await loadWorkspaceRegistry()).forEach((id) => idSet.add(id)); } catch (_) {}
  return Array.from(idSet);
}

export async function listWorkspaceMetas(): Promise<WorkspaceMeta[]> {
  const ids = await listWorkspaces();
  const registry = await loadWorkspaceRegistry();
  return ids.map((id) => registry[id] || {
    id,
    name: id,
    dirPath: `${WORKSPACES_DIR}${id}/`,
    template: "Blank",
    createdAt: Date.now(),
  });
}

export function normalizeCleanPath(p: string): string {
  if (!p) return "";
  return p.trim().replace(/^file:\/\//, "").replace(/\/+/g, "/");
}

export async function readFileContent(workspaceId: string, filePath: string): Promise<string> {
  try {
    const rawBaseDir = await getWorkspaceDirPath(workspaceId);
    const baseDir = normalizeCleanPath(rawBaseDir).replace(/\/+$/, "");
    const cleanFilePath = normalizeCleanPath(filePath);

    let targetFullPath: string;
    if (
      cleanFilePath.startsWith("/") &&
      (cleanFilePath.startsWith(baseDir) ||
        cleanFilePath.startsWith("/sdcard") ||
        cleanFilePath.startsWith("/storage") ||
        cleanFilePath.startsWith("/data"))
    ) {
      targetFullPath = cleanFilePath;
    } else {
      const rel = cleanFilePath.replace(/^\/+/, "");
      targetFullPath = `${baseDir}/${rel}`;
    }

    return await readFileText(targetFullPath);
  } catch (_) {}
  return "";
}

export async function loadWorkspace(workspaceId: string): Promise<Workspace> {
  await ensureWorkspacesDir();
  const workspacePath = await getWorkspaceDirPath(workspaceId);
  await makeDir(workspacePath);

  const root = await readDirectoryRecursive(workspacePath, `${workspaceId}::root`, workspaceId, workspacePath);
  return {
    id: workspaceId,
    name: workspaceId,
    root,
    dirPath: workspacePath,
  };
}

export async function loadOrCreateDefaultWorkspace(): Promise<Workspace> {
  try {
    await ensureWorkspacesDir();
    const dirs = await listWorkspaces();
    if (!dirs || dirs.length === 0) {
      return await createWorkspace("MyFirstProject");
    }
    return await loadWorkspace(dirs[0]);
  } catch (e) {
    return await createWorkspace("MyFirstProject");
  }
}

async function readDirectoryRecursive(
  dirPath: string,
  parentId: string,
  workspaceId: string,
  baseDir: string,
  depth = 0
): Promise<FileNode> {
  if (depth > 6) {
    return { id: parentId, name: parentId, type: "folder", path: "", children: [] };
  }

  const cleanBaseDir = normalizeCleanPath(baseDir).replace(/\/+$/, "");
  const cleanDirPath = normalizeCleanPath(dirPath).replace(/\/+$/, "");

  try {
    const entries = await readDirEntries(cleanDirPath);
    const children: FileNode[] = [];

    for (const entry of entries) {
      if (IGNORED_FOLDERS.has(entry.name)) continue;
      if (entry.name.startsWith(".") && entry.name !== ".env" && entry.name !== ".gitignore" && entry.name !== ".env.example") continue;

      const cleanFullPath = normalizeCleanPath(entry.path);
      let relativePath = cleanFullPath;
      if (cleanFullPath.startsWith(cleanBaseDir)) {
        relativePath = cleanFullPath.slice(cleanBaseDir.length).replace(/^\/+/, "");
      } else {
        relativePath = cleanFullPath.replace(/^\/+/, "");
      }

      const id = `${workspaceId}::${relativePath}`;

      if (entry.isDirectory) {
        const childFolder = await readDirectoryRecursive(`${cleanFullPath}/`, id, workspaceId, cleanBaseDir, depth + 1);
        childFolder.path = relativePath;
        children.push(childFolder);
      } else {
        children.push({
          id,
          name: entry.name,
          type: "file",
          path: relativePath,
          content: "",
        });
      }
    }

    const folderName = cleanDirPath.split("/").filter(Boolean).pop() || workspaceId;
    let relFolder = cleanDirPath;
    if (cleanDirPath.startsWith(cleanBaseDir)) {
      relFolder = cleanDirPath.slice(cleanBaseDir.length).replace(/^\/+/, "");
    }

    return {
      id: parentId,
      name: folderName,
      type: "folder",
      path: relFolder,
      children,
    };
  } catch (e) {
    return { id: parentId, name: workspaceId, type: "folder", path: "", children: [] };
  }
}

export async function createWorkspace(
  name: string,
  template = "Blank",
  customPath?: string
): Promise<Workspace> {
  await ensureWorkspacesDir();
  const folderName = name.trim().replace(/[\/\\]/g, "-");
  const workspaceId = name.toLowerCase().replace(/[^a-z0-9_-]/g, "-");

  let targetDir: string;
  if (customPath && customPath.trim().length > 0) {
    const clean = customPath.trim().replace(/^file:\/\//, "").replace(/\/+$/, "");
    const lastSegment = clean.split("/").filter(Boolean).pop() || "";
    if (lastSegment.toLowerCase() === folderName.toLowerCase() || lastSegment.toLowerCase() === workspaceId) {
      targetDir = `${clean}/`;
    } else {
      targetDir = `${clean}/${folderName}/`;
    }
  } else {
    targetDir = `${WORKSPACES_DIR}${workspaceId}/`;
  }

  await saveWorkspaceMeta({
    id: workspaceId,
    name,
    dirPath: targetDir,
    template,
    createdAt: Date.now(),
  });

  try {
    await makeDir(targetDir);
  } catch (e) {}

  notifyWorkspaceChanged(workspaceId);
  return await loadWorkspace(workspaceId);
}

export async function openExistingDirectoryAsProject(
  dirPath: string,
  customName?: string
): Promise<Workspace> {
  await ensureWorkspacesDir();
  const cleanPath = dirPath.trim().replace(/^file:\/\//, "");
  const normalizedPath = cleanPath.endsWith("/") ? cleanPath : `${cleanPath}/`;

  const folderName = normalizedPath.split("/").filter(Boolean).pop() || "project";
  const name = customName?.trim() || folderName;
  const workspaceId = name.toLowerCase().replace(/[^a-z0-9_-]/g, "-");

  let detectedTemplate = "Custom Project";
  try {
    const entries = await readDirEntries(normalizedPath);
    const fileNames = new Set(entries.map((e) => e.name.toLowerCase()));
    if (fileNames.has("project.godot")) {
      detectedTemplate = "Godot 4 (GDScript)";
    } else if (fileNames.has("package.json")) {
      detectedTemplate = "Node.js / Web";
    } else if (fileNames.has("requirements.txt") || fileNames.has("main.py") || entries.some((e) => e.name.endsWith(".py"))) {
      detectedTemplate = "Python";
    } else if (fileNames.has("composer.json") || fileNames.has("artisan")) {
      detectedTemplate = "PHP / Laravel";
    }
  } catch (_) {}

  await saveWorkspaceMeta({
    id: workspaceId,
    name,
    dirPath: normalizedPath,
    template: detectedTemplate,
    createdAt: Date.now(),
  });

  notifyWorkspaceChanged(workspaceId);
  return await loadWorkspace(workspaceId);
}

export async function saveFileContent(workspaceId: string, filePath: string, content: string): Promise<void> {
  try {
    const rawBaseDir = await getWorkspaceDirPath(workspaceId);
    const baseDir = normalizeCleanPath(rawBaseDir).replace(/\/+$/, "");
    const cleanFilePath = normalizeCleanPath(filePath);

    let targetFullPath: string;
    if (
      cleanFilePath.startsWith("/") &&
      (cleanFilePath.startsWith(baseDir) ||
        cleanFilePath.startsWith("/sdcard") ||
        cleanFilePath.startsWith("/storage") ||
        cleanFilePath.startsWith("/data"))
    ) {
      targetFullPath = cleanFilePath;
    } else {
      const rel = cleanFilePath.replace(/^\/+/, "");
      targetFullPath = `${baseDir}/${rel}`;
    }

    await writeFileText(targetFullPath, content);
    notifyWorkspaceChanged(workspaceId);
  } catch (_) {}
}

export async function createFileInWorkspace(workspaceId: string, fileName: string, content = ""): Promise<FileNode> {
  await saveFileContent(workspaceId, fileName, content);
  const cleanPath = fileName.replace(/^\/+/, "");
  return {
    id: `${workspaceId}::${cleanPath}`,
    name: cleanPath.split("/").pop() || cleanPath,
    type: "file",
    path: cleanPath,
    content,
  };
}

export async function deleteFileFromWorkspace(workspaceId: string, filePath: string): Promise<void> {
  try {
    const rawBaseDir = await getWorkspaceDirPath(workspaceId);
    const baseDir = normalizeCleanPath(rawBaseDir).replace(/\/+$/, "");
    const cleanFilePath = normalizeCleanPath(filePath);

    let targetFullPath: string;
    if (
      cleanFilePath.startsWith("/") &&
      (cleanFilePath.startsWith(baseDir) ||
        cleanFilePath.startsWith("/sdcard") ||
        cleanFilePath.startsWith("/storage") ||
        cleanFilePath.startsWith("/data"))
    ) {
      targetFullPath = cleanFilePath;
    } else {
      const rel = cleanFilePath.replace(/^\/+/, "");
      targetFullPath = `${baseDir}/${rel}`;
    }

    await deletePath(targetFullPath);
    notifyWorkspaceChanged(workspaceId);
  } catch (_) {}
}

export async function deleteNodeInWorkspace(workspaceId: string, nodeOrPath: string | FileNode): Promise<void> {
  let path = typeof nodeOrPath === "string" ? nodeOrPath : (nodeOrPath.path || nodeOrPath.name);
  if (path.startsWith(`${workspaceId}::`)) {
    path = path.slice(workspaceId.length + 2);
  } else if (path.startsWith(`${workspaceId}-`)) {
    path = path.slice(workspaceId.length + 1);
  }
  path = path.replace(/^\/+/, "");
  await deleteFileFromWorkspace(workspaceId, path);
}

export async function renameNodeInWorkspace(
  workspaceId: string,
  oldNodeOrPath: string | FileNode,
  newName: string
): Promise<void> {
  let oldPath = typeof oldNodeOrPath === "string" ? oldNodeOrPath : (oldNodeOrPath.path || oldNodeOrPath.name);
  if (oldPath.startsWith(`${workspaceId}::`)) {
    oldPath = oldPath.slice(workspaceId.length + 2);
  } else if (oldPath.startsWith(`${workspaceId}-`)) {
    oldPath = oldPath.slice(workspaceId.length + 1);
  }
  const cleanOld = normalizeCleanPath(oldPath).replace(/^\/+/, "");
  const parentDir = cleanOld.includes("/") ? cleanOld.substring(0, cleanOld.lastIndexOf("/")) : "";
  const cleanNew = parentDir ? `${parentDir}/${newName}` : newName;

  try {
    const rawBaseDir = await getWorkspaceDirPath(workspaceId);
    const baseDir = normalizeCleanPath(rawBaseDir).replace(/\/+$/, "");
    const fullOld = cleanOld.startsWith("/") ? cleanOld : `${baseDir}/${cleanOld}`;
    const fullNew = `${baseDir}/${cleanNew}`;
    await movePath(fullOld, fullNew);
    notifyWorkspaceChanged(workspaceId);
  } catch (_) {}
}

export async function moveNodeInWorkspace(
  workspaceId: string,
  sourceNodeIdOrPath: string | FileNode,
  targetFolderNodeIdOrPath: string | FileNode | null
): Promise<void> {
  let sourcePath = typeof sourceNodeIdOrPath === "string" ? sourceNodeIdOrPath : (sourceNodeIdOrPath.path || sourceNodeIdOrPath.name);
  if (sourcePath.startsWith(`${workspaceId}::`)) {
    sourcePath = sourcePath.slice(workspaceId.length + 2);
  } else if (sourcePath.startsWith(`${workspaceId}-`)) {
    sourcePath = sourcePath.slice(workspaceId.length + 1);
  }
  sourcePath = normalizeCleanPath(sourcePath).replace(/^\/+/, "");

  let targetFolder = "";
  if (targetFolderNodeIdOrPath) {
    targetFolder = typeof targetFolderNodeIdOrPath === "string" ? targetFolderNodeIdOrPath : (targetFolderNodeIdOrPath.path || targetFolderNodeIdOrPath.name);
    if (targetFolder.startsWith(`${workspaceId}::`)) {
      targetFolder = targetFolder.slice(workspaceId.length + 2);
    } else if (targetFolder.startsWith(`${workspaceId}-`)) {
      targetFolder = targetFolder.slice(workspaceId.length + 1);
    }
    if (targetFolder === "root" || targetFolder.endsWith("::root")) {
      targetFolder = "";
    }
    targetFolder = normalizeCleanPath(targetFolder).replace(/^\/+/, "");
  }

  const fileName = sourcePath.split("/").pop() || sourcePath;
  const newPath = targetFolder ? `${targetFolder}/${fileName}` : fileName;

  if (sourcePath === newPath) return;

  try {
    const rawBaseDir = await getWorkspaceDirPath(workspaceId);
    const baseDir = normalizeCleanPath(rawBaseDir).replace(/\/+$/, "");
    const fullSource = sourcePath.startsWith("/") ? sourcePath : `${baseDir}/${sourcePath}`;
    const fullTarget = newPath.startsWith("/") ? newPath : `${baseDir}/${newPath}`;
    await movePath(fullSource, fullTarget);
    notifyWorkspaceChanged(workspaceId);
  } catch (e) {
    console.error("Error moving node in workspace:", e);
  }
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  try {
    const workspacePath = await getWorkspaceDirPath(workspaceId);
    await deletePath(workspacePath);

    // Clean up registry
    try {
      const registry = await loadWorkspaceRegistry();
      if (registry[workspaceId]) {
        delete registry[workspaceId];
        await writeFileText(REGISTRY_FILE, JSON.stringify(registry, null, 2));
      }
    } catch (_) {}

    // Clean up isolated conversation storage for this workspace
    try {
      const safeId = (workspaceId || "default").replace(/[^a-zA-Z0-9_-]/g, "_");
      const convFile = `${FileSystem.documentDirectory}conversations/${safeId}.json`;
      await deletePath(convFile);
    } catch (_) {}

    notifyWorkspaceChanged(workspaceId);
  } catch (_) {}
}
