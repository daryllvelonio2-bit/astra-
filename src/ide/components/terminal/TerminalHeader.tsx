import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TerminalTab } from "./useTerminalSession";
import { TerminalTheme } from "./terminalThemes";

interface TerminalHeaderProps {
  sessions: TerminalTab[];
  activeSessionId: string;
  theme: TerminalTheme;
  onSelectSession: (id: string) => void;
  onAddSession: () => void;
  onCloseSession: (id: string) => void;
  onRestartSession: () => void;
  onClearSession: () => void;
  onOpenThemePicker: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function TerminalHeader({
  sessions,
  activeSessionId,
  theme,
  onSelectSession,
  onAddSession,
  onCloseSession,
  onRestartSession,
  onClearSession,
  onOpenThemePicker,
  onZoomIn,
  onZoomOut,
}: TerminalHeaderProps) {
  return (
    <View
      style={[
        styles.topBar,
        { backgroundColor: theme.cardBg, borderBottomColor: theme.borderColor },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContainer}
      >
        {sessions.map((s) => {
          const isActive = s.id === activeSessionId;
          return (
            <TouchableOpacity
              key={s.id}
              style={[
                styles.tab,
                { backgroundColor: theme.cardBg, borderColor: theme.borderColor },
                isActive && {
                  backgroundColor: theme.background,
                  borderBottomColor: theme.accent,
                },
              ]}
              onPress={() => onSelectSession(s.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.statusDot,
                  s.isTask && { backgroundColor: "#34d399" },
                  isActive && !s.isTask && { backgroundColor: theme.promptUser },
                ]}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? theme.foreground : s.isTask ? "#a7f3d0" : "#8b949e" },
                ]}
              >
                {s.name}
              </Text>
              {sessions.length > 1 && (
                <TouchableOpacity
                  onPress={() => onCloseSession(s.id)}
                  style={styles.closeTabBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={12} color={theme.foreground + "80"} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[styles.addTabBtn, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}
          onPress={onAddSession}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={14} color={theme.foreground + "80"} />
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.topActions}>
        {/* Zoom Controls */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onZoomOut}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="remove-outline" size={14} color="#8b949e" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onZoomIn}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="add-outline" size={14} color="#8b949e" />
        </TouchableOpacity>

        {/* Theme Palette */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onOpenThemePicker}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="color-palette-outline" size={14} color="#8b949e" />
        </TouchableOpacity>

        {/* Restart Active */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onRestartSession}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="refresh-outline" size={14} color="#8b949e" />
        </TouchableOpacity>

        {/* Clear Active */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onClearSession}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="trash-outline" size={14} color="#8b949e" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingHorizontal: 6,
    height: 34,
  },
  tabsScroll: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: "#0d1117",
    gap: 5,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#484f58",
  },
  tabText: {
    fontSize: 11,
    fontFamily: "monospace",
  },
  closeTabBtn: {
    marginLeft: 2,
  },
  addTabBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: "#0d1117",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 4,
  },
  actionBtn: {
    padding: 3,
  },
});
