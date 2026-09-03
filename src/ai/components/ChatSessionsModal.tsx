import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ConversationSession } from "../agent/agentTypes";
import { useTheme } from "../../theme/themeContext";

interface ChatSessionsModalProps {
  visible: boolean;
  sessions: ConversationSession[];
  activeSessionId: string | null;
  workspaceName?: string;
  onSelectSession: (session: ConversationSession) => void;
  onCreateNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onClose: () => void;
}

export function ChatSessionsModal({
  visible,
  sessions,
  activeSessionId,
  workspaceName,
  onSelectSession,
  onCreateNewSession,
  onDeleteSession,
  onClose,
}: ChatSessionsModalProps) {
  const { theme } = useTheme();
  const confirmDelete = (session: ConversationSession) => {
    Alert.alert("Delete Chat", `Delete conversation "${session.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDeleteSession(session.id),
      },
    ]);
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.bottomSheet, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: theme.textPrimary }]}>Project Conversations</Text>
              <Text style={[styles.subtitle, { color: theme.accent }]}>Workspace: {workspaceName || "Active"}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.newChatBtn, { backgroundColor: theme.accent }]} onPress={onCreateNewSession} activeOpacity={0.8}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.newChatText}>Start New Chat Thread</Text>
          </TouchableOpacity>

          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isActive = item.id === activeSessionId;
              return (
                <TouchableOpacity
                  style={[
                    styles.sessionItem,
                    { backgroundColor: theme.bgTertiary, borderColor: theme.border },
                    isActive && { borderColor: theme.accent, backgroundColor: `${theme.accent}15` },
                  ]}
                  onPress={() => onSelectSession(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.sessionLeft}>
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={18}
                      color={isActive ? theme.accent : theme.textMuted}
                    />
                    <View style={styles.sessionTextWrapper}>
                      <Text
                        style={[
                          styles.sessionTitle,
                          { color: theme.textPrimary },
                          isActive && { color: theme.accent, fontWeight: "700" },
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text style={[styles.sessionMeta, { color: theme.textMuted }]}>
                        {item.messages.length} messages • {formatDate(item.updatedAt)}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => confirmDelete(item)}
                  >
                    <Ionicons name="trash-outline" size={16} color={theme.accentRed} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>No previous chats in this workspace.</Text>
              </View>
            }
          />
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
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: "#3c3c3c",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f0f0f0",
  },
  subtitle: {
    fontSize: 12,
    color: "#8ab4f8",
    marginTop: 2,
  },
  newChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0e639c",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
  },
  newChatText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  listContent: {
    paddingBottom: 20,
  },
  sessionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1e1e1e",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  activeSessionItem: {
    borderColor: "#8ab4f8",
    backgroundColor: "rgba(138, 180, 248, 0.08)",
  },
  sessionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
    gap: 10,
  },
  sessionTextWrapper: {
    flex: 1,
  },
  sessionTitle: {
    color: "#e3e3e3",
    fontSize: 14,
    fontWeight: "600",
  },
  activeSessionTitle: {
    color: "#8ab4f8",
  },
  sessionMeta: {
    color: "#777",
    fontSize: 11,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 6,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 30,
  },
  emptyText: {
    color: "#777",
    fontSize: 13,
  },
});
