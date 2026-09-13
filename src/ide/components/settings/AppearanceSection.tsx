import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppTheme } from "../../services/configService";
import { ThemeColors, THEMES } from "../../../theme/themeContext";
import {
  getInstalledThemes,
  getInstalledIconThemes,
  setActiveIconTheme,
  loadExtensionRegistry,
  subscribeExtensionRegistry,
} from "../../services/extensions/extensionRegistry";

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
  onRerunStartup?: () => void;
}

export function AppearanceSection({ activeTheme, onSelectTheme, theme, onRerunStartup }: AppearanceSectionProps) {
  const [extensionThemes, setExtensionThemes] = useState<Array<{ id: string; label: string }>>([]);
  const [iconThemes, setIconThemes] = useState<Array<{ id: string; label: string }>>([]);
  const [activeIconThemeId, setActiveIconThemeId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const loadExtThemes = async () => {
      try {
        const list = await getInstalledThemes();
        setExtensionThemes(list.map((t) => ({ id: t.id, label: t.label })));
        const reg = await loadExtensionRegistry();
        setActiveIconThemeId(reg.activeIconThemeId);
        const icons = await getInstalledIconThemes();
        setIconThemes(icons.map((it) => ({ id: it.id, label: it.label })));
      } catch {}
    };

    loadExtThemes();
    const unsub = subscribeExtensionRegistry(() => {
      loadExtThemes();
    });
    return () => {
      unsub();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionHeading, { color: theme.textMuted }]}>THEME PALETTE</Text>
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

      {extensionThemes.length > 0 && (
        <View style={styles.extThemesWrap}>
          <Text style={[styles.sectionHeading, { color: theme.textMuted, marginTop: 8 }]}>
            INSTALLED EXTENSION THEMES
          </Text>
          {extensionThemes.map((ext) => {
            const isSelected = activeTheme === ext.id;
            return (
              <TouchableOpacity
                key={ext.id}
                style={[
                  styles.themeCard,
                  { backgroundColor: theme.bgPrimary, borderColor: isSelected ? theme.accent : theme.border },
                  isSelected && { borderWidth: 1.5 },
                ]}
                onPress={() => onSelectTheme(ext.id)}
                activeOpacity={0.7}
              >
                <View style={styles.themeCardHeader}>
                  <View style={styles.themeIconRow}>
                    <View style={[styles.themeIconBox, { backgroundColor: `${theme.accent}20` }]}>
                      <Ionicons name="color-palette" size={15} color={theme.accent} />
                    </View>
                    <Text style={[styles.themeTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                      {ext.label}
                    </Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={16} color={theme.accent} />}
                </View>
                <Text style={[styles.themeDesc, { color: theme.textMuted }]}>
                  {isSelected ? "Active extension theme" : "Tap to apply theme"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={{ marginTop: 8, gap: 8 }}>
        <Text style={[styles.sectionHeading, { color: theme.textMuted }]}>FILE ICON THEME</Text>
        <TouchableOpacity
          style={[
            styles.themeCard,
            { backgroundColor: theme.bgPrimary, borderColor: !activeIconThemeId ? theme.accent : theme.border },
            !activeIconThemeId && { borderWidth: 1.5 },
          ]}
          onPress={async () => {
            await setActiveIconTheme(undefined);
            setActiveIconThemeId(undefined);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.themeCardHeader}>
            <View style={styles.themeIconRow}>
              <View style={[styles.themeIconBox, { backgroundColor: `${theme.accent}20` }]}>
                <Ionicons name="images" size={15} color={theme.accent} />
              </View>
              <Text style={[styles.themeTitle, { color: theme.textPrimary }]}>Default (Native Language Icons)</Text>
            </View>
            {!activeIconThemeId && <Ionicons name="checkmark-circle" size={16} color={theme.accent} />}
          </View>
          <Text style={[styles.themeDesc, { color: theme.textMuted }]}>
            High-performance native vector icons for all programming languages
          </Text>
        </TouchableOpacity>

        {iconThemes.map((it) => {
          const isSelected = activeIconThemeId === it.id;
          return (
            <TouchableOpacity
              key={it.id}
              style={[
                styles.themeCard,
                { backgroundColor: theme.bgPrimary, borderColor: isSelected ? theme.accent : theme.border },
                isSelected && { borderWidth: 1.5 },
              ]}
              onPress={async () => {
                await setActiveIconTheme(it.id);
                setActiveIconThemeId(it.id);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.themeCardHeader}>
                <View style={styles.themeIconRow}>
                  <View style={[styles.themeIconBox, { backgroundColor: `${theme.accent}20` }]}>
                    <Ionicons name="sparkles" size={15} color={theme.accent} />
                  </View>
                  <Text style={[styles.themeTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                    {it.label}
                  </Text>
                </View>
                {isSelected && <Ionicons name="checkmark-circle" size={16} color={theme.accent} />}
              </View>
              <Text style={[styles.themeDesc, { color: theme.textMuted }]}>
                {isSelected ? "Active marketplace icon theme" : "Tap to activate marketplace icon theme"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {onRerunStartup && (
        <View style={styles.startupWrap}>
          <Text style={[styles.sectionHeading, { color: theme.textMuted }]}>ONBOARDING & SETUP</Text>
          <TouchableOpacity
            style={[styles.rerunCard, { backgroundColor: theme.bgPrimary, borderColor: theme.border }]}
            onPress={onRerunStartup}
            activeOpacity={0.7}
          >
            <View style={[styles.rerunIconBox, { backgroundColor: `${theme.accent}20` }]}>
              <Ionicons name="sparkles" size={16} color={theme.accent} />
            </View>
            <View style={styles.rerunTextCol}>
              <Text style={[styles.rerunTitle, { color: theme.textPrimary }]}>
                Re-run Setup Wizard
              </Text>
              <Text style={[styles.rerunDesc, { color: theme.textMuted }]}>
                Reconfigure theme, default editor, and GitHub integration.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, paddingBottom: 24 },
  sectionHeading: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, marginTop: 4, marginBottom: 2 },
  themeCard: { padding: 10, borderRadius: 10, borderWidth: 1, gap: 4 },
  themeCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  themeIconRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  themeIconBox: { width: 26, height: 26, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  themeTitle: { fontSize: 13, fontWeight: "700" },
  themeDesc: { fontSize: 11, marginLeft: 34 },
  extThemesWrap: { gap: 8 },
  startupWrap: { marginTop: 12, gap: 6 },
  rerunCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  rerunIconBox: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  rerunTextCol: { flex: 1, gap: 2 },
  rerunTitle: { fontSize: 13, fontWeight: "700" },
  rerunDesc: { fontSize: 11 },
});
