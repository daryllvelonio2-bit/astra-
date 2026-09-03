import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AgentStep } from "../agent/agentTypes";
import { useTheme } from "../../theme/themeContext";

interface ActionApprovalModalProps {
  visible: boolean;
  step: AgentStep | null;
  onApprove: () => void;
  onApproveSession: () => void;
  onReject: () => void;
  onStopAgent?: () => void;
}

export function ActionApprovalModal({
  visible,
  step,
  onApprove,
  onApproveSession,
  onReject,
  onStopAgent,
}: ActionApprovalModalProps) {
  const { theme } = useTheme();
  if (!step) return null;

  const toolName = step.toolName || "tool";
  const args = step.toolArgs || {};

  const isCommand =
    toolName === "run_shell_command" ||
    toolName === "run_terminal_command" ||
    toolName === "exec_command" ||
    toolName === "execute_command" ||
    toolName === "bash" ||
    typeof args.command === "string";

  const isWrite =
    toolName === "write_file" ||
    toolName === "create_file" ||
    toolName === "write_to_file" ||
    toolName === "edit_file" ||
    toolName === "replace_file_content" ||
    toolName === "patch_file";

  const command = args.command || args.cmd || "";
  const filePath = args.file_path || args.path || args.file || args.TargetFile || "";
  const content = args.content || args.file_text || args.code || args.ReplacementContent || args.CodeContent || "";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onReject}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconCircle, { backgroundColor: theme.bgTertiary }]}>
                <Ionicons
                  name={isCommand ? "terminal" : isWrite ? "create" : "shield-checkmark"}
                  size={18}
                  color={theme.accent}
                />
              </View>
              <View>
                <Text style={[styles.title, { color: theme.textPrimary }]}>Action Approval Required</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Astra AI is requesting permission to execute:</Text>
              </View>
            </View>
          </View>

          {/* Action Details Container */}
          <ScrollView style={styles.contentScroll} contentContainerStyle={styles.scrollInner}>
            <View style={[styles.actionBox, { backgroundColor: theme.bgTertiary, borderColor: theme.border }]}>
              <Text style={[styles.actionName, { color: theme.textPrimary }]}>
                {isCommand ? "Execute Shell Command" : isWrite ? "Modify File" : step.content || toolName}
              </Text>

              {filePath ? (
                <View style={[styles.pathPill, { backgroundColor: `${theme.accentGreen}15` }]}>
                  <Ionicons name="document-text-outline" size={13} color={theme.accentGreen} />
                  <Text style={[styles.pathText, { color: theme.accentGreen }]} numberOfLines={1}>{filePath}</Text>
                </View>
              ) : null}

              {command ? (
                <View style={[styles.codeBox, { backgroundColor: theme.bgPrimary, borderColor: theme.border }]}>
                  <Text style={[styles.promptSign, { color: theme.accentGreen }]}>$</Text>
                  <Text selectable style={[styles.commandText, { color: theme.textPrimary }]}>{command}</Text>
                </View>
              ) : null}

              {content ? (
                <View style={[styles.codeBox, { backgroundColor: theme.bgPrimary, borderColor: theme.border }]}>
                  <Text selectable style={[styles.contentText, { color: theme.textPrimary }]} numberOfLines={10}>
                    {typeof content === "string" ? content : JSON.stringify(content, null, 2)}
                  </Text>
                </View>
              ) : null}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.rejectBtn, { backgroundColor: `${theme.accentGold}15`, borderColor: theme.accentGold }]} onPress={onReject} activeOpacity={0.7}>
              <Ionicons name="ban-outline" size={15} color={theme.accentGold} />
              <Text style={[styles.rejectText, { color: theme.accentGold }]}>Deny</Text>
            </TouchableOpacity>

            {onStopAgent ? (
              <TouchableOpacity style={[styles.stopBtn, { backgroundColor: `${theme.accentRed}15`, borderColor: theme.accentRed }]} onPress={onStopAgent} activeOpacity={0.7}>
                <Ionicons name="stop-circle-outline" size={15} color={theme.accentRed} />
                <Text style={[styles.stopText, { color: theme.accentRed }]}>Stop</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={[styles.sessionBtn, { backgroundColor: theme.bgTertiary, borderColor: theme.border }]} onPress={onApproveSession} activeOpacity={0.7}>
              <Ionicons name="flash-outline" size={14} color={theme.textSecondary} />
              <Text style={[styles.sessionText, { color: theme.textSecondary }]}>Always</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.approveBtn, { backgroundColor: theme.accent }]} onPress={onApprove} activeOpacity={0.7}>
              <Ionicons name="checkmark" size={16} color="#ffffff" />
              <Text style={styles.approveText}>Approve</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#181a20",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2d3342",
    padding: 16,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#262b36",
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: "#f1f5f9",
    fontSize: 14.5,
    fontWeight: "700",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 1,
  },
  contentScroll: {
    maxHeight: 280,
  },
  scrollInner: {
    paddingVertical: 4,
  },
  actionBox: {
    backgroundColor: "#121418",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#222733",
    gap: 8,
  },
  actionName: {
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: "600",
  },
  pathPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1c2e24",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  pathText: {
    color: "#81c995",
    fontSize: 11.5,
    fontFamily: "monospace",
  },
  codeBox: {
    flexDirection: "row",
    backgroundColor: "#0d0f12",
    borderRadius: 6,
    padding: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: "#1e222b",
  },
  promptSign: {
    color: "#34d399",
    fontSize: 12,
    fontFamily: "monospace",
    fontWeight: "700",
  },
  commandText: {
    color: "#f8fafc",
    fontSize: 12,
    fontFamily: "monospace",
    flex: 1,
  },
  contentText: {
    color: "#cbd5e1",
    fontSize: 11.5,
    fontFamily: "monospace",
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
  },
  rejectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#3b1e08",
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#7c2d12",
  },
  rejectText: {
    color: "#fb923c",
    fontSize: 11.5,
    fontWeight: "600",
  },
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#450a0a",
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#7f1d1d",
  },
  stopText: {
    color: "#f87171",
    fontSize: 11.5,
    fontWeight: "600",
  },
  sessionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#1e293b",
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  sessionText: {
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "600",
  },
  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2563eb",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  approveText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
});
