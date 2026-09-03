import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/themeContext';

export interface ParsedFileItem {
  name: string;
  isDirectory: boolean;
  size?: number;
  date?: string;
  icon: any;
  iconColor: string;
}

export function isDirectoryListingText(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const lines = text.trim().split('\n');
  let matchCount = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('total ') || /^([dcbsp-])[rwxstST-]{9}/.test(trimmed)) {
      matchCount++;
    }
  }
  return matchCount >= 2 || (lines.length === 1 && /^([dcbsp-])[rwxstST-]{9}/.test(lines[0].trim()));
}

export function parseDirectoryListing(text: string): ParsedFileItem[] {
  const lines = text.trim().split('\n');
  const items: ParsedFileItem[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('total ')) continue;

    // Match standard Unix ls -l format
    const lsMatch = line.match(/^([dcbsp-])[rwxstST-]{9}[+.]?\s+\d+\s+\S+\s+\S+\s+(\d+)\s+([A-Za-z]{3}\s+\d+\s+[\d:]+|\d{4}-\d{2}-\d{2}\s+[\d:]+)\s+(.+)$/);
    if (lsMatch) {
      const typeChar = lsMatch[1];
      const sizeBytes = parseInt(lsMatch[2], 10);
      const dateStr = lsMatch[3];
      const name = lsMatch[4].trim();

      // Skip current and parent dir markers
      if (name === '.' || name === '..') continue;

      const isDirectory = typeChar === 'd';
      const { icon, iconColor } = getFileIconInfo(name, isDirectory);

      items.push({
        name,
        isDirectory,
        size: isDirectory ? undefined : sizeBytes,
        date: dateStr,
        icon,
        iconColor,
      });
      continue;
    }

    // Simple line fallback
    if (line !== '.' && line !== '..') {
      const isDir = line.endsWith('/') || !line.includes('.');
      const cleanName = line.replace(/\/+$/, '');
      const { icon, iconColor } = getFileIconInfo(cleanName, isDir);
      items.push({
        name: cleanName,
        isDirectory: isDir,
        icon,
        iconColor,
      });
    }
  }

  // Sort: directories first, then alphabetically
  return items.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
}

function getFileIconInfo(name: string, isDirectory: boolean): { icon: string; iconColor: string } {
  if (isDirectory) {
    if (name.toLowerCase().includes('godot')) return { icon: 'game-controller', iconColor: '#8ab4f8' };
    if (name.toLowerCase().includes('doc')) return { icon: 'folder', iconColor: '#fdd663' };
    return { icon: 'folder', iconColor: '#facc15' };
  }

  const ext = name.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'godot':
    case 'tscn':
    case 'gd':
    case 'tres':
    case 'res':
      return { icon: 'game-controller-outline', iconColor: '#8ab4f8' };
    case 'docx':
    case 'doc':
    case 'pdf':
    case 'txt':
    case 'md':
      return { icon: 'document-text-outline', iconColor: '#60a5fa' };
    case 'js':
    case 'ts':
    case 'tsx':
    case 'jsx':
    case 'json':
    case 'py':
    case 'php':
    case 'sh':
      return { icon: 'code-slash-outline', iconColor: '#34d399' };
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'svg':
      return { icon: 'image-outline', iconColor: '#c084fc' };
    case 'zip':
    case 'tar':
    case 'gz':
      return { icon: 'archive-outline', iconColor: '#f87171' };
    default:
      return { icon: 'document-outline', iconColor: '#9ca3af' };
  }
}

function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return '';
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DirectoryListRendererProps {
  rawOutput: string;
  title?: string;
}

export function DirectoryListRenderer({ rawOutput, title = 'Directory Contents' }: DirectoryListRendererProps) {
  const { theme } = useTheme();
  const [showAll, setShowAll] = useState(false);
  const items = parseDirectoryListing(rawOutput);

  if (items.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.bgPrimary, borderColor: theme.border }]}>
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>No files in directory</Text>
      </View>
    );
  }

  const dirCount = items.filter((i) => i.isDirectory).length;
  const fileCount = items.length - dirCount;
  const displayItems = showAll || items.length <= 10 ? items : items.slice(0, 10);
  const remaining = items.length - 10;

  return (
    <View style={[styles.container, { backgroundColor: theme.bgPrimary, borderColor: theme.border }]}>
      {/* Header Summary */}
      <View style={[styles.header, { backgroundColor: theme.bgSecondary, borderBottomColor: theme.border }]}>
        <View style={styles.headerLeft}>
          <Ionicons name="folder-open" size={14} color={theme.accentGold} />
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{title}</Text>
        </View>
        <View style={styles.badgeRow}>
          {dirCount > 0 && (
            <View style={[styles.countBadge, { backgroundColor: `${theme.accentGold}20` }]}>
              <Text style={[styles.countBadgeText, { color: theme.accentGold }]}>{dirCount} folders</Text>
            </View>
          )}
          {fileCount > 0 && (
            <View style={[styles.countBadge, { backgroundColor: `${theme.accent}20` }]}>
              <Text style={[styles.countBadgeText, { color: theme.accent }]}>{fileCount} files</Text>
            </View>
          )}
        </View>
      </View>

      {/* Items List */}
      <View style={styles.itemList}>
        {displayItems.map((item, idx) => (
          <View
            key={`${item.name}-${idx}`}
            style={[
              styles.itemRow,
              { borderBottomColor: theme.border },
              idx === displayItems.length - 1 && { borderBottomWidth: 0 },
            ]}
          >
            <View style={styles.itemLeft}>
              <Ionicons name={item.icon} size={15} color={item.iconColor} style={styles.itemIcon} />
              <Text style={[styles.itemName, { color: theme.textPrimary }]} numberOfLines={1}>
                {item.name}
              </Text>
            </View>

            <View style={styles.itemRight}>
              {item.size !== undefined && (
                <Text style={[styles.itemSize, { color: theme.textMuted }]}>{formatBytes(item.size)}</Text>
              )}
              {item.date && (
                <Text style={[styles.itemDate, { color: theme.textMuted }]}>{item.date}</Text>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Show more button if over 10 items */}
      {!showAll && remaining > 0 && (
        <TouchableOpacity
          style={[styles.showMoreBtn, { backgroundColor: theme.bgSecondary, borderTopColor: theme.border }]}
          onPress={() => setShowAll(true)}
        >
          <Text style={[styles.showMoreText, { color: theme.accent }]}>
            Show {remaining} more items...
          </Text>
          <Ionicons name="chevron-down" size={13} color={theme.accent} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 9.5,
    fontWeight: '600',
  },
  itemList: {
    paddingHorizontal: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  itemIcon: {
    marginRight: 7,
  },
  itemName: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemSize: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
  itemDate: {
    fontSize: 9.5,
  },
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    gap: 4,
  },
  showMoreText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
  },
});
