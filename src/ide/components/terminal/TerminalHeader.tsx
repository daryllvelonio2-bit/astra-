import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TerminalTab } from "./useTerminalSession";
import { useTheme } from "../../../theme/themeContext";

interface TerminalHeaderProps {
  sessions: TerminalTab[];
  activeSessionId: string;
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
  onSelectSession,
  onAddSession,
  onCloseSession,
  onRestartSession,
  onClearSession,
  onOpenThemePicker,
  onZoomIn,
  onZoomOut,
}: TerminalHeaderProps) {
  const { theme: appTheme } = useTheme();
  return (
    <View
      style={[
        styles.topBar,
        { backgroundColor: appTheme.bgSecondary, borderBottomColor: appTheme.border },
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
                { backgroundColor: appTheme.bgTertiary, borderColor: appTheme.border },
                isActive && {
                  backgroundColor: appTheme.bgPrimary,
                  borderBottomColor: appTheme.accent,
                },
              ]}
              onPress={() => onSelectSession(s.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: appTheme.textMuted },
                  s.isTask && { backgroundColor: appTheme.accentGreen },
                  isActive && !s.isTask && { backgroundColor: appTheme.accent },
                ]}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? appTheme.textPrimary : s.isTask ? appTheme.accentGreen : appTheme.textMuted },
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
                  <Ionicons name="close" size={12} color={appTheme.textMuted} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[styles.addTabBtn, { backgroundColor: appTheme.bgTertiary, borderColor: appTheme.border }]}
          onPress={onAddSession}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={14} color={appTheme.textMuted} />
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.topActions}>
        {/* Zoom Controls */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onZoomOut}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="remove-outline" size={14} color={appTheme.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onZoomIn}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="add-outline" size={14} color={appTheme.textMuted} />
        </TouchableOpacity>

        {/* Theme Palette */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onOpenThemePicker}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="color-palette-outline" size={14} color={appTheme.textMuted} />
        </TouchableOpacity>

        {/* Restart Active */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onRestartSession}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="refresh-outline" size={14} color={appTheme.textMuted} />
        </TouchableOpacity>

        {/* Clear Active */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onClearSession}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="trash-outline" size={14} color={appTheme.textMuted} />
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
    gap: 5,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
