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
          styles.optionCard,
          { backgroundColor: theme.bgTertiary, borderColor: theme.border },
          isSelected && {
            borderColor: opt.highlightColor,
            backgroundColor: `${opt.highlightColor}15`,
          },
        ]}
        onPress={() => onSelectMode(opt.id)}
        activeOpacity={0.7}
      >
        <View style={styles.optionHeader}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                { backgroundColor: `${opt.highlightColor}20` },
              ]}
            >
              <Text style={[styles.badgeText, { color: opt.highlightColor }]}>
                {opt.badge}
              </Text>
            </View>
            <Text
              style={[
                styles.optionName,
                { color: theme.textPrimary },
                isSelected && { color: opt.highlightColor, fontWeight: "700" },
              ]}
            >
              {opt.name}
            </Text>
          </View>
          {isSelected && (
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={opt.highlightColor}
            />
          )}
        </View>
        <Text style={[styles.optionDesc, { color: theme.textSecondary }]}>{opt.description}</Text>
        {opt.tag ? (
          <View style={[styles.tagRow, { borderTopColor: theme.border }]}>
            <Text style={[styles.tagLabel, { color: theme.textMuted }]}>CLI / Prompt Tag:</Text>
            <Text style={[styles.tagCode, { color: theme.accent }]}>
              {opt.cliFlag} {opt.tag ? `• ${opt.tag}` : ""}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={[styles.backdrop, { backgroundColor: theme.overlay }]} activeOpacity={1} onPress={onClose}>
        <View style={[styles.modalCard, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View>
              <Text style={[styles.title, { color: theme.textPrimary }]}>Astra Cognitive Modes</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Select reasoning depth & game engine specializations
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Reasoning Effort Section */}
            <Text style={[styles.sectionHeader, { color: theme.textMuted, marginTop: 12 }]}>REASONING EFFORT</Text>
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
            <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>COGNITIVE PROFILES</Text>
            {cognitiveModes.map(renderModeOption)}

            {/* Godot 4.x Game Development */}
            <Text style={[styles.sectionHeader, { color: theme.textMuted, marginTop: 14 }]}>
              GODOT 4.X GAME DEVELOPMENT
            </Text>
            {gamingModes.map(renderModeOption)}
          </ScrollView>
        </View>
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
    maxWidth: 420,
    maxHeight: "85%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  scrollArea: {
    flexGrow: 0,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  effortRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  effortBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  effortBtnActive: {
  },
  effortLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  effortLabelActive: {
    fontWeight: "700",
  },
  optionCard: {
    borderRadius: 10,
    padding: 11,
    borderWidth: 1,
    marginBottom: 8,
  },
  optionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  optionName: {
    fontSize: 13,
    fontWeight: "600",
  },
  optionDesc: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tagLabel: {
    fontSize: 10,
  },
  tagCode: {
    fontSize: 10,
    fontFamily: "monospace",
  },
});
