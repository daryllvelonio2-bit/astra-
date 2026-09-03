import { requireNativeModule, EventEmitter } from 'expo-modules-core';

let LinuxRunnerModule: any = null;
try {
  LinuxRunnerModule = requireNativeModule('LinuxRunner');
} catch (_) {
  LinuxRunnerModule = null;
}

const emitter: any = new EventEmitter(LinuxRunnerModule ?? {});

export interface ExecutionResult {
  stdout: string;
  exitCode: number;
}

export async function isEnvironmentReady(): Promise<boolean> {
  if (LinuxRunnerModule?.isEnvironmentReady) {
    try {
      return await LinuxRunnerModule.isEnvironmentReady();
    } catch (_) {
      return false;
    }
  }
  return false;
}

export async function initializeEnvironment(): Promise<boolean> {
  if (LinuxRunnerModule?.initializeEnvironment) {
    try {
      return await LinuxRunnerModule.initializeEnvironment();
    } catch (_) {
      return false;
    }
  }
  return true;
}

export async function executeCommand(
  command: string,
  workspaceId?: string
): Promise<ExecutionResult> {
  if (LinuxRunnerModule?.executeCommand) {
    try {
      return await LinuxRunnerModule.executeCommand(command, workspaceId ?? null);
    } catch (e: any) {
      return { stdout: `Error executing command: ${e.message}`, exitCode: -1 };
    }
  }
  return { stdout: `[LinuxRunner Fallback] Simulated execution: ${command}`, exitCode: 0 };
}

export async function executeCommandStream(
  commandId: string,
  command: string,
  workspaceId?: string
): Promise<ExecutionResult> {
  if (LinuxRunnerModule?.executeCommandStream) {
    try {
      return await LinuxRunnerModule.executeCommandStream(commandId, command, workspaceId ?? null);
    } catch (e: any) {
      return { stdout: `Error executing command stream: ${e.message}`, exitCode: -1 };
    }
  }
  return executeCommand(command, workspaceId);
}

export function stopCommand(commandId: string): boolean {
  if (LinuxRunnerModule?.stopCommand) {
    try {
      return LinuxRunnerModule.stopCommand(commandId);
    } catch (e) {
      console.warn("Failed to stop command", e);
    }
  }
  return false;
}

export function stopAllCommands(): boolean {
  if (LinuxRunnerModule?.stopAllCommands) {
    try {
      return LinuxRunnerModule.stopAllCommands();
    } catch (e) {
      console.warn("Failed to stop all commands", e);
    }
  }
  return false;
}

export async function startTerminalSession(
  sessionId: string,
  workspaceId?: string
): Promise<void> {
  if (LinuxRunnerModule?.startTerminalSession) {
    try {
      await LinuxRunnerModule.startTerminalSession(sessionId, workspaceId ?? null);
    } catch (e) {
      console.warn("Failed to start native terminal session", e);
    }
  }
}

export function writeTerminalInput(sessionId: string, data: string): void {
  if (LinuxRunnerModule?.writeTerminalInput) {
    try {
      LinuxRunnerModule.writeTerminalInput(sessionId, data);
    } catch (e) {
      console.warn("Failed to write terminal input", e);
    }
  }
}

export async function getSessionHistory(sessionId: string): Promise<string> {
  if (LinuxRunnerModule?.getSessionHistory) {
    try {
      return (await LinuxRunnerModule.getSessionHistory(sessionId)) || "";
    } catch (_) {
      return "";
    }
  }
  return "";
}

export async function listActiveSessions(): Promise<string[]> {
  if (LinuxRunnerModule?.listActiveSessions) {
    try {
      return (await LinuxRunnerModule.listActiveSessions()) || [];
    } catch (_) {
      return [];
    }
  }
  return [];
}

export async function stopTerminalSession(sessionId: string): Promise<void> {
  if (LinuxRunnerModule?.stopTerminalSession) {
    try {
      await LinuxRunnerModule.stopTerminalSession(sessionId);
    } catch (e) {
      console.warn("Failed to stop terminal session", e);
    }
  }
}

export function addTerminalDataListener(
  sessionId: string,
  listener: (data: string) => void
): { remove: () => void } {
  if (LinuxRunnerModule) {
    const sub = emitter.addListener("onTerminalData", (event: { sessionId: string; data: string }) => {
      if (event && event.sessionId === sessionId && typeof event.data === "string") {
        listener(event.data);
      }
    });
    return sub;
  }
  // Fallback mock listener for web / Expo Go simulation
  const timer = setTimeout(() => {
    listener("\r\nastra:/workspace# ");
  }, 100);
  return {
    remove: () => clearTimeout(timer),
  };
}

