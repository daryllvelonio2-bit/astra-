import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeColors } from "../../theme/themeContext";

interface AstraAiStepProps {
  astraEnabled: boolean;
  onSelectAstra: (enabled: boolean) => void;
  theme: ThemeColors;
  isLandscape?: boolean;
}

const OPTIONS = [
  {
    enabled: true,
    title: "Astra AI On",
    subtitle: "Full AI coding assistant",
    badge: "Recommended",
    description: "Floating assistant button, fullscreen chat workspace, and Messenger-style chathead over other apps.",
    features: ["Floating AI button in editor", "Fullscreen Astra chat", "Float-over-apps chathead"],
  },
  {
    enabled: false,
    title: "Astra AI Off",
    subtitle: "Distraction-free coding",
    badge: "Minimal",
    description: "Hides every AI surface. Pure editor, terminal, and tools — no AI buttons, chat, or overlays.",
    features: ["No AI buttons or popups", "Zero background AI usage", "Re-enable anytime in Settings"],
  },
] as const;

export function AstraAiStep({
  astraEnabled,
  onSelectAstra,
  theme,
  isLandscape = false,
}: AstraAiStepProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerWrap}>
        <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>
          Enable Astra AI?
        </Text>
        <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
          Turn the AI assistant on or off. You can change this anytime in Settings.
        </Text>
      </View>

      <View style={[styles.cardsWrap, isLandscape && styles.cardsWrapLandscape]}>
        {OPTIONS.map((opt) => {
          const isSelected = astraEnabled === opt.enabled;
          const accentColor = theme.accent;

          return (
            <TouchableOpacity
              key={opt.title}
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
              onPress={() => onSelectAstra(opt.enabled)}
              activeOpacity={0.75}
            >
              <View style={styles.cardTopRow}>
                <View style={[styles.iconWrap, { backgroundColor: `${accentColor}20` }]}>
                  <Ionicons
                    name={opt.enabled ? "sparkles" : "leaf-outline"}
                    size={20}
                    color={accentColor}
                  />
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
