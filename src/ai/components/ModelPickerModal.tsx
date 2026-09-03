import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SUPPORTED_MODELS } from "../../ide/services/configService";
import { useTheme } from "../../theme/themeContext";

interface ModelPickerModalProps {
  visible: boolean;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  onClose: () => void;
}

export function ModelPickerModal({ visible, selectedModel, onSelectModel, onClose }: ModelPickerModalProps) {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
        <View style={[styles.modelPickerCard, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
          <Text style={[styles.modalCardTitle, { color: theme.textPrimary }]}>Select AI Reasoning Model</Text>
          {SUPPORTED_MODELS.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[
                styles.modelOption,
                selectedModel === m.id && { backgroundColor: theme.bgTertiary, borderColor: theme.accent, borderWidth: 1 },
              ]}
              onPress={() => onSelectModel(m.id)}
            >
              <View style={styles.modelOptionLeft}>
                <Text
                  style={[
                    styles.modelOptionName,
                    { color: theme.textPrimary },
                    selectedModel === m.id && { color: theme.accent, fontWeight: "700" },
                  ]}
                >
                  {m.name}
                </Text>
                <Text style={[styles.modelOptionDesc, { color: theme.textMuted }]}>{m.description}</Text>
              </View>
              {selectedModel === m.id && <Ionicons name="checkmark-circle" size={18} color={theme.accent} />}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modelPickerCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#252526",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#3c3c3c",
  },
  modalCardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  modelOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  activeModelOption: {
    backgroundColor: "#2e3035",
  },
  modelOptionLeft: {
    flex: 1,
  },
  modelOptionName: {
    color: "#e3e3e3",
    fontSize: 14,
    fontWeight: "600",
  },
  activeModelName: {
    color: "#8ab4f8",
  },
  modelOptionDesc: {
    color: "#888",
    fontSize: 11,
    marginTop: 2,
  },
});
