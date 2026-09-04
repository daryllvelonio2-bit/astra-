import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Octicons } from "@expo/vector-icons";
import { useTheme } from "../../../theme/themeContext";
import { useOrientation } from "../../../theme/useOrientation";
import {
  GitBranch,
  GitCommit,
  GitCommitFile,
  GitFileStatus,
  GitRepoStatus,
} from "./types";
import {
  getGitStatus,
  getGitFileDiff,
  stageGitFile,
  unstageGitFile,
  stageAllGitFiles,
  unstageAllGitFiles,
  commitGitChanges,
  getGitCommitHistory,
  getGitCommitFiles,
  getGitCommitDiff,
  getGitBranches,
  switchGitBranch,
  createGitBranch,
  fetchGitRemote,
  pullGitRemote,
  pushGitRemote,
  initGitRepo,
  getGitRemoteUrl,
  setGitRemoteUrl,
} from "../../services/gitService";
import { GitHeaderBar } from "./GitHeaderBar";
import { GitChangesList } from "./GitChangesList";
import { GitHistoryList } from "./GitHistoryList";
import { GitCommitFilesList } from "./GitCommitFilesList";
import { GitDiffViewer } from "./GitDiffViewer";
import { GitBranchModal } from "./GitBranchModal";
import { GitCredentialsModal } from "./GitCredentialsModal";
import { GitRemoteModal } from "./GitRemoteModal";

interface GitHubDesktopViewProps {
  workspaceId?: string;
  projectName?: string;
  visible: boolean;
}