export function addCommandOutputListener(
  commandId: string,
  listener: (line: string) => void
): { remove: () => void } {
  if (LinuxRunnerModule) {
    const sub = emitter.addListener("onCommandOutput", (event: { commandId: string; line: string }) => {
      if (event && event.commandId === commandId && typeof event.line === "string") {
        listener(event.line);
      }
    });
    return sub;
  }
  return {
    remove: () => {},
  };
}

// High-level utility helpers
export async function installPackages(
  packages: string[],
  workspaceId?: string
): Promise<ExecutionResult> {
  return executeCommand(`apk add --no-cache ${packages.join(" ")}`, workspaceId);
}

export async function runArtisan(
  projectPath: string,
  args: string[]
): Promise<ExecutionResult> {
  return executeCommand(`cd /workspace/${projectPath} && php artisan ${args.join(" ")}`);
}

export function copyToClipboard(text: string): boolean {
  if (LinuxRunnerModule?.copyToClipboard) {
    try {
      return LinuxRunnerModule.copyToClipboard(text);
    } catch (_) {
      return false;
    }
  }
  return false;
}

export function getStringFromClipboard(): string {
  if (LinuxRunnerModule?.getStringFromClipboard) {
    try {
      return LinuxRunnerModule.getStringFromClipboard();
    } catch (_) {
      return "";
    }
  }
  return "";
}

// System Floating Chat Head Overlay APIs
export async function checkOverlayPermission(): Promise<boolean> {
  if (LinuxRunnerModule?.checkOverlayPermission) {
    try {
      return await LinuxRunnerModule.checkOverlayPermission();
    } catch (_) {
      return false;
    }
  }
  return false;
}

export async function requestOverlayPermission(): Promise<boolean> {
  if (LinuxRunnerModule?.requestOverlayPermission) {
    try {
      return await LinuxRunnerModule.requestOverlayPermission();
    } catch (_) {
      return false;
    }
  }
  return false;
}

export async function startFloatingOverlay(options?: {
  workspaceId?: string;
  activeFileName?: string;
}): Promise<boolean> {
  if (LinuxRunnerModule?.startFloatingOverlay) {
    try {
      return await LinuxRunnerModule.startFloatingOverlay(options ?? null);
    } catch (e) {
      console.warn("Failed to start floating overlay:", e);
      return false;
    }
  }
  return false;
}

export async function stopFloatingOverlay(): Promise<boolean> {
  if (LinuxRunnerModule?.stopFloatingOverlay) {
    try {
      return await LinuxRunnerModule.stopFloatingOverlay();
    } catch (_) {
      return false;
    }
  }
  return false;
}

export async function isFloatingOverlayRunning(): Promise<boolean> {
  if (LinuxRunnerModule?.isFloatingOverlayRunning) {
    try {
      return await LinuxRunnerModule.isFloatingOverlayRunning();
    } catch (_) {
      return false;
    }
  }
  return false;
}

export async function collapseOverlay(): Promise<boolean> {
  if (LinuxRunnerModule?.collapseOverlay) {
    try {
      return await LinuxRunnerModule.collapseOverlay();
    } catch (_) {
      return false;
    }
  }
  return false;
}

export async function expandOverlay(): Promise<boolean> {
  if (LinuxRunnerModule?.expandOverlay) {
    try {
      return await LinuxRunnerModule.expandOverlay();
    } catch (_) {
      return false;
    }
  }
  return false;
}

export async function openMainApp(): Promise<boolean> {
  if (LinuxRunnerModule?.openMainApp) {
    try {
      return await LinuxRunnerModule.openMainApp();
    } catch (_) {
      return false;
    }
  }
  return false;
}

let nodeFs: any = null;
let nodePath: any = null;
try {
  nodeFs = require('fs');
  nodePath = require('path');
} catch (_) {
  nodeFs = null;
  nodePath = null;
}

function cleanPath(raw: string): string {
  let p = (raw || "").trim();
  if (p.startsWith("file://")) {
    p = p.substring(7);
  }
  return p;
}

export interface NativeDirEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  lastModified: number;
}

export interface NativeFileInfo {
  exists: boolean;
  isDirectory: boolean;
  size: number;
  path: string;
  lastModified?: number;
}

