import React from "react";
import { View, Text, StyleSheet, Switch } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  BottomTabVisibility,
  ToggleableBottomTab,
  getEditorBottomTabsPreset,
  saveDefaultEditorUi,
  EditorUiType,
} from "../../services/configService";
import { ThemeColors } from "../../../theme/themeContext";

interface TabRow {
  id: ToggleableBottomTab;
  title: string;
  description: string;
  icon: any;
  isMaterial?: boolean;
}

const TAB_ROWS: TabRow[] = [
  { id: "editor", title: "Native Editor", description: "Built-in lightweight mobile code editor", icon: "code-slash-outline" },
  { id: "vscode", title: "VS Code", description: "Full VS Code web desktop editor", icon: "microsoft-visual-studio-code", isMaterial: true },
  { id: "terminal", title: "Terminal", description: "Shell + task output tab", icon: "terminal-outline" },
  { id: "browser", title: "Browser", description: "Web preview tab", icon: "globe-outline" },
  { id: "git", title: "Git", description: "Source control tab", icon: "git-branch-outline" },
  { id: "desktop", title: "Desktop", description: "Linux desktop tab", icon: "desktop-outline" },
];

interface NavigationSectionProps {
  visibility: BottomTabVisibility;
  onChange: (next: BottomTabVisibility) => void;
  astraEnabled: boolean;
  onChangeAstraEnabled: (enabled: boolean) => void;
  theme: ThemeColors;
}

export function NavigationSection({ visibility, onChange, astraEnabled, onChangeAstraEnabled, theme }: NavigationSectionProps) {
  const handleToggleTab = (tabId: ToggleableBottomTab, value: boolean) => {
    if (tabId === "editor") {
      const nextEditor: EditorUiType = value ? "native" : "vscode";
      const nextTabs = getEditorBottomTabsPreset(nextEditor, visibility);
      onChange(nextTabs);
      saveDefaultEditorUi(nextEditor).catch(() => {});
      return;
    }
    if (tabId === "vscode") {
      const nextEditor: EditorUiType = value ? "vscode" : "native";
      const nextTabs = getEditorBottomTabsPreset(nextEditor, visibility);
      onChange(nextTabs);
      saveDefaultEditorUi(nextEditor).catch(() => {});
      return;
    }
    onChange({ ...visibility, [tabId]: value });
  };

  const getTabDescription = (row: TabRow, enabled: boolean) => {
    if (row.id === "editor") {
      return enabled
        ? "Active code editor (VS Code disabled)"
        : "Disabled (tap to switch to Native Editor)";
    }
    if (row.id === "vscode") {
      return enabled
        ? "Active code editor (Native editor disabled)"
        : "Disabled (tap to switch to VS Code)";
    }
    return row.description;
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.heading, { color: theme.textMuted }]}>
        ASTRA AI
      </Text>
      <View style={[styles.row, { backgroundColor: theme.bgPrimary, borderColor: theme.border }]}>
        <View style={[styles.iconBox, { backgroundColor: `${theme.accent}20` }]}>
          <Ionicons name="sparkles-outline" size={16} color={theme.accent} />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Astra AI assistant</Text>
          <Text style={[styles.desc, { color: theme.textMuted }]}>Chat, floating button + chathead. Off hides every AI surface.</Text>
        </View>
        <Switch
          value={astraEnabled}
          onValueChange={onChangeAstraEnabled}
          trackColor={{ false: theme.bgTertiary, true: theme.accent }}
          thumbColor={astraEnabled ? theme.sendButtonIcon : theme.textMuted}
        />
      </View>
      <Text style={[styles.heading, { color: theme.textMuted }]}>
        BOTTOM NAVIGATION
      </Text>
      <Text style={[styles.subheading, { color: theme.textMuted }]}>
        Native Editor &amp; VS Code are mutually exclusive.
      </Text>
      {TAB_ROWS.map((row) => {
        const enabled = visibility[row.id];
        const isLastOn = enabled && TAB_ROWS.filter((r) => visibility[r.id]).length <= 1;
        return (
          <View
            key={row.id}
            style={[styles.row, { backgroundColor: theme.bgPrimary, borderColor: theme.border }]}
          >
            <View style={[styles.iconBox, { backgroundColor: `${theme.accent}20` }]}>
              {row.isMaterial ? (
                <MaterialCommunityIcons name={row.icon} size={16} color={theme.accent} />
              ) : (
                <Ionicons name={row.icon} size={16} color={theme.accent} />
              )}
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.title, { color: theme.textPrimary }]}>{row.title}</Text>
              <Text style={[styles.desc, { color: theme.textMuted }]}>
                {getTabDescription(row, enabled)}
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={(v) => handleToggleTab(row.id, v)}
              disabled={isLastOn}
              trackColor={{ false: theme.bgTertiary, true: theme.accent }}
              thumbColor={enabled ? theme.sendButtonIcon : theme.textMuted}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, paddingBottom: 24 },
  heading: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  subheading: { fontSize: 11, marginTop: -4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  iconBox: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  textWrap: { flex: 1, gap: 1 },
  title: { fontSize: 13, fontWeight: "700" },
  desc: { fontSize: 11 },
});
