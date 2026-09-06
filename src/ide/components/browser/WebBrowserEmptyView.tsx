import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RunningTask } from "../../../ai/services/runningTasksService";
import { useTheme } from "../../../theme/themeContext";

interface WebBrowserEmptyViewProps {
  runningTasks: RunningTask[];
  isStartingServer: boolean;
  currentPort: string;
  onNavigate: (targetUrl: string) => void;
  onStartServer: () => void;
}

export function WebBrowserEmptyView({
  runningTasks,
  isStartingServer,
  currentPort,
  onNavigate,
  onStartServer,
}: WebBrowserEmptyViewProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
      <Ionicons name="globe-outline" size={48} color={theme.textMuted} />
      <Text style={[styles.title, { color: theme.textPrimary }]}>Browser is empty</Text>
      <Text style={[styles.subtext, { color: theme.textSecondary }]}>
        Type a URL or port above, or start a server below.
      </Text>

      {runningTasks.length > 0 && (
        <View style={[styles.detectedTasksCard, { backgroundColor: `${theme.accentGreen}12`, borderColor: theme.accentGreen }]}>
          <Text style={[styles.detectedTasksTitle, { color: theme.accentGreen }]}>⚡ Running Server Found:</Text>
          {runningTasks.map((t) => {
            const taskPort = t.port || 8080;
            const targetUrl = t.url || `http://127.0.0.1:${taskPort}`;
            const cleanCmd = (t.command || "Server")
              .replace(/^pkill[^;]+;\s*/i, "")
              .replace(/\s*&.*$/, "")
              .trim();
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.switchPortBtn, { backgroundColor: theme.accentGreen }]}
                onPress={() => onNavigate(targetUrl)}
                activeOpacity={0.8}
              >
                <View style={[styles.pulseDot, { backgroundColor: theme.bubbleUserText }]} />
                <Text style={[styles.switchPortBtnText, { color: theme.bubbleUserText }]} numberOfLines={1}>
                  Connect to {cleanCmd} (:{taskPort}) ➔
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <TouchableOpacity
        style={[styles.startBtn, { backgroundColor: theme.accentGreen }]}
        onPress={onStartServer}
        disabled={isStartingServer}
        activeOpacity={0.8}
      >
        {isStartingServer ? (
          <ActivityIndicator size="small" color={theme.sendButtonIcon} style={{ marginRight: 6 }} />
        ) : (
          <Ionicons name="play" size={14} color={theme.sendButtonIcon} style={{ marginRight: 6 }} />
        )}
        <Text style={[styles.startBtnText, { color: theme.sendButtonIcon }]}>
          {isStartingServer ? "Starting Server..." : `Start Web Server (:${currentPort || "8080"})`}
        </Text>
      </TouchableOpacity>
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
  title: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 14,
  },
  subtext: {
    fontSize: 12.5,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 16,
    maxWidth: 320,
  },
  detectedTasksCard: {
    width: "100%",
    maxWidth: 340,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  detectedTasksTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  switchPortBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 8,
  },
  switchPortBtnText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  startBtnText: {
    fontSize: 12.5,
    fontWeight: "600",
  },
});
