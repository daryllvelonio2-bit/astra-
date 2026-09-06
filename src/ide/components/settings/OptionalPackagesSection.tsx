import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeColors } from "../../../theme/themeContext";
import {
  executeCommand,
  installPackages,
} from "../../../../modules/linux-runner/src";
import { OPTIONAL_GROUPS, OptionalPackage } from "../../services/optionalPackages";

interface OptionalPackagesSectionProps {
  theme: ThemeColors;
  /** True while base provisioning runs — installs are disabled (apk lock). */
  provisioningActive: boolean;
}

/** Probe every catalog binary in a single shell round-trip. Returns bin -> installed. */
async function probeAll(bins: string[]): Promise<Record<string, boolean>> {
  const script = `for b in ${bins.join(" ")}; do if command -v "$b" >/dev/null 2>&1; then echo "$b:yes"; else echo "$b:no"; fi; done`;
  try {
    const res = await executeCommand(script);
    const out: Record<string, boolean> = {};
    for (const line of res.stdout.split("\n")) {
      const m = line.trim().match(/^(\S+):(yes|no)$/);
      if (m) out[m[1]] = m[2] === "yes";
    }
    return out;
  } catch (_) {
    return {};
  }
}

export function OptionalPackagesSection({ theme, provisioningActive }: OptionalPackagesSectionProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>("cli");
  const [installed, setInstalled] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [groupBusy, setGroupBusy] = useState<Record<string, boolean>>({});
  const [probing, setProbing] = useState(true);

  const allPackages: OptionalPackage[] = OPTIONAL_GROUPS.flatMap((g) => g.packages);

  const refresh = useCallback(async (bins?: string[]) => {
    const targets = bins ?? allPackages.map((p) => p.bin);
    const result = await probeAll(targets);
    setInstalled((prev) => {
      const next = { ...prev };
      for (const p of allPackages) {
        if (p.bin in result) next[p.id] = result[p.bin];
      }
      return next;
    });
  }, []);

  useEffect(() => {
    (async () => {
      setProbing(true);
      try {
        await refresh();
      } finally {
        setProbing(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const guardProvisioning = (): boolean => {
    if (provisioningActive) {
      Alert.alert(
        "Provisioning Running",
        "Wait for the base toolchain download to finish before installing extras (they share the apk lock)."
      );
      return true;
    }
    return false;
  };

  const handleInstallOne = (pkg: OptionalPackage) => {
    if (guardProvisioning()) return;
    const run = async () => {
      setBusy((prev) => ({ ...prev, [pkg.id]: true }));
      try {
        const res = await installPackages(pkg.apk);
        if (res.exitCode === 0) {
          await refresh([pkg.bin]);
        } else {
          Alert.alert(
            `Failed to install ${pkg.name}`,
            (res.stdout || "Unknown error").slice(-400)
          );
        }
      } finally {
        setBusy((prev) => ({ ...prev, [pkg.id]: false }));
      }
    };
    if (pkg.heavy) {
      Alert.alert(
        `Install ${pkg.name}?`,
        "This is a large download (hundreds of MB). Make sure you have free storage and a stable connection.",
        [{ text: "Cancel", style: "cancel" }, { text: "Install", onPress: run }]
      );
    } else {
      run();
    }
  };

  const handleInstallGroup = (groupId: string) => {
    if (guardProvisioning()) return;
    const group = OPTIONAL_GROUPS.find((g) => g.id === groupId);
    if (!group) return;
    const missing = group.packages.filter((p) => !installed[p.id]);
    if (missing.length === 0) return;
    const heavyOnes = missing.filter((p) => p.heavy);
    const run = async () => {
      setGroupBusy((prev) => ({ ...prev, [groupId]: true }));
      try {
        const apks = missing.flatMap((p) => p.apk);
        const res = await installPackages(apks);
        if (res.exitCode === 0) {
          await refresh(missing.map((p) => p.bin));
        } else {
          Alert.alert(
            `Failed to install ${group.title}`,
            (res.stdout || "Unknown error").slice(-400)
          );
        }
      } finally {
        setGroupBusy((prev) => ({ ...prev, [groupId]: false }));
      }
    };
    Alert.alert(
      `Install ${missing.length} missing package${missing.length > 1 ? "s" : ""}?`,
      `${missing.map((p) => p.name).join(", ")}${heavyOnes.length > 0 ? "\n\nIncludes large download(s): " + heavyOnes.map((p) => p.name).join(", ") + ". Check free storage first." : ""}`,
      [{ text: "Cancel", style: "cancel" }, { text: "Install All", onPress: run }]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionHeading, { color: theme.textMuted }]}>
        OPTIONAL EXTRAS
      </Text>
      <Text style={[styles.sectionSub, { color: theme.textMuted }]}>
        One-tap dev boosts for your Linux environment. Installed outside the base toolchain, anytime.
      </Text>

      {OPTIONAL_GROUPS.map((group) => {
        const doneCount = group.packages.filter((p) => installed[p.id]).length;
        const allDone = doneCount === group.packages.length;
        const isExpanded = expandedGroup === group.id;
        const isGroupBusy = !!groupBusy[group.id];
        return (
          <View
            key={group.id}
            style={[
              styles.groupCard,
              {
                backgroundColor: theme.bgSecondary,
                borderColor: allDone ? `${theme.accentGreen}40` : theme.border,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.groupHeader}
              onPress={() => setExpandedGroup(isExpanded ? null : group.id)}
              activeOpacity={0.7}
            >
              <View style={styles.groupLeft}>
                <View style={[styles.groupBadge, { backgroundColor: `${theme.accent}18` }]}>
                  <Ionicons name={group.icon as any} size={15} color={theme.accent} />
                </View>
                <View style={styles.titleCol}>
                  <Text style={[styles.groupTitle, { color: theme.textPrimary }]}>
                    {group.title}
                  </Text>
                  <Text style={[styles.groupDesc, { color: theme.textMuted }]} numberOfLines={1}>
                    {group.blurb}
                  </Text>
                </View>
              </View>
              <View style={styles.groupRight}>
                {probing ? (
                  <ActivityIndicator size={12} color={theme.textMuted} />
                ) : (
                  <Text
                    style={[
                      styles.groupCount,
                      { color: allDone ? theme.accentGreen : theme.textMuted },
                    ]}
                  >
                    {allDone ? "All installed" : `${doneCount}/${group.packages.length}`}
                  </Text>
                )}
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={theme.textMuted}
                />
              </View>
            </TouchableOpacity>

            {isExpanded && (
              <View style={[styles.packageList, { borderTopColor: theme.border }]}>
                {group.packages.map((pkg) => {
                  const isInstalled = !!installed[pkg.id];
                  const isBusy = !!busy[pkg.id];
                  return (
                    <View key={pkg.id} style={styles.pkgRow}>
                      <View style={styles.pkgInfo}>
                        <View style={styles.pkgNameRow}>
                          <Text style={[styles.pkgName, { color: theme.textPrimary }]}>
                            {pkg.name}
                          </Text>
                          <View style={[styles.apkChip, { backgroundColor: theme.bgTertiary, borderColor: theme.border }]}>
                            <Text style={[styles.apkChipText, { color: theme.textSecondary }]}>
                              {pkg.apk.join(" ")}
                            </Text>
                          </View>
                          {pkg.heavy && (
                            <View style={[styles.heavyChip, { backgroundColor: `${theme.accentGold}18`, borderColor: `${theme.accentGold}40` }]}>
                              <Text style={[styles.heavyChipText, { color: theme.accentGold }]}>
                                LARGE
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.pkgDesc, { color: theme.textSecondary }]}>
                          {pkg.desc}
                        </Text>
                      </View>
                      <View style={styles.pkgAction}>
                        {isBusy || isGroupBusy ? (
                          <ActivityIndicator size={14} color={theme.accent} />
                        ) : isInstalled ? (
                          <Ionicons name="checkmark-circle" size={20} color={theme.accentGreen} />
                        ) : (
                          <TouchableOpacity
                            style={[
                              styles.installBtn,
                              {
                                backgroundColor: `${theme.accent}15`,
                                borderColor: `${theme.accent}40`,
                                opacity: provisioningActive ? 0.4 : 1,
                              },
                            ]}
                            onPress={() => handleInstallOne(pkg)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="download-outline" size={13} color={theme.accent} />
                            <Text style={[styles.installText, { color: theme.accent }]}>
                              Get
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}

                {!allDone && !probing && (
                  <TouchableOpacity
                    style={[
                      styles.installAllBtn,
                      {
                        backgroundColor: `${theme.accent}12`,
                        borderColor: `${theme.accent}30`,
                        opacity: provisioningActive || isGroupBusy ? 0.5 : 1,
                      },
                    ]}
                    onPress={() => handleInstallGroup(group.id)}
                    disabled={provisioningActive || isGroupBusy}
                    activeOpacity={0.7}
                  >
                    {isGroupBusy ? (
                      <ActivityIndicator size={13} color={theme.accent} />
                    ) : (
                      <Ionicons name="albums-outline" size={13} color={theme.accent} />
                    )}
                    <Text style={[styles.installAllText, { color: theme.accent }]}>
                      Install all missing ({group.packages.length - doneCount})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  sectionHeading: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, marginTop: 4 },
  sectionSub: { fontSize: 11, marginTop: -4 },
  groupCard: { borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
  },
  groupLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  groupBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  titleCol: { flex: 1 },
  groupTitle: { fontSize: 13, fontWeight: "700" },
  groupDesc: { fontSize: 10, marginTop: 1 },
  groupRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  groupCount: { fontSize: 11, fontWeight: "600" },
  packageList: { borderTopWidth: 1, padding: 10, gap: 10 },
  pkgRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  pkgInfo: { flex: 1, gap: 3 },
  pkgNameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 5 },
  pkgName: { fontSize: 12.5, fontWeight: "700" },
  apkChip: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  apkChipText: { fontSize: 9.5, fontFamily: "monospace" },
  heavyChip: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  heavyChipText: { fontSize: 9, fontWeight: "800" },
  pkgDesc: { fontSize: 11, lineHeight: 15 },
  pkgAction: { minWidth: 30, alignItems: "flex-end", justifyContent: "center", paddingTop: 2 },
  installBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  installText: { fontSize: 11, fontWeight: "700" },
  installAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 7,
    borderRadius: 7,
    borderWidth: 1,
    marginTop: 2,
  },
  installAllText: { fontSize: 12, fontWeight: "700" },
});
