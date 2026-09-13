import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeColors } from "../../../theme/themeContext";

const FONT_FAMILY = Platform.OS === "ios" ? "Menlo" : "monospace";

interface EditorFloatingHudProps {
  theme: ThemeColors;
  splitToast: string | null;
  zoomBadge: string | null;
  formatToast: string | null;
}

export function EditorFloatingHud({
  theme,
  splitToast,
  zoomBadge,
  formatToast,
}: EditorFloatingHudProps) {
  return (
    <>
      {/* Floating Zoom / Split Toast HUD */}
      {(zoomBadge || splitToast) && (
        <View
          style={[
            styles.floatingHud,
            {
              backgroundColor: `${theme.bgSecondary}EE`,
              borderColor: theme.border,
            },
          ]}
        >
          <Ionicons
            name={splitToast ? "tablet-landscape-outline" : "search-outline"}
            size={13}
            color={theme.accent}
          />
          <Text style={[styles.floatingHudText, { color: theme.textPrimary }]}>
            {splitToast || zoomBadge}
          </Text>
        </View>
      )}

      {/* Format Toast without background block */}
      {formatToast && (
        <View style={styles.formatToast} pointerEvents="none">
          <Ionicons
            name="sparkles"
            size={11}
            color={theme.accentGreen}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.formatToastText, { color: theme.textPrimary }]}>
            {formatToast}
          </Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  formatToast: {
    position: "absolute",
    top: 38,
    alignSelf: "center",
    zIndex: 95,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
    paddingHorizontal: 8,
    backgroundColor: "transparent",
  },
  formatToastText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    fontWeight: "600",
    textShadowColor: "rgba(0, 0, 0, 0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  floatingHud: {
    position: "absolute",
    top: 48,
    alignSelf: "center",
    zIndex: 99,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  floatingHudText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    fontWeight: "700",
  },
});
