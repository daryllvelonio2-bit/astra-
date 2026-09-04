import React from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TerminalTheme, TERMINAL_THEMES } from "./terminalThemes";
import { useTheme } from "../../../theme/themeContext";

interface ThemePickerModalProps {
  visible: boolean;
  themeId: string;
  activeTheme: TerminalTheme;
  onSelectTheme: (themeId: string) => void;
  onClose: () => void;
}

export function ThemePickerModal({
  visible,
  themeId,
  activeTheme,
  onSelectTheme,
  onClose,
}: ThemePickerModalProps) {
  const { theme: appTheme } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.modalOverlay, { backgroundColor: appTheme.overlay }]}>
          <View
            style={[
              styles.themeModalContent,
              { backgroundColor: activeTheme.cardBg, borderColor: activeTheme.borderColor },
            ]}
          >
            <Text style={[styles.modalTitle, { color: activeTheme.foreground }]}>
              Terminal Theme
            </Text>
            {Object.values(TERMINAL_THEMES).map((t) => {
              const isSelected = t.id === themeId;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.themeOption,
                    { borderColor: activeTheme.borderColor },
                    isSelected && {
                      backgroundColor: activeTheme.accent + "22",
                      borderColor: activeTheme.accent,
                    },
                  ]}
                  onPress={() => {
                    onSelectTheme(t.id);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.themeColorPreview,
                      { backgroundColor: t.background, borderColor: t.foreground },
                    ]}
                  />
                  <Text
                    style={[
                      styles.themeOptionText,
                      { color: isSelected ? activeTheme.accent : activeTheme.foreground },
                    ]}
                  >
                    {t.name}
                  </Text>
                  {isSelected && <Ionicons name="checkmark" size={16} color={activeTheme.accent} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  themeModalContent: {
    width: "85%",
    maxWidth: 320,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    gap: 8,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: "monospace",
    marginBottom: 8,
  },
  themeOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  themeColorPreview: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
  },
  themeOptionText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "monospace",
    fontWeight: "600",
  },
});
