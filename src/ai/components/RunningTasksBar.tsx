import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  LayoutAnimation,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { runningTasksService, RunningTask } from "../services/runningTasksService";
import { useTheme } from "../../theme/themeContext";

interface RunningTasksBarProps {
  onOpenUrl?: (url: string) => void;
}

export function RunningTasksBar({ onOpenUrl }: RunningTasksBarProps) {
  const { theme } = useTheme();
  const [tasks, setTasks] = useState<RunningTask[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [killingId, setKillingId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = runningTasksService.subscribe((currentTasks) => {
      setTasks(currentTasks);
    });
    return unsub;
  }, []);

  if (tasks.length === 0) return null;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const handleKill = async (task: RunningTask) => {
    setKillingId(task.id);
    await runningTasksService.killTask(task.id);
    setKillingId(null);
  };

  const handleKillAll = async () => {
    setKillingId("all");
    await runningTasksService.killAllTasks();
    setKillingId(null);
  };

  const primaryTask = tasks[0];

  return (
    <View style={[styles.container, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
      {/* Tappable Compact Header Bar */}
      <TouchableOpacity
        style={[styles.headerBar, { backgroundColor: theme.bgTertiary }]}
        onPress={toggleExpand}
        activeOpacity={0.8}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.statusDotOuter, { backgroundColor: `${theme.accentGreen}30` }]}>
            <View style={[styles.statusDotInner, { backgroundColor: theme.accentGreen }]} />
          </View>
          <View style={styles.headerTextGroup}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]} numberOfLines={1}>
              {tasks.length === 1 ? primaryTask.command : `${tasks.length} Running Tasks`}
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
              {primaryTask.url
                ? `${primaryTask.url} • PID ${primaryTask.pid || "?"}`
                : `PID ${primaryTask.pid || "Active"} • Tap to manage`}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.quickKillBtn, { backgroundColor: `${theme.accentRed}18`, borderColor: `${theme.accentRed}40` }]}
            onPress={() => (tasks.length === 1 ? handleKill(primaryTask) : handleKillAll())}
            activeOpacity={0.7}
            disabled={killingId !== null}
          >
            {killingId ? (
              <ActivityIndicator size="small" color={theme.accentRed} />
            ) : (
              <>
                <Ionicons name="close-circle" size={13} color={theme.accentRed} />
                <Text style={[styles.quickKillText, { color: theme.accentRed }]}>Kill</Text>
              </>
            )}
          </TouchableOpacity>

          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={theme.accent}
            style={{ marginLeft: 4 }}
          />
        </View>
      </TouchableOpacity>

      {/* Expanded Details Card */}
      {expanded && (
        <View style={[styles.expandedContent, { backgroundColor: theme.bgPrimary }]}>
          {tasks.map((task) => (
            <View key={task.id} style={[styles.taskCard, { backgroundColor: theme.bgSecondary, borderColor: theme.border, borderWidth: 1 }]}>
              <View style={styles.taskInfoRow}>
                <View style={[styles.taskBadge, { backgroundColor: `${theme.accent}18` }]}>
                  <Ionicons name="terminal" size={11} color={theme.accent} />
                  <Text style={[styles.taskBadgeText, { color: theme.accent }]}>
                    {task.pid ? `PID: ${task.pid}` : "Process"}
                  </Text>
                </View>
                <Text style={[styles.taskCommandText, { color: theme.textPrimary }]} numberOfLines={1}>
                  {task.command}
                </Text>
              </View>

              {task.url && (
                <View style={[styles.urlRow, { backgroundColor: `${theme.accentGreen}12`, borderColor: `${theme.accentGreen}30` }]}>
                  <Ionicons name="globe-outline" size={13} color={theme.accentGreen} />
                  <Text style={[styles.urlText, { color: theme.accentGreen }]} numberOfLines={1}>
                    {task.url}
                  </Text>
                  {onOpenUrl && (
                    <TouchableOpacity
                      style={[styles.openUrlBtn, { backgroundColor: `${theme.accent}20` }]}
                      onPress={() => onOpenUrl(task.url!)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="open-outline" size={11} color={theme.accent} />
                      <Text style={[styles.openUrlText, { color: theme.accent }]}>Open</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <View style={styles.actionRow}>
                <Text style={[styles.statusLabel, { color: theme.accentGreen }]}>
                  🟢 Active background server
                </Text>
                <TouchableOpacity
                  style={[styles.killBtn, { backgroundColor: `${theme.accentRed}18`, borderColor: `${theme.accentRed}40` }]}
                  onPress={() => handleKill(task)}
                  activeOpacity={0.7}
                  disabled={killingId === task.id}
                >
                  {killingId === task.id ? (
                    <ActivityIndicator size="small" color={theme.accentRed} />
                  ) : (
                    <>
                      <Ionicons name="stop-circle" size={13} color={theme.accentRed} />
                      <Text style={[styles.killBtnText, { color: theme.accentRed }]}>Kill Activity</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
    marginHorizontal: 8,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 9,
  },
  statusDotOuter: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDotInner: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 10.5,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  quickKillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  quickKillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  expandedContent: {
    padding: 10,
    gap: 8,
  },
  taskCard: {
    borderRadius: 7,
    padding: 10,
  },
  taskInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  taskBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  taskBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  taskCommandText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "monospace",
  },
  urlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 8,
  },
  urlText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
  },
  openUrlBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  openUrlText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  killBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  killBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
