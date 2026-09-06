import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { EditorUiType } from "../../ide/services/configService";
import { ThemeColors } from "../../theme/themeContext";

interface EditorUiOption {
  id: EditorUiType;
  title: string;
  subtitle: string;
  badge: string;
  description: string;
  features: string[];
}

const EDITOR_OPTIONS: EditorUiOption[] = [
  {
    id: "native",
    title: "Native Code Editor",
    subtitle: "Recommended for mobile",
    badge: "Lightweight",
    description: "Built-in mobile editor designed specifically for instant file opening, minimal battery drain, and fast touch navigation.",
    features: [
      "Native Editor, Terminal, Browser & Git enabled",
      "VS Code disabled for optimal performance",
      "Instant startup & zero lag",
    ],
  },
  {
    id: "vscode",
    title: "Visual Studio Code",
    subtitle: "Desktop powerhouse",
    badge: "Extensions",
    description: "Full web-based code-server environment with access to extensions, themes, and full desktop editor capabilities.",
    features: [
      "VS Code, Terminal, Browser & Git enabled",
      "Native Editor disabled",
      "VS Code extension marketplace & tooling",
    ],
  },
];

interface EditorUiStepProps {
  selectedEditor: EditorUiType;
  onSelectEditor: (editor: EditorUiType) => void;
  theme: ThemeColors;
  isLandscape?: boolean;
}

export function EditorUiStep({
  selectedEditor,
  onSelectEditor,
  theme,
  isLandscape = false,
}: EditorUiStepProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerWrap}>
        <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>
          Select Your Editor Experience
        </Text>
        <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
          Choose your primary code editor. Selecting one enables its workspace tabs and disables the other.
        </Text>
      </View>

      <View style={[styles.cardsWrap, isLandscape && styles.cardsWrapLandscape]}>
        {EDITOR_OPTIONS.map((opt) => {
          const isSelected = selectedEditor === opt.id;
          const accentColor = theme.accent;

          return (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.card,
                isLandscape && styles.cardLandscape,
                {
                  backgroundColor: theme.bgSecondary,
                  borderColor: isSelected ? accentColor : theme.border,
                },
                isSelected && {
                  borderWidth: 2,
                  backgroundColor: `${accentColor}0D`,
                },
              ]}
              onPress={() => onSelectEditor(opt.id)}
              activeOpacity={0.75}
            >
              <View style={styles.cardTopRow}>
                <View style={[styles.iconWrap, { backgroundColor: `${accentColor}20` }]}>
                  {opt.id === "vscode" ? (
                    <MaterialCommunityIcons name="microsoft-visual-studio-code" size={20} color={accentColor} />
                  ) : (
                    <Ionicons name="code-slash" size={20} color={accentColor} />
                  )}
                </View>
                <View style={styles.titleCol}>
                  <View style={styles.badgeRow}>
                    <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                      {opt.title}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: `${accentColor}18` }]}>
                      <Text style={[styles.badgeText, { color: accentColor }]}>
                        {opt.badge}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
                    {opt.subtitle}
                  </Text>
                </View>
                <View style={styles.selectionIndicator}>
                  <Ionicons
                    name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                    size={22}
                    color={isSelected ? accentColor : theme.textMuted}
                  />
                </View>
              </View>

              <Text
                style={[styles.cardDesc, isLandscape && styles.cardDescLandscape, { color: theme.textSecondary }]}
                numberOfLines={isLandscape ? 2 : 3}
              >
                {opt.description}
              </Text>

              {/* Feature Checklist */}
              <View style={styles.featuresList}>
                {opt.features.map((feat, idx) => (
                  <View key={idx} style={styles.featureRow}>
                    <Ionicons name="checkmark" size={14} color={theme.accentGreen} style={styles.featureCheck} />
                    <Text
                      style={[styles.featureText, isLandscape && styles.featureTextLandscape, { color: theme.textSecondary }]}
                      numberOfLines={1}
                    >
                      {feat}
                    </Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
  },
  headerWrap: {
    gap: 4,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  stepSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardsWrap: {
    gap: 12,
  },
  cardsWrapLandscape: {
    flexDirection: "row",
    gap: 10,
  },
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  cardLandscape: {
    flex: 1,
    padding: 10,
    gap: 6,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  titleCol: {
    flex: 1,
    gap: 1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  cardSubtitle: {
    fontSize: 11,
  },
  selectionIndicator: {
    paddingLeft: 4,
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  cardDescLandscape: {
    fontSize: 11,
    lineHeight: 14,
  },
  featuresList: {
    gap: 4,
    marginTop: 2,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  featureCheck: {
    marginTop: 1,
  },
  featureText: {
    fontSize: 11.5,
  },
  featureTextLandscape: {
    fontSize: 10.5,
  },
});
