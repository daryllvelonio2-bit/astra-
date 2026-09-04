import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  Pressable,
} from "react-native";
import { Ionicons, Octicons } from "@expo/vector-icons";
import { useTheme } from "../../../theme/themeContext";
import { useOrientation } from "../../../theme/useOrientation";
import { GitCommitFile } from "./types";

interface GitCommitFilePickerProps {
  visible: boolean;
  files: GitCommitFile[];
  selectedFile: GitCommitFile | null;
  onSelect: (file: GitCommitFile) => void;
  onClose: () => void;
}

export function GitCommitFilePicker({
  visible,
  files,
  selectedFile,
  onSelect,
  onClose,
}: GitCommitFilePickerProps) {
  const { theme } = useTheme();
  const { isLandscape } = useOrientation();
  const [filterQuery, setFilterQuery] = useState("");

  const filteredFiles = useMemo(() => {
    if (!filterQuery.trim()) return files;
    const q = filterQuery.toLowerCase();
    return files.filter(
      (f) => f.filename.toLowerCase().includes(q) || f.path.toLowerCase().includes(q)
    );
  }, [files, filterQuery]);

  const getStatusColor = (status: GitCommitFile["status"]) => {
    switch (status) {
      case "added":
        return theme.accentGreen;
      case "deleted":
        return theme.accentRed;
      case "renamed":
        return theme.accent;
      case "modified":
      default:
        return theme.accentGold;
    }
  };

  const getStatusLabel = (status: GitCommitFile["status"]) => {
    switch (status) {
      case "added":
        return "New";
      case "deleted":
        return "Deleted";
      case "renamed":
        return "Renamed";
      case "modified":
      default:
        return "Modified";
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.modalCard,
            isLandscape && styles.modalCardLandscape,
            { backgroundColor: theme.bgSecondary, borderColor: theme.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconWrap, { backgroundColor: `${theme.accent}18` }]}>
                <Octicons name="file-diff" size={16} color={theme.accent} />
              </View>
              <View>
                <Text style={[styles.title, { color: theme.textPrimary }]}>
                  Changed Files
                </Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  {files.length} {files.length === 1 ? "file" : "files"} in this commit
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: theme.bgTertiary }]}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Filter Search Input if more than 4 files */}
          {files.length > 4 && (
            <View style={[styles.searchBox, { backgroundColor: theme.bgTertiary, borderColor: theme.border }]}>
              <Ionicons name="search" size={14} color={theme.textMuted} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: theme.textPrimary }]}
                placeholder="Filter files in commit…"
                placeholderTextColor={theme.textMuted}
                value={filterQuery}
                onChangeText={setFilterQuery}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              {filterQuery.length > 0 && (
                <TouchableOpacity onPress={() => setFilterQuery("")}>
                  <Ionicons name="close-circle" size={14} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* File List */}
          <FlatList
            data={filteredFiles}
            keyExtractor={(item) => item.path}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isSelected = selectedFile?.path === item.path;
              const statusColor = getStatusColor(item.status);
              const statusLabel = getStatusLabel(item.status);
              const dirPath = item.path.includes("/")
                ? item.path.substring(0, item.path.lastIndexOf("/"))
                : "";

              return (
                <TouchableOpacity
                  style={[
                    styles.fileRow,
                    { borderBottomColor: `${theme.border}50` },
                    isSelected && { backgroundColor: `${theme.accent}14` },
                  ]}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.fileRowLeft}>
                    <View style={styles.fileIconCol}>
                      <Octicons
                        name={item.status === "deleted" ? "diff-removed" : item.status === "added" ? "diff-added" : "file"}
                        size={15}
                        color={statusColor}
                      />
                    </View>
                    <View style={styles.fileInfo}>
                      <Text
                        style={[
                          styles.filename,
                          { color: isSelected ? theme.accent : theme.textPrimary },
                          isSelected && styles.filenameSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {item.filename}
                      </Text>
                      {dirPath ? (
                        <Text style={[styles.fileDir, { color: theme.textMuted }]} numberOfLines={1}>
                          {dirPath}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.fileRowRight}>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
                      <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                        {statusLabel}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={theme.accent}
                        style={{ marginLeft: 6 }}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                  No files match "{filterQuery}"
                </Text>
              </View>
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "80%",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  modalCardLandscape: {
    maxWidth: 480,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    padding: 0,
  },
  listContent: {
    paddingVertical: 4,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fileRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
    gap: 10,
  },
  fileIconCol: {
    width: 18,
    alignItems: "center",
  },
  fileInfo: {
    flex: 1,
  },
  filename: {
    fontSize: 12,
    fontWeight: "600",
  },
  filenameSelected: {
    fontWeight: "700",
  },
  fileDir: {
    fontSize: 10,
    marginTop: 1,
  },
  fileRowRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  emptyWrap: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 12,
  },
});
