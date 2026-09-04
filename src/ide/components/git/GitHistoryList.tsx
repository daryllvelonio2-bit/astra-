import React from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { Octicons } from "@expo/vector-icons";
import { useTheme } from "../../../theme/themeContext";
import { useOrientation } from "../../../theme/useOrientation";
import { GitCommit } from "./types";

interface GitHistoryListProps {
  commits: GitCommit[];
  selectedCommit: GitCommit | null;
  onSelectCommit: (commit: GitCommit) => void;
}

export function GitHistoryList({
  commits,
  selectedCommit,
  onSelectCommit,
}: GitHistoryListProps) {
  const { theme } = useTheme();
  const { isLandscape } = useOrientation();

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (name[0] || "?").toUpperCase();
  };

  return (
    <FlatList
      data={commits}
      keyExtractor={(item) => item.hash}
      style={styles.container}
      contentContainerStyle={commits.length === 0 ? styles.emptyContainer : undefined}
      renderItem={({ item }) => {
        const isSelected = selectedCommit?.hash === item.hash;
        return (
          <TouchableOpacity
            style={[
              styles.commitRow,
              isLandscape && styles.commitRowLandscape,
              { borderBottomColor: theme.border },
              isSelected && { backgroundColor: `${theme.accent}18` },
            ]}
            onPress={() => onSelectCommit(item)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.avatar,
                isLandscape && styles.avatarLandscape,
                { backgroundColor: theme.bgTertiary, borderColor: theme.border },
              ]}
            >
              <Text
                style={[
                  styles.avatarText,
                  isLandscape && styles.avatarTextLandscape,
                  { color: theme.textSecondary },
                ]}
              >
                {getInitials(item.authorName)}
              </Text>
            </View>
            <View style={styles.contentCol}>
              <Text
                style={[
                  styles.commitMessage,
                  isLandscape && styles.commitMessageLandscape,
                  { color: theme.textPrimary },
                  isSelected && { color: theme.accent, fontWeight: "700" },
                ]}
                numberOfLines={isLandscape ? 1 : 2}
              >
                {item.message}
              </Text>
              <View style={[styles.metaRow, isLandscape && styles.metaRowLandscape]}>
                <Text
                  style={[
                    styles.authorName,
                    isLandscape && styles.authorNameLandscape,
                    { color: theme.textMuted },
                  ]}
                  numberOfLines={1}
                >
                  {item.authorName}
                </Text>
                <Text style={[styles.dot, { color: theme.textMuted }]}>·</Text>
                <Text
                  style={[
                    styles.timeAgo,
                    isLandscape && styles.timeAgoLandscape,
                    { color: theme.textMuted },
                  ]}
                >
                  {item.relativeTime}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.hashBadge,
                isLandscape && styles.hashBadgeLandscape,
                { backgroundColor: theme.bgTertiary, borderColor: theme.border },
              ]}
            >
              <Text
                style={[
                  styles.hashText,
                  isLandscape && styles.hashTextLandscape,
                  { color: theme.textSecondary },
                ]}
              >
                {item.shortHash}
              </Text>
            </View>
          </TouchableOpacity>
        );
      }}
      ListEmptyComponent={
        <View style={styles.emptyView}>
          <Octicons name="history" size={32} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No commit history</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            Commits made to this repository will appear here.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  commitRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  commitRowLandscape: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    gap: 6,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLandscape: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  avatarText: {
    fontSize: 11,
    fontWeight: "700",
  },
  avatarTextLandscape: {
    fontSize: 8.5,
  },
  contentCol: {
    flex: 1,
  },
  commitMessage: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  commitMessageLandscape: {
    fontSize: 10.5,
    lineHeight: 14,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  metaRowLandscape: {
    gap: 2,
    marginTop: 1,
  },
  authorName: {
    fontSize: 10.5,
  },
  authorNameLandscape: {
    fontSize: 9,
    maxWidth: 60,
  },
  dot: {
    fontSize: 10,
  },
  timeAgo: {
    fontSize: 10.5,
  },
  timeAgoLandscape: {
    fontSize: 9,
  },
  hashBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  hashBadgeLandscape: {
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 3,
  },
  hashText: {
    fontFamily: "monospace",
    fontSize: 10,
    fontWeight: "600",
  },
  hashTextLandscape: {
    fontSize: 8.5,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyView: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: "center",
  },
});
