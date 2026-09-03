import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AstraLogo } from "./AstraLogo";
import { ConversationSession } from "../agent/agentTypes";
import { Workspace } from "../../ide/services/workspaceService";
import { AstraCognitiveMode, getAstraModeInfo } from "../astra/astraModes";
import { useTheme } from "../../theme/themeContext";

interface ChatHeaderProps {
  currentSession: ConversationSession | null;
  workspace: Workspace | null;
  selectedModel: string;
  selectedCognitiveMode?: AstraCognitiveMode;
  onOpenSessions: () => void;
  onOpenModelPicker: () => void;
  onOpenCognitiveModes?: () => void;
  onCreateNewChat: () => void;
  onNavigateToEditor: () => void;
  onNavigateToWorkspaces: () => void;
}

export function ChatHeader({
  currentSession,
  workspace,
  selectedModel,
  selectedCognitiveMode = "default",
  onOpenSessions,
  onOpenModelPicker,
  onOpenCognitiveModes,
  onCreateNewChat,
  onNavigateToEditor,
  onNavigateToWorkspaces,
}: ChatHeaderProps) {
  const { theme } = useTheme();
  const displayTitle =
    !currentSession?.title ||
    currentSession.title.startsWith("Chat ") ||
    currentSession.title === "New Conversation" ||
    currentSession.title === "Astra AI"
      ? "Astra AI"
      : currentSession.title;

  const modelShortName = selectedModel.replace(/^gemini-/, "").replace("flash-lite", "Lite");
  const modeInfo = getAstraModeInfo(selectedCognitiveMode);

  return (
    <View style={[styles.header, { backgroundColor: theme.bgSecondary, borderBottomColor: theme.border }]}>
      {/* Back to Editor Button with consistent icon button sizing */}
      <TouchableOpacity
        style={[styles.iconBtn, { backgroundColor: theme.bgTertiary, borderColor: theme.border }]}
        onPress={onNavigateToEditor}
        activeOpacity={0.7}
        accessibilityLabel="Return to Editor"
      >
        <Ionicons name="code-slash" size={17} color={theme.accent} />
      </TouchableOpacity>

      {/* Center/Left Title & Streamlined Project/Model Indicator */}
      <TouchableOpacity
        style={styles.headerCenter}
        onPress={onOpenSessions}
        activeOpacity={0.7}
        accessibilityLabel="Chat sessions and settings"
      >
        <View style={[styles.logoWrapper, { backgroundColor: theme.bgTertiary, borderColor: theme.border }]}>
          <AstraLogo width={26} height={26} />
        </View>
        <View style={styles.headerTitles}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={1}>
              {displayTitle}
            </Text>
            <Ionicons name="chevron-down" size={12} color={theme.textMuted} />
          </View>
          <View style={styles.subtitleRow}>
            <Ionicons name="folder-outline" size={10} color={theme.accent} />
            <Text style={[styles.subtitleWorkspace, { color: theme.accent }]} numberOfLines={1}>
              {workspace?.name || "Workspace"}
            </Text>
            <Text style={[styles.dotSeparator, { color: theme.borderLight }]}>•</Text>
            <TouchableOpacity onPress={onOpenModelPicker} activeOpacity={0.7}>
              <Text style={[styles.subtitleEngine, { color: theme.accentGreen }]} numberOfLines={1}>
                {modelShortName}
              </Text>
            </TouchableOpacity>
            {selectedCognitiveMode !== "default" && (
              <>
                <Text style={[styles.dotSeparator, { color: theme.borderLight }]}>•</Text>
                <Text
                  style={[styles.subtitleEngine, { color: modeInfo.highlightColor }]}
                  numberOfLines={1}
                >
                  {modeInfo.badge}
                </Text>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Prioritized Action Bar with Uniform Icon Buttons */}
      <View style={styles.headerActions}>
        {/* Cognitive Mode Selector Button */}
        {onOpenCognitiveModes && (
          <TouchableOpacity
            style={[
              styles.iconBtn,
              { backgroundColor: theme.bgTertiary, borderColor: theme.border },
              selectedCognitiveMode !== "default" && {
                borderColor: modeInfo.highlightColor,
                backgroundColor: `${modeInfo.highlightColor}20`,
              },
            ]}
            onPress={onOpenCognitiveModes}
            activeOpacity={0.7}
            accessibilityLabel="Switch Cognitive Mode"
          >
            <Ionicons
              name={selectedCognitiveMode !== "default" ? "bulb" : "bulb-outline"}
              size={16}
              color={selectedCognitiveMode !== "default" ? modeInfo.highlightColor : theme.textSecondary}
            />
          </TouchableOpacity>
        )}

        {/* AI Model Picker */}
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: theme.bgTertiary, borderColor: theme.border }]}
          onPress={onOpenModelPicker}
          activeOpacity={0.7}
          accessibilityLabel="Switch AI Model"
        >
          <Ionicons name="sparkles" size={16} color={theme.accent} />
        </TouchableOpacity>

        {/* New Chat */}
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: theme.bgTertiary, borderColor: theme.border }]}
          onPress={onCreateNewChat}
          activeOpacity={0.7}
          accessibilityLabel="New Chat"
        >
          <Ionicons name="add" size={19} color={theme.textPrimary} />
        </TouchableOpacity>

        {/* Chat Sessions / History */}
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: theme.bgTertiary, borderColor: theme.border }]}
          onPress={onOpenSessions}
          activeOpacity={0.7}
          accessibilityLabel="Chat History"
        >
          <Ionicons name="chatbubbles-outline" size={16} color={theme.textPrimary} />
        </TouchableOpacity>

        {/* Workspaces Picker */}
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: theme.bgTertiary, borderColor: theme.border }]}
          onPress={onNavigateToWorkspaces}
          activeOpacity={0.7}
          accessibilityLabel="Workspaces"
        >
          <Ionicons name="folder-open-outline" size={16} color={theme.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#222429",
    backgroundColor: "#131314",
    gap: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#1c1e22",
    borderWidth: 1,
    borderColor: "#2b2e34",
    justifyContent: "center",
    alignItems: "center",
  },
  iconBtnActiveCli: {
    borderColor: "rgba(52, 211, 153, 0.4)",
    backgroundColor: "#16231c",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    overflow: "hidden",
  },
  logoWrapper: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#1a1d24",
    borderWidth: 1,
    borderColor: "#282c35",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  headerTitles: {
    flex: 1,
    overflow: "hidden",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f1f3f4",
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1.5,
    overflow: "hidden",
  },
  subtitleWorkspace: {
    fontSize: 10.5,
    color: "#8ab4f8",
    fontWeight: "500",
    maxWidth: 80,
  },
  dotSeparator: {
    color: "#4e5258",
    fontSize: 9,
  },
  subtitleEngine: {
    fontSize: 10.5,
    color: "#9aa0a6",
    fontWeight: "500",
    flexShrink: 1,
  },
  subtitleEngineCli: {
    color: "#34d399",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});
