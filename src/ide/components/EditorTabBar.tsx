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
  errorCount?: number;
  warningCount?: number;
  onShowProblems?: () => void;
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
  errorCount = 0,
  warningCount = 0,
  onShowProblems,
}: EditorTabBarProps) {
  const { theme } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const [barWidth, setBarWidth] = useState(0);

  // Narrow editor (sidebar open / small screen): collapse secondary actions
  // into the overflow menu so buttons never squeeze or overlap.
  const hasOverflowMenu = !!onExitProject;
  const narrow = barWidth > 0 && barWidth < 420;
  const collapseActions = narrow && hasOverflowMenu;

  return (
    <View
      style={[styles.tabBar, { backgroundColor: theme.bgSecondary, borderBottomColor: theme.border }]}
      onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
    >
      <View style={styles.tabLeft}>
        {onToggleSidebar && (
          <TouchableOpacity onPress={onToggleSidebar} style={styles.hamburgerBtn}>
            <Ionicons name="menu" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
        <Ionicons name="document-text-outline" size={16} color={theme.accent} style={{ marginRight: 6 }} />
        <Text style={[styles.tabTitle, { color: theme.textPrimary }]} numberOfLines={1} ellipsizeMode="middle">
          {fileName}
        </Text>
        <TouchableOpacity
          style={[styles.modeBadge, styles.noShrink, { backgroundColor: theme.bgTertiary, borderColor: theme.border }, isEditing && { backgroundColor: `${theme.accentGreen}15`, borderColor: theme.accentGreen }]}
          onPress={onToggleEdit}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isEditing ? "pencil" : "lock-closed-outline"}
            size={11}
            color={isEditing ? theme.accentGreen : theme.textMuted}
          />
          {!narrow && (
            <Text style={[styles.modeBadgeText, isEditing ? { color: theme.accentGreen } : { color: theme.textMuted }]}>
              {isEditing ? "Editing" : "View"}
            </Text>
          )}
        </TouchableOpacity>
        {(errorCount > 0 || warningCount > 0) && (
          <TouchableOpacity
            style={[styles.problemBadge, styles.noShrink, { backgroundColor: errorCount > 0 ? `${theme.accentRed}18` : `${theme.accentGold}18`, borderColor: errorCount > 0 ? theme.accentRed : theme.accentGold }]}
            onPress={onShowProblems}
            activeOpacity={0.7}
          >
            <Ionicons
              name={errorCount > 0 ? "alert-circle" : "warning-outline"}
              size={11}
              color={errorCount > 0 ? theme.accentRed : theme.accentGold}
            />
            <Text style={[styles.problemBadgeText, { color: errorCount > 0 ? theme.accentRed : theme.accentGold }]}>
              {errorCount > 0 ? errorCount : warningCount}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Toolbar */}
      <View style={[styles.tabActions, styles.noShrink]}>
        {isEditing ? (
          <TouchableOpacity style={[styles.doneEditBtn, { backgroundColor: `${theme.accentGreen}15`, borderColor: theme.accentGreen }]} onPress={onDoneEdit}>
            <Ionicons name="checkmark-outline" size={14} color={theme.accentGreen} />
            <Text style={[styles.doneEditText, { color: theme.accentGreen }]}>Done</Text>
          </TouchableOpacity>
        ) : (
          !collapseActions && (
            <TouchableOpacity style={styles.actionIconBtn} onPress={onFormatCode} activeOpacity={0.7}>
              <MaterialCommunityIcons name="auto-fix" size={16} color={theme.accentGold} />
            </TouchableOpacity>
          )
        )}

        {onRunFile && (
          <TouchableOpacity style={styles.actionIconBtn} onPress={onRunFile}>
            <Ionicons name="play" size={16} color={theme.accentGreen} />
          </TouchableOpacity>
        )}
        {onAskAi && !collapseActions && (
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    borderBottomWidth: 1,
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
    fontSize: 13,
    fontWeight: "500",
    maxWidth: 160,
    flexShrink: 1,
  },
  noShrink: {
    flexShrink: 0,
  },
  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  modeBadgeEditing: {},
  modeBadgeText: {
    fontSize: 10.5,
    fontWeight: "500",
  },
  problemBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  problemBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  doneEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 4,
  },
  doneEditText: {
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
    borderRadius: 8,
    borderWidth: 1,
    width: 190,
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
    fontSize: 12.5,
    fontWeight: "500",
  },
});
