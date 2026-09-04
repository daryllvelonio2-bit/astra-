import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AstraLogo } from "./AstraLogo";
import { AgentMessageItem } from "./AgentMessageItem";
import { LiveAgentStatusBar } from "./LiveAgentStatusBar";
import { ModelPickerModal } from "./ModelPickerModal";
import { CognitiveModeModal } from "./CognitiveModeModal";
import { CognitiveModeBar } from "./CognitiveModeBar";
import { ExecutionResultModal } from "./ExecutionResultModal";
import { ChatSessionsModal } from "./ChatSessionsModal";
import { ActionApprovalModal } from "./ActionApprovalModal";
import { FloatingOverlay } from "../services/floatingOverlayService";
import { useChatSession } from "./useChatSession";
import { FloatingOverlayTopBar } from "./FloatingOverlayTopBar";
import { getAstraModeInfo } from "../astra/astraModes";
import { useTheme } from "../../theme/themeContext";

interface FloatingChatOverlayProps {
  workspaceId?: string;
  activeFileName?: string;
  activeFileContent?: string;
  isSystemOverlay?: boolean;
}

export function FloatingChatOverlay({
  workspaceId: initialWorkspaceId,
  activeFileName: initialActiveFileName,
  activeFileContent: initialActiveFileContent,
}: FloatingChatOverlayProps) {
  const { theme, isMidnight } = useTheme();
  const [activeFileName] = useState<string | undefined>(initialActiveFileName);
  const [activeFileContent] = useState<string | undefined>(initialActiveFileContent);

  const {
    workspace,
    messages,
    renderLimit,
    setRenderLimit,
    input,
    setInput,
    agentStatus,
    selectedModel,
    selectedCognitiveMode,
    selectedEffort,
    interactiveApproval,
    pendingApprovalStep,
    showApprovalModal,
    showModelPicker,
    setShowModelPicker,
    showCognitiveModeModal,
    setShowCognitiveModeModal,
    showSessionsModal,
    setShowSessionsModal,
    sessions,
    currentSession,
    runOutput,
    setRunOutput,
    liveStatus,
    elapsedSeconds,
    scrollRef,
    shouldScrollToEndRef,
    handleSend,
    handleStopAgent,
    handleSelectSession,
    handleCreateNewChat,
    handleDeleteSession,
    handleSelectModel,
    handleSelectCognitiveMode,
    handleSelectEffort,
    handleRunSnippet,
    handleApplyFile,
    handleToggleInteractiveApproval,
    handleApproveAction,
    handleApproveSession,
    handleRejectAction,
  } = useChatSession({
    workspaceId: initialWorkspaceId,
    activeFileName,
    activeFileContent,
  });

  const visibleMessages = messages.slice(-renderLimit);
  const hiddenCount = Math.max(0, messages.length - renderLimit);
  const modeInfo = getAstraModeInfo(selectedCognitiveMode);

  const handleMinimize = () => FloatingOverlay.collapseToBubble();
  const handleOpenIDE = () => {
    FloatingOverlay.bringAppToFront();
    FloatingOverlay.collapseToBubble();
  };
  const handleCloseOverlay = () => FloatingOverlay.stop();

  const displayTitle =
    !currentSession?.title ||
    currentSession.title.startsWith("Chat ") ||
    currentSession.title === "New Conversation" ||
    currentSession.title === "Astra AI"
      ? "Astra AI"
      : currentSession.title;

  return (
    <View style={styles.rootBackdrop}>
      <TouchableWithoutFeedback onPress={handleMinimize}>
        <View style={StyleSheet.absoluteFillObject} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.centerContainer}
        pointerEvents="box-none"
      >
        <View style={[styles.floatingCard, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
          {/* Header */}
          <View style={[styles.cardHeader, { backgroundColor: theme.bgTertiary, borderBottomColor: theme.border }]}>
            <TouchableOpacity
              style={styles.headerLeft}
              onPress={() => setShowSessionsModal(true)}
              activeOpacity={0.7}
            >
              <AstraLogo width={18} height={18} />
              <View style={styles.headerTitleWrap}>
                <View style={styles.titleRow}>
                  <Text style={[styles.headerTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                    {displayTitle}
                  </Text>
                  <Ionicons name="caret-down" size={10} color={theme.textMuted} />
                </View>
                <View style={styles.subtitleRow}>
                  <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                    {workspace?.name || "Workspace"}
                  </Text>
                  {selectedCognitiveMode !== "default" && (
                    <>
                      <Text style={[styles.dotSeparator, { color: theme.textMuted }]}>•</Text>
                      <Text style={[styles.headerSubtitle, { color: modeInfo.highlightColor }]} numberOfLines={1}>
                        {modeInfo.badge}
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.headerActions}>
              <TouchableOpacity style={[styles.headerBtn, { backgroundColor: theme.bgSecondary }]} onPress={handleOpenIDE} activeOpacity={0.7}>
                <Ionicons name="code-slash" size={13} color={theme.accent} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.headerBtn, { backgroundColor: theme.bgSecondary }]} onPress={handleMinimize} activeOpacity={0.7}>
                <Ionicons name="remove" size={14} color={theme.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.headerBtn, styles.headerCloseBtn, { backgroundColor: `${theme.accentRed}18` }]} onPress={handleCloseOverlay} activeOpacity={0.7}>
                <Ionicons name="close" size={13} color={theme.accentRed} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Action Chips Bar */}
          <FloatingOverlayTopBar
            selectedModel={selectedModel}
            selectedCognitiveMode={selectedCognitiveMode}
            onOpenModelPicker={() => setShowModelPicker(true)}
            onOpenCognitiveModes={() => setShowCognitiveModeModal(true)}
            onOpenSessions={() => setShowSessionsModal(true)}
            onCreateNewChat={handleCreateNewChat}
          />

          {/* Messages Body */}
          {!workspace ? (
            <View style={[styles.loadingContainer, { backgroundColor: theme.bgPrimary }]}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Connecting to workspace...</Text>
            </View>
          ) : (
            <ScrollView
              ref={scrollRef}
              style={[styles.messagesScroll, { backgroundColor: theme.bgPrimary }]}
              contentContainerStyle={styles.messagesContent}
              keyboardShouldPersistTaps="handled"
              onScroll={({ nativeEvent }) => {
                if (!shouldScrollToEndRef.current && nativeEvent.contentOffset.y <= 5 && hiddenCount > 0) {
                  setRenderLimit((prev) => prev + 10);
                }
              }}
              onContentSizeChange={() => {
                if (shouldScrollToEndRef.current) {
                  scrollRef.current?.scrollToEnd({ animated: false });
                } else if (agentStatus !== "idle") {
                  scrollRef.current?.scrollToEnd({ animated: true });
                }
              }}
            >
              {hiddenCount > 0 && (
                <TouchableOpacity style={[styles.earlierBadge, { backgroundColor: theme.bgTertiary }]} onPress={() => setRenderLimit((prev) => prev + 10)}>
                  <Text style={[styles.earlierBadgeText, { color: theme.accent }]}>Earlier messages ({hiddenCount})</Text>
                </TouchableOpacity>
              )}

              {visibleMessages.length === 0 ? (
                <View style={styles.emptyState}>
                  <AstraLogo width={28} height={28} />
                  <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Astra Vibe Coder</Text>
                  <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                    Floating pair-programmer active above your apps. Ask anything or test code on the go!
                  </Text>
                </View>
              ) : (
                visibleMessages.map((msg) => (
                  <AgentMessageItem
                    key={msg.id}
                    message={msg}
                    onRunCodeSnippet={handleRunSnippet}
                    onApplyFile={handleApplyFile}
                  />
                ))
              )}
            </ScrollView>
          )}

          {/* Live Agent Status Bar */}
          {agentStatus !== "idle" && (
            <LiveAgentStatusBar
              status={agentStatus}
              liveInfo={liveStatus as any}
              elapsedSeconds={elapsedSeconds}
              onStop={handleStopAgent}
            />
          )}

          {/* Cognitive Mode Quick Bar */}
          <CognitiveModeBar
            selectedMode={selectedCognitiveMode}
            interactiveApproval={interactiveApproval}
            onSelectMode={handleSelectCognitiveMode}
            onOpenModeModal={() => setShowCognitiveModeModal(true)}
            onToggleInteractiveApproval={handleToggleInteractiveApproval}
          />

          {/* Prompt Input Bar */}
          <View style={[styles.inputContainer, { backgroundColor: theme.bgSecondary, borderTopColor: theme.border }]}>
            <TextInput
              style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.border, color: theme.textPrimary }]}
              placeholder="Ask Astra or write code..."
              placeholderTextColor={theme.textMuted}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={4000}
              editable={agentStatus === "idle"}
              onFocus={() => {
                shouldScrollToEndRef.current = true;
                scrollRef.current?.scrollToEnd({ animated: true });
              }}
            />

            {agentStatus === "idle" ? (
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  input.trim()
                    ? { backgroundColor: theme.sendButtonBg }
                    : { backgroundColor: theme.bgTertiary },
                ]}
                onPress={() => handleSend()}
                disabled={!input.trim()}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isMidnight ? "navigate" : "arrow-up"}
                  size={16}
                  color={input.trim() ? theme.sendButtonIcon : theme.textMuted}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.stopBtn, { backgroundColor: theme.accentRed }]} onPress={handleStopAgent} activeOpacity={0.8}>
                <Ionicons name="square" size={12} color={theme.sendButtonIcon} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Modals */}
      <CognitiveModeModal
        visible={showCognitiveModeModal}
        selectedMode={selectedCognitiveMode}
        selectedEffort={selectedEffort}
        interactiveApproval={interactiveApproval}
        onSelectMode={handleSelectCognitiveMode}
        onSelectEffort={handleSelectEffort}
        onToggleInteractiveApproval={handleToggleInteractiveApproval}
        onClose={() => setShowCognitiveModeModal(false)}
      />

      <ActionApprovalModal
        visible={showApprovalModal}
        step={pendingApprovalStep}
        onApprove={handleApproveAction}
        onApproveSession={handleApproveSession}
        onReject={handleRejectAction}
      />

      <ModelPickerModal
        visible={showModelPicker}
        selectedModel={selectedModel}
        onSelectModel={handleSelectModel}
        onClose={() => setShowModelPicker(false)}
      />

      <ChatSessionsModal
        visible={showSessionsModal}
        sessions={sessions}
        activeSessionId={currentSession?.id || null}
        workspaceName={workspace?.name}
        onSelectSession={handleSelectSession}
        onCreateNewSession={handleCreateNewChat}
        onDeleteSession={handleDeleteSession}
        onClose={() => setShowSessionsModal(false)}
      />

      <ExecutionResultModal runOutput={runOutput} onClose={() => setRunOutput(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  rootBackdrop: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  centerContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 24,
  },
  floatingCard: {
    width: "88%",
    maxWidth: 380,
    height: "78%",
    maxHeight: 580,
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 24,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  headerTitleWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  headerTitle: { fontSize: 12, fontWeight: "700", maxWidth: 140 },
  subtitleRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 },
  headerSubtitle: { fontSize: 9.5, fontWeight: "500" },
  dotSeparator: { fontSize: 9 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerBtn: { padding: 4.5, borderRadius: 5, alignItems: "center", justifyContent: "center" },
  headerCloseBtn: {},
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  loadingText: { fontSize: 12 },
  messagesScroll: { flex: 1 },
  messagesContent: { padding: 8, paddingBottom: 16 },
  earlierBadge: { alignSelf: "center", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
  earlierBadgeText: { fontSize: 10.5, fontWeight: "600" },
  emptyState: { paddingVertical: 32, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  emptyTitle: { fontSize: 13, fontWeight: "700", marginTop: 8 },
  emptySubtitle: { fontSize: 11, textAlign: "center", marginTop: 4, lineHeight: 16 },
  inputContainer: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 8, paddingVertical: 6, borderTopWidth: 1, gap: 6 },
  input: { flex: 1, minHeight: 34, maxHeight: 90, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, borderWidth: 1 },
  sendBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { opacity: 0.5 },
  stopBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
