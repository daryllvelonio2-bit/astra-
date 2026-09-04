import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../theme/themeContext";

interface IDEBottomBarProps {
  bottomTab: "editor" | "terminal" | "browser" | "git" | "desktop";
  onChangeTab: (tab: "editor" | "terminal" | "browser" | "git" | "desktop") => void;
  runningTaskCount?: number;
  compact?: boolean;
}

export function IDEBottomBar({ bottomTab, onChangeTab, runningTaskCount = 0, compact = false }: IDEBottomBarProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.bottomBar, { backgroundColor: theme.bgSecondary, borderTopColor: theme.border }, compact && styles.bottomBarCompact]}>
      <TouchableOpacity
        style={[
          styles.bottomTabBtn,
          bottomTab === "editor" && { backgroundColor: theme.bgTertiary },
        ]}
        onPress={() => onChangeTab("editor")}
      >
        <Ionicons name="code-slash" size={16} color={bottomTab === "editor" ? theme.accent : theme.textMuted} />
        <Text
          style={[
            styles.bottomTabText,
            compact && styles.bottomTabTextCompact,
            { color: theme.textMuted },
            bottomTab === "editor" && { color: theme.accent, fontWeight: "700" },
          ]}
        >
          Editor
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.bottomTabBtn,
          bottomTab === "terminal" && { backgroundColor: theme.bgTertiary },
        ]}
        onPress={() => onChangeTab("terminal")}
      >
        <View style={styles.terminalIconContainer}>
          <MaterialCommunityIcons name="console" size={16} color={bottomTab === "terminal" ? theme.accent : theme.textMuted} />
          {runningTaskCount > 0 && (
            <View style={[styles.taskBadge, { backgroundColor: theme.accentGreen, borderColor: theme.bgSecondary }]}>
              <View style={[styles.taskBadgeDot, { backgroundColor: theme.bubbleUserText }]} />
            </View>
          )}
        </View>
        <Text
          style={[
            styles.bottomTabText,
            compact && styles.bottomTabTextCompact,
            { color: theme.textMuted },
            bottomTab === "terminal" && { color: theme.accent, fontWeight: "700" },
          ]}
        >
          Terminal{runningTaskCount > 0 ? ` (${runningTaskCount})` : ""}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.bottomTabBtn,
          bottomTab === "browser" && { backgroundColor: theme.bgTertiary },
        ]}
        onPress={() => onChangeTab("browser")}
      >
        <Ionicons name="globe-outline" size={16} color={bottomTab === "browser" ? theme.accent : theme.textMuted} />
        <Text
          style={[
            styles.bottomTabText,
            compact && styles.bottomTabTextCompact,
            { color: theme.textMuted },
            bottomTab === "browser" && { color: theme.accent, fontWeight: "700" },
          ]}
        >
          Browser
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.bottomTabBtn,
          bottomTab === "git" && { backgroundColor: theme.bgTertiary },
        ]}
        onPress={() => onChangeTab("git")}
      >
        <Ionicons name="git-branch-outline" size={16} color={bottomTab === "git" ? theme.accent : theme.textMuted} />
        <Text
          style={[
            styles.bottomTabText,
            compact && styles.bottomTabTextCompact,
            { color: theme.textMuted },
            bottomTab === "git" && { color: theme.accent, fontWeight: "700" },
          ]}
        >
          Git
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.bottomTabBtn,
          bottomTab === "desktop" && { backgroundColor: theme.bgTertiary },
        ]}
        onPress={() => onChangeTab("desktop")}
      >
        <Ionicons name="desktop-outline" size={16} color={bottomTab === "desktop" ? theme.accent : theme.textMuted} />
        <Text
          style={[
            styles.bottomTabText,
            compact && styles.bottomTabTextCompact,
            { color: theme.textMuted },
            bottomTab === "desktop" && { color: theme.accent, fontWeight: "700" },
          ]}
        >
          Desktop
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderTopWidth: 1,
  },
  bottomBarCompact: {
    height: 34,
  },
  bottomTabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
  },
  bottomTabBtnActive: {},
  bottomTabText: {
    fontSize: 12,
    fontWeight: "500",
  },
  bottomTabTextCompact: {
    fontSize: 10.5,
  },
  bottomTabTextActive: {
    fontWeight: "700",
  },
  terminalIconContainer: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  taskBadge: {
    position: "absolute",
    top: -2,
    right: -4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  taskBadgeDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
});
