import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Keyboard,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAccurateKeyboard } from "../../theme/useAccurateKeyboard";
import { AgentMessageItem } from "./AgentMessageItem";
import { LiveAgentStatusBar } from "./LiveAgentStatusBar";
import { ChatHeader } from "./ChatHeader";
import { ModelPickerModal } from "./ModelPickerModal";
import { CognitiveModeModal } from "./CognitiveModeModal";
import { ExecutionResultModal } from "./ExecutionResultModal";
import { ChatSessionsModal } from "./ChatSessionsModal";
import { ActionApprovalModal } from "./ActionApprovalModal";
import { useChatSession } from "./useChatSession";
import { useVoiceInput } from "./useVoiceInput";
import { useTheme } from "../../theme/themeContext";

const ASTRA_ASCII = `    _    ____ _____ ____      _    
   / \\  / ___|_   _|  _ \\    / \\   
  / _ \\ \\___ \\ | | | |_) |  / _ \\  
 / ___ \\ ___) || | |  _ <  / ___ \\ 
/_/   \\_\\____/ |_| |_| \\_\\/_/   \\_\\`;

export interface AstraChatScreenProps {
  workspaceId?: string;
  onNavigateToWorkspaces?: () => void;
  onNavigateToEditor?: () => void;
  onNavigateToTerminal?: () => void;
}

export type GeminiChatScreenProps = AstraChatScreenProps;

export function AstraChatScreen({
  workspaceId,
  onNavigateToWorkspaces,
  onNavigateToEditor,
}: AstraChatScreenProps) {
  const { keyboardOffset, isKeyboardVisible } = useAccurateKeyboard(4);
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
    handleRunInTerminal,
    handleApplyFile,
    handleSelectModel,
    handleSelectCognitiveMode,
    handleSelectEffort,
    handleApproveAction,
    handleApproveSession,
    handleRejectAction,
  } = useChatSession({ workspaceId });

  // Mic replaces send while the box is empty; dictated text lands in input.
  const {
    voiceSupported,
    voiceListening,
    voiceTranscribing,
    toggleVoice,
  } = useVoiceInput({
    input,
    onText: setInput,
    onError: (msg) => Alert.alert("Voice input", msg),
  });
  const showMic = voiceSupported && !input.trim();
  const voiceBusy = voiceListening || voiceTranscribing;
  const onMicPress = async () => {
    const err = await toggleVoice();
    if (err) Alert.alert("Voice input", err);
  };

  useEffect(() => {
    if (isKeyboardVisible) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 80);
    }
  }, [isKeyboardVisible, scrollRef]);

  // Stable slice: 1Hz timer ticks re-render parent but keep same array ref
  // when messages/renderLimit are unchanged, letting memo rows skip.
  const visibleMessages = useMemo(() => messages.slice(-renderLimit), [messages, renderLimit]);
  const hiddenCount = Math.max(0, messages.length - renderLimit);

  const handleScroll = useCallback(
    ({ nativeEvent }: any) => {
      if (!shouldScrollToEndRef.current && nativeEvent.contentOffset.y <= 5 && hiddenCount > 0) {
        setRenderLimit((prev) => prev + 20);
      }
    },
    [hiddenCount, setRenderLimit, shouldScrollToEndRef]
  );

  const handleContentSizeChange = useCallback(() => {
    // Never animate during streaming — animated scrolls jank on Android.
    if (shouldScrollToEndRef.current || agentStatus !== "idle") {
      scrollRef.current?.scrollToEnd({ animated: false });
    }
  }, [agentStatus, scrollRef, shouldScrollToEndRef]);

  const handleLoadOlder = useCallback(() => {
    setRenderLimit((prev) => prev + 20);
  }, [setRenderLimit]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bgPrimary, paddingBottom: keyboardOffset }]}>
      <ChatHeader
        currentSession={currentSession}
        workspace={workspace}
        selectedModel={selectedModel}
        selectedCognitiveMode={selectedCognitiveMode}
        onOpenSessions={() => setShowSessionsModal(true)}
        onOpenCognitiveModes={() => setShowCognitiveModeModal(true)}
      />

      <ScrollView
        ref={scrollRef}
        style={[styles.chatScroll, { backgroundColor: theme.bgPrimary }]}
        contentContainerStyle={[styles.chatContent, messages.length === 0 && styles.emptyChatContent]}
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        onContentSizeChange={handleContentSizeChange}
      >
        {hiddenCount > 0 && (
          <TouchableOpacity
            style={[styles.loadOlderBtn, { backgroundColor: theme.bgTertiary, borderColor: theme.border }]}
            onPress={handleLoadOlder}
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
            <Text style={[styles.emptyAscii, { color: theme.textPrimary }]}>
              {ASTRA_ASCII}
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

      <View style={[styles.inputContainer, { backgroundColor: theme.bgSecondary, borderTopColor: theme.border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.border, color: theme.textPrimary }]}
          placeholder={voiceListening ? "Listening… speak now" : voiceTranscribing ? "Transcribing…" : "Ask Astra..."}
          placeholderTextColor={theme.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={4000}
        />
        {agentStatus !== "idle" ? (
          <TouchableOpacity
            style={[styles.sendButton, styles.stopButton, { backgroundColor: theme.accentRed, borderColor: theme.accentRed }]}
            onPress={handleStopAgent}
            activeOpacity={0.8}
            accessibilityLabel="Stop agent"
          >
            <Ionicons name="stop" size={16} color={theme.sendButtonIcon} />
          </TouchableOpacity>
        ) : showMic ? (
          <TouchableOpacity
            style={[
              styles.sendButton,
              voiceBusy
                ? { backgroundColor: theme.accentRed, borderColor: theme.accentRed }
                : { backgroundColor: theme.bgTertiary, borderColor: theme.border },
            ]}
            onPress={onMicPress}
            activeOpacity={0.8}
            accessibilityLabel={voiceListening ? "Stop voice input" : "Voice input"}
          >
            <Ionicons
              name={voiceBusy ? "mic" : "mic-outline"}
              size={17}
              color={voiceBusy ? theme.sendButtonIcon : theme.accent}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.sendButton,
              input.trim()
                ? { backgroundColor: theme.sendButtonBg, borderColor: theme.sendButtonBg }
                : { backgroundColor: theme.bgTertiary, borderColor: theme.border },
            ]}
            // Never disabled: a state-lagging `disabled` gate eats fast
            // type+send taps (input looks empty for one frame). Empty sends
            // still no-op inside handleSend; grey styling is cosmetic only.
            onPress={() => handleSend()}
            activeOpacity={0.8}
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !input.trim() }}
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
        onSelectMode={handleSelectCognitiveMode}
        onSelectEffort={handleSelectEffort}
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
      <ExecutionResultModal
        runOutput={runOutput}
        onClose={() => setRunOutput(null)}
        onRunInTerminal={handleRunInTerminal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chatScroll: { flex: 1 },
  chatContent: { padding: 16, paddingBottom: 24 },
  emptyChatContent: { flexGrow: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyAscii: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0,
    marginTop: 10,
  },
  loadOlderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 12,
    alignSelf: "center",
  },
  loadOlderText: { fontSize: 11.5, fontWeight: "600" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
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
    borderWidth: 1,
  },
  sendButtonActive: {
    borderWidth: 1,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  stopButton: {
    borderWidth: 1,
    elevation: 3,
  },
});

export const Astra = AstraChatScreen;
export const GeminiChatScreen = AstraChatScreen;

