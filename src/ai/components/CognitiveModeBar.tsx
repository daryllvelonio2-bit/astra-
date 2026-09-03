import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AstraCognitiveMode, ASTRA_MODES } from "../astra/astraModes";
import { useTheme } from "../../theme/themeContext";

interface CognitiveModeBarProps {
  selectedMode: AstraCognitiveMode;
  interactiveApproval?: boolean;
  onSelectMode: (mode: AstraCognitiveMode) => void;
  onOpenModeModal: () => void;
  onToggleInteractiveApproval?: () => void;
}

export function CognitiveModeBar({
  selectedMode,
  interactiveApproval = false,
  onSelectMode,
  onOpenModeModal,
  onToggleInteractiveApproval,
}: CognitiveModeBarProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.bgSecondary, borderTopColor: theme.border }]}>
      {/* Quick Interactive Approval / YOLO Toggle */}
      {onToggleInteractiveApproval && (
        <TouchableOpacity
          style={[
            styles.approvalTogglePill,
            { backgroundColor: `${theme.accentPurple}15`, borderColor: `${theme.accentPurple}40` },
            interactiveApproval && { backgroundColor: `${theme.accentGreen}20`, borderColor: theme.accentGreen },
          ]}
          onPress={onToggleInteractiveApproval}
          activeOpacity={0.7}
          accessibilityLabel="Toggle Interactive Approval Mode"
        >
          <Ionicons
            name={interactiveApproval ? "shield-checkmark" : "flash"}
            size={11}
            color={interactiveApproval ? theme.accentGreen : theme.accentPurple}
          />
          <Text
            style={[
              styles.approvalToggleText,
              { color: theme.accentPurple },
              interactiveApproval && { color: theme.accentGreen },
            ]}
          >
            {interactiveApproval ? "Interactive" : "YOLO"}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.moreBtn, { backgroundColor: theme.bgTertiary, borderColor: theme.border }]}
        onPress={onOpenModeModal}
        activeOpacity={0.7}
        accessibilityLabel="Configure Cognitive Modes"
      >
        <Ionicons name="options-outline" size={13} color={theme.textSecondary} />
        <Text style={[styles.moreText, { color: theme.textSecondary }]}>Modes</Text>
      </TouchableOpacity>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {ASTRA_MODES.map((mode) => {
          const isSelected = selectedMode === mode.id;
          return (
            <TouchableOpacity
              key={mode.id}
              style={[
                styles.pill,
                { backgroundColor: theme.bgTertiary, borderColor: theme.border },
                isSelected && {
                  borderColor: mode.highlightColor,
                  backgroundColor: `${mode.highlightColor}20`,
                },
              ]}
              onPress={() => onSelectMode(mode.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.pillText,
                  { color: theme.textMuted },
                  isSelected && {
                    color: mode.highlightColor,
                    fontWeight: "700",
                  },
                ]}
              >
                {mode.badge}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: "#131314",
    borderTopWidth: 1,
    borderTopColor: "#1e2024",
    gap: 6,
  },
  moreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 3.5,
    paddingHorizontal: 7,
    borderRadius: 6,
    backgroundColor: "#1c1e22",
    borderWidth: 1,
    borderColor: "#2a2d33",
  },
  moreText: {
    color: "#9aa0a6",
    fontSize: 10.5,
    fontWeight: "600",
  },
  scrollContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingRight: 10,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    backgroundColor: "#181a1e",
    borderWidth: 1,
    borderColor: "#25282e",
  },
  pillText: {
    color: "#8e9297",
    fontSize: 10.5,
    fontWeight: "500",
  },
  approvalTogglePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3.5,
    paddingVertical: 3.5,
    paddingHorizontal: 7,
    borderRadius: 6,
    backgroundColor: "rgba(168, 85, 247, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.3)",
  },
  approvalTogglePillActive: {
    backgroundColor: "rgba(52, 211, 153, 0.15)",
    borderColor: "rgba(52, 211, 153, 0.4)",
  },
  approvalToggleText: {
    color: "#c084fc",
    fontSize: 10.5,
    fontWeight: "700",
  },
  approvalToggleTextActive: {
    color: "#34d399",
  },
});
