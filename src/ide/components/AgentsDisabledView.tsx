import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/themeContext";

interface AgentsDisabledViewProps {
  onOpenSettings: () => void;
  onOpenMarketplace?: () => void;
}

export function AgentsDisabledView({ onOpenSettings }: AgentsDisabledViewProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
      <View style={[styles.card, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
        <View style={[styles.iconWrap, { backgroundColor: `${theme.accent}18` }]}>
          <Ionicons name="sparkles-outline" size={32} color={theme.accent} />
        </View>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Astra AI is Disabled</Text>
        <Text style={[styles.desc, { color: theme.textSecondary }]}>
          Enable Astra AI Assistant in Settings to chat, generate code, and inspect your project.
        </Text>
        <View style={styles.btnCol}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.accent }]}
            onPress={onOpenSettings}
            activeOpacity={0.8}
          >
            <Ionicons name="sparkles-outline" size={16} color={theme.sendButtonIcon} />
            <Text style={[styles.btnText, { color: theme.sendButtonIcon }]}>
              Turn on Astra AI in Settings
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  desc: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  btnCol: {
    width: "100%",
    gap: 10,
    marginTop: 6,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    width: "100%",
  },
  btnSecondary: {
    borderWidth: 1,
  },
  btnText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
