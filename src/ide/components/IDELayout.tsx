import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  StatusBar,
  TouchableOpacity,
  Alert,
  Animated,
  PanResponder,
  Keyboard,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { FileExplorer } from "./FileExplorer";
import { EditorView } from "./EditorView";
import { FileActionModal } from "./FileActionModal";
import { TerminalView } from "./TerminalView";
import { WebBrowserPreview } from "./WebBrowserPreview";
import { DesktopView } from "./DesktopView";
import { GitHubDesktopView } from "./git/GitHubDesktopView";
import { IDEBottomBar } from "./IDEBottomBar";
import { WorkspaceLoadingScreen } from "./WorkspaceLoadingScreen";
import { AiAssistantMenu } from "./AiAssistantMenu";
import { AstraLogo } from "../../ai/components/AstraLogo";
import { OverlayPermissionModal } from "../../ai/components/OverlayPermissionModal";
import { useFloatingOverlayControl } from "./useFloatingOverlayControl";
import { runningTasksService, RunningTask } from "../../ai/services/runningTasksService";
import { FileNode } from "../types";
import { useSidebarResizer } from "./useSidebarResizer";
import { useWorkspaceFileActions } from "./useWorkspaceFileActions";
import {
  readFileContent,
  loadOrCreateDefaultWorkspace,
  loadWorkspace,
  saveFileContent,
  Workspace,
} from "../services/workspaceService";
import { useWorkspaceAutoRefresh } from "./useWorkspaceAutoRefresh";
import { useTheme } from "../../theme/themeContext";
import { useOrientation } from "../../theme/useOrientation";
import { ideActionService } from "../services/ideActionService";
import { resolveChatPathToRelative } from "../services/chatFileLinkService";
import {
  BottomTabVisibility,
  DEFAULT_BOTTOM_TABS,
  loadBottomTabs,
  loadShowAiButton,
  subscribeConfigChanges,
  ToggleableBottomTab,
} from "../services/configService";

interface IDELayoutProps {
  workspaceId?: string;
  onBackToPicker?: () => void;
  onOpenFullChat?: () => void;
}

const shortLoadPath = (p: string) =>
  (p || "").replace(/^file:\/\//, "").split("/").filter(Boolean).slice(-2).join("/");

const findFirstFile = (node: FileNode): FileNode | null => {
  if (node.type === "file") return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findFirstFile(child);
      if (found) return found;
    }
  }
  return null;
};

