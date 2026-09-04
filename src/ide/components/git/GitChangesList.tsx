import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons, Octicons } from "@expo/vector-icons";
import { useTheme } from "../../../theme/themeContext";
import { useOrientation } from "../../../theme/useOrientation";
import { GitFileStatus } from "./types";

interface GitChangesListProps {
  files: GitFileStatus[];
  selectedFile: GitFileStatus | null;
  currentBranch: string;
  committing: boolean;
  onSelectFile: (file: GitFileStatus) => void;
  onToggleStageFile: (file: GitFileStatus) => void;
  onToggleStageAll: (stageAll: boolean) => void;
  onCommit: (summary: string, description: string) => void;
}

export function GitChangesList({
  files,
  selectedFile,
  currentBranch,
  committing,
  onSelectFile,
  onToggleStageFile,
  onToggleStageAll,
  onCommit,
}: GitChangesListProps) {
  const { theme } = useTheme();
  const { isLandscape } = useOrientation();
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [showDescriptionInLandscape, setShowDescriptionInLandscape] = useState(false);

  const stagedCount = files.filter((f) => f.staged).length;
  const allStaged = files.length > 0 && stagedCount === files.length;
  const canCommit = summary.trim().length > 0 && stagedCount > 0 && !committing;

  const handleCommitPress = () => {
    if (!canCommit) return;
    onCommit(summary.trim(), description.trim());
    setSummary("");
    setDescription("");
  };

  const renderStatusBadge = (status: GitFileStatus["status"]) => {
    let text = "M";
    let bg = `${theme.accentGold}25`;
    let color = theme.accentGold;

    if (status === "added" || status === "untracked") {
      text = status === "untracked" ? "U" : "A";
      bg = `${theme.accentGreen}25`;
      color = theme.accentGreen;
    } else if (status === "deleted") {
      text = "D";
      bg = `${theme.accentRed}25`;
      color = theme.accentRed;
    } else if (status === "renamed") {
      text = "R";
      bg = `${theme.accentPurple}25`;
      color = theme.accentPurple;
    }

    return (
      <View style={[styles.statusBadge, isLandscape && styles.statusBadgeLandscape, { backgroundColor: bg }]}>
        <Text style={[styles.statusBadgeText, isLandscape && styles.statusBadgeTextLandscape, { color }]}>
          {text}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Changes Header & Select All */}
      <View
        style={[
          styles.subHeader,
          isLandscape && styles.subHeaderLandscape,
          { backgroundColor: theme.bgSecondary, borderBottomColor: theme.border },
        ]}
      >
        <TouchableOpacity
          style={styles.selectAllRow}
          onPress={() => onToggleStageAll(!allStaged)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={allStaged ? "checkbox" : stagedCount > 0 ? "remove-circle" : "square-outline"}
            size={isLandscape ? 15 : 18}
            color={allStaged || stagedCount > 0 ? theme.accent : theme.textMuted}
          />
          <Text
            style={[
              styles.countText,
              isLandscape && styles.countTextLandscape,
              { color: theme.textSecondary },
            ]}
          >
            {files.length} changed file{files.length !== 1 ? "s" : ""}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Changed Files List (Working Directory) */}
      <FlatList
        data={files}
        keyExtractor={(item) => item.path}
        style={styles.fileList}
        contentContainerStyle={files.length === 0 ? styles.emptyContainer : styles.fileListContent}
        renderItem={({ item }) => {
          const isSelected = selectedFile?.path === item.path;
          return (
            <TouchableOpacity
              style={[
                styles.fileRow,
                isLandscape && styles.fileRowLandscape,
                { borderBottomColor: theme.border },
                isSelected && { backgroundColor: `${theme.accent}18` },
              ]}
              onPress={() => onSelectFile(item)}
              activeOpacity={0.7}
            >
              <TouchableOpacity
                style={styles.checkboxTouch}
                onPress={() => onToggleStageFile(item)}
              >
                <Ionicons
                  name={item.staged ? "checkbox" : "square-outline"}
                  size={isLandscape ? 15 : 17}
                  color={item.staged ? theme.accent : theme.textMuted}
                />
              </TouchableOpacity>
              <View style={styles.filePathCol}>
                <Text
                  style={[
                    styles.fileName,
                    isLandscape && styles.fileNameLandscape,
                    { color: theme.textPrimary },
                    isSelected && { color: theme.accent, fontWeight: "700" },
                  ]}
                  numberOfLines={1}
                >
                  {item.filename}
                </Text>
                {item.path !== item.filename && (
                  <Text
                    style={[
                      styles.filePath,
                      isLandscape && styles.filePathLandscape,
                      { color: theme.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {item.path}
                  </Text>
                )}
              </View>
              {renderStatusBadge(item.status)}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyView}>
            <Octicons name="check-circle" size={isLandscape ? 26 : 32} color={theme.accentGreen} />
            <Text style={[styles.emptyTitle, isLandscape && styles.emptyTitleLandscape, { color: theme.textPrimary }]}>
              No local changes
            </Text>
            <Text style={[styles.emptySubtitle, isLandscape && styles.emptySubtitleLandscape, { color: theme.textSecondary }]}>
              Working directory is completely clean.
            </Text>
          </View>
        }
      />

      {/* GitHub Desktop Fixed Commit Box at Bottom (Compact in Landscape) */}
      <View
        style={[
          styles.commitBox,
          isLandscape && styles.commitBoxLandscape,
          { backgroundColor: theme.bgSecondary, borderTopColor: theme.border },
        ]}
      >
        <View style={styles.summaryRow}>
          <TextInput
            style={[
              styles.summaryInput,
              isLandscape && styles.summaryInputLandscape,
              { backgroundColor: theme.bgTertiary, borderColor: theme.border, color: theme.textPrimary },
            ]}
            placeholder="Summary (required)"
            placeholderTextColor={theme.textMuted}
            value={summary}
            onChangeText={setSummary}
            returnKeyType="next"
          />
          {isLandscape && (
            <TouchableOpacity
              style={[
                styles.descToggleBtn,
                isLandscape && styles.descToggleBtnLandscape,
                { backgroundColor: theme.bgTertiary, borderColor: theme.border },
                showDescriptionInLandscape && { borderColor: theme.accent },
              ]}
              onPress={() => setShowDescriptionInLandscape((prev) => !prev)}
              accessibilityLabel="Toggle Description field"
            >
              <Ionicons
                name={showDescriptionInLandscape ? "chevron-down" : "add"}
                size={13}
                color={showDescriptionInLandscape ? theme.accent : theme.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>

        {(!isLandscape || showDescriptionInLandscape) && (
          <TextInput
            style={[
              styles.descriptionInput,
              isLandscape && styles.descriptionInputLandscape,
              { backgroundColor: theme.bgTertiary, borderColor: theme.border, color: theme.textPrimary },
            ]}
            placeholder="Description (optional)"
            placeholderTextColor={theme.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={isLandscape ? 1 : 2}
          />
        )}

        <TouchableOpacity
          style={[
            styles.commitBtn,
            isLandscape && styles.commitBtnLandscape,
            { backgroundColor: canCommit ? theme.accent : theme.bgTertiary, borderColor: theme.border },
          ]}
          onPress={handleCommitPress}
          disabled={!canCommit}
          activeOpacity={0.8}
        >
          {committing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text
              style={[
                styles.commitBtnText,
                isLandscape && styles.commitBtnTextLandscape,
                { color: canCommit ? "#fff" : theme.textMuted },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Commit to {currentBranch} ({stagedCount})
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  subHeaderLandscape: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  selectAllRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  countText: {
    fontSize: 12,
    fontWeight: "600",
  },
  countTextLandscape: {
    fontSize: 11,
  },
  fileList: {
    flex: 1,
  },
  fileListContent: {
    paddingBottom: 4,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  fileRowLandscape: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 8,
  },
  checkboxTouch: {
    padding: 2,
  },
  filePathCol: {
    flex: 1,
  },
  fileName: {
    fontSize: 12.5,
    fontWeight: "500",
  },
  fileNameLandscape: {
    fontSize: 12,
    fontWeight: "600",
  },
  filePath: {
    fontSize: 10,
    marginTop: 1,
  },
  filePathLandscape: {
    fontSize: 9.5,
    marginTop: 0.5,
  },
  statusBadge: {
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadgeLandscape: {
    width: 17,
    height: 17,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusBadgeTextLandscape: {
    fontSize: 9.5,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyView: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  emptyTitleLandscape: {
    fontSize: 12.5,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: "center",
  },
  emptySubtitleLandscape: {
    fontSize: 10.5,
  },
  commitBox: {
    padding: 10,
    borderTopWidth: 1,
    gap: 8,
    flexShrink: 0,
  },
  commitBoxLandscape: {
    padding: 6,
    gap: 5,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  summaryInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 0,
    textAlignVertical: "center",
    fontSize: 12,
  },
  summaryInputLandscape: {
    height: 30,
    fontSize: 10.5,
    paddingHorizontal: 6,
    paddingVertical: 0,
    textAlignVertical: "center",
    borderRadius: 4,
  },
  descToggleBtn: {
    width: 28,
    height: 28,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  descToggleBtnLandscape: {
    width: 30,
    height: 30,
  },
  descriptionInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11.5,
    textAlignVertical: "top",
  },
  descriptionInputLandscape: {
    height: 30,
    fontSize: 10.5,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
  },
  commitBtn: {
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  commitBtnLandscape: {
    height: 30,
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  commitBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  commitBtnTextLandscape: {
    fontSize: 10.5,
    fontWeight: "700",
  },
});
