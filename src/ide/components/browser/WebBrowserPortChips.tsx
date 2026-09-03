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
    backgroundColor: "#141414",
    borderBottomWidth: 1,
    borderBottomColor: "#222",
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
    backgroundColor: "#064e3b",
    borderColor: "#059669",
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
    backgroundColor: "#34d399",
  },
  liveTaskText: {
    color: "#a7f3d0",
    fontSize: 11,
    fontWeight: "600",
  },
  portPill: {
    backgroundColor: "#1f1f1f",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  portPillActive: {
    backgroundColor: "#1e3a8a",
    borderColor: "#3b82f6",
  },
  portPillText: {
    color: "#9ca3af",
    fontSize: 11,
  },
  portPillTextActive: {
    color: "#bfdbfe",
    fontWeight: "700",
  },
});
