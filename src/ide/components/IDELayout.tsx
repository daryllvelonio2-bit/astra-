import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  StatusBar,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  PanResponder,
  Keyboard,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { FileExplorer } from "./FileExplorer";
import { EditorView } from "./EditorView";
import { FileActionModal } from "./FileActionModal";
import { TerminalView } from "./TerminalView";
import { WebBrowserPreview } from "./WebBrowserPreview";
import { IDEBottomBar } from "./IDEBottomBar";
import { AiAssistantMenu } from "./AiAssistantMenu";
import { AstraLogo } from "../../ai/components/AstraLogo";
import { FloatingOverlay } from "../../ai/services/floatingOverlayService";
import { OverlayPermissionModal } from "../../ai/components/OverlayPermissionModal";
import { runningTasksService, RunningTask } from "../../ai/services/runningTasksService";
import { FileNode } from "../types";
import { useSidebarResizer } from "./useSidebarResizer";
import { useWorkspaceFileActions } from "./useWorkspaceFileActions";
import {
  readFileContent,
  loadOrCreateDefaultWorkspace,
  loadWorkspace,
  saveFileContent,
  subscribeWorkspaceChanges,
  Workspace,
} from "../services/workspaceService";
import { useTheme } from "../../theme/themeContext";
import { ideActionService } from "../services/ideActionService";

interface IDELayoutProps {
  workspaceId?: string;
  onBackToPicker?: () => void;
  onOpenFullChat?: () => void;
}

export function IDELayout({ workspaceId, onBackToPicker, onOpenFullChat }: IDELayoutProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { theme } = useTheme();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [activeFile, setActiveFile] = useState<FileNode | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [bottomTab, setBottomTab] = useState<"editor" | "terminal" | "browser">("editor");
  const [browserUrl, setBrowserUrl] = useState<string>("http://127.0.0.1:8000");
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [isOverlayRunning, setIsOverlayRunning] = useState(false);
  const [runningTasks, setRunningTasks] = useState<RunningTask[]>([]);

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

  // Subscribe to Astra CLI App UI Control Bridge actions
  useEffect(() => {
    const unsubOpenFile = ideActionService.subscribe("OPEN_FILE", async ({ filePath, workspaceId: targetWsId }) => {
      if (targetWsId && workspace && targetWsId !== workspace.id) return;
      if (!workspace || !filePath) return;

      const cleanTarget = filePath.replace(/^file:\/\//, "");
      const fileName = cleanTarget.split("/").pop() || cleanTarget;
      const content = await readFileContent(workspace.id, cleanTarget);

      setActiveFile({
        id: `${workspace.id}::${cleanTarget}`,
        name: fileName,
        type: "file",
        path: cleanTarget,
        content: content || "",
      });
      setBottomTab("editor");
    });

    const unsubOpenBrowser = ideActionService.subscribe("OPEN_BROWSER", ({ url }) => {
      if (url) {
        setBrowserUrl(url);
        setBottomTab("browser");
      }
    });

    const unsubOpenTerminal = ideActionService.subscribe("OPEN_TERMINAL", () => {
      setBottomTab("terminal");
    });

    const unsubSwitchTab = ideActionService.subscribe("SWITCH_TAB", ({ tab }) => {
      if (tab) {
        setBottomTab(tab);
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
    setBottomTab("browser");
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
    const loadWs = async () => {
      let ws: Workspace;
      try {
        ws = workspaceId ? await loadWorkspace(workspaceId) : await loadOrCreateDefaultWorkspace();
      } catch (e) {
        ws = await loadOrCreateDefaultWorkspace();
      }
      setWorkspace(ws);

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

      const initialFile = findFirstFile(ws.root);
      if (initialFile) {
        let content = initialFile.content || "";
        if (!content) {
          content = await readFileContent(ws.id, initialFile.path || initialFile.name);
        }
        setActiveFile({ ...initialFile, content });
      }
    };
    loadWs();
  }, [workspaceId]);

  useEffect(() => {
    if (!workspace?.id) return;
    const unsub = subscribeWorkspaceChanges((changedWsId) => {
      if (changedWsId === workspace.id) {
        refreshWorkspace();
      }
    });
    return unsub;
  }, [workspace?.id]);

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

  if (!workspace) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bgPrimary }]}>
        <ActivityIndicator size="large" color={theme.accent} style={{ marginBottom: 12 }} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Opening Workspace...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bgPrimary, paddingTop: insets.top }]}>
      <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor={theme.bgSecondary} />

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
              onAskAiAboutFile={() => handleLaunchSystemOverlay()}
            />
          </View>

          <View style={[styles.tabContent, bottomTab !== "terminal" && styles.hiddenTab]}>
            <TerminalView workspaceId={workspace?.id} />
          </View>

          <View style={[styles.tabContent, bottomTab !== "browser" && styles.hiddenTab]}>
            <WebBrowserPreview
              initialUrl={browserUrl}
              workspaceId={workspace?.id}
              activeHtmlContent={activeFile?.content}
              activeFileName={activeFile?.name}
            />
          </View>

          {/* AI Assistant Floating Button & Menu */}
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
        </View>
      </View>

      {/* Bottom Panel Toggle Bar (Auto-hidden when soft keyboard is open) */}
      {!isKeyboardVisible && (
        <IDEBottomBar
          bottomTab={bottomTab}
          onChangeTab={setBottomTab}
          runningTaskCount={runningTasks.filter((t) => t.status === "running").length}
        />
      )}

      {/* Overlay Permission Guide Modal */}
      <OverlayPermissionModal
        visible={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        onPermissionGranted={() => {
          setShowPermissionModal(false);
          FloatingOverlay.start({
            workspaceId: workspace?.id,
            activeFileName: activeFile?.name,
          }).then((ok) => ok && setIsOverlayRunning(true));
        }}
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
    backgroundColor: "#181818",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#181818",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#ffffff",
    fontSize: 15,
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
