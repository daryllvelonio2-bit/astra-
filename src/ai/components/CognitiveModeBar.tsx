import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AstraCognitiveMode, ASTRA_MODES } from "../astra/astraModes";
import { useTheme } from "../../theme/themeContext";

interface CognitiveModeBarProps {
  selectedMode: AstraCognitiveMode;
  onSelectMode: (mode: AstraCognitiveMode) => void;
  onOpenModeModal: () => void;
}

export function CognitiveModeBar({
  selectedMode,
  onSelectMode,
  onOpenModeModal,
}: CognitiveModeBarProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.bgSecondary, borderTopColor: theme.border }]}>
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
    borderTopWidth: 1,
    gap: 6,
  },
  moreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 3.5,
    paddingHorizontal: 7,
    borderRadius: 6,
    borderWidth: 1,
  },
  moreText: {
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
    borderWidth: 1,
  },
  pillText: {
    fontSize: 10.5,
    fontWeight: "500",
  },
});
