import React, { useState, useEffect, useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/themeContext";
import { getFileIcon } from "./fileExplorerUtils";
import { subscribeIconTheme } from "../services/extensions/iconThemeService";
import { RecentFileItem } from "./editor/useRecentFiles";

const FONT_FAMILY = Platform.OS === "ios" ? "Menlo" : "monospace";

interface EditorTabBarProps {
  fileName?: string;
  activeFilePath?: string;
  isEditing: boolean;
  onToggleEdit: () => void;
  onDoneEdit: () => void;
  onRunFile?: () => void;
  onExitProject?: () => void;
  onToggleSidebar?: () => void;
  errorCount?: number;
  warningCount?: number;
  onShowProblems?: () => void;
  onOpenSettings?: () => void;
  onFormat?: () => void;
  isFormatting?: boolean;
  isLandscape?: boolean;
  isSplitScreen?: boolean;
  onToggleSplitScreen?: () => void;
  recentFiles?: RecentFileItem[];
  onSelectRecentFile?: (file: RecentFileItem) => void;
  onCloseRecentFile?: (filePath: string) => void;
}

export function EditorTabBar({
  fileName,
  activeFilePath,
  isEditing,
  onToggleEdit,
  onDoneEdit,
  onRunFile,
  onExitProject,
  onToggleSidebar,
  errorCount = 0,
  warningCount = 0,
  onShowProblems,
  onOpenSettings,
  onFormat,
  isFormatting = false,
  isLandscape = false,
  isSplitScreen = false,
  onToggleSplitScreen,
  recentFiles = [],
  onSelectRecentFile,
  onCloseRecentFile,
}: EditorTabBarProps) {
  const { theme } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const [barWidth, setBarWidth] = useState(0);

  // Filter out the active file so recents show files you can switch TO
  const recentFilesToDisplay = useMemo(() => {
    if (!recentFiles || recentFiles.length === 0) return [];
    return recentFiles.filter(
      (f) => f.name !== fileName && (activeFilePath ? f.path !== activeFilePath : true)
    );
  }, [recentFiles, fileName, activeFilePath]);

  // Narrow editor (sidebar open / small screen): collapse secondary actions
  // into the overflow menu so buttons never squeeze or overlap.
  const hasOverflowMenu = !!onExitProject || !!onOpenSettings;
  const narrow = barWidth > 0 && barWidth < 420;
  const collapseActions = narrow && hasOverflowMenu;

  const [, setIconTick] = useState(0);
  useEffect(() => {
    return subscribeIconTheme(() => {
      setIconTick((t) => t + 1);
    });
  }, []);

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
        <View style={{ marginRight: 6 }}>
          {fileName ? getFileIcon(fileName) : <Ionicons name="document-text-outline" size={16} color={theme.textMuted} />}
        </View>
        <Text style={[styles.tabTitle, { color: fileName ? theme.textPrimary : theme.textMuted }]} numberOfLines={1} ellipsizeMode="middle">
          {fileName ?? "No file open"}
        </Text>
        {fileName && (
          <TouchableOpacity
            style={[
              styles.modeBadge,
              styles.noShrink,
              { backgroundColor: theme.bgTertiary, borderColor: theme.border },
              isEditing && { backgroundColor: `${theme.accentGreen}15`, borderColor: theme.accentGreen },
            ]}
            onPress={onToggleEdit}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            accessibilityLabel={isEditing ? "Switch to view mode" : "Switch to editing mode"}
          >
            <Ionicons
              name={isEditing ? "pencil" : "lock-closed-outline"}
              size={12}
              color={isEditing ? theme.accentGreen : theme.textMuted}
            />
          </TouchableOpacity>
        )}
        {fileName && (errorCount > 0 || warningCount > 0) && (
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

      {/* Recently Edited Files in the generous header space */}
      {recentFilesToDisplay.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.recentFilesScroll}
          contentContainerStyle={styles.recentFilesContent}
          keyboardShouldPersistTaps="handled"
        >
          {recentFilesToDisplay.map((file) => (
            <TouchableOpacity
              key={file.path || file.name}
              style={[
                styles.recentChip,
                { backgroundColor: theme.bgTertiary, borderColor: theme.border },
              ]}
              onPress={() => onSelectRecentFile?.(file)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <View style={styles.recentChipIcon}>
                {getFileIcon(file.name)}
              </View>
              <Text
                style={[styles.recentChipText, { color: theme.textSecondary }]}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {file.name}
              </Text>
              {file.lastEdited ? (
                <View style={[styles.dirtyDot, { backgroundColor: theme.accentGreen }]} />
              ) : null}
              {onCloseRecentFile && (
                <TouchableOpacity
                  style={styles.recentChipClose}
                  onPress={(e) => {
                    e.stopPropagation();
                    onCloseRecentFile(file.path);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                  <Ionicons name="close" size={10} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Quick Toolbar (file actions only when a file is open) */}
      <View style={[styles.tabActions, styles.noShrink]}>
        {fileName && isEditing && (
          <TouchableOpacity style={[styles.doneEditBtn, { backgroundColor: `${theme.accentGreen}15`, borderColor: theme.accentGreen }]} onPress={onDoneEdit}>
            <Ionicons name="checkmark-outline" size={14} color={theme.accentGreen} />
            <Text style={[styles.doneEditText, { color: theme.accentGreen }]}>Done</Text>
          </TouchableOpacity>
        )}

        {fileName && onRunFile && (
          <TouchableOpacity style={styles.actionIconBtn} onPress={onRunFile}>
            <Ionicons name="play" size={16} color={theme.accentGreen} />
          </TouchableOpacity>
        )}
        {fileName && isLandscape && onToggleSplitScreen && (
          <TouchableOpacity
            style={[
              styles.actionIconBtn,
              isSplitScreen && { backgroundColor: `${theme.accent}25`, borderRadius: 6 },
            ]}
            onPress={onToggleSplitScreen}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons
              name={isSplitScreen ? "tablet-portrait-outline" : "tablet-landscape-outline"}
              size={16}
              color={isSplitScreen ? theme.accent : theme.textSecondary}
            />
          </TouchableOpacity>
        )}
        {(onExitProject || onOpenSettings) && (
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
            {onOpenSettings && (
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setShowDropdown(false);
                  onOpenSettings();
                }}
              >
                <Ionicons name="settings-outline" size={16} color={theme.textPrimary} style={{ marginRight: 8 }} />
                <Text style={[styles.dropdownItemText, { color: theme.textPrimary }]}>Settings</Text>
              </TouchableOpacity>
            )}
            {onExitProject && (
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setShowDropdown(false);
                  onExitProject();
                }}
              >
                <Ionicons name="exit-outline" size={16} color={theme.accentRed} style={{ marginRight: 8 }} />
                <Text style={[styles.dropdownItemText, { color: theme.accentRed }]}>Exit Project</Text>
              </TouchableOpacity>
            )}
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
    gap: 6,
    flexShrink: 0,
    maxWidth: 220,
  },
  hamburgerBtn: {
    marginRight: 2,
    padding: 4,
  },
  tabTitle: {
    fontSize: 13,
    fontWeight: "500",
    maxWidth: 130,
    flexShrink: 1,
  },
  recentFilesScroll: {
    flex: 1,
    marginHorizontal: 8,
    maxHeight: 28,
  },
  recentFilesContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 1,
  },
  recentChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    gap: 5,
    maxWidth: 150,
  },
  recentChipIcon: {
    justifyContent: "center",
    alignItems: "center",
  },
  recentChipText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    fontWeight: "500",
    maxWidth: 90,
  },
  dirtyDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  recentChipClose: {
    padding: 1,
    borderRadius: 3,
    marginLeft: 2,
  },
  noShrink: {
    flexShrink: 0,
  },
  modeBadge: {
    alignItems: "center",
    justifyContent: "center",
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
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
