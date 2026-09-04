import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeColors } from "../../../theme/themeContext";

interface AgentSectionProps {
  interactiveApproval: boolean;
  onToggleApproval: () => void;
  theme: ThemeColors;
}

export function AgentSection({ interactiveApproval, onToggleApproval, theme }: AgentSectionProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.approvalCard,
          { backgroundColor: theme.bgPrimary, borderColor: theme.border },
          interactiveApproval && { borderColor: theme.accentGreen, backgroundColor: `${theme.accentGreen}12` },
        ]}
        onPress={onToggleApproval}
        activeOpacity={0.8}
      >
        <View style={styles.approvalCardLeft}>
          <Ionicons
            name={interactiveApproval ? "shield-checkmark" : "flash"}
            size={20}
            color={interactiveApproval ? theme.accentGreen : theme.accentPurple}
          />
          <View style={styles.approvalCardTextCol}>
            <Text style={[styles.approvalCardTitle, { color: theme.textPrimary }]}>
              {interactiveApproval ? "Interactive Approval (ON)" : "Auto-Pilot / YOLO (OFF)"}
            </Text>
            <Text style={[styles.approvalCardSub, { color: theme.textSecondary }]}>
              {interactiveApproval
                ? "Astra pauses and asks permission before editing files or running commands."
                : "Astra executes commands and edits automatically without pausing."}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.togglePill,
            { backgroundColor: theme.bgTertiary, borderColor: theme.border },
            interactiveApproval && { backgroundColor: `${theme.accentGreen}25`, borderColor: theme.accentGreen },
          ]}
        >
          <Text
            style={[
              styles.togglePillText,
              { color: theme.textSecondary },
              interactiveApproval && { color: theme.accentGreen },
            ]}
          >
            {interactiveApproval ? "On" : "Off"}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  approvalCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  approvalCardLeft: { flexDirection: "row", alignItems: "flex-start", gap: 10, flex: 1 },
  approvalCardTextCol: { flex: 1, gap: 3 },
  approvalCardTitle: { fontSize: 13, fontWeight: "600" },
  approvalCardSub: { fontSize: 11, lineHeight: 15 },
  togglePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  togglePillText: { fontSize: 11, fontWeight: "700" },
});
