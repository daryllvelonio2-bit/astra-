import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { ProjectItem } from "./ProjectCard";
import { useTheme } from "../../theme/themeContext";

interface ProjectInspectorModalProps {
  visible: boolean;
  project: ProjectItem | null;
  onClose: () => void;
  onOpenProject: (project: ProjectItem) => void;
  onDeleteProject?: (project: ProjectItem) => void;
}

export function ProjectInspectorModal({
  visible,
  project,
  onClose,
  onOpenProject,
  onDeleteProject,
}: ProjectInspectorModalProps) {
  const { theme } = useTheme();
  if (!project) return null;

  const handleDelete = () => {
    Alert.alert(
      "⚠️ Delete Workspace & All Contents?",
      `Are you sure you want to delete "${project.name}"?\n\n` +
      `⚠️ CRITICAL WARNING: All files, subdirectories, code, and assets located inside:\n\n` +
      `${project.path}\n\n` +
      `will be PERMANENTLY REMOVED from your storage. This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Permanently",
          style: "destructive",
          onPress: () => {
            if (onDeleteProject) onDeleteProject(project);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.bottomSheet, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
          <View style={styles.inspectorHeader}>
            <View style={styles.headerTitleRow}>
              <MaterialCommunityIcons name="folder-outline" size={20} color={theme.accent} />
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                {project.name}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={[styles.inspectorDetails, { backgroundColor: theme.bgTertiary, borderColor: theme.border }]}>
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color={theme.accent} />
              <Text style={[styles.detailText, { color: theme.textPrimary }]} numberOfLines={1}>{project.path}</Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="git" size={16} color={theme.accent} />
              <Text style={[styles.detailText, { color: theme.textPrimary }]}>Branch: {project.branch}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="document-text-outline" size={16} color={theme.accent} />
              <Text style={[styles.detailText, { color: theme.textPrimary }]}>{project.template} Project</Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.openEditorButton, { backgroundColor: theme.accent }]}
              onPress={() => onOpenProject(project)}
              activeOpacity={0.8}
            >
              <Ionicons name="code-slash" size={18} color="#fff" />
              <Text style={styles.openEditorButtonText}>Open in Mobile IDE</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: `${theme.accentRed}20`, borderColor: theme.accentRed }]}
              onPress={handleDelete}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={16} color={theme.accentRed} />
              <Text style={[styles.deleteButtonText, { color: theme.accentRed }]}>Delete Workspace</Text>
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
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: "#3c3c3c",
  },
  inspectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f0f0f0",
    flex: 1,
  },
  inspectorDetails: {
    marginBottom: 20,
    gap: 10,
    backgroundColor: "#1e1e1e",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailText: {
    color: "#f0f0f0",
    fontSize: 13.5,
    marginLeft: 10,
    flex: 1,
  },
  actionButtons: {
    gap: 10,
  },
  openEditorButton: {
    backgroundColor: "#0e639c",
    paddingVertical: 13,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  openEditorButtonText: {
    color: "#fff",
    fontSize: 14.5,
    fontWeight: "700",
  },
  deleteButton: {
    backgroundColor: "#2c1517",
    borderWidth: 1,
    borderColor: "#5c2427",
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  deleteButtonText: {
    color: "#f28b82",
    fontSize: 14,
    fontWeight: "600",
  },
});
