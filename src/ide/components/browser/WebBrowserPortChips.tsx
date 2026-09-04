import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { RunningTask } from "../../../ai/services/runningTasksService";
import { useTheme } from "../../../theme/themeContext";

interface WebBrowserPortChipsProps {
  runningTasks: RunningTask[];
  currentPort: string;
  onSelectTask: (task: RunningTask) => void;
  onSelectPort: (port: string) => void;
}

const PORT_PRESETS = [
  { port: "8000", label: ":8000 (Laravel/PHP)" },
  { port: "3000", label: ":3000 (Node/React)" },
  { port: "5173", label: ":5173 (Vite)" },
  { port: "5000", label: ":5000 (Python)" },
  { port: "8080", label: ":8080 (Web)" },
];

export function WebBrowserPortChips({
  runningTasks,
  currentPort,
  onSelectTask,
  onSelectPort,
}: WebBrowserPortChipsProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.portPillsBar, { backgroundColor: theme.bgSecondary, borderBottomColor: theme.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScroll}>
        {/* Active Running Task Chip (Detected live from Alpine PRoot) */}
        {runningTasks.map((t) => {
          const cleanCmd = (t.command || "Server")
            .replace(/^pkill[^;]+;\s*/i, "")
            .replace(/\s*&.*$/, "")
            .trim();
          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.liveTaskChip, { backgroundColor: `${theme.accentGreen}20`, borderColor: theme.accentGreen }]}
              onPress={() => onSelectTask(t)}
              activeOpacity={0.7}
            >
              <View style={[styles.pulseDot, { backgroundColor: theme.accentGreen }]} />
              <Text style={[styles.liveTaskText, { color: theme.accentGreen }]} numberOfLines={1}>
                {cleanCmd} {t.port ? `(:${t.port})` : ""}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Quick Port Presets */}
        {PORT_PRESETS.map((p) => {
          const isActive = currentPort === p.port;
          return (
            <TouchableOpacity
              key={p.port}
              style={[
                styles.portPill,
                { backgroundColor: theme.bgTertiary, borderColor: theme.border },
                isActive && { backgroundColor: `${theme.accent}20`, borderColor: theme.accent },
              ]}
              onPress={() => onSelectPort(p.port)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.portPillText,
                  { color: theme.textSecondary },
                  isActive && { color: theme.accent, fontWeight: "700" },
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  portPillsBar: {
    borderBottomWidth: 1,
    paddingVertical: 5,
  },
  pillsScroll: {
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 6,
  },
  liveTaskChip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    gap: 5,
    maxWidth: 220,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveTaskText: {
    fontSize: 11,
    fontWeight: "600",
  },
  portPill: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  portPillActive: {},
  portPillText: {
    fontSize: 11,
  },
  portPillTextActive: {
    fontWeight: "700",
  },
});
