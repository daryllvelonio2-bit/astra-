import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AstraLogo } from "./AstraLogo";
import { StepCard } from "./StepCard";
import { MarkdownMessageView } from "./MarkdownMessageView";
import { AgentChatMessage, AgentStep } from "../agent/agentTypes";
import { sanitizeAgentText, isMachineJsonDump } from "./sanitizeAgentText";
import { RawDumpView } from "./RawDumpView";
import { Clipboard } from "../../ide/services/clipboardService";
import { useTheme } from "../../theme/themeContext";
import { ideActionService } from "../../ide/services/ideActionService";

interface AgentMessageItemProps {
  message: AgentChatMessage;
  onRunCodeSnippet?: (code: string, language: string) => void;
  onApplyFile?: (filePath: string, code: string) => void;
}

export function AgentMessageItem({ message, onRunCodeSnippet, onApplyFile }: AgentMessageItemProps) {
  const { theme, isMidnight } = useTheme();
  const isUser = message.role === "user";
  const [showThoughts, setShowThoughts] = useState(true);
  const [showSteps, setShowSteps] = useState(true);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  const steps = message.steps || [];
  const isExecuting =
    message.status === "thinking" ||
    message.status === "executing_tool" ||
    message.status === "verifying";

  // Separate thoughts from actionable tool steps
  const thoughtSteps = steps.filter((s) => s.type === "thought" && s.content?.trim());
  const toolSteps = steps.filter(
    (s) =>
      s.type !== "thought" &&
      s.toolName !== "update_topic" &&
      s.toolName !== "set_topic" &&
      !s.content?.startsWith("## Topic:")
  );

  const totalToolSteps = toolSteps.length;
  const visibleToolSteps = showAllHistory || totalToolSteps <= 3 ? toolSteps : toolSteps.slice(-3);
  const hiddenCount = totalToolSteps > 3 && !showAllHistory ? totalToolSteps - 3 : 0;

  const handleCopyMessage = async () => {
    try {
      const ok = await Clipboard.setStringAsync(message.text || "");
      if (ok) {
        setCopiedMsg(true);
        setTimeout(() => setCopiedMsg(false), 2000);
      }
    } catch (_) {}
  };

  const renderFormattedText = (text: string) => {
    const isActive = isExecuting || message.status === "error";

    if (!text && isActive) {
      if (thoughtSteps.length > 0) {
        return null;
      }
      const latestStep = steps[steps.length - 1];
      const hasError = latestStep?.isError || message.status === "error";

      let statusIcon = "sparkles";
      let statusColor = theme.accent;
      let statusText = "Astra is analyzing & formulating code...";

      if (hasError) {
        statusIcon = "alert-circle";
        statusColor = theme.accentRed;
        statusText = latestStep?.toolOutput || latestStep?.content || "An error occurred. Check your API key in Settings.";
      } else if (latestStep?.type === "tool_call") {
        statusIcon = "construct";
        statusColor = theme.accentGreen;
        statusText = latestStep.content || `Executing ${latestStep.toolName || "tool"}...`;
      } else if (latestStep?.type === "thought") {
        statusIcon = "bulb-outline";
        statusColor = theme.accentGold;
        statusText = latestStep.content;
      }

      const targetFilePath =
        latestStep?.toolArgs?.file_path ||
        latestStep?.toolArgs?.path ||
        latestStep?.toolArgs?.file ||
        latestStep?.toolArgs?.TargetFile;

      const rawCmd = latestStep?.toolArgs?.command || latestStep?.toolArgs?.cmd || "";
      let portMatch = (rawCmd + " " + (latestStep?.toolOutput || "")).match(/(?:--port|-p)\s+(\d{2,5})|:(\d{4,5})/i);
      let detectedPort = portMatch ? parseInt(portMatch[1] || portMatch[2], 10) : undefined;
      if (!detectedPort && /expo/i.test(rawCmd)) detectedPort = 8081;
      if (!detectedPort && /artisan/i.test(rawCmd)) detectedPort = 8000;
      if (!detectedPort && /vite/i.test(rawCmd)) detectedPort = 5173;
      if (!detectedPort && /http\.server/i.test(rawCmd)) detectedPort = 8000;
      const detectedUrl = detectedPort ? `http://127.0.0.1:${detectedPort}` : undefined;

      return (
        <View style={[styles.thinkingCard, { backgroundColor: theme.bgSecondary, borderColor: theme.border }, hasError && { backgroundColor: `${theme.accentRed}12`, borderColor: `${theme.accentRed}50` }]}>
          <View style={styles.thinkingHeader}>
            <View style={styles.thinkingPulseRow}>
              {!hasError && <ActivityIndicator size="small" color={statusColor} />}
              <Ionicons name={statusIcon as any} size={14} color={statusColor} style={{ marginLeft: hasError ? 0 : 6 }} />
              <Text style={[styles.thinkingTitle, { color: statusColor }]}>
                {hasError ? "Agent Alert" : "Agent Active"}
              </Text>
            </View>
            <View style={[styles.stepBadge, { backgroundColor: theme.bgTertiary, borderColor: theme.border }]}>
              <Text style={[styles.stepBadgeText, { color: theme.accent }]}>
                Step {Math.max(totalToolSteps, 1)}
              </Text>
            </View>
          </View>
          <Text style={[styles.thinkingSubtext, { color: theme.textSecondary }, hasError && { color: theme.accentRed }]} numberOfLines={3}>
            {statusText}
          </Text>
          {targetFilePath && !hasError ? (
            <TouchableOpacity
              style={[styles.thinkingActionBtn, { backgroundColor: `${theme.accent}18`, borderColor: theme.accent }]}
              onPress={() => ideActionService.openFile(targetFilePath, undefined, undefined, true)}
              activeOpacity={0.7}
            >
              <Ionicons name="open-outline" size={11} color={theme.accent} />
              <Text style={[styles.thinkingActionBtnText, { color: theme.accent }]}>
                View {targetFilePath.split("/").pop()} in Editor
              </Text>
            </TouchableOpacity>
          ) : detectedUrl && !hasError ? (
            <TouchableOpacity
              style={[styles.thinkingActionBtn, { backgroundColor: `${theme.accentGreen}18`, borderColor: theme.accentGreen }]}
              onPress={() => ideActionService.openBrowser(detectedUrl, detectedPort, true)}
              activeOpacity={0.7}
            >
              <Ionicons name="globe-outline" size={11} color={theme.accentGreen} />
              <Text style={[styles.thinkingActionBtnText, { color: theme.accentGreen }]}>
                Open Preview ({detectedUrl})
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      );
    }

    if (!text) {
      const errorStep = steps.find((s) => s.isError);
      return (
        <Text selectable style={[styles.messageText, styles.assistantText, { color: theme.textPrimary }]}>
          {errorStep ? `⚠️ ${errorStep.content || "An error occurred."}` : "✅ Completed."}
        </Text>
      );
    }

    return (
      <MarkdownMessageView
        content={text}
        isUser={isUser}
        onRunCodeSnippet={onRunCodeSnippet}
        onApplyFile={onApplyFile}
      />
    );
  };

  // Machine JSON dump guard: serialized steps/tool results must never render raw.
  const renderDumpGuard = (text: string) => {
    if (!text || !isMachineJsonDump(text)) return null;
    const cleaned = sanitizeAgentText(text);
    if (cleaned) {
      return (
        <MarkdownMessageView
          content={cleaned}
          isUser={isUser}
          onRunCodeSnippet={onRunCodeSnippet}
          onApplyFile={onApplyFile}
        />
      );
    }
    return <RawDumpView text={text} />;
  };

  // User message rendering (Aligned right)
  if (isUser) {
    return (
      <View style={styles.userContainer}>
        <View style={[styles.userAvatar, { backgroundColor: theme.borderLight }]}>
          <Ionicons name="person" size={13} color={theme.textPrimary} />
        </View>
        <View style={[styles.userBubble, { backgroundColor: theme.bubbleUser, borderColor: theme.border }]}>
        {renderDumpGuard(message.text) || renderFormattedText(message.text)}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.assistantContainer}>
      <View style={styles.assistantHeaderRow}>
        <View style={[styles.astraBadgeIcon, { backgroundColor: `${theme.accentGreen}25` }]}>
          <Ionicons name="terminal" size={13} color={theme.accentGreen} />
        </View>
        <Text style={[styles.assistantAuthorName, { color: theme.accentGreen }]}>
          Astra CLI
        </Text>
      </View>

      <View
        style={[
          styles.assistantBubble,
          {
            backgroundColor: theme.bubbleAssistant,
            borderColor: isMidnight ? theme.borderLight : theme.bubbleAssistantBorder,
          },
          isMidnight && {
            shadowColor: theme.accentCyan,
            shadowOpacity: 0.15,
            shadowRadius: 8,
          },
        ]}
      >
        {/* Streamlined Thought Process (No boxes / step wrapper) */}
        {thoughtSteps.length > 0 && (
          <View style={[styles.thoughtsWrapper, { borderBottomColor: theme.border }]}>
            <TouchableOpacity
              style={styles.thoughtsHeader}
              onPress={() => setShowThoughts(!showThoughts)}
              activeOpacity={0.7}
            >
              <View style={styles.thoughtsHeaderLeft}>
                <Ionicons name="sparkles" size={12} color={theme.accentGold} />
                <Text style={[styles.thoughtsTitle, { color: theme.accentGold }]}>
                  {isExecuting && !message.text ? "Reasoning..." : "Thought process"}
                </Text>
                {isExecuting && !message.text && (
                  <ActivityIndicator size="small" color={theme.accentGold} style={{ transform: [{ scale: 0.65 }] }} />
                )}
              </View>
              <Ionicons name={showThoughts ? "chevron-up" : "chevron-down"} size={12} color={theme.textMuted} />
            </TouchableOpacity>

            {showThoughts && (
              <View style={[styles.thoughtsContent, { borderLeftColor: `${theme.accentGold}60` }]}>
                {thoughtSteps.map((thought, idx) => (
                  <Text key={thought.id || idx} style={[styles.thoughtItemText, { color: theme.textSecondary }]} selectable>
                    {thought.content}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Action Steps (Commands, File writes, Edits) */}
        {totalToolSteps > 0 && (
          <View style={[styles.stepsSection, { backgroundColor: theme.bgPrimary, borderColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.stepsSummaryHeader, { backgroundColor: theme.bgSecondary }]}
              onPress={() => setShowSteps(!showSteps)}
              activeOpacity={0.7}
            >
              <View style={styles.stepsSummaryLeft}>
                <Ionicons name="construct-outline" size={12} color={theme.accent} />
                <Text style={[styles.stepsSummaryText, { color: theme.accent }]}>
                  {totalToolSteps} Action{totalToolSteps > 1 ? "s" : ""}
                </Text>
              </View>
              <Ionicons name={showSteps ? "chevron-up" : "chevron-down"} size={12} color={theme.accent} />
            </TouchableOpacity>

            {showSteps && (
              <View style={styles.stepsList}>
                {hiddenCount > 0 && (
                  <TouchableOpacity
                    style={[styles.olderStepsBadge, { backgroundColor: theme.bgTertiary }]}
                    onPress={() => setShowAllHistory(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="time-outline" size={11} color={theme.accent} />
                    <Text style={[styles.olderStepsText, { color: theme.accent }]}>
                      +{hiddenCount} previous action{hiddenCount > 1 ? "s" : ""} (tap to show)
                    </Text>
                  </TouchableOpacity>
                )}

                {visibleToolSteps.map((step, idx) => {
                  const actualIndex = showAllHistory || totalToolSteps <= 3 ? idx : idx + hiddenCount;
                  const isCurrent = actualIndex === totalToolSteps - 1;
                  return (
                    <StepCard
                      key={step.id || actualIndex}
                      step={step}
                      index={actualIndex}
                      isCurrent={isCurrent}
                    />
                  );
                })}

                {showAllHistory && totalToolSteps > 3 && (
                  <TouchableOpacity
                    style={[styles.olderStepsBadge, { backgroundColor: theme.bgTertiary }]}
                    onPress={() => setShowAllHistory(false)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chevron-up" size={11} color={theme.accent} />
                    <Text style={[styles.olderStepsText, { color: theme.accent }]}>Collapse older actions</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {renderFormattedText(message.text)}

        {message.text ? (
          <View style={styles.assistantFooter}>
            <TouchableOpacity style={styles.copyMsgBtn} onPress={handleCopyMessage} activeOpacity={0.7}>
              <Ionicons name={copiedMsg ? "checkmark-circle" : "copy-outline"} size={12} color={copiedMsg ? theme.accentGreen : theme.textSecondary} />
              <Text style={[styles.copyMsgText, { color: theme.textMuted }, copiedMsg && { color: theme.accentGreen }]}>{copiedMsg ? "Copied" : "Copy"}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  userContainer: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 6,
    marginVertical: 3,
    paddingHorizontal: 4,
    alignSelf: "flex-end",
    maxWidth: "92%",
  },
  userAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  userBubble: {
    borderRadius: 10,
    borderTopRightRadius: 2,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderWidth: 1,
  },
  assistantContainer: {
    width: "100%",
    marginVertical: 4,
    paddingHorizontal: 4,
    gap: 3,
  },
  assistantHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingLeft: 2,
  },
  assistantAuthorName: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  astraAuthorName: {
  },
  astraBadgeIcon: {
    width: 16,
    height: 16,
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  assistantBubble: {
    width: "100%",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  thoughtsWrapper: {
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
  },
  thoughtsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  thoughtsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  thoughtsTitle: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  thoughtsContent: {
    marginTop: 4,
    marginBottom: 2,
    borderLeftWidth: 2,
    paddingLeft: 8,
    gap: 4,
  },
  thoughtItemText: {
    fontSize: 12,
    lineHeight: 17,
    fontStyle: "italic",
  },
  messageText: { fontSize: 12.5, lineHeight: 18 },
  userText: { },
  assistantText: { },
  thinkingCard: {
    borderRadius: 6,
    padding: 7,
    borderWidth: 1,
    marginVertical: 2,
    gap: 4,
  },
  thinkingCardError: {
  },
  thinkingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  thinkingPulseRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  thinkingTitle: {
    fontSize: 10.5,
    fontWeight: "700",
    marginLeft: 5,
  },
  stepBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 1,
  },
  stepBadgeText: {
    fontSize: 8.5,
    fontWeight: "bold",
  },
  thinkingSubtext: {
    fontSize: 10.5,
    lineHeight: 14,
    fontFamily: "monospace",
  },
  stepsSection: { marginBottom: 4, borderRadius: 5, borderWidth: 1, overflow: "hidden" },
  stepsSummaryHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 6, paddingVertical: 3.5 },
  stepsSummaryLeft: { flexDirection: "row", alignItems: "center", gap: 4 },
  stepsSummaryText: { fontSize: 9.5, fontWeight: "600" },
  stepsList: { padding: 4, gap: 2 },
  olderStepsBadge: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 2, borderRadius: 3, marginVertical: 1 },
  olderStepsText: { fontSize: 9, fontWeight: "600" },
  assistantFooter: { flexDirection: "row", justifyContent: "flex-end", marginTop: 2, paddingTop: 1 },
  copyMsgBtn: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 3, paddingVertical: 1 },
  copyMsgText: { fontSize: 9 },
  thinkingActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 4,
    borderWidth: 1,
    marginTop: 2,
  },
  thinkingActionBtnText: {
    fontSize: 10,
    fontWeight: "600",
  },
});
