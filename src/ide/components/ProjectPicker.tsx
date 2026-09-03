import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  listWorkspaces,
  listWorkspaceMetas,
  createWorkspace,
  deleteWorkspace,
  openExistingDirectoryAsProject,
} from '../services/workspaceService';
import { ProjectCard, ProjectItem } from './ProjectCard';
import { CreateProjectModal } from './CreateProjectModal';
import { ProjectInspectorModal } from './ProjectInspectorModal';
import { SettingsModal } from './SettingsModal';
import { DirectoryPickerModal } from './DirectoryPickerModal';
import { useTheme } from '../../theme/themeContext';

interface ProjectPickerProps {
  onOpenWorkspace: (workspaceId: string) => void;
  onNavigateToChat?: () => void;
}

export function ProjectPicker({ onOpenWorkspace, onNavigateToChat }: ProjectPickerProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  // Modals
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [isOpenProjectModalVisible, setOpenProjectModalVisible] = useState(false);
  const [isSettingsModalVisible, setSettingsModalVisible] = useState(false);
  const [isInspectorVisible, setInspectorVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const metas = await listWorkspaceMetas();
      const loaded: ProjectItem[] = metas.map((meta) => ({
        id: meta.id,
        name: meta.name || meta.id,
        template: meta.template || 'React Native',
        path: meta.dirPath ? meta.dirPath.replace(/^file:\/\//, '') : `~/storage/workspaces/${meta.id}`,
        lastModified: 'Recently',
        fileCount: 1,
        branch: 'main',
      }));
      setProjects(loaded);
    } catch (e) {
      console.error('Failed to load workspaces:', e);
    }
  };

  const handleCreateProject = async (name: string, template: string, customPath?: string) => {
    try {
      const ws = await createWorkspace(name, template, customPath);
      await loadProjects();
      onOpenWorkspace(ws.id);
    } catch (e) {
      Alert.alert('Error', 'Failed to create project workspace');
    }
  };

  const handleOpenExistingProject = async (directoryPath: string) => {
    try {
      const ws = await openExistingDirectoryAsProject(directoryPath);
      await loadProjects();
      onOpenWorkspace(ws.id);
    } catch (e) {
      Alert.alert('Error', 'Failed to open project workspace');
    }
  };

  const handleDeleteProject = async (project: ProjectItem) => {
    try {
      await deleteWorkspace(project.id);
      await loadProjects();
    } catch (e) {
      Alert.alert('Error', 'Failed to delete workspace');
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeFilter === 'All') return matchesSearch;
    return matchesSearch && p.template.toLowerCase().includes(activeFilter.toLowerCase());
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.bgPrimary, paddingTop: insets.top }]}>
      <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor={theme.bgSecondary} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.bgSecondary, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Workspaces</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: `${theme.accentGold}18`, borderColor: `${theme.accentGold}40` }]}
            onPress={() => setOpenProjectModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="folder-open-outline" size={15} color={theme.accentGold} />
            <Text style={[styles.headerBtnText, { color: theme.accentGold }]}>Open Project</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.bgTertiary, borderColor: theme.border }]} onPress={() => setCreateModalVisible(true)}>
            <Ionicons name="add" size={24} color={theme.accent} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.bgTertiary, borderColor: theme.border }]} onPress={() => setSettingsModalVisible(true)}>
            <Ionicons name="settings-outline" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input */}
      <View style={[styles.searchContainer, { backgroundColor: theme.bgInput, borderColor: theme.border }]}>
        <Ionicons name="search" size={18} color={theme.textMuted} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.textPrimary }]}
          placeholder="Search projects..."
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScrollView}
        contentContainerStyle={styles.filterScrollContent}
      >
        {['All', 'React Native', 'Node.js', 'Python', 'Web'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterChip,
              { backgroundColor: theme.bgTertiary, borderColor: theme.border },
              activeFilter === filter && { backgroundColor: theme.accent, borderColor: theme.accent },
            ]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: activeFilter === filter ? "#ffffff" : theme.textSecondary },
              ]}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Project List */}
      <FlatList
        data={filteredProjects}
        renderItem={({ item }) => (
          <ProjectCard
            item={item}
            onPress={(p) => {
              onOpenWorkspace(p.id);
            }}
            onMorePress={(p) => {
              setSelectedProject(p);
              setInspectorVisible(true);
            }}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No workspace projects found.</Text>
            <View style={styles.emptyActionsRow}>
              <TouchableOpacity style={[styles.createBtn, { backgroundColor: theme.accent }]} onPress={() => setCreateModalVisible(true)}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.createBtnText}>New Project</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createBtn, styles.openExistingBtn, { backgroundColor: theme.bgTertiary, borderColor: theme.border }]}
                onPress={() => setOpenProjectModalVisible(true)}
              >
                <Ionicons name="folder-open-outline" size={16} color={theme.accentGold} />
                <Text style={[styles.createBtnText, { color: theme.textPrimary }]}>Open Existing</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
      />

      {/* Modals */}
      <CreateProjectModal
        visible={isCreateModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreateProject={handleCreateProject}
      />

      <DirectoryPickerModal
        visible={isOpenProjectModalVisible}
        onClose={() => setOpenProjectModalVisible(false)}
        onSelectDirectory={(selectedPath) => {
          setOpenProjectModalVisible(false);
          handleOpenExistingProject(selectedPath);
        }}
      />

      <SettingsModal
        visible={isSettingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
      />

      <ProjectInspectorModal
        visible={isInspectorVisible}
        project={selectedProject}
        onClose={() => setInspectorVisible(false)}
        onOpenProject={(p) => {
          setInspectorVisible(false);
          onOpenWorkspace(p.id);
        }}
        onDeleteProject={handleDeleteProject}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#282828',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f0f0f0',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252526',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#f0f0f0',
    paddingVertical: 8,
    fontSize: 14,
  },
  filterScrollView: {
    maxHeight: 45,
    marginVertical: 4,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 6,
  },
  filterChip: {
    backgroundColor: '#252526',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  filterChipActive: {
    backgroundColor: '#0e639c',
    borderColor: '#0e639c',
  },
  filterChipText: {
    color: '#a0a0a0',
    fontSize: 12,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    gap: 14,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  headerBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0e639c',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  openExistingBtn: {
    borderWidth: 1,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 13.5,
    fontWeight: 'bold',
  },
});
