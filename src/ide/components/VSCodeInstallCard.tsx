import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/themeContext";
import { VSCodeProvisionProgress } from "../services/vscodeService";

export interface VSCodeInstallCardProps {
  progress: VSCodeProvisionProgress | null;
  log: string[];
}

export function VSCodeInstallCard({ progress, log }: VSCodeInstallCardProps) {
  const { theme } = useTheme();
  const [showLog, setShowLog] = useState(false);

  const currentPercent = Math.min(100, Math.max(5, progress?.percent ?? 5));
  const step1Done = currentPercent >= 15;
  const step2Done = currentPercent >= 75;
  const step3Done = currentPercent >= 90;
  const step4Done = currentPercent >= 100;

  return (
    <View style={[styles.center, { backgroundColor: theme.bgPrimary }]}>
      <View style={[styles.installCard, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
        <View style={styles.installHeader}>
          <View style={[styles.installIconCircle, { backgroundColor: `${theme.accent}1f` }]}>
            <Ionicons name="cloud-download-outline" size={22} color={theme.accent} />
          </View>
          <View style={styles.installTitleBox}>
            <Text style={[styles.installTitle, { color: theme.textPrimary }]}>Installing VS Code</Text>
            <Text style={[styles.installSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
              {progress?.stage || "Preparing environment…"}
            </Text>
          </View>
        </View>

        {/* Progress bar track */}
        <View style={[styles.progressTrack, { backgroundColor: theme.bgTertiary, borderColor: theme.border }]}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${currentPercent}%`,
                backgroundColor: theme.accent,
              },
            ]}
          />
        </View>

        {/* Stats row */}
        <View style={styles.progressStatsRow}>
          <Text style={[styles.statsLeft, { color: theme.textSecondary }]}>
            {progress?.downloadedMb && progress?.totalMb
              ? `${progress.downloadedMb} MB / ${progress.totalMb} MB`
              : progress?.stage || "In progress…"}
          </Text>
          <Text style={[styles.statsRight, { color: theme.accent }]}>{currentPercent}%</Text>
        </View>

        {/* Step indicators */}
        <View style={styles.stepIndicatorRow}>
          <View style={styles.stepItem}>
            <Ionicons
              name={step1Done ? "checkmark-circle" : "ellipse-outline"}
              size={12}
              color={step1Done ? theme.accentGreen : theme.textMuted}
            />
            <Text style={[styles.stepText, { color: step1Done ? theme.textPrimary : theme.textMuted }]}>
              Prepare
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={10} color={theme.borderLight} />
          <View style={styles.stepItem}>
            <Ionicons
              name={step2Done ? "checkmark-circle" : currentPercent >= 15 ? "radio-button-on" : "ellipse-outline"}
              size={12}
              color={step2Done ? theme.accentGreen : currentPercent >= 15 ? theme.accent : theme.textMuted}
            />
            <Text style={[styles.stepText, { color: currentPercent >= 15 ? theme.textPrimary : theme.textMuted }]}>
              Download
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={10} color={theme.borderLight} />
          <View style={styles.stepItem}>
            <Ionicons
              name={step3Done ? "checkmark-circle" : currentPercent >= 75 ? "radio-button-on" : "ellipse-outline"}
              size={12}
              color={step3Done ? theme.accentGreen : currentPercent >= 75 ? theme.accent : theme.textMuted}
            />
            <Text style={[styles.stepText, { color: currentPercent >= 75 ? theme.textPrimary : theme.textMuted }]}>
              Extract
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={10} color={theme.borderLight} />
          <View style={styles.stepItem}>
            <Ionicons
              name={step4Done ? "checkmark-circle" : currentPercent >= 90 ? "radio-button-on" : "ellipse-outline"}
              size={12}
              color={step4Done ? theme.accentGreen : currentPercent >= 90 ? theme.accent : theme.textMuted}
            />
            <Text style={[styles.stepText, { color: currentPercent >= 90 ? theme.textPrimary : theme.textMuted }]}>
              Ready
            </Text>
          </View>
        </View>

        {/* Details toggle */}
        <TouchableOpacity
          style={[styles.toggleDetailsBtn, { borderTopColor: theme.border }]}
          onPress={() => setShowLog((v) => !v)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showLog ? "chevron-up-outline" : "chevron-down-outline"}
            size={13}
            color={theme.textSecondary}
          />
          <Text style={[styles.toggleDetailsText, { color: theme.textSecondary }]}>
            {showLog ? "Hide log details" : "Show log details"}
          </Text>
        </TouchableOpacity>

        {showLog && (
          <ScrollView style={[styles.inlineLogBox, { backgroundColor: theme.bgPrimary, borderColor: theme.border }]}>
            {log.slice(-30).map((line, i) => (
              <Text key={i} style={[styles.logLine, { color: theme.textSecondary }]} selectable>
                {line}
              </Text>
            ))}
          </ScrollView>
        )}
      </View>

      <Text style={[styles.note, { color: theme.textMuted, marginTop: 10 }]}>
        Please keep the app open while downloading and extracting.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8, padding: 20 },
  note: { fontSize: 12, textAlign: "center", lineHeight: 17 },
  logLine: { fontSize: 10, fontFamily: "monospace", lineHeight: 14 },
  installCard: { width: "100%", maxWidth: 440, borderRadius: 12, borderWidth: 1, padding: 16, gap: 12 },
  installHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  installIconCircle: { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center" },
  installTitleBox: { flex: 1 },
  installTitle: { fontSize: 15, fontWeight: "700" },
  installSubtitle: { fontSize: 12, marginTop: 2 },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden", borderWidth: 1 },
  progressBar: { height: "100%", borderRadius: 4 },
  progressStatsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statsLeft: { fontSize: 11, fontWeight: "500" },
  statsRight: { fontSize: 12, fontWeight: "700" },
  stepIndicatorRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 },
  stepItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  stepText: { fontSize: 10, fontWeight: "600" },
  toggleDetailsBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingTop: 10, borderTopWidth: 1 },
  toggleDetailsText: { fontSize: 11, fontWeight: "500" },
  inlineLogBox: { maxHeight: 120, borderRadius: 6, borderWidth: 1, padding: 6, marginTop: 4 },
});
