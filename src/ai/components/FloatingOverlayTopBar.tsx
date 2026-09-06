import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsContent}
      >
      <TouchableOpacity
        style={[styles.actionChip, { backgroundColor: theme.bgTertiary }]}
        onPress={onOpenModelPicker}
        activeOpacity={0.7}
      >
        <Ionicons name="sparkles" size={11} color={theme.accent} />
        <Text style={[styles.actionChipText, styles.modelChipText, { color: theme.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
          {selectedModel.replace("gemini-", "").replace("-flash-lite", " Lite").replace("-flash", " Flash").replace("-pro", " Pro")}
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
      </ScrollView>

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
    borderBottomWidth: 1,
    gap: 6,
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 6,
    gap: 4,
    flexShrink: 0,
  },
  chipsScroll: {
    flex: 1,
  },
  chipsContent: {
    alignItems: "center",
    gap: 6,
    paddingRight: 6,
  },
  modelChipText: {
    maxWidth: 120,
  },
  engineChipActive: {
    borderWidth: 0.5,
  },
  actionChipText: {
    fontSize: 10,
    fontWeight: "600",
  },
  newChatIconBtn: {
    marginLeft: "auto",
    padding: 4,
    borderRadius: 6,
  },
});
