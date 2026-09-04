import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/themeContext";

export type DesktopPhase =
  | "checking"
  | "not-installed"
  | "installing"
  | "starting"
  | "running"
  | "stopped"
  | "error";

interface DesktopSetupCardProps {
  phase: DesktopPhase;
  statusNote: string;
  log: string[];
  onInstall: () => void;
  onStart: () => void;
  onRefresh: () => void;
  onDiagnose: () => void;
}

export function DesktopSetupCard({
  phase,
  statusNote,
  log,
  onInstall,
  onStart,
  onRefresh,
  onDiagnose,
}: DesktopSetupCardProps) {
  const { theme } = useTheme();

  const renderCenter = (
    icon: string,
    title: string,
    body: string,
    actions: React.ReactNode
  ) => (
    <ScrollView
      contentContainerStyle={styles.center}
      keyboardShouldPersistTaps="handled"
    >
      <Ionicons name={icon as any} size={44} color={theme.textMuted} />
      <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>{body}</Text>
      {actions}
      {log.length > 0 && (
        <View
          style={[
            styles.logBox,
            { backgroundColor: theme.bgTertiary, borderColor: theme.border },
          ]}
        >
          {log.slice(-60).map((line, i) => (
            <Text
              key={i}
              style={[styles.logLine, { color: theme.textMuted }]}
              numberOfLines={3}
            >
              {line}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );

  if (phase === "checking") {
    return (
      <View style={[styles.center, { backgroundColor: theme.bgPrimary }]}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Checking desktop status…
        </Text>
      </View>
    );
  }

  if (phase === "not-installed" || phase === "installing") {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bgPrimary }}>
        {renderCenter(
          "desktop-outline",
          "Linux Desktop (XFCE)",
          phase === "installing"
            ? "Installing… this downloads ~1GB and takes several minutes. Keep the app open."
            : "Run a full XFCE desktop inside the app. One-time setup downloads Xvnc, XFCE, fonts and the noVNC viewer (~1GB, needs internet).",
          phase === "installing" ? (
            <ActivityIndicator
              size="large"
              color={theme.accent}
              style={{ marginTop: 12 }}
            />
          ) : (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: theme.accent }]}
              onPress={onInstall}
              activeOpacity={0.8}
            >
              <Ionicons name="download-outline" size={16} color="#fff" />
              <Text style={styles.btnText}>Install Desktop</Text>
            </TouchableOpacity>
          )
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bgPrimary }}>
      {renderCenter(
        phase === "starting" ? "hourglass-outline" : "desktop-outline",
        phase === "error"
          ? "Desktop failed to start"
          : phase === "starting"
            ? "Starting desktop…"
            : "Desktop stopped",
        phase === "error"
          ? statusNote || "Check the log below, then try again."
          : phase === "starting"
            ? statusNote
            : "XFCE is installed. Start it to get a full Linux desktop in this tab.",
        phase === "starting" ? (
          <ActivityIndicator
            size="large"
            color={theme.accent}
            style={{ marginTop: 12 }}
          />
        ) : (
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: theme.accent }]}
              onPress={onStart}
              activeOpacity={0.8}
            >
              <Ionicons name="play" size={16} color="#fff" />
              <Text style={styles.btnText}>
                {phase === "error" ? "Retry" : "Start Desktop"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.btn,
                styles.btnGhost,
                { borderColor: theme.border },
              ]}
              onPress={onRefresh}
              activeOpacity={0.8}
            >
              <Ionicons
                name="refresh-outline"
                size={16}
                color={theme.textSecondary}
              />
              <Text style={[styles.btnText, { color: theme.textSecondary }]}>
                Refresh
              </Text>
            </TouchableOpacity>
            {phase === "error" && (
              <TouchableOpacity
                style={[
                  styles.btn,
                  styles.btnGhost,
                  { borderColor: theme.border },
                ]}
                onPress={onDiagnose}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="bug-outline"
                  size={16}
                  color={theme.textSecondary}
                />
                <Text style={[styles.btnText, { color: theme.textSecondary }]}>
                  Diagnose
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 8,
  },
  btnGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  btnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  logBox: {
    alignSelf: "stretch",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    maxHeight: 220,
  },
  logLine: {
    fontSize: 10.5,
    fontFamily: "monospace",
    marginBottom: 2,
  },
});
