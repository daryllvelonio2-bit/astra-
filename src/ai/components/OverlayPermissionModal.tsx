import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AstraLogo } from "./AstraLogo";
import { FloatingOverlay } from "../services/floatingOverlayService";
import { useTheme } from "../../theme/themeContext";

interface OverlayPermissionModalProps {
  visible: boolean;
  onClose: () => void;
  onPermissionGranted?: () => void;
}

export function OverlayPermissionModal({
  visible,
  onClose,
  onPermissionGranted,
}: OverlayPermissionModalProps) {
  const { theme } = useTheme();
  const handleOpenSettings = async () => {
    try {
      await FloatingOverlay.requestPermission();
      onClose();
      if (onPermissionGranted) {
        onPermissionGranted();
      }
    } catch (e) {
      console.warn("Failed to request permission:", e);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <View style={[styles.card, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
          <View style={styles.headerIcon}>
            <AstraLogo width={48} height={48} />
            <View style={[styles.badgePulse, { backgroundColor: theme.accentGreen, borderColor: theme.bgSecondary }]} />
          </View>

          <Text style={[styles.title, { color: theme.textPrimary }]}>Enable Floating Chat Head</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            Vibe code anywhere! Enable <Text style={[styles.boldText, { color: theme.accent }]}>“Display over other apps”</Text> to keep Astra floating as a Messenger-style chathead above your browser, editor, and all your apps.
          </Text>

          <View style={[styles.featuresList, { backgroundColor: theme.bgTertiary, borderColor: theme.border }]}>
            <View style={styles.featureItem}>
              <Ionicons name="chatbubbles-outline" size={16} color={theme.accent} />
              <Text style={[styles.featureText, { color: theme.textPrimary }]}>Messenger-style floating bubble with drag & edge-snapping</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="sparkles-outline" size={16} color={theme.accentCyan} />
              <Text style={[styles.featureText, { color: theme.textPrimary }]}>Ask questions, generate & apply code without leaving current apps</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="terminal-outline" size={16} color={theme.accentGold} />
              <Text style={[styles.featureText, { color: theme.textPrimary }]}>Run Linux & PRoot build tasks in the background</Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: theme.bgTertiary }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.grantButton, { backgroundColor: theme.accent }]}
              onPress={handleOpenSettings}
              activeOpacity={0.85}
            >
              <Ionicons name="shield-checkmark" size={16} color={theme.sendButtonIcon} style={{ marginRight: 6 }} />
              <Text style={[styles.grantText, { color: theme.sendButtonIcon }]}>Enable Permission</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
  },
  headerIcon: {
    position: "relative",
    marginBottom: 16,
  },
  badgePulse: {
    position: "absolute",
    right: -2,
    top: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 18,
  },
  boldText: {
    fontWeight: "600",
  },
  featuresList: {
    width: "100%",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 13,
    fontWeight: "600",
  },
  grantButton: {
    flex: 1.6,
    flexDirection: "row",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  grantText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
