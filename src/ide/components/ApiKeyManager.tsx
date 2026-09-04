import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { maskApiKey, normalizeApiKeys } from "../services/configService";
import { ThemeColors } from "../../theme/themeContext";

interface ApiKeyManagerProps {
  apiKeys: string[];
  onChangeKeys: (keys: string[]) => void;
  theme: ThemeColors;
}

export function ApiKeyManager({ apiKeys, onChangeKeys, theme }: ApiKeyManagerProps) {
  const [newKeyInput, setNewKeyInput] = useState("");
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());

  const handleAddKey = () => {
    const raw = newKeyInput.trim();
    if (!raw) return;

    // Support single key or comma/newline-separated keys
    const incoming = raw
      .split(/[,;\n\r]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (incoming.length === 0) return;

    const merged = normalizeApiKeys([...apiKeys, ...incoming]);
    onChangeKeys(merged);
    setNewKeyInput("");
  };

  const handleRemoveKey = (indexToRemove: number) => {
    const keyToRemove = apiKeys[indexToRemove];
    Alert.alert(
      "Remove API Key",
      `Are you sure you want to remove Key #${indexToRemove + 1} (${maskApiKey(keyToRemove)})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            const next = apiKeys.filter((_, idx) => idx !== indexToRemove);
            onChangeKeys(next);
            setRevealedIndices((prev) => {
              const updated = new Set<number>();
              prev.forEach((i) => {
                if (i < indexToRemove) updated.add(i);
                else if (i > indexToRemove) updated.add(i - 1);
              });
              return updated;
            });
          },
        },
      ]
    );
  };

  const toggleReveal = (idx: number) => {
    setRevealedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>Google Gemini API Keys (Turn Rolling)</Text>

      {/* Input to Add New Key */}
      <View style={[styles.inputWrapper, { backgroundColor: theme.bgInput, borderColor: theme.border }]}>
        <TextInput
          style={[styles.input, { color: theme.textPrimary }]}
          placeholder="Paste API Key (or multiple comma-separated)"
          placeholderTextColor={theme.textMuted}
          value={newKeyInput}
          onChangeText={setNewKeyInput}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={handleAddKey}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[
            styles.addBtn,
            { backgroundColor: newKeyInput.trim() ? theme.accent : theme.bgTertiary },
          ]}
          onPress={handleAddKey}
          disabled={!newKeyInput.trim()}
          activeOpacity={0.8}
        >
          <Ionicons
            name="add"
            size={18}
            color={newKeyInput.trim() ? theme.sendButtonIcon : theme.textMuted}
          />
          <Text
            style={[
              styles.addBtnText,
              { color: newKeyInput.trim() ? theme.sendButtonIcon : theme.textMuted },
            ]}
          >
            Add Key
          </Text>
        </TouchableOpacity>
      </View>

      {/* API Keys List */}
      {apiKeys.length > 0 && (
        <View style={styles.keysList}>
          {apiKeys.map((key, index) => {
            const isRevealed = revealedIndices.has(index);
            const isPrimary = index === 0;

            return (
              <View
                key={`${key}-${index}`}
                style={[
                  styles.keyCard,
                  { backgroundColor: theme.bgPrimary, borderColor: theme.border },
                ]}
              >
                <View style={styles.keyCardLeft}>
                  <View
                    style={[
                      styles.indexBadge,
                      { backgroundColor: isPrimary ? `${theme.accent}25` : theme.bgTertiary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.indexBadgeText,
                        { color: isPrimary ? theme.accent : theme.textSecondary },
                      ]}
                    >
                      #{index + 1}
                    </Text>
                  </View>
                  <View style={styles.keyCardTextCol}>
                    <Text style={[styles.keyText, { color: theme.textPrimary }]} numberOfLines={1}>
                      {isRevealed ? key : maskApiKey(key)}
                    </Text>
                    <Text style={[styles.keyRole, { color: theme.textMuted }]}>
                      {isPrimary ? "Primary Key" : `Rolling Key #${index + 1}`}
                    </Text>
                  </View>
                </View>

                <View style={styles.keyCardActions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => toggleReveal(index)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={isRevealed ? "eye-off-outline" : "eye-outline"}
                      size={17}
                      color={theme.textSecondary}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleRemoveKey(index)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={17} color={theme.accentRed} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Rolling Info Banner */}
      {apiKeys.length >= 2 ? (
        <View
          style={[
            styles.rollingBanner,
            { backgroundColor: `${theme.accent}12`, borderColor: `${theme.accent}35` },
          ]}
        >
          <Ionicons name="sync-circle" size={18} color={theme.accent} />
          <Text style={[styles.rollingBannerText, { color: theme.textSecondary }]}>
            <Text style={{ fontWeight: "700", color: theme.accent }}>
              Turn Rolling Active ({apiKeys.length} Keys):{" "}
            </Text>
            Astra will automatically roll to the next API key on every turn (read, write, execute) and instantly switch if any key hits quota limits.
          </Text>
        </View>
      ) : apiKeys.length === 1 ? (
        <View
          style={[
            styles.rollingBanner,
            { backgroundColor: theme.bgPrimary, borderColor: theme.border },
          ]}
        >
          <Ionicons name="information-circle-outline" size={16} color={theme.textMuted} />
          <Text style={[styles.rollingBannerText, { color: theme.textMuted }]}>
            1 key configured. Add more API keys to enable automatic turn-by-turn key rolling and multiply your free limits.
          </Text>
        </View>
      ) : (
        <Text style={[styles.hint, { color: theme.textMuted }]}>
          Get a free API key from Google AI Studio (aistudio.google.com).
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 13,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  keysList: {
    marginTop: 8,
    gap: 6,
  },
  keyCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  keyCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  indexBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  indexBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  keyCardTextCol: {
    flex: 1,
  },
  keyText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "monospace",
  },
  keyRole: {
    fontSize: 10,
    marginTop: 1,
  },
  keyCardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginLeft: 8,
  },
  actionBtn: {
    padding: 2,
  },
  rollingBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  rollingBannerText: {
    fontSize: 11.5,
    lineHeight: 16,
    flex: 1,
  },
  hint: {
    fontSize: 11,
    marginTop: 6,
  },
});