export function readDirectoryNative(rawPath: string): NativeDirEntry[] {
  if (LinuxRunnerModule?.readDirectory) {
    try {
      return LinuxRunnerModule.readDirectory(rawPath) || [];
    } catch (_) {}
  }
  if (nodeFs && nodePath) {
    try {
      const p = cleanPath(rawPath);
      if (!nodeFs.existsSync(p)) return [];
      const entries = nodeFs.readdirSync(p, { withFileTypes: true });
      return entries.map((e: any) => {
        const fullPath = nodePath.join(p, e.name);
        let stat: any = {};
        try {
          stat = nodeFs.statSync(fullPath);
        } catch (_) {}
        return {
          name: e.name,
          path: fullPath,
          isDirectory: e.isDirectory(),
          size: e.isFile() ? (stat.size || 0) : 0,
          lastModified: stat.mtimeMs || Date.now(),
        };
      }).sort((a: any, b: any) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? 1 : -1;
        return a.name.localeCompare(b.name);
      });
    } catch (_) {}
  }
  return [];
}

export function getFileInfoNative(rawPath: string): NativeFileInfo {
  if (LinuxRunnerModule?.getFileInfo) {
    try {
      return LinuxRunnerModule.getFileInfo(rawPath) || { exists: false, isDirectory: false, size: 0, path: rawPath };
    } catch (_) {}
  }
  if (nodeFs) {
    try {
      const p = cleanPath(rawPath);
      const exists = nodeFs.existsSync(p);
      if (!exists) {
        return { exists: false, isDirectory: false, size: 0, path: p };
      }
      const stat = nodeFs.statSync(p);
      return {
        exists: true,
        isDirectory: stat.isDirectory(),
        size: stat.isFile() ? stat.size : 0,
        path: p,
        lastModified: stat.mtimeMs,
      };
    } catch (_) {}
  }
  return { exists: false, isDirectory: false, size: 0, path: rawPath };
}

export function readFileNative(rawPath: string): string {
  if (LinuxRunnerModule?.readFile) {
    try {
      return LinuxRunnerModule.readFile(rawPath) || "";
    } catch (_) {}
  }
  if (nodeFs) {
    try {
      const p = cleanPath(rawPath);
      if (nodeFs.existsSync(p)) {
        return nodeFs.readFileSync(p, 'utf8') || "";
      }
    } catch (_) {}
  }
  return "";
}

export function writeFileNative(rawPath: string, content: string): boolean {
  if (LinuxRunnerModule?.writeFile) {
    try {
      return LinuxRunnerModule.writeFile(rawPath, content) || false;
    } catch (_) {}
  }
  if (nodeFs && nodePath) {
    try {
      const p = cleanPath(rawPath);
      const parentDir = nodePath.dirname(p);
      nodeFs.mkdirSync(parentDir, { recursive: true });
      nodeFs.writeFileSync(p, content, 'utf8');
      return true;
    } catch (_) {}
  }
  return false;
}

export function makeDirectoryNative(rawPath: string): boolean {
  if (LinuxRunnerModule?.makeDirectory) {
    try {
      return LinuxRunnerModule.makeDirectory(rawPath) || false;
    } catch (_) {}
  }
  if (nodeFs) {
    try {
      const p = cleanPath(rawPath);
      nodeFs.mkdirSync(p, { recursive: true });
      return true;
    } catch (_) {}
  }
  return false;
}

export function deletePathNative(rawPath: string): boolean {
  if (LinuxRunnerModule?.deletePath) {
    try {
      return LinuxRunnerModule.deletePath(rawPath) || false;
    } catch (_) {}
  }
  if (nodeFs) {
    try {
      const p = cleanPath(rawPath);
      nodeFs.rmSync(p, { recursive: true, force: true });
      return true;
    } catch (_) {}
  }
  return false;
}

export function movePathNative(fromRaw: string, toRaw: string): boolean {
  if (LinuxRunnerModule?.movePath) {
    try {
      return LinuxRunnerModule.movePath(fromRaw, toRaw) || false;
    } catch (_) {}
  }
  if (nodeFs && nodePath) {
    try {
      const from = cleanPath(fromRaw);
      const to = cleanPath(toRaw);
      nodeFs.mkdirSync(nodePath.dirname(to), { recursive: true });
      nodeFs.renameSync(from, to);
      return true;
    } catch (_) {}
  }
  return false;
}

export function hasAllFilesPermission(): boolean {
  if (LinuxRunnerModule?.hasAllFilesPermission) {
    try {
      return LinuxRunnerModule.hasAllFilesPermission();
    } catch (_) {
      return true;
    }
  }
  return true;
}

export function requestAllFilesPermission(): boolean {
  if (LinuxRunnerModule?.requestAllFilesPermission) {
    try {
      return LinuxRunnerModule.requestAllFilesPermission();
    } catch (_) {
      return false;
    }
  }
  return false;
}

export { LinuxRunnerModule };


