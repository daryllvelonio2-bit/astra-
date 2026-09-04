import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons, Octicons } from "@expo/vector-icons";
import { useTheme } from "../../../theme/themeContext";
import { useOrientation } from "../../../theme/useOrientation";
import { GitCommitFile } from "./types";
import { GitCommitFilePicker } from "./GitCommitFilePicker";

export interface GitCommitFileSelectorProps {
  files: GitCommitFile[];
  selectedFile: GitCommitFile | null;
  onSelect?: (file: GitCommitFile) => void;
}

export function GitCommitFileSelector({
  files,
  selectedFile,
  onSelect,
}: GitCommitFileSelectorProps) {
  const { theme } = useTheme();
  const { isLandscape } = useOrientation();
  const [showPicker, setShowPicker] = useState(false);

  if (!files || files.length === 0) return null;

  const currentIndex = selectedFile
    ? files.findIndex((f) => f.path === selectedFile.path)
    : 0;

  const currentFile = selectedFile || files[0];

  const getStatusColor = (status?: GitCommitFile["status"]) => {
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

  const getStatusLabel = (status?: GitCommitFile["status"]) => {
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
    <>
      <View
        style={[
          styles.container,
          isLandscape && styles.containerLandscape,
          { backgroundColor: theme.bgSecondary, borderBottomColor: theme.border },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.selectorBtn,
            isLandscape && styles.selectorBtnLandscape,
            { backgroundColor: theme.bgTertiary, borderColor: theme.border },
          ]}
          onPress={() => setShowPicker(true)}
          activeOpacity={0.7}
        >
          <View style={styles.leftCol}>
            <Octicons
              name={
                currentFile?.status === "deleted"
                  ? "diff-removed"
                  : currentFile?.status === "added"
                  ? "diff-added"
                  : "file"
              }
              size={isLandscape ? 12 : 13}
              color={getStatusColor(currentFile?.status)}
            />
            <Text
              style={[
                styles.fileName,
                isLandscape && styles.fileNameLandscape,
                { color: theme.textPrimary },
              ]}
              numberOfLines={1}
            >
              {currentFile?.filename || "Select file"}
            </Text>
            <Text
              style={[
                styles.countText,
                isLandscape && styles.countTextLandscape,
                { color: theme.textMuted },
              ]}
            >
              ({currentIndex + 1} of {files.length})
            </Text>
          </View>

          <View style={styles.rightCol}>
            {currentFile && (
              <View
                style={[
                  styles.statusBadge,
                  isLandscape && styles.statusBadgeLandscape,
                  { backgroundColor: `${getStatusColor(currentFile.status)}18` },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    isLandscape && styles.statusBadgeTextLandscape,
                    { color: getStatusColor(currentFile.status) },
                  ]}
                >
                  {getStatusLabel(currentFile.status)}
                </Text>
              </View>
            )}
            <Ionicons
              name="chevron-down"
              size={13}
              color={theme.textSecondary}
              style={{ marginLeft: 5 }}
            />
          </View>
        </TouchableOpacity>
      </View>

      <GitCommitFilePicker
        visible={showPicker}
        files={files}
        selectedFile={currentFile}
        onSelect={(file) => {
          onSelect?.(file);
        }}
        onClose={() => setShowPicker(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  containerLandscape: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  selectorBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  selectorBtnLandscape: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  leftCol: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
    gap: 6,
  },
  fileName: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  fileNameLandscape: {
    fontSize: 10.5,
  },
  countText: {
    fontSize: 10,
  },
  countTextLandscape: {
    fontSize: 9,
  },
  rightCol: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  statusBadgeLandscape: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  statusBadgeTextLandscape: {
    fontSize: 8.5,
    fontWeight: "700",
  },
});
