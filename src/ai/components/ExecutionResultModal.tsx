import React from "react";
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/themeContext";

interface ExecutionResultModalProps {
  runOutput: { stdout: string; stderr: string; code: string } | null;
  onClose: () => void;
}

export function ExecutionResultModal({ runOutput, onClose }: ExecutionResultModalProps) {
  const { theme } = useTheme();
  if (!runOutput) return null;

  return (
    <Modal visible={true} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.outputModalOverlay, { backgroundColor: theme.overlay }]}>
        <View style={[styles.outputModalCard, { backgroundColor: theme.bgSecondary, borderTopColor: theme.border, borderWidth: 1 }]}>
          <View style={styles.outputModalHeader}>
            <Text style={[styles.outputModalTitle, { color: theme.accentGreen }]}>▶️ Sandbox Execution Result</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.outputModalScroll}>
            <Text style={[styles.outputLabel, { color: theme.textSecondary }]}>Stdout:</Text>
            <Text style={[styles.outputBox, { backgroundColor: theme.bgPrimary, color: theme.textPrimary, borderColor: theme.border }]}>{runOutput.stdout}</Text>
            {runOutput.stderr ? (
              <>
                <Text style={[styles.outputLabel, { color: theme.accentRed }]}>Stderr / Errors:</Text>
                <Text style={[styles.outputBox, { backgroundColor: theme.bgPrimary, color: theme.accentRed, borderColor: theme.accentRed }]}>{runOutput.stderr}</Text>
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  outputModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  outputModalCard: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: "60%",
  },
  outputModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  outputModalTitle: {
    fontSize: 15,
    fontWeight: "bold",
  },
  outputModalScroll: {
    maxHeight: 250,
  },
  outputLabel: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 4,
  },
  outputBox: {
    fontFamily: "monospace",
    fontSize: 12,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 12,
  },
});
