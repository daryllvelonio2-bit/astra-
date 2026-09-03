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
  interactiveApproval?: boolean;
  onSelectMode: (mode: AstraCognitiveMode) => void;
  onSelectEffort: (effort: AstraEffort) => void;
  onToggleInteractiveApproval?: () => void;
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
  interactiveApproval = false,
  onSelectMode,
  onSelectEffort,
  onToggleInteractiveApproval,
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
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
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
            {/* Action Permission & Interactive Approval Section */}
            {onToggleInteractiveApproval && (
              <>
                <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>ACTION APPROVAL & SAFETY</Text>
                <View style={styles.approvalGrid}>
                  <TouchableOpacity
                    style={[
                      styles.approvalOptionCard,
                      { backgroundColor: theme.bgTertiary, borderColor: theme.border },
                      !interactiveApproval && styles.approvalOptionCardActive,
                    ]}
                    onPress={interactiveApproval ? onToggleInteractiveApproval : undefined}
                    activeOpacity={0.7}
                  >
                    <View style={styles.approvalHeader}>
                      <Ionicons name="flash" size={14} color="#a855f7" />
                      <Text style={[styles.approvalOptionTitle, { color: theme.textPrimary }, !interactiveApproval && { color: "#c084fc" }]}>
                        ⚡ YOLO Mode
                      </Text>
                    </View>
                    <Text style={[styles.approvalOptionDesc, { color: theme.textSecondary }]}>
                      Auto-approves all file writes & shell tasks without pausing.
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.approvalOptionCard,
                      { backgroundColor: theme.bgTertiary, borderColor: theme.border },
                      interactiveApproval && styles.approvalOptionCardActiveGreen,
                    ]}
                    onPress={!interactiveApproval ? onToggleInteractiveApproval : undefined}
                    activeOpacity={0.7}
                  >
                    <View style={styles.approvalHeader}>
                      <Ionicons name="shield-checkmark" size={14} color={theme.accentGreen} />
                      <Text style={[styles.approvalOptionTitle, { color: theme.textPrimary }, interactiveApproval && { color: theme.accentGreen }]}>
                        🛡️ Interactive Mode
                      </Text>
                    </View>
                    <Text style={[styles.approvalOptionDesc, { color: theme.textSecondary }]}>
                      Pauses and requires explicit user confirmation before executing.
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

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
            <Text style={[styles.sectionHeader, { marginTop: 14 }]}>
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
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "85%",
    backgroundColor: "#161719",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2d33",
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
    borderBottomColor: "#22252a",
  },
  title: {
    color: "#f1f3f4",
    fontSize: 16,
    fontWeight: "700",
  },
  subtitle: {
    color: "#8e9297",
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
    color: "#757b85",
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
    backgroundColor: "#1f2227",
    borderWidth: 1,
    borderColor: "#2d3138",
    alignItems: "center",
  },
  effortBtnActive: {
    borderColor: "#8ab4f8",
    backgroundColor: "rgba(138, 180, 248, 0.12)",
  },
  effortLabel: {
    color: "#9aa0a6",
    fontSize: 12,
    fontWeight: "600",
  },
  effortLabelActive: {
    color: "#8ab4f8",
    fontWeight: "700",
  },
  optionCard: {
    backgroundColor: "#1c1e23",
    borderRadius: 10,
    padding: 11,
    borderWidth: 1,
    borderColor: "#2a2d34",
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
    color: "#e3e3e3",
    fontSize: 13,
    fontWeight: "600",
  },
  optionDesc: {
    color: "#9aa0a6",
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
    borderTopColor: "#282a30",
  },
  tagLabel: {
    color: "#6b7280",
    fontSize: 10,
  },
  tagCode: {
    color: "#8ab4f8",
    fontSize: 10,
    fontFamily: "monospace",
  },
  approvalGrid: {
    gap: 8,
    marginBottom: 6,
  },
  approvalOptionCard: {
    backgroundColor: "#1c1e22",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2a2d33",
    padding: 10,
    gap: 4,
  },
  approvalOptionCardActive: {
    borderColor: "#a855f7",
    backgroundColor: "rgba(168, 85, 247, 0.08)",
  },
  approvalOptionCardActiveGreen: {
    borderColor: "#34d399",
    backgroundColor: "rgba(52, 211, 153, 0.08)",
  },
  approvalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  approvalOptionTitle: {
    color: "#e2e8f0",
    fontSize: 12.5,
    fontWeight: "700",
  },
  approvalOptionDesc: {
    color: "#94a3b8",
    fontSize: 11,
    lineHeight: 15,
  },
});
