import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AgentStatus, LiveStatusInfo } from "../agent/agentTypes";
import { runningTasksService, RunningTask } from "../services/runningTasksService";
import { useTheme } from "../../theme/themeContext";
import { ideActionService } from "../../ide/services/ideActionService";

interface LiveAgentStatusBarProps {
  status: AgentStatus;
  liveInfo: LiveStatusInfo | null;
  elapsedSeconds: number;
  onStop: () => void;
  onOpenUrl?: (url: string) => void;
}

export function LiveAgentStatusBar({
  status,
  liveInfo,
  elapsedSeconds,
  onStop,
  onOpenUrl,
}: LiveAgentStatusBarProps) {
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

  const hasRunningTasks = tasks.length > 0;
  const isAgentBusy = status === "thinking" || status === "executing_tool" || status === "verifying";
  const isError = status === "error";

  // Hide if idle and no background tasks
  if (!hasRunningTasks && !isAgentBusy && !isError) {
    return null;
  }

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
    <View style={styles.wrapper}>
      {/* 1. Background Tasks Bar (if tasks are active) */}
      {hasRunningTasks ? (
        <View style={styles.taskContainer}>
          <TouchableOpacity
            style={[styles.taskCompactBar, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}
            onPress={toggleExpand}
            activeOpacity={0.7}
          >
            <View style={styles.leftTaskGroup}>
              <View style={[styles.pulseDot, { backgroundColor: `${theme.accentGreen}25` }]}>
                <View style={[styles.pulseDotInner, { backgroundColor: theme.accentGreen }]} />
              </View>
              <Text style={[styles.taskTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                {tasks.length === 1
                  ? primaryTask.url
                    ? `${primaryTask.command} (${primaryTask.url})`
                    : primaryTask.command
                  : `${tasks.length} tasks running (${primaryTask.command} +${tasks.length - 1})`}
              </Text>
            </View>

            <View style={styles.rightTaskGroup}>
              <TouchableOpacity
                style={[styles.killBtnSmall, { backgroundColor: `${theme.accentRed}18` }]}
                onPress={() => (tasks.length === 1 ? handleKill(primaryTask) : handleKillAll())}
                activeOpacity={0.6}
                disabled={killingId !== null}
              >
                {killingId ? (
                  <ActivityIndicator size="small" color={theme.accentRed} />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={12} color={theme.accentRed} />
                    <Text style={[styles.killBtnText, { color: theme.accentRed }]}>Kill</Text>
                  </>
                )}
              </TouchableOpacity>

              <Ionicons
                name={expanded ? "chevron-up" : "chevron-down"}
                size={14}
                color={theme.accent}
              />
            </View>
          </TouchableOpacity>

          {/* Expandable Task List */}
          {expanded && (
            <View style={styles.expandedList}>
              {tasks.map((task) => (
                <View key={task.id} style={[styles.taskCard, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.pidBadge, { backgroundColor: `${theme.accent}18` }]}>
                      <Ionicons name="terminal-outline" size={10} color={theme.accent} />
                      <Text style={[styles.pidText, { color: theme.accent }]}>PID {task.pid || "Active"}</Text>
                    </View>
                    <Text style={[styles.commandName, { color: theme.textPrimary }]} numberOfLines={1}>
                      {task.command}
                    </Text>
                  </View>

                  {task.url && (
                    <View style={[styles.urlRow, { backgroundColor: `${theme.accentGreen}12` }]}>
                      <Ionicons name="globe-outline" size={12} color={theme.accentGreen} />
                      <Text style={[styles.urlText, { color: theme.accentGreen }]} numberOfLines={1}>
                        {task.url}
                      </Text>
                      {onOpenUrl && (
                        <TouchableOpacity
                          style={[styles.openBtn, { backgroundColor: `${theme.accent}20` }]}
                          onPress={() => onOpenUrl(task.url!)}
                          activeOpacity={0.6}
                        >
                          <Text style={[styles.openBtnText, { color: theme.accent }]}>Open</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  <View style={styles.cardFooter}>
                    <Text style={[styles.runningLabel, { color: theme.accentGreen }]}>🟢 Running in background</Text>
                    <TouchableOpacity
                      style={[styles.killCardBtn, { backgroundColor: `${theme.accentRed}18`, borderColor: `${theme.accentRed}40` }]}
                      onPress={() => handleKill(task)}
                      activeOpacity={0.6}
                      disabled={killingId === task.id}
                    >
                      {killingId === task.id ? (
                        <ActivityIndicator size="small" color={theme.accentRed} />
                      ) : (
                        <>
                          <Ionicons name="stop-circle" size={12} color={theme.accentRed} />
                          <Text style={[styles.killCardBtnText, { color: theme.accentRed }]}>Kill Activity</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : null}

      {/* 2. Active AI Query / Tool execution status (compact, transparent, no heavy background) */}
      {isAgentBusy || isError ? (
        <View style={styles.agentStatusBar}>
          <View style={styles.agentStatusLeft}>
            <Ionicons
              name={isError ? "alert-circle-outline" : (liveInfo?.icon as any) || "sparkles-outline"}
              size={12}
              color={isError ? theme.accentRed : theme.accent}
            />
            <Text
              style={[styles.agentStatusText, { color: theme.textSecondary }, isError && { color: theme.accentRed }]}
              numberOfLines={1}
            >
              {liveInfo?.detail || (isError ? "An error occurred" : "Processing...")}
            </Text>
          </View>

          <View style={styles.agentStatusRight}>
            <Text style={[styles.timerText, { color: theme.textMuted }]}>{elapsedSeconds}s</Text>
            {hasRunningTasks && primaryTask?.url ? (
              <TouchableOpacity
                style={[styles.quickBarBtn, { backgroundColor: `${theme.accentGreen}20` }]}
                onPress={() => ideActionService.openBrowser(primaryTask.url!, primaryTask.port)}
                activeOpacity={0.6}
              >
                <Ionicons name="globe-outline" size={10} color={theme.accentGreen} />
                <Text style={[styles.quickBarBtnText, { color: theme.accentGreen }]}>Preview</Text>
              </TouchableOpacity>
            ) : null}
            {isAgentBusy && (
              <TouchableOpacity
                style={[styles.stopBtn, { backgroundColor: `${theme.accentRed}20` }]}
                onPress={onStop}
                activeOpacity={0.6}
              >
                <Ionicons name="stop" size={9} color={theme.accentRed} />
                <Text style={[styles.stopBtnText, { color: theme.accentRed }]}>Stop</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "transparent",
    paddingHorizontal: 12,
    paddingVertical: 2,
    gap: 4,
  },
  taskContainer: {
    backgroundColor: "transparent",
  },
  taskCompactBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "rgba(30, 41, 59, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(138, 180, 248, 0.2)",
  },
  leftTaskGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(129, 201, 149, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  pulseDotInner: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#81c995",
  },
  taskTitle: {
    color: "#c9d1d9",
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  rightTaskGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  killBtnSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(242, 139, 130, 0.12)",
  },
  killBtnText: {
    color: "#f28b82",
    fontSize: 10,
    fontWeight: "700",
  },
  expandedList: {
    marginTop: 4,
    gap: 6,
  },
  taskCard: {
    backgroundColor: "#161b22",
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: "#30363d",
    gap: 6,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pidBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(138, 180, 248, 0.12)",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3,
  },
  pidText: {
    color: "#8ab4f8",
    fontSize: 9.5,
    fontWeight: "700",
  },
  commandName: {
    color: "#e8eaed",
    fontSize: 11.5,
    fontWeight: "600",
    flex: 1,
  },
  urlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(129, 201, 149, 0.08)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  urlText: {
    color: "#81c995",
    fontSize: 10.5,
    flex: 1,
  },
  openBtn: {
    backgroundColor: "rgba(138, 180, 248, 0.15)",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3,
  },
  openBtnText: {
    color: "#8ab4f8",
    fontSize: 9.5,
    fontWeight: "700",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  runningLabel: {
    color: "#81c995",
    fontSize: 10,
  },
  killCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: "rgba(242, 139, 130, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(242, 139, 130, 0.3)",
  },
  killCardBtnText: {
    color: "#f28b82",
    fontSize: 10.5,
    fontWeight: "700",
  },
  agentStatusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
    backgroundColor: "transparent",
  },
  agentStatusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
    marginRight: 8,
  },
  agentStatusText: {
    color: "#8ab4f8",
    fontSize: 10.5,
    fontWeight: "500",
    flex: 1,
  },
  agentStatusRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timerText: {
    color: "#8b949e",
    fontSize: 10,
  },
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3,
    backgroundColor: "rgba(242, 139, 130, 0.15)",
  },
  stopBtnText: {
    color: "#f28b82",
    fontSize: 9.5,
    fontWeight: "700",
  },
  quickBarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3,
  },
  quickBarBtnText: {
    fontSize: 9.5,
    fontWeight: "700",
  },
});
