import { useState, useEffect } from "react";
import { FloatingOverlay } from "../../ai/services/floatingOverlayService";
import { Workspace } from "../services/workspaceService";
import { FileNode } from "../types";

export function useFloatingOverlayControl(
  workspace: Workspace | null,
  activeFile: FileNode | null
) {
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [isOverlayRunning, setIsOverlayRunning] = useState(false);

  const checkOverlayStatus = async () => {
    try {
      const running = await FloatingOverlay.isRunning();
      setIsOverlayRunning(running);
    } catch (_) {}
  };

  useEffect(() => {
    checkOverlayStatus();
    const interval = setInterval(checkOverlayStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleLaunchSystemOverlay = async () => {
    setShowAiMenu(false);
    const hasPerm = await FloatingOverlay.hasPermission();
    if (!hasPerm) {
      setShowPermissionModal(true);
      return;
    }
    const started = await FloatingOverlay.start({
      workspaceId: workspace?.id,
      activeFileName: activeFile?.name,
    });
    if (started) {
      setIsOverlayRunning(true);
    }
  };

  const handleStopSystemOverlay = async () => {
    setShowAiMenu(false);
    await FloatingOverlay.stop();
    setIsOverlayRunning(false);
  };

  const handlePermissionGranted = async () => {
    setShowPermissionModal(false);
    const started = await FloatingOverlay.start({
      workspaceId: workspace?.id,
      activeFileName: activeFile?.name,
    });
    if (started) {
      setIsOverlayRunning(true);
    }
  };

  return {
    showPermissionModal,
    setShowPermissionModal,
    showAiMenu,
    setShowAiMenu,
    isOverlayRunning,
    setIsOverlayRunning,
    handleLaunchSystemOverlay,
    handleStopSystemOverlay,
    handlePermissionGranted,
  };
}
