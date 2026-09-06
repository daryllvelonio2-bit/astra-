import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/themeContext";

interface RawDumpViewProps {
  text: string;
}

/** Collapsed view for machine JSON dumps that could not be cleaned. */
export function RawDumpView({ text }: RawDumpViewProps) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.rawDumpBox, { backgroundColor: theme.bgPrimary, borderColor: theme.border }]}>
      <TouchableOpacity style={styles.rawDumpToggle} onPress={() => setExpanded((v) => !v)} activeOpacity={0.7}>
        <Ionicons name="code-slash" size={11} color={theme.textMuted} />
        <Text style={[styles.rawDumpToggleText, { color: theme.textMuted }]}>
          Raw tool output ({Math.round(text.length / 1024)} KB) — {expanded ? "tap to collapse" : "tap to expand"}
        </Text>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={11} color={theme.textMuted} />
      </TouchableOpacity>
      <Text selectable style={[styles.rawDumpText, { color: theme.textSecondary }]} numberOfLines={expanded ? undefined : 6}>
        {expanded ? text.slice(0, 20000) : text.slice(0, 1200)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rawDumpBox: {
    borderRadius: 6,
    borderWidth: 1,
    padding: 6,
    marginVertical: 2,
    gap: 4,
  },
  rawDumpToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  rawDumpToggleText: {
    fontSize: 10,
    fontWeight: "600",
    flex: 1,
  },
  rawDumpText: {
    fontSize: 10,
    lineHeight: 14,
    fontFamily: "monospace",
  },
});
