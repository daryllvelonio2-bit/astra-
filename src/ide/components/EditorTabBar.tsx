import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../theme/themeContext";

interface EditorTabBarProps {
  fileName: string;
  isEditing: boolean;
  onToggleEdit: () => void;
  onDoneEdit: () => void;
  onFormatCode: () => void;
  onRunFile?: () => void;
  onAskAi?: () => void;
  onExitProject?: () => void;
  onToggleSidebar?: () => void;
}

export function EditorTabBar({
  fileName,
  isEditing,
  onToggleEdit,
  onDoneEdit,
  onFormatCode,
  onRunFile,
  onAskAi,
  onExitProject,
  onToggleSidebar,
}: EditorTabBarProps) {
  const { theme } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <View style={[styles.tabBar, { backgroundColor: theme.bgSecondary, borderBottomColor: theme.border }]}>
      <View style={styles.tabLeft}>
        {onToggleSidebar && (
          <TouchableOpacity onPress={onToggleSidebar} style={styles.hamburgerBtn}>
            <Ionicons name="menu" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
        <Ionicons name="document-text-outline" size={16} color={theme.accent} style={{ marginRight: 6 }} />
        <Text style={[styles.tabTitle, { color: theme.textPrimary }]} numberOfLines={1}>
          {fileName}
        </Text>
        <TouchableOpacity
          style={[styles.modeBadge, { backgroundColor: theme.bgTertiary, borderColor: theme.border }, isEditing && styles.modeBadgeEditing]}
          onPress={onToggleEdit}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isEditing ? "pencil" : "lock-closed-outline"}
            size={11}
            color={isEditing ? theme.accentGreen : theme.textMuted}
          />
          <Text style={[styles.modeBadgeText, isEditing ? { color: theme.accentGreen } : { color: theme.textMuted }]}>
            {isEditing ? "Editing" : "View"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick Toolbar */}
      <View style={styles.tabActions}>
        {isEditing ? (
          <TouchableOpacity style={styles.doneEditBtn} onPress={onDoneEdit}>
            <Ionicons name="checkmark-outline" size={14} color="#81c995" />
            <Text style={styles.doneEditText}>Done</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.actionIconBtn} onPress={onFormatCode} activeOpacity={0.7}>
            <MaterialCommunityIcons name="auto-fix" size={16} color={theme.accentGold} />
          </TouchableOpacity>
        )}

        {onRunFile && (
          <TouchableOpacity style={styles.actionIconBtn} onPress={onRunFile}>
            <Ionicons name="play" size={16} color={theme.accentGreen} />
          </TouchableOpacity>
        )}
        {onAskAi && (
          <TouchableOpacity style={styles.actionIconBtn} onPress={onAskAi}>
            <Ionicons name="sparkles" size={16} color={theme.accent} />
          </TouchableOpacity>
        )}
        {onExitProject && (
          <TouchableOpacity onPress={() => setShowDropdown(true)} style={styles.actionIconBtn}>
            <Ionicons name="ellipsis-vertical" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Dropdown Menu Overlay */}
      {showDropdown && (
        <View style={styles.dropdownOverlay}>
          <TouchableOpacity
            style={styles.dropdownBackdrop}
            activeOpacity={1}
            onPress={() => setShowDropdown(false)}
          />
          <View style={[styles.dropdownBox, { backgroundColor: theme.bgTertiary, borderColor: theme.border }]}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setShowDropdown(false);
                onFormatCode();
              }}
            >
              <MaterialCommunityIcons name="auto-fix" size={16} color={theme.accentGold} style={{ marginRight: 8 }} />
              <Text style={[styles.dropdownItemText, { color: theme.accentGold }]}>Format Code (Prettier)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setShowDropdown(false);
                if (onExitProject) onExitProject();
              }}
            >
              <Ionicons name="exit-outline" size={16} color={theme.accentRed} style={{ marginRight: 8 }} />
              <Text style={[styles.dropdownItemText, { color: theme.accentRed }]}>Exit Project</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 40,
    backgroundColor: "#252526",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e1e",
    zIndex: 10,
  },
  tabLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
    gap: 6,
  },
  hamburgerBtn: {
    marginRight: 2,
    padding: 4,
  },
  tabTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "500",
    maxWidth: 160,
  },
  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1b1d22",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#333538",
  },
  modeBadgeEditing: {
    borderColor: "#1e3a2b",
    backgroundColor: "#15241b",
  },
  modeBadgeText: {
    color: "#9aa0a6",
    fontSize: 10.5,
    fontWeight: "500",
  },
  doneEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#15241b",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#1e3a2b",
    marginRight: 4,
  },
  doneEditText: {
    color: "#81c995",
    fontSize: 11,
    fontWeight: "600",
  },
  tabActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionIconBtn: {
    padding: 6,
    borderRadius: 4,
  },
  dropdownOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  dropdownBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dropdownBox: {
    position: "absolute",
    top: 40,
    right: 8,
    backgroundColor: "#252526",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3c3c3c",
    width: 190,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dropdownItemText: {
    color: "#f48771",
    fontSize: 12.5,
    fontWeight: "500",
  },
});
