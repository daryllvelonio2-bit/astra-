import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  AstraCognitiveMode,
  AstraEffort,
  ASTRA_MODES,
  AstraModeInfo,
} from "../astra/astraModes";
import { useTheme } from "../../theme/themeContext";

interface CognitiveModeModalProps {
  visible: boolean;
  selectedMode: AstraCognitiveMode;
  selectedEffort: AstraEffort;
  onSelectMode: (mode: AstraCognitiveMode) => void;
  onSelectEffort: (effort: AstraEffort) => void;
  onClose: () => void;
}

const EFFORT_OPTIONS: { id: AstraEffort; label: string; desc: string }[] = [
  { id: "default", label: "Auto", desc: "Balanced agent effort" },
  { id: "low", label: "Low", desc: "Fastest response with minimal reasoning steps" },
  { id: "medium", label: "Medium", desc: "Standard multi-step validation" },
  { id: "high", label: "High", desc: "Exhaustive reasoning, edge cases & verification" },
];

export function CognitiveModeModal({
  visible,
  selectedMode,
  selectedEffort,
  onSelectMode,
  onSelectEffort,
  onClose,
}: CognitiveModeModalProps) {
  const { theme } = useTheme();
  const cognitiveModes = ASTRA_MODES.filter(
    (m) => m.category === "cognitive" || m.category === "general"
  );
  const gamingModes = ASTRA_MODES.filter((m) => m.category === "gaming");

  const renderModeOption = (opt: AstraModeInfo) => {
    const isSelected = selectedMode === opt.id;
    return (
      <TouchableOpacity
        key={opt.id}
        style={[
          styles.optionRow,
          { backgroundColor: theme.bgTertiary, borderColor: theme.border },
          isSelected && {
            borderColor: opt.highlightColor,
            backgroundColor: `${opt.highlightColor}18`,
          },
        ]}
        onPress={() => onSelectMode(opt.id)}
        activeOpacity={0.7}
      >
        <View style={styles.optionContent}>
          <View style={styles.optionTitleRow}>
            <Text style={[styles.optionBadge, { color: opt.highlightColor }]}>
              {opt.badge}
            </Text>
            <Text
              style={[
                styles.optionName,
                { color: isSelected ? opt.highlightColor : theme.textPrimary },
              ]}
              numberOfLines={1}
            >
              {opt.shortName}
            </Text>
          </View>
          <Text
            style={[styles.optionDesc, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {opt.description}
          </Text>
        </View>
        {isSelected && (
          <Ionicons
            name="checkmark-circle"
            size={16}
            color={opt.highlightColor}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={[styles.backdrop, { backgroundColor: theme.overlay }]} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[styles.modalCard, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Cognitive Mode</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={17} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Reasoning Effort Section */}
            <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>EFFORT</Text>
            <View style={styles.effortRow}>
              {EFFORT_OPTIONS.map((e) => {
                const isEffortSelected = selectedEffort === e.id;
                return (
                  <TouchableOpacity
                    key={e.id}
                    style={[
                      styles.effortBtn,
                      { backgroundColor: theme.bgTertiary, borderColor: theme.border },
                      isEffortSelected && { borderColor: theme.accent, backgroundColor: `${theme.accent}20` },
                    ]}
                    onPress={() => onSelectEffort(e.id)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.effortLabel,
                        { color: theme.textSecondary },
                        isEffortSelected && { color: theme.accent, fontWeight: "700" },
                      ]}
                    >
                      {e.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Cognitive Profiles */}
            <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>MODES</Text>
            {cognitiveModes.map(renderModeOption)}

            {/* Godot 4.x Game Development */}
            <Text style={[styles.sectionHeader, { color: theme.textMuted, marginTop: 8 }]}>
              GAME DEV (GODOT)
            </Text>
            {gamingModes.map(renderModeOption)}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 320,
    maxHeight: "78%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 7,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 2,
  },
  scrollArea: {
    flexGrow: 0,
  },
  sectionHeader: {
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginBottom: 4,
    marginTop: 4,
  },
  effortRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 8,
  },
  effortBtn: {
    flex: 1,
    paddingVertical: 4.5,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
  },
  effortLabel: {
    fontSize: 10.5,
    fontWeight: "600",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 7,
    paddingVertical: 5.5,
    paddingHorizontal: 9,
    borderWidth: 1,
    marginBottom: 4,
  },
  optionContent: {
    flex: 1,
    marginRight: 6,
  },
  optionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  optionBadge: {
    fontSize: 11,
    fontWeight: "700",
  },
  optionName: {
    fontSize: 11,
    fontWeight: "600",
  },
  optionDesc: {
    fontSize: 10,
    lineHeight: 13,
    marginTop: 1,
  },
});
