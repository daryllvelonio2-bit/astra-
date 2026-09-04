import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppTheme } from "../../services/configService";
import { ThemeColors, THEMES } from "../../../theme/themeContext";

interface ThemeOption {
  id: AppTheme;
  title: string;
  description: string;
  icon: any;
}

const THEME_OPTIONS: ThemeOption[] = (Object.keys(THEMES) as AppTheme[]).map((id) => ({
  id,
  title: THEMES[id].name,
  description:
    id === "dark"
      ? "Classic Obsidian & Charcoal Dark"
      : id === "light"
        ? "Crisp Slate & Porcelain Light"
        : "Deep Cosmic Slate with Radiant Cyan & Purple",
  icon: id === "dark" ? "moon" : id === "light" ? "sunny" : "planet",
}));

interface AppearanceSectionProps {
  activeTheme: AppTheme;
  onSelectTheme: (theme: AppTheme) => void;
  theme: ThemeColors;
}

export function AppearanceSection({ activeTheme, onSelectTheme, theme }: AppearanceSectionProps) {
  return (
    <View style={styles.container}>
      {THEME_OPTIONS.map((t) => {
        const isSelected = activeTheme === t.id;
        const accentColor = THEMES[t.id].accent;
        return (
          <TouchableOpacity
            key={t.id}
            style={[
              styles.themeCard,
              { backgroundColor: theme.bgPrimary, borderColor: isSelected ? accentColor : theme.border },
              isSelected && { borderWidth: 1.5 },
            ]}
            onPress={() => onSelectTheme(t.id)}
            activeOpacity={0.7}
          >
            <View style={styles.themeCardHeader}>
              <View style={styles.themeIconRow}>
                <View style={[styles.themeIconBox, { backgroundColor: `${accentColor}20` }]}>
                  <Ionicons name={t.icon} size={15} color={accentColor} />
                </View>
                <Text style={[styles.themeTitle, { color: theme.textPrimary }]}>{t.title}</Text>
              </View>
              {isSelected && <Ionicons name="checkmark-circle" size={16} color={accentColor} />}
            </View>
            <Text style={[styles.themeDesc, { color: theme.textMuted }]}>{t.description}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  themeCard: { padding: 10, borderRadius: 10, borderWidth: 1, gap: 4 },
  themeCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  themeIconRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  themeIconBox: { width: 26, height: 26, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  themeTitle: { fontSize: 13, fontWeight: "700" },
  themeDesc: { fontSize: 11, marginLeft: 34 },
});
