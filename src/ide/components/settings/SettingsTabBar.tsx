import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeColors } from "../../../theme/themeContext";

export type SettingsTabId = "appearance" | "keys" | "model" | "environment";

interface SettingsTab {
  id: SettingsTabId;
  title: string;
  icon: any;
}

const TABS: SettingsTab[] = [
  { id: "appearance", title: "Theme", icon: "color-palette-outline" },
  { id: "keys", title: "Keys", icon: "key-outline" },
  { id: "model", title: "Model", icon: "sparkles-outline" },
  { id: "environment", title: "Linux", icon: "cube-outline" },
];

interface SettingsTabBarProps {
  activeTab: SettingsTabId;
  onSelectTab: (tab: SettingsTabId) => void;
  keyCount: number;
  theme: ThemeColors;
}

export function SettingsTabBar({ activeTab, onSelectTab, keyCount, theme }: SettingsTabBarProps) {
  return (
    <View style={[styles.tabBar, { backgroundColor: theme.bgPrimary, borderColor: theme.border }]}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const color = isActive ? theme.accent : theme.textMuted;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              { borderBottomColor: isActive ? theme.accent : "transparent" },
            ]}
            onPress={() => onSelectTab(tab.id)}
            activeOpacity={0.7}
          >
            <Ionicons name={tab.icon} size={17} color={color} />
            <Text style={[styles.tabText, { color }]}>
              {tab.title}
            </Text>
            {tab.id === "keys" && keyCount > 0 && (
              <View style={[styles.countBadge, { backgroundColor: `${theme.accent}25` }]}>
                <Text style={[styles.countText, { color: theme.accent }]}>{keyCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 9,
    paddingHorizontal: 1,
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 11,
    fontWeight: "600",
  },
  countBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  countText: {
    fontSize: 10,
    fontWeight: "700",
  },
});
