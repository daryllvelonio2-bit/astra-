import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/themeContext";
import { Clipboard } from "../../ide/services/clipboardService";

export interface ExecutionResultModalProps {
  runOutput: {
    stdout: string;
    stderr: string;
    code: string;
    exitCode?: number;
    environment?: string;
  } | null;
  onClose: () => void;
  onRunInTerminal?: (command: string) => void;
}

export function ExecutionResultModal({
  runOutput,
  onClose,
  onRunInTerminal,
}: ExecutionResultModalProps) {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);

  if (!runOutput) return null;

  const exitCode = runOutput.exitCode ?? (runOutput.stderr && !runOutput.stdout ? 1 : 0);
  const isSuccess = exitCode === 0;
  const envLabel = runOutput.environment || "Alpine Linux Sandbox";

  const handleCopy = () => {
    const fullText = `$ ${runOutput.code}\n\n${runOutput.stdout}${
      runOutput.stderr ? `\n[STDERR]:\n${runOutput.stderr}` : ""
    }`;
    Clipboard.setStringAsync(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleLaunchTerminal = () => {
    if (onRunInTerminal) {
      onRunInTerminal(runOutput.code);
    }
    onClose();
  };

  return (
    <Modal visible={true} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <View style={[styles.terminalCard, { borderColor: theme.border }]}>
          {/* Terminal Window Titlebar */}
          <View style={styles.titleBar}>
            <View style={styles.windowControls}>
              <View style={[styles.windowDot, { backgroundColor: "#ff5f56" }]} />
              <View style={[styles.windowDot, { backgroundColor: "#ffbd2e" }]} />
              <View style={[styles.windowDot, { backgroundColor: "#27c93f" }]} />
            </View>
            <View style={styles.titleCenter}>
              <Ionicons name="terminal" size={13} color="#94a3b8" style={{ marginRight: 6 }} />
              <Text style={styles.titleText} numberOfLines={1}>
                astra-terminal — {envLabel}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Terminal Console View */}
          <ScrollView
            style={styles.terminalBody}
            contentContainerStyle={styles.terminalBodyContent}
            showsVerticalScrollIndicator={true}
          >
            {/* Terminal Prompt line */}
            <View style={styles.promptLine}>
              <Text style={styles.promptUser}>astra@coder</Text>
              <Text style={styles.promptSep}>:</Text>
              <Text style={styles.promptPath}>~/workspace</Text>
              <Text style={styles.promptChar}>$ </Text>
              <Text style={styles.promptCommand} selectable numberOfLines={3}>
                {runOutput.code.trim()}
              </Text>
            </View>

            {/* Standard Output */}
            {runOutput.stdout ? (
              <Text style={styles.stdoutText} selectable>
                {runOutput.stdout}
              </Text>
            ) : null}

            {/* Standard Error */}
            {runOutput.stderr ? (
              <View style={styles.stderrContainer}>
                <Text style={styles.stderrText} selectable>
                  {runOutput.stderr}
                </Text>
              </View>
            ) : null}

            {/* Process Completion Status Tag */}
            <View style={styles.statusFooter}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: isSuccess ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)" },
                ]}
              >
                <View
                  style={[
                    styles.statusIndicatorDot,
                    { backgroundColor: isSuccess ? "#22c55e" : "#ef4444" },
                  ]}
                />
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: isSuccess ? "#4ade80" : "#f87171" },
                  ]}
                >
                  {isSuccess ? `Completed (exit 0)` : `Exited with code ${exitCode}`}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Terminal Action Bar */}
          <View style={[styles.actionBar, { borderTopColor: "rgba(255, 255, 255, 0.08)" }]}>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.7}>
              <Ionicons
                name={copied ? "checkmark" : "copy-outline"}
                size={13}
                color={copied ? "#4ade80" : "#94a3b8"}
              />
              <Text style={[styles.copyBtnText, copied && { color: "#4ade80" }]}>
                {copied ? "Copied" : "Copy Output"}
              </Text>
            </TouchableOpacity>

            <View style={styles.actionRight}>
              {onRunInTerminal && (
                <TouchableOpacity
                  style={styles.terminalRunBtn}
                  onPress={handleLaunchTerminal}
                  activeOpacity={0.7}
                >
                  <Ionicons name="terminal-outline" size={14} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.terminalRunBtnText}>Run in Terminal</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                <Text style={styles.closeBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const MONOSPACE_FONT = Platform.OS === "ios" ? "Menlo" : "monospace";

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  terminalCard: {
    width: "100%",
    maxWidth: 640,
    maxHeight: "80%",
    backgroundColor: "#0d1117",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 12,
  },
  titleBar: {
    height: 38,
    backgroundColor: "#161b22",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  windowControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    width: 50,
  },
  windowDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  titleCenter: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  titleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#c9d1d9",
    fontFamily: MONOSPACE_FONT,
  },
  terminalBody: {
    maxHeight: 380,
    backgroundColor: "#0d1117",
  },
  terminalBodyContent: {
    padding: 14,
    gap: 8,
  },
  promptLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 4,
  },
  promptUser: {
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: MONOSPACE_FONT,
  },
  promptSep: {
    color: "#94a3b8",
    fontSize: 12,
    fontFamily: MONOSPACE_FONT,
  },
  promptPath: {
    color: "#c084fc",
    fontSize: 12,
    fontFamily: MONOSPACE_FONT,
  },
  promptChar: {
    color: "#f1f5f9",
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: MONOSPACE_FONT,
  },
  promptCommand: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: MONOSPACE_FONT,
  },
  stdoutText: {
    color: "#e2e8f0",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: MONOSPACE_FONT,
  },
  stderrContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderColor: "rgba(239, 68, 68, 0.25)",
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    marginTop: 4,
  },
  stderrText: {
    color: "#fca5a5",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: MONOSPACE_FONT,
  },
  statusFooter: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 6,
  },
  statusIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: MONOSPACE_FONT,
  },
  actionBar: {
    height: 48,
    backgroundColor: "#161b22",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  copyBtnText: {
    fontSize: 12,
    color: "#94a3b8",
    fontFamily: MONOSPACE_FONT,
  },
  actionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  terminalRunBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563eb",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  terminalRunBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff",
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  closeBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#e2e8f0",
  },
});