export function GitHubDesktopView({
  workspaceId,
  projectName = "Project",
  visible,
}: GitHubDesktopViewProps) {
  const { theme } = useTheme();
  const { isLandscape } = useOrientation();

  const [activeTab, setActiveTab] = useState<"changes" | "history">("changes");
  const [status, setStatus] = useState<GitRepoStatus | null>(null);
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<GitFileStatus | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<GitCommit | null>(null);
  const [commitFiles, setCommitFiles] = useState<GitCommitFile[]>([]);
  const [selectedCommitFile, setSelectedCommitFile] = useState<GitCommitFile | null>(null);
  const [diffText, setDiffText] = useState<string>("");

  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [loadingCommitFiles, setLoadingCommitFiles] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showRemoteModal, setShowRemoteModal] = useState(false);
  const [portraitShowDetail, setPortraitShowDetail] = useState(false);

  const refreshGitState = useCallback(async () => {
    if (!visible) return;
    setLoadingStatus(true);
    const newStatus = await getGitStatus(workspaceId);
    setStatus(newStatus);
    setLoadingStatus(false);
    if (newStatus.isRepo) {
      getGitCommitHistory(workspaceId).then(setCommits);
      getGitBranches(workspaceId).then(setBranches);
      getGitRemoteUrl(workspaceId).then(setRemoteUrl);
    }
  }, [workspaceId, visible]);

  useEffect(() => {
    if (visible) refreshGitState();
  }, [visible, refreshGitState]);

  const loadFileDiff = async (file: GitFileStatus) => {
    setSelectedFile(file);
    setSelectedCommit(null);
    setCommitFiles([]);
    setSelectedCommitFile(null);
    setLoadingDiff(true);
    if (!isLandscape) setPortraitShowDetail(true);
    const diff = await getGitFileDiff(workspaceId, file.path, file.staged);
    setDiffText(diff);
    setLoadingDiff(false);
  };

  const loadCommitDiff = async (commit: GitCommit) => {
    setSelectedCommit(commit);
    setSelectedFile(null);
    setLoadingCommitFiles(true);
    const files = await getGitCommitFiles(workspaceId, commit.hash);
    setCommitFiles(files);
    setLoadingCommitFiles(false);
    const initialFile = files[0] || null;
    setSelectedCommitFile(initialFile);
    setLoadingDiff(true);
    const diff = await getGitCommitDiff(workspaceId, commit.hash, initialFile?.path);
    setDiffText(diff);
    setLoadingDiff(false);
  };

  const handleSelectCommitFile = async (file: GitCommitFile) => {
    if (!selectedCommit) return;
    setSelectedCommitFile(file);
    setLoadingDiff(true);
    if (!isLandscape) setPortraitShowDetail(true);
    const diff = await getGitCommitDiff(workspaceId, selectedCommit.hash, file.path);
    setDiffText(diff);
    setLoadingDiff(false);
  };

  const handleBackToCommits = () => {
    setSelectedCommit(null);
    setSelectedCommitFile(null);
    setCommitFiles([]);
    setDiffText("");
    if (!isLandscape) setPortraitShowDetail(false);
  };

  const handleToggleStageFile = async (file: GitFileStatus) => {
    if (file.staged) {
      await unstageGitFile(workspaceId, file.path);
    } else {
      await stageGitFile(workspaceId, file.path);
    }
    refreshGitState();
  };

  const handleToggleStageAll = async (stageAll: boolean) => {
    if (stageAll) {
      await stageAllGitFiles(workspaceId);
    } else {
      await unstageAllGitFiles(workspaceId);
    }
    refreshGitState();
  };

  const handleCommit = async (summary: string, description: string) => {
    setCommitting(true);
    const res = await commitGitChanges(workspaceId, summary, description);
    setCommitting(false);
    if (res.success) {
      setSelectedFile(null);
      setDiffText("");
      if (!isLandscape) setPortraitShowDetail(false);
      refreshGitState();
    } else {
      Alert.alert("Commit Failed", res.error || "Could not commit changes.");
    }
  };

  const handleCommitAndPush = async (summary: string, description: string) => {
    setCommitting(true);
    const res = await commitGitChanges(workspaceId, summary, description);
    if (!res.success) {
      setCommitting(false);
      Alert.alert("Commit Failed", res.error || "Could not commit changes.");
      return;
    }
    setSelectedFile(null);
    setDiffText("");
    if (!isLandscape) setPortraitShowDetail(false);

    if (!remoteUrl) {
      setCommitting(false);
      refreshGitState();
      Alert.alert(
        "Committed Locally",
        "Your commit was created, but no remote repository is configured. Would you like to publish this repository now?",
        [
          { text: "Later", style: "cancel" },
          { text: "Publish to GitHub", onPress: () => setShowRemoteModal(true) },
        ]
      );
      return;
    }

    const pushRes = await pushGitRemote(workspaceId, status?.currentBranch);
    setCommitting(false);
    refreshGitState();
    Alert.alert(pushRes.success ? "Success" : "Pushed with notice", pushRes.success ? "Committed and pushed changes to remote!" : pushRes.message);
  };

  const handleSaveRemote = async (url: string): Promise<{ success: boolean; error?: string }> => {
    const res = await setGitRemoteUrl(workspaceId, url);
    if (res.success) {
      setRemoteUrl(url.trim() ? url.trim() : null);
      refreshGitState();
    }
    return res;
  };

  const handlePush = async () => {
    if (!status?.isRepo) return;
    if (!remoteUrl) return setShowRemoteModal(true);
    setSyncing(true);
    const res = await pushGitRemote(workspaceId, status.currentBranch);
    setSyncing(false);
    refreshGitState();
    Alert.alert("Push", res.message);
  };

  const handleSync = async () => {
    if (!status?.isRepo) return;
    if (!remoteUrl) return setShowRemoteModal(true);
    setSyncing(true);
    let res: { message: string };
    if (status.behind > 0) res = await pullGitRemote(workspaceId);
    else if (status.ahead > 0) res = await pushGitRemote(workspaceId, status.currentBranch);
    else res = await fetchGitRemote(workspaceId);
    setSyncing(false);
    refreshGitState();
    Alert.alert(status.behind > 0 ? "Pull" : status.ahead > 0 ? "Push" : "Fetch", res.message);
  };

  const handleSwitchBranch = async (branchName: string) => {
    const res = await switchGitBranch(workspaceId, branchName);
    if (res.success) refreshGitState();
    else Alert.alert("Error", res.error || "Could not switch branch.");
  };

  const handleCreateBranch = async (branchName: string) => {
    const res = await createGitBranch(workspaceId, branchName);
    if (res.success) refreshGitState();
    else Alert.alert("Error", res.error || "Could not create branch.");
  };

  const handleInitRepo = async () => {
    const ok = await initGitRepo(workspaceId);
    if (ok) refreshGitState();
    else Alert.alert("Error", "Could not initialize Git repository.");
  };

  const files = status?.files || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
      {/* Top Header Bar */}
      <GitHeaderBar
        repoName={projectName}
        status={status}
        loading={loadingStatus}
        syncing={syncing}
        remoteUrl={remoteUrl}
        onSelectBranch={() => setShowBranchModal(true)}
        onSync={handleSync}
        onRefresh={refreshGitState}
        onOpenCredentials={() => setShowCredentialsModal(true)}
        onOpenRemoteModal={() => setShowRemoteModal(true)}
        onInitRepo={handleInitRepo}
      />

      {/* Main Workspace Area */}
      <View style={styles.contentRow}>
        {/* Left Sidebar (or full view in portrait when detail is false) */}
        {(!portraitShowDetail || isLandscape) && (
          <View style={[styles.sidebar, isLandscape && styles.sidebarLandscape, { borderRightColor: theme.border, backgroundColor: theme.bgSecondary }]}>
            {/* Sub-Tabs: Changes vs History */}
            <View style={[styles.tabBar, isLandscape && styles.tabBarLandscape, { borderBottomColor: theme.border }]}>
              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  isLandscape && styles.tabBtnLandscape,
                  activeTab === "changes" && { borderBottomColor: theme.accent, borderBottomWidth: 2 },
                ]}
                onPress={() => setActiveTab("changes")}
              >
                <Octicons
                  name="diff-modified"
                  size={isLandscape ? 11 : 13}
                  color={activeTab === "changes" ? theme.accent : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.tabBtnText,
                    isLandscape && styles.tabBtnTextLandscape,
                    { color: activeTab === "changes" ? theme.accent : theme.textSecondary },
                    activeTab === "changes" && { fontWeight: "700" },
                  ]}
                  numberOfLines={1}
                >
                  Changes {files.length > 0 ? `(${files.length})` : ""}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  isLandscape && styles.tabBtnLandscape,
                  activeTab === "history" && { borderBottomColor: theme.accent, borderBottomWidth: 2 },
                ]}
                onPress={() => setActiveTab("history")}
              >
                <Octicons
                  name="history"
                  size={isLandscape ? 11 : 13}
                  color={activeTab === "history" ? theme.accent : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.tabBtnText,
                    isLandscape && styles.tabBtnTextLandscape,
                    { color: activeTab === "history" ? theme.accent : theme.textSecondary },
                    activeTab === "history" && { fontWeight: "700" },
                  ]}
                  numberOfLines={1}
                >
                  History
                </Text>
              </TouchableOpacity>
            </View>

            {activeTab === "changes" ? (
              <GitChangesList
                files={files}
                selectedFile={selectedFile}
                currentBranch={status?.currentBranch || "main"}
                ahead={status?.ahead || 0}
                committing={committing || syncing}
                onSelectFile={loadFileDiff}
                onToggleStageFile={handleToggleStageFile}
                onToggleStageAll={handleToggleStageAll}
                onCommit={handleCommit}
                onCommitAndPush={handleCommitAndPush}
                onPush={handlePush}
              />
            ) : selectedCommit ? (
              <GitCommitFilesList
                commit={selectedCommit}
                files={commitFiles}
                selectedFile={selectedCommitFile}
                loading={loadingCommitFiles}
                onSelectFile={handleSelectCommitFile}
                onBackToCommits={handleBackToCommits}
              />
            ) : (
              <GitHistoryList
                commits={commits}
                selectedCommit={selectedCommit}
                onSelectCommit={loadCommitDiff}
              />
            )}
          </View>
        )}

        {/* Right Main Pane: Diff Viewer (or full view in portrait when detail is true) */}
        {(portraitShowDetail || isLandscape) && (
          <View style={styles.diffPane}>
            <GitDiffViewer
              diff={diffText}
              loading={loadingDiff}
              selectedFile={selectedFile}
              selectedCommit={selectedCommit}
              selectedCommitFile={selectedCommitFile}
              onBackToMaster={!isLandscape ? () => setPortraitShowDetail(false) : undefined}
            />
          </View>
        )}
      </View>

      {/* Branch Switcher Modal */}
      <GitBranchModal
        visible={showBranchModal}
        branches={branches}
        currentBranch={status?.currentBranch || "main"}
        loading={loadingStatus}
        onClose={() => setShowBranchModal(false)}
        onSwitchBranch={handleSwitchBranch}
        onCreateBranch={handleCreateBranch}
      />

      {/* GitHub Credentials Modal */}
      <GitCredentialsModal
        visible={showCredentialsModal}
        onClose={() => setShowCredentialsModal(false)}
      />

      {/* GitHub Remote Manager Modal */}
      <GitRemoteModal
        visible={showRemoteModal}
        currentRemoteUrl={remoteUrl}
        onClose={() => setShowRemoteModal(false)}
        onSaveRemote={handleSaveRemote}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentRow: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    flex: 1,
  },
  sidebarLandscape: {
    flex: 0,
    width: 190,
    maxWidth: "25%",
    borderRightWidth: 1,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tabBarLandscape: {
    height: 32,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  tabBtnLandscape: {
    paddingVertical: 5,
    paddingHorizontal: 2,
    gap: 3,
  },
  tabBtnText: {
    fontSize: 12,
  },
  tabBtnTextLandscape: {
    fontSize: 10.5,
  },
  diffPane: {
    flex: 1,
  },
});
