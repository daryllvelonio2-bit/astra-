import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Switch, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeColors } from "../../../theme/themeContext";
import { EditorSettings } from "../../services/configService";
import { ExtensionMarketplaceModal } from "../extensions/ExtensionMarketplaceModal";
import { getActiveFormatters } from "../../services/formatService";
import { InstalledExtension } from "../../services/extensions/types";

interface EditorSectionProps {
  keyboardMouseMode: boolean;
  onChangeKeyboardMouseMode: (enabled: boolean) => void;
  editorSettings: EditorSettings;
  onChangeEditorSettings: (settings: EditorSettings) => void;
  theme: ThemeColors;
}

export function EditorSection({
  keyboardMouseMode,
  onChangeKeyboardMouseMode,
  editorSettings,
  onChangeEditorSettings,
  theme,
}: EditorSectionProps) {
  const [showExtensionsModal, setShowExtensionsModal] = useState(false);
  const [formatters, setFormatters] = useState<InstalledExtension[]>([]);

  useEffect(() => {
    getActiveFormatters().then(setFormatters);
  }, [showExtensionsModal]);

  const hasFormatters = formatters.length > 0;
  const formatterNames = hasFormatters
    ? formatters.map((f) => f.displayName).join(", ")
    : "Built-in intelligent formatter";

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionHeading, { color: theme.textMuted }]}>
        EXTENSIONS & CODE FORMATTING
      </Text>

      {/* VS Code Extensions Marketplace */}
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: `${theme.accent}08`,
            borderColor: `${theme.accent}50`,
            borderWidth: 1.5,
          },
        ]}
        onPress={() => setShowExtensionsModal(true)}
        activeOpacity={0.7}
      >
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: `${theme.accent}25` }]}>
            <Ionicons name="cube-outline" size={18} color={theme.accent} />
          </View>
          <View style={styles.textCol}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: theme.textPrimary }]}>Extensions & Themes</Text>
              <View style={[styles.activeBadge, { backgroundColor: `${theme.accent}20` }]}>
                <Text style={[styles.activeBadgeText, { color: theme.accent }]}>Marketplace</Text>
              </View>
            </View>
            <Text style={[styles.description, { color: theme.textMuted }]}>
              Install themes, formatters (Prettier, Black, Clang-Format), and snippets from Open VSX.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.accent} />
        </View>
      </TouchableOpacity>

      {/* Formatter Status Card */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.bgPrimary,
            borderColor: hasFormatters ? theme.accentGreen : theme.border,
            borderWidth: hasFormatters ? 1.5 : 1,
          },
        ]}
      >
        <View style={styles.row}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: hasFormatters ? `${theme.accentGreen}20` : `${theme.accent}15` },
            ]}
          >
            <Ionicons
              name="sparkles"
              size={18}
              color={hasFormatters ? theme.accentGreen : theme.accent}
            />
          </View>
          <View style={styles.textCol}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: theme.textPrimary }]}>Code Formatter</Text>
              <View
                style={[
                  styles.activeBadge,
                  { backgroundColor: hasFormatters ? `${theme.accentGreen}20` : `${theme.accent}20` },
                ]}
              >
                <Text
                  style={[
                    styles.activeBadgeText,
                    { color: hasFormatters ? theme.accentGreen : theme.accent },
                  ]}
                >
                  {hasFormatters ? "Active" : "Default"}
                </Text>
              </View>
            </View>
            <Text style={[styles.description, { color: theme.textMuted }]}>
              {formatterNames}
            </Text>
          </View>
          {!hasFormatters && (
            <TouchableOpacity
              onPress={() => setShowExtensionsModal(true)}
              style={[styles.smallBtn, { backgroundColor: `${theme.accent}20` }]}
            >
              <Text style={[styles.smallBtnText, { color: theme.accent }]}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Format on Save Toggle */}
      <View style={[styles.card, { backgroundColor: theme.bgPrimary, borderColor: theme.border }]}>
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: `${theme.accent}15` }]}>
            <Ionicons name="save-outline" size={18} color={theme.accent} />
          </View>
          <View style={styles.textCol}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Format on Save</Text>
            <Text style={[styles.description, { color: theme.textMuted }]}>
              Automatically format code with active formatters when exiting edit mode.
            </Text>
          </View>
          <Switch
            value={editorSettings.formatOnSave !== false}
            onValueChange={(val) => onChangeEditorSettings({ ...editorSettings, formatOnSave: val })}
            trackColor={{ false: theme.border, true: `${theme.accentGreen}80` }}
            thumbColor={editorSettings.formatOnSave !== false ? theme.accentGreen : theme.textMuted}
          />
        </View>
      </View>

      {/* Tab Indentation Size */}
      <View style={[styles.card, { backgroundColor: theme.bgPrimary, borderColor: theme.border }]}>
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: `${theme.accent}15` }]}>
            <Ionicons name="code-working-outline" size={18} color={theme.accent} />
          </View>
          <View style={styles.textCol}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Tab Indent Size</Text>
            <Text style={[styles.description, { color: theme.textMuted }]}>
              Spaces used for tab indent and formatting: {editorSettings.tabSize || 2} spaces
            </Text>
          </View>
          <View style={styles.tabToggleRow}>
            <TouchableOpacity
              style={[
                styles.tabToggleBtn,
                { borderColor: theme.border },
                (editorSettings.tabSize || 2) === 2 && { backgroundColor: theme.accent, borderColor: theme.accent },
              ]}
              onPress={() => onChangeEditorSettings({ ...editorSettings, tabSize: 2 })}
            >
              <Text style={[styles.tabToggleText, { color: (editorSettings.tabSize || 2) === 2 ? "#fff" : theme.textMuted }]}>2</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabToggleBtn,
                { borderColor: theme.border },
                editorSettings.tabSize === 4 && { backgroundColor: theme.accent, borderColor: theme.accent },
              ]}
              onPress={() => onChangeEditorSettings({ ...editorSettings, tabSize: 4 })}
            >
              <Text style={[styles.tabToggleText, { color: editorSettings.tabSize === 4 ? "#fff" : theme.textMuted }]}>4</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Indent Guides Toggle */}
      <View style={[styles.card, { backgroundColor: theme.bgPrimary, borderColor: theme.border }]}>
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: `${theme.accent}15` }]}>
            <Ionicons name="reorder-four-outline" size={18} color={theme.accent} />
          </View>
          <View style={styles.textCol}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Indent Guides</Text>
            <Text style={[styles.description, { color: theme.textMuted }]}>
              Show vertical nesting guidelines in code blocks.
            </Text>
          </View>
          <Switch
            value={editorSettings.showIndentGuides !== false}
            onValueChange={(val) => onChangeEditorSettings({ ...editorSettings, showIndentGuides: val })}
            trackColor={{ false: theme.border, true: `${theme.accentGreen}80` }}
            thumbColor={editorSettings.showIndentGuides !== false ? theme.accentGreen : theme.textMuted}
          />
        </View>
      </View>

      <Text style={[styles.sectionHeading, { color: theme.textMuted, marginTop: 12 }]}>
        HARDWARE INPUT & PERIPHERALS
      </Text>

      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.bgPrimary,
            borderColor: keyboardMouseMode ? theme.accentGreen : theme.border,
            borderWidth: keyboardMouseMode ? 1.5 : 1,
          },
        ]}
      >
        <View style={styles.row}>
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: keyboardMouseMode
                  ? `${theme.accentGreen}20`
                  : `${theme.accent}15`,
              },
            ]}
          >
            <Ionicons
              name="hardware-chip-outline"
              size={18}
              color={keyboardMouseMode ? theme.accentGreen : theme.accent}
            />
          </View>
          <View style={styles.textCol}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: theme.textPrimary }]}>
                Keyboard & Mouse Mode
              </Text>
              {keyboardMouseMode && (
                <View
                  style={[
                    styles.activeBadge,
                    { backgroundColor: `${theme.accentGreen}20` },
                  ]}
                >
                  <Text style={[styles.activeBadgeText, { color: theme.accentGreen }]}>
                    Active
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.description, { color: theme.textMuted }]}>
              Disables the virtual on-screen keyboard from ever popping up. Recommended when using an external USB or Bluetooth physical keyboard and mouse.
            </Text>
          </View>
          <Switch
            value={keyboardMouseMode}
            onValueChange={onChangeKeyboardMouseMode}
            trackColor={{ false: theme.border, true: `${theme.accentGreen}80` }}
            thumbColor={keyboardMouseMode ? theme.accentGreen : theme.textMuted}
          />
        </View>
      </View>

      <ExtensionMarketplaceModal
        visible={showExtensionsModal}
        onClose={() => setShowExtensionsModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    paddingBottom: 24,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginTop: 4,
    marginBottom: 2,
  },
  card: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
  },
  description: {
    fontSize: 11,
    lineHeight: 15,
  },
  activeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  smallBtnText: {
    fontSize: 11,
    fontWeight: "600",
  },
  tabToggleRow: {
    flexDirection: "row",
    gap: 4,
  },
  tabToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  tabToggleText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
