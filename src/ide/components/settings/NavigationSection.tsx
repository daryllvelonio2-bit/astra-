import React from "react";
import { View, Text, StyleSheet, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabVisibility, ToggleableBottomTab } from "../../services/configService";
import { ThemeColors } from "../../../theme/themeContext";

interface TabRow {
  id: ToggleableBottomTab;
  title: string;
  description: string;
  icon: any;
}

const TAB_ROWS: TabRow[] = [
  { id: "browser", title: "Browser", description: "Web preview tab", icon: "globe-outline" },
  { id: "git", title: "Git", description: "Source control tab", icon: "git-branch-outline" },
  { id: "desktop", title: "Desktop", description: "Linux desktop tab", icon: "desktop-outline" },
];

interface NavigationSectionProps {
  visibility: BottomTabVisibility;
  onChange: (next: BottomTabVisibility) => void;
  showAiButton: boolean;
  onChangeAiButton: (visible: boolean) => void;
  theme: ThemeColors;
}

export function NavigationSection({ visibility, onChange, showAiButton, onChangeAiButton, theme }: NavigationSectionProps) {
  return (
    <View style={styles.container}>
      <Text style={[styles.heading, { color: theme.textMuted }]}>
        BOTTOM NAVIGATION
      </Text>
      <Text style={[styles.subheading, { color: theme.textMuted }]}>
        Editor and Terminal are always shown.
      </Text>
      {TAB_ROWS.map((row) => {
        const enabled = visibility[row.id];
        return (
          <View
            key={row.id}
            style={[styles.row, { backgroundColor: theme.bgPrimary, borderColor: theme.border }]}
          >
            <View style={[styles.iconBox, { backgroundColor: `${theme.accent}20` }]}>
              <Ionicons name={row.icon} size={16} color={theme.accent} />
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.title, { color: theme.textPrimary }]}>{row.title}</Text>
              <Text style={[styles.desc, { color: theme.textMuted }]}>{row.description}</Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={(v) => onChange({ ...visibility, [row.id]: v })}
              trackColor={{ false: theme.bgTertiary, true: theme.accent }}
              thumbColor={enabled ? theme.sendButtonIcon : theme.textMuted}
            />
          </View>
        );
      })}
      <Text style={[styles.heading, { color: theme.textMuted, marginTop: 8 }]}>
        FLOATING SHORTCUT
      </Text>
      <View style={[styles.row, { backgroundColor: theme.bgPrimary, borderColor: theme.border }]}>
        <View style={[styles.iconBox, { backgroundColor: `${theme.accent}20` }]}>
          <Ionicons name="sparkles-outline" size={16} color={theme.accent} />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>AI Assistant button</Text>
          <Text style={[styles.desc, { color: theme.textMuted }]}>Fullscreen chat + floating chathead shortcut</Text>
        </View>
        <Switch
          value={showAiButton}
          onValueChange={onChangeAiButton}
          trackColor={{ false: theme.bgTertiary, true: theme.accent }}
          thumbColor={showAiButton ? theme.sendButtonIcon : theme.textMuted}
        />
      </View>
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
