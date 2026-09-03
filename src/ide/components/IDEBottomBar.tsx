import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../theme/themeContext";

interface IDEBottomBarProps {
  bottomTab: "editor" | "terminal" | "browser";
  onChangeTab: (tab: "editor" | "terminal" | "browser") => void;
  runningTaskCount?: number;
}

export function IDEBottomBar({ bottomTab, onChangeTab, runningTaskCount = 0 }: IDEBottomBarProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.bottomBar, { backgroundColor: theme.bgSecondary, borderTopColor: theme.border }]}>
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
              <View style={styles.taskBadgeDot} />
            </View>
          )}
        </View>
        <Text
          style={[
            styles.bottomTabText,
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
            { color: theme.textMuted },
            bottomTab === "browser" && { color: theme.accent, fontWeight: "700" },
          ]}
        >
          Browser
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    height: 42,
    backgroundColor: "#181818",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: "#282828",
  },
  bottomTabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  bottomTabBtnActive: {
    backgroundColor: "#252526",
  },
  bottomTabText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "500",
  },
  bottomTabTextActive: {
    color: "#8ab4f8",
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
    backgroundColor: "#10b981",
    borderWidth: 1,
    borderColor: "#181818",
    justifyContent: "center",
    alignItems: "center",
  },
  taskBadgeDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#ffffff",
  },
});
