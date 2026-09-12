import React, { useState } from "react";
import { View, Text, StyleSheet, Switch, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeColors } from "../../../theme/themeContext";
import { EditorSettings } from "../../services/configService";
import { ExtensionMarketplaceModal } from "../extensions/ExtensionMarketplaceModal";

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


  const handleUpdate = <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
    onChangeEditorSettings({
      ...editorSettings,
      [key]: value,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionHeading, { color: theme.textMuted }]}>
        EDITOR BEHAVIOR & FORMATTING
      </Text>

      {/* Tab Size Selection */}
      <View style={[styles.card, { backgroundColor: theme.bgPrimary, borderColor: theme.border }]}>
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: `${theme.accent}15` }]}>
            <Ionicons name="reorder-two-outline" size={18} color={theme.accent} />
          </View>
          <View style={styles.textCol}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Tab Size</Text>
            <Text style={[styles.description, { color: theme.textMuted }]}>
              Spaces inserted on Tab or Enter auto-indent
            </Text>
          </View>
          <View style={styles.tabSizeGroup}>
            {([2, 4] as const).map((size) => {
              const active = editorSettings.tabSize === size;
              return (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.tabSizeBtn,
                    {
                      backgroundColor: active ? `${theme.accent}20` : theme.bgSecondary,
                      borderColor: active ? theme.accent : theme.border,
                    },
                  ]}
                  onPress={() => handleUpdate("tabSize", size)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.tabSizeBtnText,
                      { color: active ? theme.accent : theme.textMuted },
                    ]}
                  >
                    {size} sp
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Auto-Close Brackets */}
      <View style={[styles.card, { backgroundColor: theme.bgPrimary, borderColor: theme.border }]}>
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: `${theme.accent}15` }]}>
            <Ionicons name="shapes-outline" size={18} color={theme.accent} />
          </View>
          <View style={styles.textCol}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Auto-Close Brackets</Text>
            <Text style={[styles.description, { color: theme.textMuted }]}>
              Automatically insert closing brackets: (), [], {"{}"}
            </Text>
          </View>
          <Switch
            value={editorSettings.autoCloseBrackets}
            onValueChange={(val) => handleUpdate("autoCloseBrackets", val)}
            trackColor={{ false: theme.border, true: `${theme.accent}80` }}
            thumbColor={editorSettings.autoCloseBrackets ? theme.accent : theme.textMuted}
          />
        </View>
      </View>

      {/* Auto-Close Quotes */}
      <View style={[styles.card, { backgroundColor: theme.bgPrimary, borderColor: theme.border }]}>
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: `${theme.accent}15` }]}>
            <Ionicons name="chatbox-outline" size={18} color={theme.accent} />
          </View>
          <View style={styles.textCol}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Auto-Close Quotes</Text>
            <Text style={[styles.description, { color: theme.textMuted }]}>
              Automatically insert matching quotes: &apos;&apos;, &quot;&quot;, ``
            </Text>
          </View>
          <Switch
            value={editorSettings.autoCloseQuotes}
            onValueChange={(val) => handleUpdate("autoCloseQuotes", val)}
            trackColor={{ false: theme.border, true: `${theme.accent}80` }}
            thumbColor={editorSettings.autoCloseQuotes ? theme.accent : theme.textMuted}
          />
        </View>
      </View>

      {/* Smart Indent on Enter */}
      <View style={[styles.card, { backgroundColor: theme.bgPrimary, borderColor: theme.border }]}>
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: `${theme.accent}15` }]}>
            <Ionicons name="return-down-forward-outline" size={18} color={theme.accent} />
          </View>
          <View style={styles.textCol}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Smart Indent on Enter</Text>
            <Text style={[styles.description, { color: theme.textMuted }]}>
              Align indentation and expand open brackets and colons
            </Text>
          </View>
          <Switch
            value={editorSettings.autoIndentOnEnter}
            onValueChange={(val) => handleUpdate("autoIndentOnEnter", val)}
            trackColor={{ false: theme.border, true: `${theme.accent}80` }}
            thumbColor={editorSettings.autoIndentOnEnter ? theme.accent : theme.textMuted}
          />
        </View>
      </View>

      {/* Format on Save */}
      <View style={[styles.card, { backgroundColor: theme.bgPrimary, borderColor: theme.border }]}>
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: `${theme.accentGold}18` }]}>
            <Ionicons name="sparkles-outline" size={18} color={theme.accentGold} />
          </View>
          <View style={styles.textCol}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Format on Save</Text>
            <Text style={[styles.description, { color: theme.textMuted }]}>
              Automatically beautify and format code when done editing
            </Text>
          </View>
          <Switch
            value={editorSettings.formatOnSave}
            onValueChange={(val) => handleUpdate("formatOnSave", val)}
            trackColor={{ false: theme.border, true: `${theme.accentGold}80` }}
            thumbColor={editorSettings.formatOnSave ? theme.accentGold : theme.textMuted}
          />
        </View>
      </View>

      {/* Code Completion (IntelliSense) */}
      <View style={[styles.card, { backgroundColor: theme.bgPrimary, borderColor: theme.border }]}>
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: `${theme.accent}15` }]}>
            <Ionicons name="flash-outline" size={18} color={theme.accent} />
          </View>
          <View style={styles.textCol}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Code Completion (IntelliSense)</Text>
            <Text style={[styles.description, { color: theme.textMuted }]}>
              Display mobile suggestion bar for symbols, keywords, and functions
            </Text>
          </View>
          <Switch
            value={editorSettings.enableCompletions !== false}
            onValueChange={(val) => handleUpdate("enableCompletions", val)}
            trackColor={{ false: theme.border, true: `${theme.accent}80` }}
            thumbColor={editorSettings.enableCompletions !== false ? theme.accent : theme.textMuted}
          />
        </View>
      </View>

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
              <Text style={[styles.title, { color: theme.textPrimary }]}>VS Code Extensions</Text>
              <View style={[styles.activeBadge, { backgroundColor: `${theme.accent}20` }]}>
                <Text style={[styles.activeBadgeText, { color: theme.accent }]}>Marketplace</Text>
              </View>
            </View>
            <Text style={[styles.description, { color: theme.textMuted }]}>
              Install real themes, snippets, and grammars directly from Open VSX without VS Code Web.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.accent} />
        </View>
      </TouchableOpacity>
 
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
  tabSizeGroup: {
    flexDirection: "row",
    gap: 6,
  },
  tabSizeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 46,
    alignItems: "center",
  },
  tabSizeBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
});
