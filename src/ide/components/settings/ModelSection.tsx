import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SUPPORTED_MODELS } from "../../services/configService";
import { ThemeColors } from "../../../theme/themeContext";

interface ModelSectionProps {
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  theme: ThemeColors;
}

export function ModelSection({ selectedModel, onSelectModel, theme }: ModelSectionProps) {
  return (
    <View style={styles.container}>
      {SUPPORTED_MODELS.map((m) => {
        const isSelected = selectedModel === m.id;
        return (
          <TouchableOpacity
            key={m.id}
            style={[
              styles.modelChip,
              { backgroundColor: theme.bgPrimary, borderColor: theme.border },
              isSelected && { backgroundColor: theme.accent, borderColor: theme.accent },
            ]}
            onPress={() => onSelectModel(m.id)}
            activeOpacity={0.7}
          >
            <View style={styles.modelHeader}>
              <Text style={[styles.modelChipText, { color: isSelected ? theme.sendButtonIcon : theme.textSecondary }]}>
                {m.name}
              </Text>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={14} color={theme.sendButtonIcon} />
              )}
            </View>
            {m.description && (
              <Text style={[styles.modelDesc, { color: isSelected ? theme.sendButtonIcon : theme.textMuted }]}>
                {m.description}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  modelChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  modelHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modelChipText: { fontSize: 13, fontWeight: "600" },
  modelDesc: { fontSize: 11, marginTop: 2 },
});
