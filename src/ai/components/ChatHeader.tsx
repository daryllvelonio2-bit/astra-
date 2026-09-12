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
  onOpenSessions?: () => void;
}

export function ChatHeader({
  currentSession,
  workspace,
  selectedModel,
  selectedCognitiveMode = "default",
  onOpenSessions,
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
      <TouchableOpacity
        style={styles.headerCenter}
        onPress={onOpenSessions}
        activeOpacity={onOpenSessions ? 0.7 : 1}
        disabled={!onOpenSessions}
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
            {onOpenSessions && <Ionicons name="chevron-down" size={12} color={theme.textMuted} />}
          </View>
          <View style={styles.subtitleRow}>
            <Ionicons name="folder-outline" size={10} color={theme.accent} />
            <Text style={[styles.subtitleWorkspace, { color: theme.accent }]} numberOfLines={1}>
              {workspace?.name || "Workspace"}
            </Text>
            <Text style={[styles.dotSeparator, { color: theme.borderLight }]}>•</Text>
            <Text style={[styles.subtitleEngine, { color: theme.accentGreen }]} numberOfLines={1}>
              {modelShortName}
            </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    overflow: "hidden",
  },
  logoWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
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
    gap: 5,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
    overflow: "hidden",
  },
  subtitleWorkspace: {
    fontSize: 11,
    fontWeight: "500",
    maxWidth: 120,
  },
  dotSeparator: {
    fontSize: 9,
  },
  subtitleEngine: {
    fontSize: 11,
    fontWeight: "500",
    flexShrink: 1,
  },
});
