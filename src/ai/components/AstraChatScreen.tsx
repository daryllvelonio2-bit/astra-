import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Platform,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AgentMessageItem } from "./AgentMessageItem";
import { LiveAgentStatusBar } from "./LiveAgentStatusBar";
import { ChatHeader } from "./ChatHeader";
import { ModelPickerModal } from "./ModelPickerModal";
import { CognitiveModeModal } from "./CognitiveModeModal";
import { CognitiveModeBar } from "./CognitiveModeBar";
import { ExecutionResultModal } from "./ExecutionResultModal";
import { ChatSessionsModal } from "./ChatSessionsModal";
import { ActionApprovalModal } from "./ActionApprovalModal";
import { AstraLogo } from "./AstraLogo";
import { useChatSession } from "./useChatSession";
import { useTheme } from "../../theme/themeContext";

export interface AstraChatScreenProps {
  workspaceId?: string;
  onNavigateToWorkspaces: () => void;
  onNavigateToEditor: () => void;
  onNavigateToTerminal?: () => void;
}

export type GeminiChatScreenProps = AstraChatScreenProps;

export function AstraChatScreen({
  workspaceId,
  onNavigateToWorkspaces,
  onNavigateToEditor,
}: AstraChatScreenProps) {
  const insets = useSafeAreaInsets();
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const { theme, isMidnight } = useTheme();

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
    handleRunSnippet,
    handleApplyFile,
    handleSelectModel,
    handleSelectCognitiveMode,
    handleSelectEffort,
    handleToggleInteractiveApproval,
    handleApproveAction,
    handleApproveSession,
    handleRejectAction,
  } = useChatSession({ workspaceId });

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvt, (e) => {
      setKeyboardOffset(e.endCoordinates.height);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    });
    const hideSub = Keyboard.addListener(hideEvt, () => {
      setKeyboardOffset(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollRef]);

  const visibleMessages = messages.slice(-renderLimit);
  const hiddenCount = Math.max(0, messages.length - renderLimit);

  return (
    <View style={[styles.container, { backgroundColor: theme.bgPrimary, paddingTop: insets.top, paddingBottom: keyboardOffset }]}>
      <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor={theme.bgSecondary} />
      <ChatHeader
        currentSession={currentSession}
        workspace={workspace}
        selectedModel={selectedModel}
        selectedCognitiveMode={selectedCognitiveMode}
        onOpenSessions={() => setShowSessionsModal(true)}
        onOpenModelPicker={() => setShowModelPicker(true)}
        onOpenCognitiveModes={() => setShowCognitiveModeModal(true)}
        onCreateNewChat={handleCreateNewChat}
        onNavigateToWorkspaces={onNavigateToWorkspaces}
        onNavigateToEditor={onNavigateToEditor}
      />

      <ScrollView
        ref={scrollRef}
        style={[styles.chatScroll, { backgroundColor: theme.bgPrimary }]}
        contentContainerStyle={[styles.chatContent, messages.length === 0 && styles.emptyChatContent]}
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
          <TouchableOpacity
            style={[styles.loadOlderBtn, { backgroundColor: theme.bgTertiary, borderColor: theme.border }]}
            onPress={() => setRenderLimit((prev) => prev + 10)}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={12} color={theme.accent} />
            <Text style={[styles.loadOlderText, { color: theme.accent }]}>
              Show earlier messages ({hiddenCount} older)
            </Text>
          </TouchableOpacity>
        )}

        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.logoCardWrapper}>
              <View style={[styles.logoCardGlow, isMidnight && { backgroundColor: theme.accentCyan }]} />
              <View style={[styles.logoCard, { backgroundColor: theme.bgTertiary, borderColor: theme.border }]}>
                <AstraLogo width={50} height={50} />
              </View>
            </View>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Astra Pair Programmer</Text>
            {workspace ? (
              <View style={styles.emptySubtitleRow}>
                <Text style={[styles.emptySubtitlePrefix, { color: theme.textSecondary }]}>Active in</Text>
                <View style={[styles.emptyProjectBadge, { backgroundColor: theme.bgTertiary, borderColor: theme.border }]}>
                  <Ionicons name="folder" size={12} color={theme.accent} />
                  <Text style={[styles.emptyProjectBadgeText, { color: theme.accent }]} numberOfLines={1}>
                    {workspace.name}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={[styles.emptySubtitleText, { color: theme.textSecondary }]}>
                Ask questions, generate code, or explore your workspace.
              </Text>
            )}
            <Text style={[styles.emptyHintText, { color: theme.textMuted }]}>
              Ask questions, build features, or run terminal tasks below.
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

      <LiveAgentStatusBar
        status={agentStatus}
        liveInfo={liveStatus as any}
        elapsedSeconds={elapsedSeconds}
        onStop={handleStopAgent}
      />

      <CognitiveModeBar
        selectedMode={selectedCognitiveMode}
        interactiveApproval={interactiveApproval}
        onSelectMode={handleSelectCognitiveMode}
        onOpenModeModal={() => setShowCognitiveModeModal(true)}
        onToggleInteractiveApproval={handleToggleInteractiveApproval}
      />

      <View style={[styles.inputContainer, { backgroundColor: theme.bgSecondary, borderTopColor: theme.border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.border, color: theme.textPrimary }]}
          placeholder="Ask Astra..."
          placeholderTextColor={theme.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={4000}
        />
        {agentStatus !== "idle" ? (
          <TouchableOpacity
            style={[styles.sendButton, styles.stopButton]}
            onPress={handleStopAgent}
            activeOpacity={0.8}
            accessibilityLabel="Stop agent"
          >
            <Ionicons name="stop" size={16} color="#ffffff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.sendButton,
              input.trim()
                ? { backgroundColor: theme.sendButtonBg, borderColor: theme.sendButtonBg }
                : { backgroundColor: theme.bgTertiary, borderColor: theme.border },
            ]}
            disabled={!input.trim()}
            onPress={() => handleSend()}
            activeOpacity={0.8}
            accessibilityLabel="Send message"
          >
            <Ionicons
              name={isMidnight ? "navigate" : "arrow-up"}
              size={17}
              color={input.trim() ? theme.sendButtonIcon : theme.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>

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
        onStopAgent={handleStopAgent}
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
  container: { flex: 1, backgroundColor: "#131314" },
  chatScroll: { flex: 1 },
  chatContent: { padding: 16, paddingBottom: 24 },
  emptyChatContent: { flexGrow: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 8,
  },
  logoCardWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  logoCardGlow: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(59, 130, 246, 0.12)",
  },
  logoCard: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: "#191c22",
    borderWidth: 1,
    borderColor: "rgba(138, 180, 248, 0.22)",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    overflow: "hidden",
  },
  emptyTitle: {
    color: "#f1f3f4",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  emptySubtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  emptySubtitlePrefix: {
    color: "#9aa0a6",
    fontSize: 13,
    fontWeight: "500",
  },
  emptyProjectBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(138, 180, 248, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(138, 180, 248, 0.25)",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
  },
  emptyProjectBadgeText: {
    color: "#8ab4f8",
    fontSize: 12.5,
    fontWeight: "600",
    maxWidth: 160,
  },
  emptySubtitleText: {
    color: "#9aa0a6",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  emptyHintText: {
    color: "#5f6368",
    fontSize: 12,
    textAlign: "center",
    marginTop: 2,
  },
  loadOlderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#1e2229",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 12,
    alignSelf: "center",
  },
  loadOlderText: { color: "#8ab4f8", fontSize: 11.5, fontWeight: "600" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "#161719",
    borderTopWidth: 1,
    borderTopColor: "#26282d",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#1f2126",
    borderWidth: 1,
    borderColor: "#2d3037",
    color: "#f1f3f4",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 9,
    paddingBottom: 9,
    fontSize: 14,
    lineHeight: 20,
    maxHeight: 120,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 1,
  },
  sendButtonDisabled: {
    backgroundColor: "#222429",
    borderWidth: 1,
    borderColor: "#2b2e34",
  },
  sendButtonActive: {
    backgroundColor: "#3b82f6",
    borderWidth: 1,
    borderColor: "#60a5fa",
    elevation: 4,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  stopButton: {
    backgroundColor: "#ef4444",
    borderWidth: 1,
    borderColor: "#f87171",
    elevation: 3,
  },
});

export const Astra = AstraChatScreen;
export const GeminiChatScreen = AstraChatScreen;

