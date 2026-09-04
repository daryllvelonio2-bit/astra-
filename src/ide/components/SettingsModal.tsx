import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  loadConfig,
  saveConfig,
  AppTheme,
} from "../services/configService";
import { useTheme } from "../../theme/themeContext";
import { ApiKeyManager } from "./ApiKeyManager";
import { SettingsTabBar, SettingsTabId } from "./settings/SettingsTabBar";
import { AppearanceSection } from "./settings/AppearanceSection";
import { AgentSection } from "./settings/AgentSection";
import { ModelSection } from "./settings/ModelSection";
import { EnvironmentSection } from "./settings/EnvironmentSection";

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  workspaceId?: string;
  onSyncWorkspace?: () => void;
}

const AUTOSAVE_DEBOUNCE_MS = 800;

export function SettingsModal({ visible, onClose, onSyncWorkspace }: SettingsModalProps) {
  const { theme, themeMode, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTabId>("appearance");
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("gemini-3.5-flash-lite");
  const [interactiveApproval, setInteractiveApproval] = useState(false);
  const [activeTheme, setActiveTheme] = useState<AppTheme>(themeMode);
  const [savedTick, setSavedTick] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const dirtyRef = useRef(false);
  const skipFirstRef = useRef(true);
  const saveTimer = useRef<any>(null);
  const draftRef = useRef({ apiKeys, selectedModel, interactiveApproval, activeTheme });
  draftRef.current = { apiKeys, selectedModel, interactiveApproval, activeTheme };

  const flushSave = async () => {
    const draft = draftRef.current;
    await saveConfig({
      apiKeys: draft.apiKeys,
      apiKey: draft.apiKeys[0] || "",
      selectedModel: draft.selectedModel,
      interactiveApproval: draft.interactiveApproval,
      selectedTheme: draft.activeTheme,
    });
    setTheme(draft.activeTheme);
    dirtyRef.current = false;
    setSavedTick((t) => t + 1);
  };

  useEffect(() => {
    if (visible) {
      setLoaded(false);
      dirtyRef.current = false;
      skipFirstRef.current = true;
      loadConfig().then((cfg) => {
        setApiKeys(cfg.apiKeys || (cfg.apiKey ? [cfg.apiKey] : []));
        setSelectedModel(cfg.selectedModel || "gemini-3.5-flash-lite");
        setInteractiveApproval(!!cfg.interactiveApproval);
        setActiveTheme(cfg.selectedTheme || themeMode);
        setLoaded(true);
      });
    } else {
      // Closing with pending edits: flush immediately, never drop them.
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (dirtyRef.current) {
        flushSave();
        if (onSyncWorkspace) onSyncWorkspace();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Debounced auto-save on any change (no Save button, no alert).
  useEffect(() => {
    if (!loaded) return;
    if (skipFirstRef.current) {
      skipFirstRef.current = false;
      return;
    }
    dirtyRef.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushSave, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKeys, selectedModel, interactiveApproval, activeTheme, loaded]);

  const handleSelectTheme = (mode: AppTheme) => {
    setActiveTheme(mode);
    setTheme(mode);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={[styles.modalBackdrop, { backgroundColor: theme.overlay }]} activeOpacity={1} onPress={onClose} />
        <View style={[styles.bottomSheet, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="settings-sharp" size={20} color={theme.accent} />
              <Text style={[styles.title, { color: theme.textPrimary }]}>Settings</Text>
            </View>
            <View style={styles.headerRight}>
              {savedTick > 0 && (
                <View style={styles.savedHint}>
                  <Ionicons name="checkmark" size={12} color={theme.accentGreen} />
                  <Text style={[styles.savedText, { color: theme.accentGreen }]}>Saved</Text>
                </View>
              )}
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          <SettingsTabBar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            keyCount={apiKeys.length}
            theme={theme}
          />

          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            {activeTab === "appearance" && (
              <AppearanceSection activeTheme={activeTheme} onSelectTheme={handleSelectTheme} theme={theme} />
            )}
            {activeTab === "keys" && (
              <ApiKeyManager apiKeys={apiKeys} onChangeKeys={setApiKeys} theme={theme} />
            )}
            {activeTab === "agent" && (
              <AgentSection
                interactiveApproval={interactiveApproval}
                onToggleApproval={() => setInteractiveApproval((prev) => !prev)}
                theme={theme}
              />
            )}
            {activeTab === "model" && (
              <ModelSection selectedModel={selectedModel} onSelectModel={setSelectedModel} theme={theme} />
            )}
            {activeTab === "environment" && (
              <EnvironmentSection theme={theme} />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
    maxHeight: "88%",
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 17, fontWeight: "700" },
  savedHint: { flexDirection: "row", alignItems: "center", gap: 3 },
  savedText: { fontSize: 11, fontWeight: "600" },
  scroll: { maxHeight: 400, paddingTop: 12 },
});
