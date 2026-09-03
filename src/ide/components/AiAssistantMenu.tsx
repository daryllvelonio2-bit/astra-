import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AstraLogo } from "../../ai/components/AstraLogo";
import { useTheme } from "../../theme/themeContext";

interface AiAssistantMenuProps {
  showAiMenu: boolean;
  isOverlayRunning: boolean;
  runningTaskCount?: number;
  onToggleAiMenu: () => void;
  onLaunchSystemOverlay: () => void;
  onStopSystemOverlay: () => void;
  onOpenFullChat?: () => void;
}

export function AiAssistantMenu({
  showAiMenu,
  isOverlayRunning,
  runningTaskCount = 0,
  onToggleAiMenu,
  onLaunchSystemOverlay,
  onStopSystemOverlay,
  onOpenFullChat,
}: AiAssistantMenuProps) {
  const { theme, isMidnight } = useTheme();
  const isWorking = isOverlayRunning || runningTaskCount > 0;
  return (
    <>
      {/* Quick AI Assistant Popup Menu */}
      {showAiMenu && (
        <View style={[styles.aiMenuPopup, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
          <View style={[styles.aiMenuHeader, { borderBottomColor: theme.border }]}>
            <AstraLogo width={18} height={18} />
            <Text style={[styles.aiMenuTitle, { color: theme.textPrimary }]}>Astra AI Assistant</Text>
            {isOverlayRunning && (
              <View style={styles.activeTag}>
                <View style={styles.activeDot} />
                <Text style={styles.activeTagText}>Chathead Active</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.aiMenuItem}
            onPress={onLaunchSystemOverlay}
            activeOpacity={0.7}
          >
            <View style={[styles.aiMenuIcon, { backgroundColor: `${theme.accent}25` }]}>
              <Ionicons name="layers" size={16} color={theme.accent} />
            </View>
            <View style={styles.aiMenuTextCol}>
              <Text style={[styles.aiMenuItemTitle, { color: theme.textPrimary }]}>Float Over Other Apps</Text>
              <Text style={[styles.aiMenuItemSubtitle, { color: theme.textSecondary }]}>
                Messenger chathead to vibe-code anywhere
              </Text>
            </View>
          </TouchableOpacity>

          {onOpenFullChat && (
            <TouchableOpacity
              style={styles.aiMenuItem}
              onPress={onOpenFullChat}
              activeOpacity={0.7}
            >
              <View style={[styles.aiMenuIcon, { backgroundColor: `${theme.accentPurple}25` }]}>
                <Ionicons name="expand" size={16} color={theme.accentPurple} />
              </View>
              <View style={styles.aiMenuTextCol}>
                <Text style={[styles.aiMenuItemTitle, { color: theme.textPrimary }]}>Astra AI</Text>
                <Text style={[styles.aiMenuItemSubtitle, { color: theme.textSecondary }]}>Dedicated chat workspace</Text>
              </View>
            </TouchableOpacity>
          )}

          {isOverlayRunning && (
            <TouchableOpacity
              style={[styles.aiMenuItem, styles.aiMenuStopItem, { borderTopColor: theme.border }]}
              onPress={onStopSystemOverlay}
              activeOpacity={0.7}
            >
              <View style={[styles.aiMenuIcon, { backgroundColor: `${theme.accentRed}25` }]}>
                <Ionicons name="close-circle" size={16} color={theme.accentRed} />
              </View>
              <View style={styles.aiMenuTextCol}>
                <Text style={[styles.aiMenuItemTitle, { color: theme.accentRed }]}>
                  Stop Floating Chat Head
                </Text>
                <Text style={[styles.aiMenuItemSubtitle, { color: theme.textMuted }]}>Remove system overlay</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Floating AI Assistant Button */}
      <TouchableOpacity
        style={[
          styles.floatingAiBtn,
          {
            backgroundColor: theme.bgSecondary,
            borderColor: theme.borderGlow || theme.accent,
          },
          isMidnight && {
            shadowColor: theme.accentCyan,
            shadowOpacity: 0.3,
            shadowRadius: 10,
          },
          isWorking && styles.floatingAiBtnRunning,
        ]}
        onPress={onToggleAiMenu}
        onLongPress={onLaunchSystemOverlay}
        activeOpacity={0.85}
      >
        <AstraLogo width={42} height={42} />
        {isWorking && (
          <View style={[styles.floatingBtnBadge, { borderColor: theme.bgSecondary }]}>
            <View style={styles.floatingBtnPulse} />
          </View>
        )}
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  floatingAiBtn: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#16171b",
    borderWidth: 1.5,
    borderColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    zIndex: 999,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  floatingAiBtnRunning: {
    borderColor: "#10b981",
    backgroundColor: "#0d2818",
  },
  floatingBtnBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10b981",
    borderWidth: 2,
    borderColor: "#16171b",
  },
  floatingBtnPulse: {
    flex: 1,
    borderRadius: 6,
    backgroundColor: "#34d399",
  },
  aiMenuPopup: {
    position: "absolute",
    bottom: 84,
    right: 16,
    width: 270,
    backgroundColor: "#181a20",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2d3342",
    padding: 12,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 16,
  },
  aiMenuHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 10,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#262b36",
  },
  aiMenuTitle: {
    color: "#f1f5f9",
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  activeTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#064e3b",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#34d399",
  },
  activeTagText: {
    color: "#a7f3d0",
    fontSize: 9,
    fontWeight: "600",
  },
  aiMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    gap: 10,
  },
  aiMenuStopItem: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#262b36",
    paddingTop: 10,
  },
  aiMenuIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  aiMenuTextCol: {
    flex: 1,
  },
  aiMenuItemTitle: {
    color: "#f8fafc",
    fontSize: 12.5,
    fontWeight: "600",
  },
  aiMenuItemSubtitle: {
    color: "#64748b",
    fontSize: 10,
    marginTop: 1,
  },
});
