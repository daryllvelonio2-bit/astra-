import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Octicons } from "@expo/vector-icons";
import { useTheme } from "../../../theme/themeContext";
import { useOrientation } from "../../../theme/useOrientation";
import { GitHeaderBar } from "./GitHeaderBar";
import { GitChangesList } from "./GitChangesList";
import { GitHistoryList } from "./GitHistoryList";
import { GitCommitFilesList } from "./GitCommitFilesList";
import { GitDiffViewer } from "./GitDiffViewer";
import { GitBranchModal } from "./GitBranchModal";
import { GitCredentialsModal } from "./GitCredentialsModal";
import { GitRemoteModal } from "./GitRemoteModal";
import { useGitOperations } from "./useGitOperations";

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

  const {
    activeTab,
    setActiveTab,
    status,
    commits,
    branches,
    remoteUrl,
    selectedFile,
    setSelectedFile,
    selectedCommit,
    commitFiles,
    selectedCommitFile,
    diffText,
    loadingStatus,
    loadingDiff,
    loadingCommitFiles,
    committing,
    syncing,
    showBranchModal,
    setShowBranchModal,
    showCredentialsModal,
    setShowCredentialsModal,
    showRemoteModal,
    setShowRemoteModal,
    portraitShowDetail,
    setPortraitShowDetail,
    avatars,
    brokenAvatars,
    markBroken,
    refreshGitState,
    loadFileDiff,
    loadCommitDiff,
    handleSelectCommitFile,
    handleBackToCommits,
    handleToggleStageFile,
    handleToggleStageAll,
    handleCommit,
    handleCommitAndPush,
    handleSaveRemote,
    handlePush,
    handleSync,
    handleSwitchBranch,
    handleCreateBranch,
    handleInitRepo,
  } = useGitOperations(workspaceId, visible, isLandscape);

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
                workspaceId={workspaceId}
                selectedFile={selectedFile}
                currentBranch={status?.currentBranch || "main"}
                ahead={status?.ahead || 0}
                detached={status?.detached || false}
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
                avatars={avatars}
                brokenAvatars={brokenAvatars}
                onAvatarError={markBroken}
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
