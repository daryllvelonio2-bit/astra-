import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RunningTask } from "../../../ai/services/runningTasksService";
import { useTheme } from "../../../theme/themeContext";

interface WebBrowserErrorViewProps {
  url: string;
  errorMessage: string;
  currentPort: string;
  runningTasks: RunningTask[];
  isStartingServer: boolean;
  onNavigate: (targetUrl: string) => void;
  onStartServer: () => void;
  onReload: () => void;
  onOpenExternal: () => void;
}

export function WebBrowserErrorView({
  url,
  errorMessage,
  currentPort,
  runningTasks,
  isStartingServer,
  onNavigate,
  onStartServer,
  onReload,
  onOpenExternal,
}: WebBrowserErrorViewProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.errorContainer, { backgroundColor: theme.bgPrimary }]}>
      <Ionicons name="cloud-offline-outline" size={48} color={theme.accentRed} />
      <Text style={[styles.errorTitle, { color: theme.textPrimary }]}>Cannot Connect to Server</Text>
      <Text style={[styles.errorSubtext, { color: theme.textSecondary }]}>
        {errorMessage || `No server responded on ${url}`}
      </Text>

      {/* Smart Detection: If background servers were detected */}
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
                <View style={[styles.pulseDot, { backgroundColor: "#ffffff" }]} />
                <Text style={styles.switchPortBtnText} numberOfLines={1}>
                  Connect to {cleanCmd} (:{taskPort}) ➔
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Suggestion Commands */}
      <View style={[styles.suggestionCard, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
        <Text style={[styles.suggestionTitle, { color: theme.textSecondary }]}>💡 Start server in terminal or ask Astra AI:</Text>
        <Text style={[styles.suggestionCode, { color: theme.accent }]}>$ php artisan serve</Text>
        <Text style={[styles.suggestionCode, { color: theme.accent }]}>$ npx expo start --web</Text>
        <Text style={[styles.suggestionCode, { color: theme.accent }]}>$ npm run dev</Text>
        <Text style={[styles.suggestionCode, { color: theme.accent }]}>$ python3 -m http.server {currentPort || "8080"}</Text>
      </View>

      {/* Actions */}
      <View style={styles.errorActions}>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: theme.accentGreen }]}
          onPress={onStartServer}
          disabled={isStartingServer}
          activeOpacity={0.8}
        >
          {isStartingServer ? (
            <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />
          ) : (
            <Ionicons name="play" size={14} color="#fff" style={{ marginRight: 6 }} />
          )}
          <Text style={styles.retryBtnText}>
            {isStartingServer ? "Starting Server..." : "Start Web Server"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.retryBtn, { backgroundColor: theme.accent }]} onPress={onReload} activeOpacity={0.8}>
          <Ionicons name="refresh" size={14} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.externalLinkBtn, { backgroundColor: theme.bgTertiary, borderColor: theme.border }]} onPress={onOpenExternal} activeOpacity={0.8}>
          <Ionicons name="open-outline" size={14} color={theme.textPrimary} style={{ marginRight: 4 }} />
          <Text style={[styles.externalLinkText, { color: theme.textPrimary }]}>Open Externally</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#161616",
  },
  errorTitle: {
    color: "#f3f4f6",
    fontSize: 17,
    fontWeight: "700",
    marginTop: 14,
  },
  errorSubtext: {
    color: "#9ca3af",
    fontSize: 12.5,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 16,
    maxWidth: 320,
    fontFamily: "monospace",
  },
  detectedTasksCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#064e3b22",
    borderColor: "#059669",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  detectedTasksTitle: {
    color: "#34d399",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  switchPortBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#064e3b",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 8,
  },
  switchPortBtnText: {
    color: "#ecfdf5",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#34d399",
  },
  suggestionCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#202022",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#2e2e32",
    marginBottom: 18,
  },
  suggestionTitle: {
    color: "#d1d5db",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  suggestionCode: {
    color: "#8ab4f8",
    fontSize: 11.5,
    fontFamily: "monospace",
    marginVertical: 2,
  },
  errorActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563eb",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  retryBtnText: {
    color: "#ffffff",
    fontSize: 12.5,
    fontWeight: "600",
  },
  externalLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e24",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2d2d38",
  },
  externalLinkText: {
    color: "#8ab4f8",
    fontSize: 12.5,
    fontWeight: "600",
  },
});
