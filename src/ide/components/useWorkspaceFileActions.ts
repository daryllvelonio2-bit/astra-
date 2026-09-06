import { useState } from "react";
import { Alert } from "react-native";
import { FileNode } from "../types";
import { moveNodeInTree } from "./fileExplorerUtils";
import {
  createFileInWorkspace,
  deleteNodeInWorkspace,
  renameNodeInWorkspace,
  moveNodeInWorkspace,
  saveFileContent,
  Workspace,
} from "../services/workspaceService";
import { resolveRunPlan, executeRunPlan } from "../services/runService";

interface UseWorkspaceFileActionsProps {
  workspace: Workspace | null;
  setWorkspace: (ws: Workspace | null) => void;
  activeFile: FileNode | null;
  setActiveFile: React.Dispatch<React.SetStateAction<FileNode | null>>;
  refreshWorkspace: () => Promise<void>;
  onOpenTerminal?: () => void;
  onOpenPreview?: (url: string) => void;
}

export function useWorkspaceFileActions({
  workspace,
  setWorkspace,
  activeFile,
  setActiveFile,
  refreshWorkspace,
  onOpenTerminal,
  onOpenPreview,
}: UseWorkspaceFileActionsProps) {
  const [selectedNode, setSelectedNode] = useState<FileNode | null>(null);
  const [modalMode, setModalMode] = useState<"none" | "options" | "rename" | "add">("none");
  const [modalInput, setModalInput] = useState("");
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({ x: 50, y: 150 });

  const handleLongPressNode = (node: FileNode, coords: { x: number; y: number }) => {
    setSelectedNode(node);
    setMenuPosition({
      x: Math.min(Math.max(coords.x, 10), 180),
      y: Math.min(coords.y, 450),
    });
    setModalMode("options");
  };

  const confirmAndDeleteNode = () => {
    if (!workspace || !selectedNode) return;
    const targetPath = selectedNode.path || selectedNode.name;
    Alert.alert("Confirm Delete", `Delete "${selectedNode.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteNodeInWorkspace(workspace.id, targetPath);
            await refreshWorkspace();
            if (activeFile && (activeFile.id === selectedNode.id || activeFile.path === selectedNode.path)) {
              setActiveFile(null);
            }
            setModalMode("none");
          } catch (e) {
            Alert.alert("Error", "Failed to delete item");
          }
        },
      },
    ]);
  };

  const handleRenameSubmit = async () => {
    if (!workspace || !selectedNode || !modalInput.trim()) return;
    const targetPath = selectedNode.path || selectedNode.name;
    try {
      await renameNodeInWorkspace(workspace.id, targetPath, modalInput.trim());
      await refreshWorkspace();
      setModalMode("none");
      setModalInput("");
    } catch (e) {
      Alert.alert("Error", "Failed to rename item");
    }
  };

  const handleCreateNode = async (inputName: string) => {
    if (!workspace || !inputName.trim()) return;
    const fileName = inputName.trim();
    const isFolder = fileName.endsWith("/");
    const cleanName = isFolder ? fileName.slice(0, -1) : fileName;

    let targetPath = cleanName;
    if (selectedNode && selectedNode.type === "folder") {
      const parentFolder = selectedNode.path || selectedNode.name;
      targetPath = `${parentFolder}/${cleanName}`;
    }

    try {
      const newNode = await createFileInWorkspace(workspace.id, targetPath, isFolder ? "" : "// New file\n");
      if (!isFolder) setActiveFile(newNode);
      await refreshWorkspace();
    } catch (_) {}
  };

  const handleMoveNode = async (source: FileNode, targetFolder: FileNode | null) => {
    if (!workspace) return;
    try {
      const targetFolderId = targetFolder ? targetFolder.id : null;
      const updatedRoot = moveNodeInTree(workspace.root, source.id, targetFolderId, workspace.id);

      const sourcePath = source.path || source.name;
      const targetPath = targetFolder ? targetFolder.path || targetFolder.name : null;
      const fileName = sourcePath.split("/").pop() || sourcePath;
      const newPath = targetPath ? `${targetPath}/${fileName}` : fileName;

      setWorkspace({
        ...workspace,
        root: updatedRoot,
      });

      if (activeFile && (activeFile.id === source.id || activeFile.path === sourcePath)) {
        const newId = `${workspace.id}-${newPath.replace(/\//g, "-")}`;
        setActiveFile((prev) => (prev ? { ...prev, path: newPath, id: newId } : null));
      }

      await moveNodeInWorkspace(workspace.id, sourcePath, targetPath);
    } catch (e: any) {
      console.error("Move Error:", e);
      Alert.alert("Move Error", e.message || "Failed to move file");
    }
  };

  const handleRunActiveFile = async (code: string, fileName: string) => {
    if (!workspace || !activeFile) return;
    const filePath = activeFile.path || activeFile.name;
    try {
      // Persist first so the guest executes exactly what's on screen.
      try {
        await saveFileContent(workspace.id, filePath, code);
      } catch (_) {}
      const rootNames = (workspace.root.children || []).map((n) => n.name);
      const plan = await resolveRunPlan(workspace.id, filePath, rootNames);
      await executeRunPlan(workspace.id, plan, {
        onOpenTerminal: () => onOpenTerminal?.(),
        onOpenBrowser: (url) => onOpenPreview?.(url),
      });
    } catch (err: any) {
      Alert.alert("Run Error", err?.message || String(err));
    }
  };

  return {
    selectedNode,
    setSelectedNode,
    modalMode,
    setModalMode,
    modalInput,
    setModalInput,
    menuPosition,
    setMenuPosition,
    handleLongPressNode,
    confirmAndDeleteNode,
    handleRenameSubmit,
    handleCreateNode,
    handleMoveNode,
    handleRunActiveFile,
  };
}
