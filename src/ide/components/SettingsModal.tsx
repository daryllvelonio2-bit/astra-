import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  loadConfig,
  saveConfig,
  SUPPORTED_MODELS,
  AppTheme,
} from "../services/configService";
import { useTheme, THEMES } from "../../theme/themeContext";
import { ApiKeyManager } from "./ApiKeyManager";

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  workspaceId?: string;
  onSyncWorkspace?: () => void;
}

interface ThemeOption {
  id: AppTheme;
  title: string;
  description: string;
  icon: any;
  accentColor: string;
  bgPreview: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "dark",
    title: "Dark Onyx",
    description: "Classic Obsidian & Charcoal Dark",
    icon: "moon",
    accentColor: "#8ab4f8",
    bgPreview: "#131314",
  },
  {
    id: "light",
    title: "Light Clean",
    description: "Crisp Slate & Porcelain Light",
    icon: "sunny",
    accentColor: "#2563eb",
    bgPreview: "#f8fafc",
  },
  {
    id: "midnight",
    title: "Midnight Glow",
    description: "Deep Cosmic Slate with Radiant Cyan & Purple",
    icon: "planet",
    accentColor: "#38bdf8",
    bgPreview: "#0b0f19",
  },
];

export function SettingsModal({ visible, onClose, onSyncWorkspace }: SettingsModalProps) {
  const { theme, themeMode, setTheme } = useTheme();
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("gemini-3.5-flash-lite");
  const [interactiveApproval, setInteractiveApproval] = useState(false);
  const [activeTheme, setActiveTheme] = useState<AppTheme>(themeMode);

  useEffect(() => {
    if (visible) {
      loadConfig().then((cfg) => {
        setApiKeys(cfg.apiKeys || (cfg.apiKey ? [cfg.apiKey] : []));
        setSelectedModel(cfg.selectedModel || "gemini-3.5-flash-lite");
        setInteractiveApproval(!!cfg.interactiveApproval);
        setActiveTheme(cfg.selectedTheme || themeMode);
      });
    }
  }, [visible]);

  const handleSelectTheme = (mode: AppTheme) => {
    setActiveTheme(mode);
    setTheme(mode);
  };

  const handleSave = async () => {
    await saveConfig({
      apiKeys,
      apiKey: apiKeys[0] || "",
      selectedModel,
      interactiveApproval,
      selectedTheme: activeTheme,
    });
    setTheme(activeTheme);
    if (onSyncWorkspace) onSyncWorkspace();
    Alert.alert("Settings Saved", "Configuration has been updated successfully.");
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.bottomSheet, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="settings-sharp" size={20} color={theme.accent} />
              <Text style={[styles.title, { color: theme.textPrimary }]}>Settings</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll}>
            {/* UI Theme Selector */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>UI Appearance & Theme</Text>
            <View style={styles.themeGrid}>
              {THEME_OPTIONS.map((t) => {
                const isSelected = activeTheme === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.themeCard,
                      { backgroundColor: theme.bgPrimary, borderColor: isSelected ? t.accentColor : theme.border },
                      isSelected && { borderWidth: 1.5, shadowColor: t.accentColor, shadowOpacity: 0.3, shadowRadius: 6 },
                    ]}
                    onPress={() => handleSelectTheme(t.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.themeCardHeader}>
                      <View style={styles.themeIconRow}>
                        <View style={[styles.themeIconBox, { backgroundColor: `${t.accentColor}20` }]}>
                          <Ionicons name={t.icon} size={15} color={t.accentColor} />
                        </View>
                        <Text style={[styles.themeTitle, { color: theme.textPrimary }]}>{t.title}</Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={16} color={t.accentColor} />}
                    </View>
                    <Text style={[styles.themeDesc, { color: theme.textMuted }]}>{t.description}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Google Gemini API Keys (Turn Rolling) */}
            <ApiKeyManager
              apiKeys={apiKeys}
              onChangeKeys={setApiKeys}
              theme={theme}
            />

            {/* Interactive Approval Toggle */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Agent Safety & Permissions</Text>
            <TouchableOpacity
              style={[
                styles.approvalCard,
                { backgroundColor: theme.bgPrimary, borderColor: theme.border },
                interactiveApproval && { borderColor: theme.accentGreen, backgroundColor: `${theme.accentGreen}12` },
              ]}
              onPress={() => setInteractiveApproval((prev) => !prev)}
              activeOpacity={0.8}
            >
              <View style={styles.approvalCardLeft}>
                <Ionicons
                  name={interactiveApproval ? "shield-checkmark" : "flash"}
                  size={20}
                  color={interactiveApproval ? theme.accentGreen : theme.accentPurple}
                />
                <View style={styles.approvalCardTextCol}>
                  <Text style={[styles.approvalCardTitle, { color: theme.textPrimary }]}>
                    {interactiveApproval ? "Interactive Approval Mode (ON)" : "Auto-Pilot / YOLO Mode (OFF)"}
                  </Text>
                  <Text style={[styles.approvalCardSub, { color: theme.textSecondary }]}>
                    {interactiveApproval
                      ? "Astra pauses and asks for your permission before editing files or running terminal commands."
                      : "Astra executes commands and file modifications automatically without pausing."}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.togglePill,
                  { backgroundColor: theme.bgTertiary, borderColor: theme.border },
                  interactiveApproval && { backgroundColor: `${theme.accentGreen}25`, borderColor: theme.accentGreen },
                ]}
              >
                <Text
                  style={[
                    styles.togglePillText,
                    { color: theme.textSecondary },
                    interactiveApproval && { color: theme.accentGreen },
                  ]}
                >
                  {interactiveApproval ? "Enabled" : "Disabled"}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Default Model */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>AI Model</Text>
            <View style={styles.modelGrid}>
              {SUPPORTED_MODELS.map((m) => {
                const isSelected = selectedModel === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.modelChip,
                      { backgroundColor: theme.bgPrimary, borderColor: theme.border },
                      isSelected && { backgroundColor: theme.accent, borderColor: theme.accent },
                    ]}
                    onPress={() => setSelectedModel(m.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.modelHeader}>
                      <Text style={[styles.modelChipText, { color: isSelected ? "#ffffff" : theme.textSecondary }]}>
                        {m.name}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={14} color="#ffffff" />
                      )}
                    </View>
                    {m.description && (
                      <Text style={[styles.modelDesc, { color: isSelected ? "rgba(255,255,255,0.85)" : theme.textMuted }]}>
                        {m.description}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: theme.bgPrimary, borderColor: theme.border, borderWidth: 1 }]}
              onPress={onClose}
            >
              <Text style={[styles.btnTextCancel, { color: theme.textPrimary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: theme.accent }]} onPress={handleSave}>
              <Text style={styles.btnTextSave}>Save Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  bottomSheet: {
    backgroundColor: "#252526",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "88%",
    borderWidth: 1,
    borderColor: "#3c3c3c",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#f0f0f0",
  },
  scroll: {
    maxHeight: 400,
  },
  themeGrid: {
    gap: 8,
    marginBottom: 14,
  },
  themeCard: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  themeCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  themeIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  themeIconBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  themeTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  themeDesc: {
    fontSize: 11,
    marginLeft: 34,
  },
  label: {
    color: "#a0a0a0",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 6,
  },
  modelGrid: {
    gap: 8,
  },
  modelChip: {
    backgroundColor: "#1e1e1e",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  modelChipActive: {
    backgroundColor: "#0e639c",
    borderColor: "#0e639c",
  },
  modelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modelChipText: {
    color: "#a0a0a0",
    fontSize: 13,
    fontWeight: "600",
  },
  modelChipTextActive: {
    color: "#ffffff",
  },
  modelDesc: {
    color: "#666",
    fontSize: 11,
    marginTop: 2,
  },
  modelDescActive: {
    color: "#d0e4ff",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  btnCancel: {
    backgroundColor: "#2d2d2d",
  },
  btnSave: {
    backgroundColor: "#0e639c",
  },
  btnTextCancel: {
    color: "#f0f0f0",
    fontWeight: "600",
  },
  btnTextSave: {
    color: "#ffffff",
    fontWeight: "600",
  },
  approvalCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1e1f20",
    borderWidth: 1,
    borderColor: "#333538",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  approvalCardActive: {
    borderColor: "#34d399",
    backgroundColor: "rgba(52, 211, 153, 0.08)",
  },
  approvalCardLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    flex: 1,
  },
  approvalCardTextCol: {
    flex: 1,
    gap: 3,
  },
  approvalCardTitle: {
    color: "#f1f3f4",
    fontSize: 13,
    fontWeight: "600",
  },
  approvalCardSub: {
    color: "#9aa0a6",
    fontSize: 11,
    lineHeight: 15,
  },
  togglePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#28292a",
    borderWidth: 1,
    borderColor: "#3c3c3c",
  },
  togglePillActive: {
    backgroundColor: "#064e3b",
    borderColor: "#34d399",
  },
  togglePillText: {
    color: "#9aa0a6",
    fontSize: 10.5,
    fontWeight: "600",
  },
  togglePillTextActive: {
    color: "#34d399",
  },
});
