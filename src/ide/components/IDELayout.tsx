import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { View, StyleSheet, StatusBar, Alert, Animated, Keyboard, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FileExplorer } from "./FileExplorer";
import { EditorView } from "./EditorView";
import { FileActionModal } from "./FileActionModal";
import { TerminalView } from "./TerminalView";
import { MonacoEngineHost } from "./editor/MonacoEngineHost";
import { WebBrowserPreview } from "./WebBrowserPreview";
import { DesktopView } from "./DesktopView";
import { VSCodeView } from "./VSCodeView";
import { GitHubDesktopView } from "./git/GitHubDesktopView";
import { IDEBottomBar } from "./IDEBottomBar";
import { WorkspaceLoadingScreen } from "./WorkspaceLoadingScreen";
import { AgentsContainerView } from "./agents/AgentsContainerView";
import { ExtensionMarketplaceModal } from "./extensions/ExtensionMarketplaceModal";
import { runningTasksService, RunningTask } from "../../ai/services/runningTasksService";
import { FileNode } from "../types";
import { useSidebarResizer } from "./useSidebarResizer";
import { useWorkspaceFileActions } from "./useWorkspaceFileActions";
import { readFileContent, loadOrCreateDefaultWorkspace, loadWorkspace, Workspace } from "../services/workspaceService";
import { useDebouncedFileSave } from "./useDebouncedFileSave";
import { useWorkspaceAutoRefresh } from "./useWorkspaceAutoRefresh";
import { useTheme } from "../../theme/themeContext";
import { useOrientation } from "../../theme/useOrientation";
import { useIdeActionBridge } from "./useIdeActionBridge";
import { SettingsModal } from "./SettingsModal";
import { resolveChatPathToRelative } from "../services/chatFileLinkService";
import { useRecentFiles } from "./editor/useRecentFiles";
import { useIDELayoutCallbacks, addVisitedTab } from "./useIDELayoutCallbacks";
import { useIDELayoutStyles } from "./useIDELayoutStyles";
import { monacoLangForFile } from "../services/monaco/monacoLanguageMap";
import {
  BottomTabVisibility, DEFAULT_BOTTOM_TABS, firstVisibleTab, loadAstraEnabled,
  loadBottomTabs, loadDefaultEditorUi, normalizeBottomTabs, subscribeConfigChanges, ToggleableBottomTab,
} from "../services/configService";

interface IDELayoutProps {
  workspaceId?: string;
  onBackToPicker?: () => void;
}

