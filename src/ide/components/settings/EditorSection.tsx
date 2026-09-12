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




  return (
    <View style={styles.container}>
      <Text style={[styles.sectionHeading, { color: theme.textMuted }]}>
        EXTENSIONS & MARKETPLACE
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
});
