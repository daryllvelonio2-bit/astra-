import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AstraCognitiveMode, getAstraModeInfo } from "../astra/astraModes";
import { useTheme } from "../../theme/themeContext";

interface FloatingOverlayTopBarProps {
  selectedModel: string;
  selectedCognitiveMode?: AstraCognitiveMode;
  onOpenModelPicker: () => void;
  onOpenCognitiveModes?: () => void;
  onOpenSessions: () => void;
  onCreateNewChat: () => void;
}

export function FloatingOverlayTopBar({
  selectedModel,
  selectedCognitiveMode = "default",
  onOpenModelPicker,
  onOpenCognitiveModes,
  onOpenSessions,
  onCreateNewChat,
}: FloatingOverlayTopBarProps) {
  const { theme } = useTheme();
  const modeInfo = getAstraModeInfo(selectedCognitiveMode);

  return (
    <View style={[styles.topActionsBar, { backgroundColor: theme.bgSecondary, borderBottomColor: theme.border }]}>
      <TouchableOpacity
        style={[styles.actionChip, { backgroundColor: theme.bgTertiary }]}
        onPress={onOpenModelPicker}
        activeOpacity={0.7}
      >
        <Ionicons name="sparkles" size={11} color={theme.accent} />
        <Text style={[styles.actionChipText, { color: theme.textSecondary }]} numberOfLines={1}>
          {selectedModel.replace("gemini-", "").replace("flash-lite", "Lite")}
        </Text>
      </TouchableOpacity>

      {onOpenCognitiveModes && (
        <TouchableOpacity
          style={[
            styles.actionChip,
            { backgroundColor: theme.bgTertiary },
            selectedCognitiveMode !== "default" && {
              backgroundColor: `${modeInfo.highlightColor}20`,
              borderWidth: 0.5,
              borderColor: `${modeInfo.highlightColor}66`,
            },
          ]}
          onPress={onOpenCognitiveModes}
          activeOpacity={0.7}
        >
          <Ionicons
            name={selectedCognitiveMode !== "default" ? "bulb" : "bulb-outline"}
            size={11}
            color={selectedCognitiveMode !== "default" ? modeInfo.highlightColor : theme.textMuted}
          />
          <Text
            style={[
              styles.actionChipText,
              { color: theme.textSecondary },
              selectedCognitiveMode !== "default" && { color: modeInfo.highlightColor },
            ]}
            numberOfLines={1}
          >
            {selectedCognitiveMode !== "default" ? modeInfo.badge : "Modes"}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.actionChip, { backgroundColor: theme.bgTertiary }]}
        onPress={onOpenSessions}
        activeOpacity={0.7}
      >
        <Ionicons name="time-outline" size={11} color={theme.textMuted} />
        <Text style={[styles.actionChipText, { color: theme.textSecondary }]}>History</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.newChatIconBtn, { backgroundColor: theme.bgTertiary }]}
        onPress={onCreateNewChat}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={16} color={theme.accent} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  topActionsBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: "#161920",
    borderBottomWidth: 1,
    borderBottomColor: "#212631",
    gap: 6,
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1f2430",
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 6,
    gap: 4,
  },
  engineChipActive: {
    backgroundColor: "#2a2215",
    borderWidth: 0.5,
    borderColor: "#f59e0b44",
  },
  actionChipText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#cbd5e1",
  },
  newChatIconBtn: {
    marginLeft: "auto",
    padding: 4,
    backgroundColor: "#1f2430",
    borderRadius: 6,
  },
});
