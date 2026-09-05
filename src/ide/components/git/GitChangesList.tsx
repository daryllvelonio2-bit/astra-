import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
} from "react-native";
import { Ionicons, Octicons } from "@expo/vector-icons";
import { useTheme } from "../../../theme/themeContext";
import { useOrientation } from "../../../theme/useOrientation";
import { GitFileStatus } from "./types";
import { GitFileItem } from "./GitFileItem";
import { gitChangesListStyles as styles } from "./GitChangesList.styles";
import { generateCommitSummary } from "../../services/gitCommitSummary";

interface GitChangesListProps {
  files: GitFileStatus[];
  workspaceId?: string;
  selectedFile: GitFileStatus | null;
  currentBranch: string;
  ahead?: number;
  detached?: boolean;
  committing: boolean;
  onSelectFile: (file: GitFileStatus) => void;
  onToggleStageFile: (file: GitFileStatus) => void;
  onToggleStageAll: (stageAll: boolean) => void;
  onCommit: (summary: string, description: string) => void;
  onCommitAndPush?: (summary: string, description: string) => void;
  onPush?: () => void;
}

export function GitChangesList({
  files,
  workspaceId,
  selectedFile,
  currentBranch,
  ahead = 0,
  detached = false,
  committing,
  onSelectFile,
  onToggleStageFile,
  onToggleStageAll,
  onCommit,
  onCommitAndPush,
  onPush,
}: GitChangesListProps) {
  const { theme } = useTheme();
  const { isLandscape } = useOrientation();
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [showDescriptionInLandscape, setShowDescriptionInLandscape] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [descHeight, setDescHeight] = useState(48);
  const descriptionRef = useRef<TextInput>(null);
  const fileListRef = useRef<FlatList>(null);

  // Edge-to-edge (Expo 52+) disables window resize, so flex alone can't lift
  // the commit box — pad it by the live keyboard height instead (same proven
  // pattern as AstraChatScreen). DidChangeFrame keeps SwiftKey's growing
  // suggestion/strip rows accurate; the file list stays flex:1 so the box is
  // pinned to the bottom of the padded container, exactly above the keyboard.
  // To avoid waiting for keyboardDidShow (fires after the slide-up animation),
  // pre-lift instantly on focus using the last measured height.
  const lastKeyboardHeight = useRef(0);
  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const setH = (e: any) => {
      const h = e?.endCoordinates?.height ?? 0;
      if (h > 0) lastKeyboardHeight.current = h;
      setKeyboardHeight((prev) => (prev === h ? prev : h));
    };
    const showSub = Keyboard.addListener(showEvt, setH);
    const frameSub = Keyboard.addListener("keyboardDidChangeFrame", setH);
    const hideSub = Keyboard.addListener(hideEvt, () => {
      setKeyboardHeight(0);
      setInputFocused(false);
    });
    return () => {
      showSub.remove();
      frameSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleGenerateSummary = async () => {
    if (generating || files.length === 0) return;
    setGenerating(true);
    try {
      const result = await generateCommitSummary(workspaceId, files);
      setSummary(result.summary);
      if (result.description) setDescription(result.description);
    } catch (e: any) {
      Alert.alert("Generate Summary", e?.message || "Could not generate a summary.");
    } finally {
      setGenerating(false);
    }
  };

  const handleInputFocus = () => {
    setInputFocused(true);
    if (!isLandscape && keyboardHeight === 0) {
      setKeyboardHeight(lastKeyboardHeight.current > 0 ? lastKeyboardHeight.current : 300);
    }
  };

  // Stable row rendering: with 179+ files, any parent re-render (e.g. every
  // keyboard frame event) must not reconcile all rows, or the lift lags.
  // Memoized GitFileItem + stable callbacks keep row updates to prop changes.
  const selectedPath = selectedFile?.path;
  const handleSelectItem = useCallback(
    (file: GitFileStatus) => onSelectFile(file),
    [onSelectFile]
  );
  const handleToggleItem = useCallback(
    (file: GitFileStatus) => onToggleStageFile(file),
    [onToggleStageFile]
  );
  const renderFileItem = useCallback(
    ({ item }: { item: GitFileStatus }) => (
      <GitFileItem
        file={item}
        isSelected={selectedPath === item.path}
        isLandscape={isLandscape}
        onSelectFile={handleSelectItem}
        onToggleStageFile={handleToggleItem}
      />
    ),
    [selectedPath, isLandscape, handleSelectItem, handleToggleItem]
  );
  const fileKeyExtractor = useCallback((item: GitFileStatus) => item.path, []);

  const stagedCount = files.filter((f) => f.staged).length;
  const allStaged = files.length > 0 && stagedCount === files.length;
  const canCommit = summary.trim().length > 0 && files.length > 0 && !committing;

  const handleCommitPress = () => {
    if (!canCommit) return;
    if (stagedCount === 0) {
      onToggleStageAll(true);
    }
    onCommit(summary.trim(), description.trim());
    setSummary("");
    setDescription("");
  };

  const handleCommitAndPushPress = () => {
    if (!canCommit) return;
    if (stagedCount === 0) {
      onToggleStageAll(true);
    }
    if (onCommitAndPush) {
      onCommitAndPush(summary.trim(), description.trim());
      setSummary("");
      setDescription("");
    }
  };

  return (
    <View style={[styles.container, !isLandscape && keyboardHeight > 0 && { paddingBottom: keyboardHeight }]}>
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
        ref={fileListRef}
        data={files}
        keyExtractor={fileKeyExtractor}
        style={styles.fileList}
        contentContainerStyle={files.length === 0 ? styles.emptyContainer : styles.fileListContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        renderItem={renderFileItem}
        ListEmptyComponent={
          <View style={styles.emptyView}>
            {detached ? (
              <>
                <Octicons name="git-branch" size={isLandscape ? 22 : 28} color={theme.accentGold} />
                <Text style={[styles.emptyTitle, isLandscape && styles.emptyTitleLandscape, { color: theme.textPrimary }]}>
                  Detached HEAD
                </Text>
                <Text style={[styles.emptySubtitle, isLandscape && styles.emptySubtitleLandscape, { color: theme.textSecondary }]}>
                  You're viewing a remote snapshot, not a branch. Switch to a local branch to commit or push.
                </Text>
              </>
            ) : ahead > 0 ? (
              <>
                <Octicons name="arrow-up" size={isLandscape ? 22 : 28} color={theme.accent} />
                <Text style={[styles.emptyTitle, isLandscape && styles.emptyTitleLandscape, { color: theme.textPrimary }]}>
                  {ahead} {ahead === 1 ? "commit" : "commits"} to push
                </Text>
                <Text style={[styles.emptySubtitle, isLandscape && styles.emptySubtitleLandscape, { color: theme.textSecondary }]}>
                  Your local commits are ready to push to GitHub.
                </Text>
                {onPush && !detached && (
                  <TouchableOpacity
                    style={[styles.pushNowBtn, { backgroundColor: theme.accent }]}
                    onPress={onPush}
                    activeOpacity={0.8}
                  >
                    <Octicons name="upload" size={13} color="#fff" />
                    <Text style={styles.pushNowBtnText}>Push origin</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <Octicons name="check-circle" size={isLandscape ? 26 : 32} color={theme.accentGreen} />
                <Text style={[styles.emptyTitle, isLandscape && styles.emptyTitleLandscape, { color: theme.textPrimary }]}>
                  No local changes
                </Text>
                <Text style={[styles.emptySubtitle, isLandscape && styles.emptySubtitleLandscape, { color: theme.textSecondary }]}>
                  Working directory is completely clean.
                </Text>
              </>
            )}
          </View>
        }
      />

      {/* Commit Box */}
      <View
        style={[
          styles.commitBox,
          isLandscape && styles.commitBoxLandscape,
          { backgroundColor: theme.bgSecondary, borderTopColor: theme.border },
        ]}
      >
        {files.length > 0 && (
          <View style={styles.summaryRow}>
            <TouchableOpacity
              style={[
                styles.descToggleBtn,
                isLandscape && styles.descToggleBtnLandscape,
                { backgroundColor: theme.bgTertiary, borderColor: theme.border },
              ]}
              onPress={handleGenerateSummary}
              disabled={generating}
              activeOpacity={0.7}
              accessibilityLabel="Generate commit summary with AI"
            >
              {generating ? (
                <ActivityIndicator size="small" color={theme.accent} />
              ) : (
                <Ionicons name="sparkles" size={14} color={theme.accent} />
              )}
            </TouchableOpacity>
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
              blurOnSubmit={false}
              onFocus={handleInputFocus}
              onBlur={() => setInputFocused(false)}
              onSubmitEditing={() => descriptionRef.current?.focus()}
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
        )}

        {files.length > 0 && (!isLandscape || showDescriptionInLandscape) && (
          <TextInput
            ref={descriptionRef}
            style={[
              styles.descriptionInput,
              isLandscape && styles.descriptionInputLandscape,
              !isLandscape && { height: Math.min(Math.max(descHeight, 48), 140) },
              inputFocused && !isLandscape && { borderColor: theme.accent },
              { backgroundColor: theme.bgTertiary, borderColor: inputFocused && !isLandscape ? theme.accent : theme.border, color: theme.textPrimary },
            ]}
            placeholder="Description (optional)"
            placeholderTextColor={theme.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            scrollEnabled
            textAlignVertical="top"
            returnKeyType="default"
            blurOnSubmit={false}
            onFocus={handleInputFocus}
            onBlur={() => setInputFocused(false)}
            onContentSizeChange={(e) => {
              if (!isLandscape) setDescHeight(e.nativeEvent.contentSize.height);
            }}
            numberOfLines={isLandscape ? 1 : 2}
          />
        )}

        <View style={styles.commitBtnRow}>
          {files.length === 0 && ahead > 0 && !detached ? (
            onPush && (
              <TouchableOpacity
                style={[styles.commitBtn, isLandscape && styles.commitBtnLandscape, { backgroundColor: theme.accent, borderColor: theme.accent, flexDirection: "row", gap: 6 }]}
                onPress={onPush}
                activeOpacity={0.8}
              >
                <Octicons name="upload" size={isLandscape ? 12 : 14} color="#fff" />
                <Text style={[styles.commitBtnText, isLandscape && styles.commitBtnTextLandscape, { color: "#fff", fontWeight: "700" }]} numberOfLines={1}>
                  Push {ahead} {ahead === 1 ? "commit" : "commits"} to origin
                </Text>
              </TouchableOpacity>
            )
          ) : (
            <>
              <TouchableOpacity
                style={[styles.commitBtn, isLandscape && styles.commitBtnLandscape, { backgroundColor: canCommit ? theme.accent : theme.bgTertiary, borderColor: theme.border }]}
                onPress={handleCommitPress}
                disabled={!canCommit}
                activeOpacity={0.8}
              >
                {committing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.commitBtnText, isLandscape && styles.commitBtnTextLandscape, { color: canCommit ? "#fff" : theme.textMuted }]} numberOfLines={1} ellipsizeMode="tail">
                    Commit to {currentBranch} ({stagedCount || files.length})
                  </Text>
                )}
              </TouchableOpacity>

              {onCommitAndPush && (
                <TouchableOpacity
                  style={[styles.commitPushBtn, isLandscape && styles.commitPushBtnLandscape, { backgroundColor: canCommit ? `${theme.accent}20` : theme.bgTertiary, borderColor: canCommit ? theme.accent : theme.border }]}
                  onPress={handleCommitAndPushPress}
                  disabled={!canCommit}
                  activeOpacity={0.8}
                  accessibilityLabel="Commit and Push"
                >
                  <Octicons name="upload" size={isLandscape ? 12 : 14} color={canCommit ? theme.accent : theme.textMuted} />
                  {!isLandscape && (
                    <Text style={[styles.commitPushText, { color: canCommit ? theme.accent : theme.textMuted }]} numberOfLines={1}>
                      Commit & Push
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
}