const shortLoadPath = (p: string) =>
  (p || "").replace(/^file:\/\//, "").split("/").filter(Boolean).slice(-2).join("/");

export function IDELayout({ workspaceId, onBackToPicker }: IDELayoutProps) {
  const insets = useSafeAreaInsets();
  const { isLandscape } = useOrientation();
  const { theme } = useTheme();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [activeFile, setActiveFile] = useState<FileNode | null>(null);
  const { recentFiles, recordRecentFile, removeRecentFile } = useRecentFiles(workspaceId);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [bottomTab, setBottomTab] = useState<ToggleableBottomTab>("editor");
  const [visitedTabs, setVisitedTabs] = useState<Set<ToggleableBottomTab>>(() => new Set([bottomTab]));
  const [visibleTabs, setVisibleTabs] = useState<BottomTabVisibility>({ ...DEFAULT_BOTTOM_TABS });
  const [astraEnabled, setAstraEnabled] = useState(true);
  const visibleTabsRef = useRef<BottomTabVisibility>({ ...DEFAULT_BOTTOM_TABS });

  useEffect(() => {
    setVisitedTabs((prev) => addVisitedTab(prev, bottomTab));
  }, [bottomTab]);

  useEffect(() => {
    setVisitedTabs(new Set([bottomTab]));
  }, [workspaceId]);

  // Never land on a hidden tab: redirect to the first visible one.
  const safeSetBottomTab = useCallback((tab: ToggleableBottomTab) => {
    if (!visibleTabsRef.current[tab]) {
      setBottomTab(firstVisibleTab(visibleTabsRef.current));
      return;
    }
    setBottomTab(tab);
  }, []);

  useEffect(() => {
    loadBottomTabs().then((tabs) => {
      visibleTabsRef.current = tabs;
      setVisibleTabs(tabs);
      // Initial tab may have loaded hidden (e.g. editor off): correct it.
      setBottomTab((current) => (!tabs[current] ? firstVisibleTab(tabs) : current));
    });
    loadAstraEnabled().then(setAstraEnabled);
    loadDefaultEditorUi().then((editor) => {
      if (editor === "vscode" && visibleTabsRef.current.vscode) {
        setBottomTab("vscode");
      }
    });
    const unsub = subscribeConfigChanges((cfg) => {
      const tabs = normalizeBottomTabs(cfg.bottomTabs);
      visibleTabsRef.current = tabs;
      setVisibleTabs(tabs);
      setAstraEnabled(cfg.astraEnabled ?? true);
    });
    return () => { unsub(); };
  }, []);

  // If the active tab gets disabled in settings, fall back to first visible.
  useEffect(() => {
    if (!visibleTabs[bottomTab]) {
      setBottomTab(firstVisibleTab(visibleTabs));
    }
  }, [visibleTabs, bottomTab]);
  const [desktopFullscreen, setDesktopFullscreen] = useState(false);
  const [isLandscapeNavbarHidden, setIsLandscapeNavbarHidden] = useState(true);
  const isLandscapeNavbarHiddenRef = useRef(true);
  const navbarTurnedOffReasonRef = useRef<"auto" | "manual" | null>("auto");
  const manualSidebarHiddenRef = useRef(false);
  const [browserUrl, setBrowserUrl] = useState<string>("");
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isSettingsModalVisible, setSettingsModalVisible] = useState(false);
  const [isMarketplaceVisible, setMarketplaceVisible] = useState(false);
  const [runningTasks, setRunningTasks] = useState<RunningTask[]>([]);
  const [loadStatus, setLoadStatus] = useState("Starting…");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadSeq, setLoadSeq] = useState(0);
  const lastLoadStatusRef = useRef(0);
  const prevLoadedWsIdRef = useRef<string | null>(null);
  // Speed: stable ref so content-change callback never recreates per keystroke.
  const activeFileRef = useRef<FileNode | null>(null);
  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);
  const runningTasksSigRef = useRef("");

  // Landscape mode: auto-hide navbar & park file sidebar on rotate
  useEffect(() => {
    setIsSidebarOpen(!isLandscape);
    if (isLandscape) {
      setIsLandscapeNavbarHidden(true);
      isLandscapeNavbarHiddenRef.current = true;
      navbarTurnedOffReasonRef.current = "auto";
    }
  }, [isLandscape]);

  useEffect(() => {
    StatusBar.setHidden(desktopFullscreen || isLandscape, "fade");
  }, [desktopFullscreen, isLandscape]);

  useEffect(() => {
    const unsubTasks = runningTasksService.subscribe((currentTasks) => {
      const sig = currentTasks.map((t) => `${t.id}|${t.status}`).join(";");
      if (sig !== runningTasksSigRef.current) {
        runningTasksSigRef.current = sig;
        setRunningTasks(currentTasks);
      }
    });
    // Never auto-switch tabs on background task registration — the user
    // stays where they are (e.g. chat). Tasks surface via RunningTasksBar
    // badge; explicit taps navigate.
    return () => { unsubTasks(); };
  }, []);

  // Open a raw agent/chat file path inside the given workspace, normalizing
  // PRoot (/workspace, /workspaces/<id>) and file:// prefixes to relative paths.
  const applyOpenFile = useCallback(async (targetWs: Workspace, rawPath: string) => {
    const relative = resolveChatPathToRelative(rawPath, targetWs.id);
    if (!relative) return;
    try {
      const content = await readFileContent(targetWs.id, relative);
      const fileName = relative.split("/").pop() || relative;
      const fileNode: FileNode = {
        id: `${targetWs.id}::${relative}`,
        name: fileName,
        type: "file",
        path: relative,
        content: content || "",
      };
      setActiveFile(fileNode);
      recordRecentFile(fileNode, false);
      safeSetBottomTab("editor");
      if (!content) {
        Alert.alert("File opened", `${fileName} is empty or could not be read at:\n${relative}`);
      }
    } catch (e: any) {
      Alert.alert("Could not open file", e?.message || relative);
    }
  }, [safeSetBottomTab, recordRecentFile]);

  const handleOpenInBrowser = useCallback((targetUrl: string) => {
    setBrowserUrl(targetUrl);
    safeSetBottomTab("browser");
  }, [safeSetBottomTab]);

  const onOpenTerminal = useCallback(() => safeSetBottomTab("terminal"), [safeSetBottomTab]);

  const { consumePendingActions } = useIdeActionBridge({
    workspace,
    applyOpenFile,
    setBrowserUrl,
    safeSetBottomTab,
  });
  const consumePendingActionsRef = useRef(consumePendingActions);
  consumePendingActionsRef.current = consumePendingActions;

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
        if (!cancelled) setLoadError(e?.message || "Failed to load workspace");
        return;
      }
      if (cancelled) return;
      setWorkspace(ws);
      // Reset active file only when changing to a different workspace
      if (prevLoadedWsIdRef.current !== ws.id) {
        prevLoadedWsIdRef.current = ws.id;
        if (!cancelled) setActiveFile(null);
      }
      await consumePendingActionsRef.current(ws);
    };
    loadWs();
    return () => { cancelled = true; };
  }, [workspaceId, loadSeq]);

  useWorkspaceAutoRefresh(workspace?.id, setWorkspace);

  const { scheduleSave, flush: flushPendingSave } = useDebouncedFileSave(workspace?.id);

  const handleBackToPicker = useCallback(() => {
    flushPendingSave();
    onBackToPicker?.();
  }, [flushPendingSave, onBackToPicker]);

  const refreshWorkspace = useCallback(async () => {
    if (!workspace) return;
    try {
      const updated = await loadWorkspace(workspace.id);
      setWorkspace(updated);
    } catch (e) {}
  }, [workspace]);

  const handleSelectFile = useCallback(async (file: any) => {
    if (!file || file.type === "folder" || !workspace) return;
    const fileName = file.name || (file.path ? file.path.split("/").pop() : "") || "file";
    const targetPath = file.path || file.name || fileName;
    const selected: FileNode = {
      ...file,
      id: file.id || `${workspace.id}::${targetPath}`,
      name: fileName,
      path: targetPath,
      type: "file",
      content: file.content || "",
    };
    setActiveFile(selected);
    recordRecentFile(selected, false);
    safeSetBottomTab("editor");
    // Explorer stays open on file select — it closes only when edit mode
    // starts (handleEditModeChange) or the user collapses it manually.
    try {
      await flushPendingSave();
      const content = await readFileContent(workspace.id, targetPath);
      setActiveFile((prev) => (prev && prev.id === selected.id ? { ...prev, content: content ?? "" } : prev));
    } catch (_) {}
  }, [workspace, safeSetBottomTab, flushPendingSave, recordRecentFile]);

  const handleContentChange = useCallback((newContent: string) => {
    const current = activeFileRef.current;
    if (!current) return;
    const targetPath = current.path || current.name;
    const targetId = current.id;
    setActiveFile((prev) => (prev && prev.id === targetId ? { ...prev, content: newContent } : prev));
    scheduleSave(targetPath, newContent);
    recordRecentFile(current, true);
  }, [scheduleSave, recordRecentFile]);

  const {
    selectedNode, modalMode, setModalMode, modalInput, setModalInput, menuPosition,
    handleLongPressNode, confirmAndDeleteNode, handleRenameSubmit, handleCreateNode,
    handleMoveNode, handleRunActiveFile,
  } = useWorkspaceFileActions({
    workspace, setWorkspace, activeFile, setActiveFile, refreshWorkspace,
    onOpenTerminal,
    onOpenPreview: handleOpenInBrowser,
  });

  // Speed: stable callbacks so memoized children don't re-render per parent tick.
  const {
    handleToggleCollapse, handleQuickAddFile, handleShowSidebar,
    handleOpenSettings, handleCloseSettings, handleOpenMarketplace,
    handleCloseMarketplace, handleNavigateToEditor,
    handleHideNavbar, handleShowNavbar, handleRetryLoad,
    handleCloseFileModal, handleSelectRename, handleSelectAdd,
    handleAddSubmit, handleBackToOptions, handleEditModeChange,
  } = useIDELayoutCallbacks({
    safeSetBottomTab, setIsSidebarOpen, setModalInput, setModalMode,
    setSettingsModalVisible, setMarketplaceVisible, setLoadError,
    setLoadStatus, setLoadSeq, selectedNode, modalInput, handleCreateNode,
    manualSidebarHiddenRef, isLandscapeNavbarHiddenRef,
    navbarTurnedOffReasonRef, setIsLandscapeNavbarHidden,
  });

  const { runningTaskCount, containerStyle, sidebarAnimStyle } = useIDELayoutStyles({
    runningTasks,
    bgPrimary: theme.bgPrimary,
    desktopFullscreen,
    isLandscape,
    insetTop: insets.top,
    insetLeft: insets.left,
    insetRight: insets.right,
    sidebarWidthAnim,
  });

  if (!workspace) {
    return (
      <WorkspaceLoadingScreen
        key={loadSeq}
        statusText={loadError ? `Couldn't open workspace: ${loadError}` : loadStatus}
        isError={!!loadError}
        onBack={handleBackToPicker}
        onRetry={handleRetryLoad}
      />
    );
  }

  return (
    <View style={containerStyle}>
      <StatusBar
        barStyle={theme.isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.bgSecondary}
        hidden={desktopFullscreen || isLandscape}
      />

      {/* Main Workspace Area */}
      <View style={styles.workspace}>
        {isSidebarOpen && bottomTab === "editor" && (
          <Animated.View style={sidebarAnimStyle}>
            <FileExplorer
              projectName={workspace.name}
              files={workspace.root.children || []}
              onSelectFile={handleSelectFile}
              activeFileId={activeFile?.id}
              onToggleCollapse={handleToggleCollapse}
              onRefreshFiles={refreshWorkspace}
              onLongPressNode={handleLongPressNode}
              onCreateFile={handleCreateNode}
              onQuickAddFile={handleQuickAddFile}
              onMoveNode={handleMoveNode}
              resizerPanHandlers={resizerPanHandlers}
              isDraggingSidebar={isDraggingSidebar}
            />
          </Animated.View>
        )}

        <View style={styles.editorContainer}>
          {visitedTabs.has("editor") && (
            <View style={[styles.tabContent, bottomTab !== "editor" && styles.hiddenTab]}>
              <EditorView
                fileName={activeFile?.name}
                activeFilePath={activeFile?.path}
                content={activeFile?.content || ""}
                onChangeContent={handleContentChange}
                onExitProject={handleBackToPicker}
                onToggleSidebar={!isSidebarOpen ? handleShowSidebar : undefined}
                onRunFile={handleRunActiveFile}
                onEditModeChange={handleEditModeChange}
                onOpenSettings={handleOpenSettings}
                recentFiles={recentFiles}
                onSelectRecentFile={handleSelectFile}
                onCloseRecentFile={removeRecentFile}
              />
              {/* Lazy engine: plaintext never uses Monaco (service returns null),
                  so skip the 3.9M WebView until a highlightable file opens. */}
              {monacoLangForFile(activeFile?.name) !== "plaintext" && <MonacoEngineHost />}
            </View>
          )}

          {visitedTabs.has("terminal") && (
            <View style={[styles.tabContent, bottomTab !== "terminal" && styles.hiddenTab]}>
              <TerminalView key={workspace?.id || "none"} workspaceId={workspace?.id} visible={bottomTab === "terminal"} />
            </View>
          )}
          {visitedTabs.has("browser") && (
            <View style={[styles.tabContent, bottomTab !== "browser" && styles.hiddenTab]}>
              <WebBrowserPreview initialUrl={browserUrl} workspaceId={workspace?.id} />
            </View>
          )}
          {visitedTabs.has("git") && (
            <View style={[styles.tabContent, bottomTab !== "git" && styles.hiddenTab]}>
              <GitHubDesktopView workspaceId={workspace?.id} projectName={workspace?.name} visible={bottomTab === "git"} />
            </View>
          )}
          {visitedTabs.has("desktop") && (
            <View style={[styles.tabContent, bottomTab !== "desktop" && styles.hiddenTab]}>
              <DesktopView visible={bottomTab === "desktop"} onFullscreenChange={setDesktopFullscreen} />
            </View>
          )}
          {visitedTabs.has("vscode") && (
            <View style={[styles.tabContent, bottomTab !== "vscode" && styles.hiddenTab]}>
              <VSCodeView workspaceDir={workspace?.dirPath} visible={bottomTab === "vscode"} />
            </View>
          )}

          {visitedTabs.has("agents") && (
            <View style={[styles.tabContent, bottomTab !== "agents" && styles.hiddenTab]}>
              <AgentsContainerView
                workspace={workspace}
                astraEnabled={astraEnabled}
                onNavigateToWorkspaces={handleBackToPicker}
                onNavigateToEditor={handleNavigateToEditor}
                onOpenSettings={handleOpenSettings}
                onOpenMarketplace={handleOpenMarketplace}
                visible={bottomTab === "agents"}
              />
            </View>
          )}
        </View>
      </View>

      {/* Bottom Panel Toggle Bar */}
      {!isKeyboardVisible && !desktopFullscreen && (
        <IDEBottomBar
          bottomTab={bottomTab}
          onChangeTab={safeSetBottomTab}
          runningTaskCount={runningTaskCount}
          compact={isLandscape}
          visibleTabs={visibleTabs}
          isLandscapeNavbarHidden={isLandscapeNavbarHidden}
          onHideNavbar={isLandscape ? handleHideNavbar : undefined}
          onShowNavbar={handleShowNavbar}
        />
      )}

      {/* File Action Modal */}
      {modalMode !== "none" && (
        <FileActionModal
          modalMode={modalMode} selectedNode={selectedNode} menuPosition={menuPosition}
          modalInput={modalInput} onChangeInput={setModalInput} onClose={handleCloseFileModal}
          onSelectRename={handleSelectRename}
          onSelectAdd={handleSelectAdd}
          onDeleteConfirm={confirmAndDeleteNode} onRenameSubmit={handleRenameSubmit}
          onAddSubmit={handleAddSubmit}
          onBackToOptions={handleBackToOptions}
        />
      )}

      {/* Settings & Marketplace Modals */}
      <SettingsModal
        visible={isSettingsModalVisible} onClose={handleCloseSettings}
        workspaceId={workspace?.id} onSyncWorkspace={refreshWorkspace}
      />
      <ExtensionMarketplaceModal visible={isMarketplaceVisible} onClose={handleCloseMarketplace} />
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