export function IDELayout({ workspaceId, onBackToPicker, onOpenFullChat }: IDELayoutProps) {
  const insets = useSafeAreaInsets();
  const { isLandscape } = useOrientation();
  const { theme } = useTheme();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [activeFile, setActiveFile] = useState<FileNode | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [bottomTab, setBottomTab] = useState<"editor" | "terminal" | "browser" | "git" | "desktop">("editor");
  const [visibleTabs, setVisibleTabs] = useState<BottomTabVisibility>({ ...DEFAULT_BOTTOM_TABS });
  const [showAiButton, setShowAiButton] = useState(true);
  const visibleTabsRef = useRef<BottomTabVisibility>({ ...DEFAULT_BOTTOM_TABS });

  // Never land on a hidden tab: redirect toggleable tabs to editor.
  const safeSetBottomTab = (tab: "editor" | "terminal" | "browser" | "git" | "desktop") => {
    const toggleable: ToggleableBottomTab[] = ["browser", "git", "desktop"];
    if ((toggleable as string[]).includes(tab) && !visibleTabsRef.current[tab as ToggleableBottomTab]) {
      setBottomTab("editor");
      return;
    }
    setBottomTab(tab);
  };

  useEffect(() => {
    loadBottomTabs().then((tabs) => {
      visibleTabsRef.current = tabs;
      setVisibleTabs(tabs);
    });
    loadShowAiButton().then(setShowAiButton);
    const unsub = subscribeConfigChanges((cfg) => {
      const tabs = { ...DEFAULT_BOTTOM_TABS, ...(cfg.bottomTabs || {}) };
      visibleTabsRef.current = tabs;
      setVisibleTabs(tabs);
      setShowAiButton(cfg.showAiButton ?? true);
    });
    return () => { unsub(); };
  }, []);

  // If the active tab gets disabled in settings, fall back to editor.
  useEffect(() => {
    const toggleable: ToggleableBottomTab[] = ["browser", "git", "desktop"];
    if ((toggleable as string[]).includes(bottomTab) && !visibleTabs[bottomTab as ToggleableBottomTab]) {
      setBottomTab("editor");
    }
  }, [visibleTabs, bottomTab]);
  const [desktopFullscreen, setDesktopFullscreen] = useState(false);
  const [browserUrl, setBrowserUrl] = useState<string>("http://127.0.0.1:8000");
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const {
    showPermissionModal,
    setShowPermissionModal,
    showAiMenu,
    setShowAiMenu,
    isOverlayRunning,
    handleLaunchSystemOverlay,
    handleStopSystemOverlay,
    handlePermissionGranted,
  } = useFloatingOverlayControl(workspace, activeFile);
  const [runningTasks, setRunningTasks] = useState<RunningTask[]>([]);
  const [loadStatus, setLoadStatus] = useState("Starting…");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadSeq, setLoadSeq] = useState(0);
  const lastLoadStatusRef = useRef(0);

  // Landscape leaves little horizontal room: park the file sidebar on rotate
  // (user can still reopen it manually; only fires on orientation change).
  useEffect(() => {
    setIsSidebarOpen(!isLandscape);
  }, [isLandscape]);

  useEffect(() => {
    const unsubTasks = runningTasksService.subscribe(setRunningTasks);
    // Automatically trigger IDE terminal tab when background task starts
    const unsubTrigger = runningTasksService.subscribeTrigger(() => {
      setBottomTab("terminal");
    });
    return () => {
      unsubTasks();
      unsubTrigger();
    };
  }, []);

  // Open a raw agent/chat file path inside the given workspace, normalizing
  // PRoot (/workspace, /workspaces/<id>) and file:// prefixes to relative paths.
  const applyOpenFile = async (targetWs: Workspace, rawPath: string) => {
    const relative = resolveChatPathToRelative(rawPath, targetWs.id);
    if (!relative) return;
    try {
      const content = await readFileContent(targetWs.id, relative);
      const fileName = relative.split("/").pop() || relative;
      setActiveFile({
        id: `${targetWs.id}::${relative}`,
        name: fileName,
        type: "file",
        path: relative,
        content: content || "",
      });
      setBottomTab("editor");
      if (!content) {
        Alert.alert("File opened", `${fileName} is empty or could not be read at:\n${relative}`);
      }
    } catch (e: any) {
      Alert.alert("Could not open file", e?.message || relative);
    }
  };

  // Subscribe to Astra CLI App UI Control Bridge actions
  useEffect(() => {
    const unsubOpenFile = ideActionService.subscribe("OPEN_FILE", async ({ filePath, workspaceId: targetWsId }) => {
      if (targetWsId && workspace && targetWsId !== workspace.id) return;
      if (!workspace || !filePath) return;
      await applyOpenFile(workspace, filePath);
    });

    const unsubOpenBrowser = ideActionService.subscribe("OPEN_BROWSER", ({ url }) => {
      if (url) {
        setBrowserUrl(url);
        safeSetBottomTab("browser");
      }
    });

    const unsubOpenTerminal = ideActionService.subscribe("OPEN_TERMINAL", () => {
      setBottomTab("terminal");
    });

    const unsubSwitchTab = ideActionService.subscribe("SWITCH_TAB", ({ tab }) => {
      if (tab) {
        safeSetBottomTab(tab);
      }
    });

    return () => {
      unsubOpenFile();
      unsubOpenBrowser();
      unsubOpenTerminal();
      unsubSwitchTab();
    };
  }, [workspace]);

  const handleOpenInBrowser = (targetUrl: string) => {
    setBrowserUrl(targetUrl);
    safeSetBottomTab("browser");
  };

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvt, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvt, () => setIsKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Smooth 60fps native sidebar dragging without re-rendering tree
  const { sidebarWidthAnim, isDraggingSidebar, resizerPanHandlers } = useSidebarResizer(130);

  useEffect(() => {
    let cancelled = false;
    const onProgress = (dirs: number, path: string) => {
      const now = Date.now();
      if (now - lastLoadStatusRef.current > 300) {
        lastLoadStatusRef.current = now;
        if (!cancelled) setLoadStatus(`Scanning ${dirs} folders… ${shortLoadPath(path)}`);
      }
    };
    const loadWs = async () => {
      let ws: Workspace;
      try {
        ws = workspaceId
          ? await loadWorkspace(workspaceId, onProgress)
          : await loadOrCreateDefaultWorkspace();
      } catch (e: any) {
        // Surface instead of silently opening the wrong workspace.
        if (!cancelled) setLoadError(e?.message || "Failed to load workspace");
        return;
      }
      if (cancelled) return;
      setWorkspace(ws);

      const initialFile = findFirstFile(ws.root);
      if (initialFile) {
        let content = initialFile.content || "";
        if (!content) {
          content = await readFileContent(ws.id, initialFile.path || initialFile.name);
        }
        if (!cancelled) setActiveFile({ ...initialFile, content });
      }

      // Consume sticky actions emitted while the editor was unmounted
      // (e.g. file taps in fullscreen chat that navigated here).
      // Explicit user taps win over stale auto-emitted actions from scaffolding.
      try {
        const pendingFile = ideActionService.consumePendingAction("OPEN_FILE");
        const pendingBrowser = ideActionService.consumePendingAction("OPEN_BROWSER");
        const pendingTerminal = ideActionService.consumePendingAction("OPEN_TERMINAL");
        const pendingTab = ideActionService.consumePendingAction("SWITCH_TAB");
        if (pendingBrowser?.payload?.userInitiated && pendingBrowser.payload.url) {
          setBrowserUrl(pendingBrowser.payload.url);
          safeSetBottomTab("browser");
        } else if (pendingTerminal?.payload?.userInitiated) {
          setBottomTab("terminal");
        } else if (pendingTab?.payload?.userInitiated) {
          safeSetBottomTab(pendingTab.payload.tab);
        } else if (pendingBrowser?.payload?.url) {
          setBrowserUrl(pendingBrowser.payload.url);
          safeSetBottomTab("browser");
        } else if (pendingFile?.payload?.filePath) {
          const targetWsId = pendingFile.payload.workspaceId;
          if (!targetWsId || targetWsId === ws.id) {
            await applyOpenFile(ws, pendingFile.payload.filePath);
          }
        }
      } catch (_) {}
    };
    loadWs();
    return () => { cancelled = true; };
  }, [workspaceId, loadSeq]);

  useWorkspaceAutoRefresh(workspace?.id, setWorkspace);

  const refreshWorkspace = async () => {
    if (!workspace) return;
    try {
      const updated = await loadWorkspace(workspace.id);
      setWorkspace(updated);
    } catch (e) {}
  };

  const handleSelectFile = async (file: any) => {
    if (file.type !== "file" || !workspace) return;
    const targetPath = file.path || file.name;
    const content = await readFileContent(workspace.id, targetPath);
    setActiveFile({ ...file, content: content ?? "" });
  };

  const handleContentChange = async (newContent: string) => {
    if (!activeFile || !workspace) return;
    setActiveFile({ ...activeFile, content: newContent });

    const updateTree = (nodes: any[]): any[] => {
      return nodes.map((node) => {
        if (node.id === activeFile.id || (node.path && node.path === activeFile.path)) {
          return { ...node, content: newContent };
        }
        if (node.children) return { ...node, children: updateTree(node.children) };
        return node;
      });
    };

    setWorkspace({
      ...workspace,
      root: {
        ...workspace.root,
        children: workspace.root.children ? updateTree(workspace.root.children) : [],
      },
    });

    try {
      await saveFileContent(workspace.id, activeFile.path || activeFile.name, newContent);
    } catch (e) {}
  };

  const {
    selectedNode,
    modalMode,
    setModalMode,
    modalInput,
    setModalInput,
    menuPosition,
    handleLongPressNode,
    confirmAndDeleteNode,
    handleRenameSubmit,
    handleCreateNode,
    handleMoveNode,
    handleRunActiveFile,
  } = useWorkspaceFileActions({
    workspace,
    setWorkspace,
    activeFile,
    setActiveFile,
    refreshWorkspace,
  });

  if (!workspace) {
    return (
      <WorkspaceLoadingScreen
        key={loadSeq}
        statusText={loadError ? `Couldn't open workspace: ${loadError}` : loadStatus}
        isError={!!loadError}
        onBack={onBackToPicker}
        onRetry={() => { setLoadError(null); setLoadStatus("Retrying…"); setLoadSeq((s) => s + 1); }}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bgPrimary, paddingTop: desktopFullscreen ? 0 : insets.top }]}>
      <StatusBar
        barStyle={theme.isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.bgSecondary}
        hidden={desktopFullscreen}
      />

      {/* Main Workspace Area */}
      <View style={styles.workspace}>
        {isSidebarOpen && bottomTab === "editor" && (
          <Animated.View style={[styles.sidebarWrapper, { width: sidebarWidthAnim }]}>
            <FileExplorer
              projectName={workspace.name}
              files={workspace.root.children || []}
              onSelectFile={handleSelectFile}
              activeFileId={activeFile?.id}
              onToggleCollapse={() => setIsSidebarOpen(false)}
              onRefreshFiles={refreshWorkspace}
              onLongPressNode={handleLongPressNode}
              onCreateFile={handleCreateNode}
              onQuickAddFile={() => {
                setModalInput("");
                setModalMode("add");
              }}
              onMoveNode={handleMoveNode}
              resizerPanHandlers={resizerPanHandlers}
              isDraggingSidebar={isDraggingSidebar}
            />
          </Animated.View>
        )}

        <View style={styles.editorContainer}>
          <View style={[styles.tabContent, bottomTab !== "editor" && styles.hiddenTab]}>
            <EditorView
              fileName={activeFile?.name}
              content={activeFile?.content || ""}
              onChangeContent={handleContentChange}
              onExitProject={onBackToPicker}
              onToggleSidebar={!isSidebarOpen ? () => setIsSidebarOpen(true) : undefined}
              onRunFile={handleRunActiveFile}
            />
          </View>

          <View style={[styles.tabContent, bottomTab !== "terminal" && styles.hiddenTab]}>
            <TerminalView key={workspace?.id || "none"} workspaceId={workspace?.id} />
          </View>

          <View style={[styles.tabContent, bottomTab !== "browser" && styles.hiddenTab]}>
            <WebBrowserPreview
              initialUrl={browserUrl}
              workspaceId={workspace?.id}
              activeHtmlContent={activeFile?.content}
              activeFileName={activeFile?.name}
            />
          </View>

          <View style={[styles.tabContent, bottomTab !== "git" && styles.hiddenTab]}>
            <GitHubDesktopView
              workspaceId={workspace?.id}
              projectName={workspace?.name}
              visible={bottomTab === "git"}
            />
          </View>

          <View style={[styles.tabContent, bottomTab !== "desktop" && styles.hiddenTab]}>
            <DesktopView
              visible={bottomTab === "desktop"}
              onFullscreenChange={setDesktopFullscreen}
            />
          </View>

          {/* AI Assistant Floating Button & Menu */}
          {showAiButton && !desktopFullscreen && bottomTab !== "git" && (
            <AiAssistantMenu
              showAiMenu={showAiMenu}
              isOverlayRunning={isOverlayRunning}
              runningTaskCount={runningTasks.filter((t) => t.status === "running").length}
              onToggleAiMenu={() => setShowAiMenu((prev) => !prev)}
              onLaunchSystemOverlay={handleLaunchSystemOverlay}
              onStopSystemOverlay={handleStopSystemOverlay}
              onOpenFullChat={
                onOpenFullChat
                  ? () => {
                      setShowAiMenu(false);
                      onOpenFullChat();
                    }
                  : undefined
              }
            />
          )}
        </View>
      </View>

      {/* Bottom Panel Toggle Bar (Auto-hidden when soft keyboard is open) */}
      {!isKeyboardVisible && !desktopFullscreen && (
        <IDEBottomBar
          bottomTab={bottomTab}
          onChangeTab={safeSetBottomTab}
          runningTaskCount={runningTasks.filter((t) => t.status === "running").length}
          compact={isLandscape}
          visibleTabs={visibleTabs}
        />
      )}

      {/* Overlay Permission Guide Modal */}
      <OverlayPermissionModal
        visible={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        onPermissionGranted={handlePermissionGranted}
      />

      {/* File Action Modal */}
      <FileActionModal
        modalMode={modalMode}
        selectedNode={selectedNode}
        menuPosition={menuPosition}
        modalInput={modalInput}
        onChangeInput={setModalInput}
        onClose={() => setModalMode("none")}
        onSelectRename={() => {
          setModalInput(selectedNode?.name || "");
          setModalMode("rename");
        }}
        onSelectAdd={() => {
          setModalInput("");
          setModalMode("add");
        }}
        onDeleteConfirm={confirmAndDeleteNode}
        onRenameSubmit={handleRenameSubmit}
        onAddSubmit={() => {
          setModalMode("none");
          handleCreateNode(modalInput);
          setModalInput("");
        }}
        onBackToOptions={() => setModalMode("options")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  workspace: {
    flex: 1,
    flexDirection: "row",
  },
  sidebarWrapper: {
    height: "100%",
  },
  editorContainer: {
    flex: 1,
    position: "relative",
  },
  tabContent: {
    flex: 1,
  },
  hiddenTab: {
    display: "none",
  },
});
