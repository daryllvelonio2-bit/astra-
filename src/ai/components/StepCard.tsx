import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AgentStep } from "../agent/agentTypes";
import { useTheme } from "../../theme/themeContext";
import { DirectoryListRenderer, isDirectoryListingText } from "./DirectoryListRenderer";
import { ideActionService } from "../../ide/services/ideActionService";

interface StepCardProps {
  step: AgentStep;
  index: number;
  isCurrent: boolean;
}

export function StepCard({ step, index, isCurrent }: StepCardProps) {
  const { theme, isMidnight } = useTheme();
  const [collapsed, setCollapsed] = useState(!isCurrent);

  // Skip internal metadata tools or topic initialization summaries
  if (
    step.toolName === "update_topic" ||
    step.toolName === "set_topic" ||
    step.toolName === "astra_topic" ||
    step.content?.includes("## Topic:") ||
    step.content?.includes("## 📁 Topic:") ||
    step.toolOutput?.includes("## Topic:") ||
    step.toolOutput?.includes("## 📁 Topic:") ||
    step.toolOutput?.includes("[!STRATEGY]")
  ) {
    return null;
  }

  const isThought = step.type === "thought";

  const filePath =
    step.toolArgs?.file_path ||
    step.toolArgs?.path ||
    step.toolArgs?.file ||
    step.toolArgs?.TargetFile ||
    step.toolArgs?.dir_path;

  const rawCmd = step.toolArgs?.command || step.toolArgs?.cmd || "";
  let portMatch = (rawCmd + " " + (step.toolOutput || "")).match(/(?:--port|-p)\s+(\d{2,5})|:(\d{4,5})/i);
  let detectedPort = portMatch ? parseInt(portMatch[1] || portMatch[2], 10) : undefined;
  if (!detectedPort && /expo/i.test(rawCmd)) detectedPort = 8081;
  if (!detectedPort && /artisan/i.test(rawCmd)) detectedPort = 8000;
  if (!detectedPort && /vite/i.test(rawCmd)) detectedPort = 5173;
  if (!detectedPort && /http\.server/i.test(rawCmd)) detectedPort = 8000;

  const detectedUrl = detectedPort ? `http://127.0.0.1:${detectedPort}` : undefined;

  let title = `Action ${index + 1}`;
  let iconName: any = "code-slash";
  let iconColor = theme.accent;

  if (isThought) {
    title = step.content ? (step.content.length > 40 ? step.content.slice(0, 40) + "..." : step.content) : `Thought ${index + 1}`;
    iconName = "bulb";
    iconColor = theme.accentGold;
  } else if (step.toolName || step.type === "tool_call" || step.type === "tool_result") {
    const rawTarget =
      step.toolArgs?.command ||
      step.toolArgs?.file_path ||
      step.toolArgs?.path ||
      step.toolArgs?.file ||
      step.toolArgs?.pattern ||
      step.toolArgs?.dir_path ||
      "";
    const target = rawTarget ? ` (${rawTarget.slice(0, 35)}${rawTarget.length > 35 ? "..." : ""})` : "";
    const tool = step.toolName || "tool";

    switch (tool) {
      case "run_shell_command":
      case "run_terminal_command":
      case "exec_command":
      case "execute_command":
      case "bash":
        title = `Command${target}`;
        iconName = "terminal";
        iconColor = theme.accentPurple;
        break;
      case "list_directory":
      case "glob_files":
      case "glob":
      case "list_dir":
      case "find_by_name":
        title = `📁 Files${target}`;
        iconName = "folder-open";
        iconColor = theme.accentGold;
        break;
      case "read_file":
      case "view_file":
        title = `🔍 Read File${target}`;
        iconName = "document-text";
        iconColor = theme.accent;
        break;
      case "write_file":
      case "create_file":
      case "write_to_file":
        title = `📝 Write File${target}`;
        iconName = "create";
        iconColor = theme.accentGreen;
        break;
      case "edit_file":
      case "patch_file":
      case "replace_file_content":
        title = `✏️ Edit File${target}`;
        iconName = "build";
        iconColor = theme.accentGold;
        break;
      default:
        title = `⚡ ${tool}${target}`;
        iconName = "flash";
        iconColor = theme.accent;
    }
  }

  const renderToolInput = () => {
    const args = step.toolArgs;
    if (!args) return null;

    const isCommand =
      step.toolName === "run_shell_command" ||
      step.toolName === "run_terminal_command" ||
      step.toolName === "exec_command" ||
      step.toolName === "execute_command" ||
      step.toolName === "bash" ||
      typeof args.command === "string";

    if (isCommand) {
      const cmd = args.command || args.cmd || String(args);
      const desc = args.description || args.desc;
      return (
        <View style={styles.subSection}>
          {desc ? <Text style={[styles.descText, { color: theme.textMuted }]}>📌 {desc}</Text> : null}
          <View style={[styles.terminalBox, { backgroundColor: theme.bgPrimary, borderColor: theme.border }]}>
            <Text style={[styles.terminalPrompt, { color: theme.accentGreen }]}>$</Text>
            <Text selectable style={[styles.terminalCommandText, { color: theme.textPrimary }]}>
              {cmd}
            </Text>
          </View>
          <View style={styles.actionRow}>
            {detectedUrl && (
              <TouchableOpacity
                style={[styles.actionNavigateBtn, { backgroundColor: `${theme.accentGreen}18`, borderColor: theme.accentGreen }]}
                onPress={() => ideActionService.openBrowser(detectedUrl, detectedPort)}
                activeOpacity={0.7}
              >
                <Ionicons name="globe-outline" size={11} color={theme.accentGreen} />
                <Text style={[styles.actionNavigateBtnText, { color: theme.accentGreen }]}>Open Preview</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionNavigateBtn, { backgroundColor: `${theme.accentPurple}18`, borderColor: theme.accentPurple }]}
              onPress={() => ideActionService.openTerminal()}
              activeOpacity={0.7}
            >
              <Ionicons name="terminal-outline" size={11} color={theme.accentPurple} />
              <Text style={[styles.actionNavigateBtnText, { color: theme.accentPurple }]}>View in Terminal</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    const desc = args.description || args.desc;
    const content = args.content || args.file_text || args.code || args.ReplacementContent;

    if (filePath) {
      return (
        <View style={styles.subSection}>
          {desc ? <Text style={[styles.descText, { color: theme.textMuted }]}>📌 {desc}</Text> : null}
          <View style={styles.fileHeaderRow}>
            <View style={[styles.filePathBadge, { backgroundColor: `${theme.accentGreen}18` }]}>
              <Ionicons name="document-text-outline" size={12} color={theme.accentGreen} />
              <Text style={[styles.filePathText, { color: theme.accentGreen }]} numberOfLines={1}>{filePath}</Text>
            </View>
            <TouchableOpacity
              style={[styles.actionNavigateBtn, { backgroundColor: `${theme.accent}18`, borderColor: theme.accent }]}
              onPress={() => ideActionService.openFile(filePath)}
              activeOpacity={0.7}
            >
              <Ionicons name="open-outline" size={11} color={theme.accent} />
              <Text style={[styles.actionNavigateBtnText, { color: theme.accent }]}>View File in Editor</Text>
            </TouchableOpacity>
          </View>
          {content ? (
            <Text selectable style={[styles.codeSnippet, { backgroundColor: theme.bgPrimary, color: theme.accentGreen }]} numberOfLines={6}>
              {typeof content === "string" ? content : JSON.stringify(content, null, 2)}
            </Text>
          ) : null}
        </View>
      );
    }

    if (typeof args === "object") {
      return (
        <View style={styles.subSection}>
          {Object.entries(args).map(([k, v]) => (
            <View key={k} style={styles.kvRow}>
              <Text style={[styles.kvKey, { color: theme.accent }]}>{k}:</Text>
              <Text style={[styles.kvVal, { color: theme.textPrimary }]} numberOfLines={2}>
                {typeof v === "string" ? v : JSON.stringify(v)}
              </Text>
            </View>
          ))}
        </View>
      );
    }

    return null;
  };

  const renderToolResult = () => {
    if (step.toolOutput) {
      if (isDirectoryListingText(step.toolOutput)) {
        return (
          <View style={styles.subSection}>
            <DirectoryListRenderer rawOutput={step.toolOutput} title="Output Directory Listing" />
          </View>
        );
      }

      return (
        <View style={styles.subSection}>
          <View style={styles.outputHeaderRow}>
            <Text style={[styles.subLabel, { color: theme.textMuted }]}>OUTPUT</Text>
            {filePath && (
              <TouchableOpacity
                style={[styles.miniNavigateBtn, { backgroundColor: `${theme.accent}15` }]}
                onPress={() => ideActionService.openFile(filePath)}
                activeOpacity={0.7}
              >
                <Ionicons name="open-outline" size={10} color={theme.accent} />
                <Text style={[styles.miniNavigateBtnText, { color: theme.accent }]}>Inspect Changes</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={[styles.outputBox, { backgroundColor: theme.bgPrimary, borderColor: theme.border }, step.isError && styles.outputBoxError]}>
            <Text selectable style={[styles.outputText, { color: theme.textPrimary }, step.isError && { color: theme.accentRed }]} numberOfLines={12}>
              {step.toolOutput}
            </Text>
          </View>
        </View>
      );
    }

    if (step.approvalStatus === "pending") {
      return (
        <View style={styles.pendingApprovalRow}>
          <Ionicons name="shield-outline" size={12} color="#fbbf24" />
          <Text style={styles.pendingApprovalText}>Awaiting your approval to proceed...</Text>
        </View>
      );
    }

    if (step.approvalStatus === "rejected") {
      return (
        <View style={styles.rejectedRow}>
          <Ionicons name="close-circle-outline" size={12} color="#f87171" />
          <Text style={styles.rejectedText}>Action rejected by user</Text>
        </View>
      );
    }

    if (step.approvalStatus === "approved" && !step.toolOutput) {
      return (
        <View style={styles.runningRow}>
          <ActivityIndicator size="small" color={theme.accentGreen} />
          <Text style={[styles.runningText, { color: theme.accentGreen }]}>Approved • Executing {step.toolName || "tool"}...</Text>
        </View>
      );
    }

    if (isCurrent && !step.toolOutput) {
      return (
        <View style={styles.runningRow}>
          <ActivityIndicator size="small" color={theme.accent} />
          <Text style={[styles.runningText, { color: theme.accent }]}>Executing {step.toolName || "tool"}...</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View
      style={[
        styles.stepCard,
        {
          backgroundColor: theme.bgSecondary,
          borderColor: theme.border,
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.stepHeader, { backgroundColor: theme.bgTertiary }]}
        onPress={() => setCollapsed(!collapsed)}
        activeOpacity={0.7}
      >
        <View style={styles.stepHeaderLeft}>
          <Ionicons
            name={step.isError ? "alert-circle" : iconName}
            size={13}
            color={step.isError ? theme.accentRed : iconColor}
          />
          <Text
            style={[
              styles.stepTitle,
              { color: theme.textPrimary },
              isThought && { color: theme.accentGold },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
        <View style={styles.stepHeaderRight}>
          {filePath ? (
            <TouchableOpacity
              style={[styles.headerQuickBtn, { backgroundColor: `${theme.accent}20` }]}
              onPress={(e) => {
                e.stopPropagation?.();
                ideActionService.openFile(filePath);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="open-outline" size={10} color={theme.accent} />
              <Text style={[styles.headerQuickBtnText, { color: theme.accent }]}>View</Text>
            </TouchableOpacity>
          ) : detectedUrl ? (
            <TouchableOpacity
              style={[styles.headerQuickBtn, { backgroundColor: `${theme.accentGreen}20` }]}
              onPress={(e) => {
                e.stopPropagation?.();
                ideActionService.openBrowser(detectedUrl, detectedPort);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="globe-outline" size={10} color={theme.accentGreen} />
              <Text style={[styles.headerQuickBtnText, { color: theme.accentGreen }]}>Preview</Text>
            </TouchableOpacity>
          ) : null}
          <Ionicons name={collapsed ? "chevron-down" : "chevron-up"} size={11} color={theme.textMuted} />
        </View>
      </TouchableOpacity>

      {!collapsed && (
        <View style={[styles.stepBody, { backgroundColor: theme.bgPrimary, borderTopColor: theme.border }]}>
          {isThought ? (
            <Text selectable style={[styles.thoughtText, { color: theme.textSecondary }]}>
              {step.content}
            </Text>
          ) : (
            <>
              {renderToolInput()}
              {renderToolResult()}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stepCard: { borderRadius: 5, borderWidth: 1, overflow: "hidden", marginBottom: 2 },
  thoughtCard: { backgroundColor: "#171612", borderColor: "#3b331b" },
  toolCard: { backgroundColor: "#11141a", borderColor: "#1d2533" },
  stepHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 6, paddingVertical: 3.5 },
  stepHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1 },
  stepTitle: { fontSize: 10, fontWeight: "600" },
  thoughtTitle: { color: "#fdd663" },
  toolTitle: { color: "#93c5fd" },
  stepBody: { padding: 6, backgroundColor: "#0b0d11", borderTopWidth: 1, borderTopColor: "#171c24", gap: 4 },
  thoughtText: { color: "#d1d5db", fontSize: 10.5, lineHeight: 14.5, fontStyle: "italic" },
  subSection: { gap: 3 },
  subLabel: { color: "#6b7280", fontSize: 8.5, fontWeight: "bold", letterSpacing: 0.5 },
  descText: { color: "#9ca3af", fontSize: 10, fontWeight: "500" },
  terminalBox: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#060709", padding: 5, borderRadius: 4, borderWidth: 1, borderColor: "#18202d", gap: 5 },
  terminalPrompt: { color: "#34d399", fontFamily: "monospace", fontSize: 10, fontWeight: "bold" },
  terminalCommandText: { color: "#e5e7eb", fontFamily: "monospace", fontSize: 10, flex: 1 },
  filePathBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#0f1f17", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3, alignSelf: "flex-start" },
  filePathText: { color: "#34d399", fontFamily: "monospace", fontSize: 9.5 },
  codeSnippet: { color: "#34d399", fontFamily: "monospace", fontSize: 9.5, backgroundColor: "#060709", padding: 5, borderRadius: 4 },
  kvRow: { flexDirection: "row", gap: 5 },
  kvKey: { color: "#93c5fd", fontSize: 9.5, fontWeight: "600" },
  kvVal: { color: "#e5e7eb", fontSize: 9.5, flex: 1 },
  outputBox: { backgroundColor: "#060709", padding: 5, borderRadius: 4, borderWidth: 1, borderColor: "#181d24" },
  outputBoxError: { borderColor: "#451a1d", backgroundColor: "#150a0c" },
  outputText: { color: "#d8b4fe", fontFamily: "monospace", fontSize: 9.5, lineHeight: 13.5 },
  runningRow: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 2 },
  runningText: { color: "#93c5fd", fontSize: 9.5, fontStyle: "italic" },
  pendingApprovalRow: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 4, backgroundColor: "#1f1a0a", paddingHorizontal: 6, borderRadius: 4, borderWidth: 1, borderColor: "#78350f" },
  pendingApprovalText: { color: "#fbbf24", fontSize: 10, fontWeight: "600" },
  rejectedRow: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 3, backgroundColor: "#200d0d", paddingHorizontal: 6, borderRadius: 4 },
  rejectedText: { color: "#f87171", fontSize: 9.5, fontWeight: "500" },
  stepHeaderRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerQuickBtn: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  headerQuickBtnText: { fontSize: 9.5, fontWeight: "600" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  fileHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  outputHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  actionNavigateBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 3, borderWidth: 1 },
  actionNavigateBtnText: { fontSize: 9.5, fontWeight: "600" },
  miniNavigateBtn: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
  miniNavigateBtnText: { fontSize: 9, fontWeight: "600" },
});
