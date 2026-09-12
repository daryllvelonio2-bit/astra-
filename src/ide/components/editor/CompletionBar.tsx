import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { CompletionItem } from "../../services/completionService";
import { ThemeColors } from "../../../theme/themeContext";

interface CompletionBarProps {
  items: CompletionItem[];
  onSelect: (item: CompletionItem) => void;
  theme: ThemeColors;
}

type AccentColorKey = "accent" | "accentGreen" | "accentGold" | "accentRed";

function getBadgeSymbol(kind: CompletionItem["kind"]): { letter: string; colorKey: AccentColorKey } {
  switch (kind) {
    case "function":
      return { letter: "ƒ", colorKey: "accent" };
    case "class":
      return { letter: "C", colorKey: "accentGreen" };
    case "type":
      return { letter: "T", colorKey: "accentGold" };
    case "module":
      return { letter: "m", colorKey: "accent" };
    case "keyword":
      return { letter: "k", colorKey: "accentRed" };
    case "snippet":
      return { letter: "⎘", colorKey: "accentGold" };
    case "variable":
    default:
      return { letter: "v", colorKey: "accentGreen" };
  }
}

export function CompletionBar({ items, onSelect, theme }: CompletionBarProps) {
  if (!items || items.length === 0) return null;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.bgSecondary, borderTopColor: theme.border },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((item, idx) => {
          const badge = getBadgeSymbol(item.kind);
          const badgeColor = theme[badge.colorKey] || theme.accent;

          return (
            <TouchableOpacity
              key={`${item.label}-${idx}`}
              style={[
                styles.itemBtn,
                { backgroundColor: theme.bgTertiary, borderColor: theme.border },
              ]}
              onPress={() => onSelect(item)}
              activeOpacity={0.6}
            >
              <View style={[styles.badge, { backgroundColor: `${badgeColor}20` }]}>
                <Text style={[styles.badgeLetter, { color: badgeColor }]}>{badge.letter}</Text>
              </View>
              <Text style={[styles.itemLabel, { color: theme.textPrimary }]}>{item.label}</Text>
              {item.detail && item.detail !== "local" && (
                <Text
                  style={[styles.itemDetail, { color: theme.textMuted }]}
                  numberOfLines={1}
                >
                  {item.detail.length > 20 ? `${item.detail.slice(0, 20)}…` : item.detail}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 38,
    borderTopWidth: 1,
    justifyContent: "center",
  },
  scrollContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    gap: 6,
  },
  itemBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    gap: 6,
  },
  badge: {
    width: 16,
    height: 16,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeLetter: {
    fontSize: 10,
    fontWeight: "800",
    fontFamily: "monospace",
  },
  itemLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  itemDetail: {
    fontSize: 10.5,
    fontFamily: "monospace",
  },
});
