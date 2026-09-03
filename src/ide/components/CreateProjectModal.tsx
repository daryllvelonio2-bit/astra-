import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/themeContext';
import { DirectoryPickerModal } from './DirectoryPickerModal';

const TEMPLATES = ['Blank', 'Godot 4 (GDScript)', 'Laravel (PHP)', 'React Native', 'Vite TS', 'Express API', 'Python CLI'];

interface CreateProjectModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateProject: (name: string, template: string, customPath?: string) => void;
}

export function CreateProjectModal({ visible, onClose, onCreateProject }: CreateProjectModalProps) {
  const { theme } = useTheme();
  const [projectName, setProjectName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('Blank');
  const [useCustomDirectory, setUseCustomDirectory] = useState(false);
  const [customDirectoryPath, setCustomDirectoryPath] = useState('');
  const [isDirectoryPickerVisible, setDirectoryPickerVisible] = useState(false);

  const handleSubmit = () => {
    if (!projectName.trim()) {
      Alert.alert('Validation Error', 'Please enter a project name.');
      return;
    }
    if (useCustomDirectory && !customDirectoryPath.trim()) {
      Alert.alert('Validation Error', 'Please select or enter a custom directory path.');
      return;
    }

    onCreateProject(
      projectName.trim(),
      selectedTemplate,
      useCustomDirectory ? customDirectoryPath.trim() : undefined
    );
    setProjectName('');
    setSelectedTemplate('Blank');
    setUseCustomDirectory(false);
    setCustomDirectoryPath('');
    onClose();
  };

  const folderName = projectName.trim().replace(/[\/\\]/g, "-");
  const computedPreviewPath = useCustomDirectory && customDirectoryPath.trim()
    ? (() => {
        const clean = customDirectoryPath.trim().replace(/^file:\/\//, "").replace(/\/+$/, "");
        const lastSegment = clean.split("/").filter(Boolean).pop() || "";
        if (folderName && lastSegment.toLowerCase() !== folderName.toLowerCase()) {
          return `${clean}/${folderName}/`;
        }
        return `${clean}/`;
      })()
    : (projectName.trim() ? `~/storage/workspaces/${projectName.toLowerCase().replace(/[^a-z0-9_-]/g, "-")}/` : "");

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.bottomSheet, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>New Workspace Project</Text>
            
            {/* Project Name */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Project Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.border, color: theme.textPrimary }]}
              placeholder="e.g. mobile-todo-app"
              placeholderTextColor={theme.textMuted}
              value={projectName}
              onChangeText={setProjectName}
              autoCapitalize="none"
              autoFocus
            />

            {/* Template Selection */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Select Starter Template</Text>
            <View style={styles.templateGrid}>
              {TEMPLATES.map((template) => (
                <TouchableOpacity
                  key={template}
                  style={[
                    styles.templateChip,
                    { backgroundColor: theme.bgTertiary, borderColor: theme.border },
                    selectedTemplate === template && { backgroundColor: theme.accent, borderColor: theme.accent },
                  ]}
                  onPress={() => setSelectedTemplate(template)}
                >
                  <Text
                    style={[
                      styles.templateChipText,
                      { color: selectedTemplate === template ? "#ffffff" : theme.textSecondary },
                      selectedTemplate === template && { fontWeight: "700" },
                    ]}
                  >
                    {template}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Workspace Directory Location Option */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Workspace Location</Text>
            <View style={styles.locationToggleRow}>
              <TouchableOpacity
                style={[
                  styles.locationTypeBtn,
                  { backgroundColor: theme.bgTertiary, borderColor: theme.border },
                  !useCustomDirectory && { backgroundColor: `${theme.accent}20`, borderColor: theme.accent },
                ]}
                onPress={() => setUseCustomDirectory(false)}
              >
                <Ionicons
                  name="folder-outline"
                  size={16}
                  color={!useCustomDirectory ? theme.accent : theme.textMuted}
                />
                <Text
                  style={[
                    styles.locationTypeBtnText,
                    { color: !useCustomDirectory ? theme.accent : theme.textSecondary },
                  ]}
                >
                  Default Storage
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.locationTypeBtn,
                  { backgroundColor: theme.bgTertiary, borderColor: theme.border },
                  useCustomDirectory && { backgroundColor: `${theme.accent}20`, borderColor: theme.accent },
                ]}
                onPress={() => setUseCustomDirectory(true)}
              >
                <Ionicons
                  name="file-tray-full-outline"
                  size={16}
                  color={useCustomDirectory ? theme.accent : theme.textMuted}
                />
                <Text
                  style={[
                    styles.locationTypeBtnText,
                    { color: useCustomDirectory ? theme.accent : theme.textSecondary },
                  ]}
                >
                  Specific Directory
                </Text>
              </TouchableOpacity>
            </View>

            {/* Custom Directory Input & Browse Button */}
            {useCustomDirectory && (
              <View style={[styles.customDirBox, { backgroundColor: theme.bgTertiary, borderColor: theme.border }]}>
                <Text style={[styles.customDirLabel, { color: theme.textSecondary }]}>
                  Parent Directory on Phone
                </Text>
                <View style={styles.customDirInputRow}>
                  <TextInput
                    style={[
                      styles.customDirInput,
                      { backgroundColor: theme.bgInput, borderColor: theme.border, color: theme.textPrimary },
                    ]}
                    placeholder="/sdcard/Documents/..."
                    placeholderTextColor={theme.textMuted}
                    value={customDirectoryPath}
                    onChangeText={setCustomDirectoryPath}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={[styles.browseBtn, { backgroundColor: theme.accent }]}
                    onPress={() => setDirectoryPickerVisible(true)}
                  >
                    <Ionicons name="folder-open" size={16} color="#fff" />
                    <Text style={styles.browseBtnText}>Browse</Text>
                  </TouchableOpacity>
                </View>

                {computedPreviewPath ? (
                  <View style={[styles.previewPathBox, { backgroundColor: `${theme.accent}14`, borderColor: `${theme.accent}30` }]}>
                    <Ionicons name="folder-outline" size={13} color={theme.accent} />
                    <Text style={[styles.previewPathText, { color: theme.accent }]} numberOfLines={1}>
                      Folder: {computedPreviewPath}
                    </Text>
                  </View>
                ) : null}

                <Text style={[styles.customDirHint, { color: theme.textMuted }]}>
                  A new project folder will be created inside this directory.
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.bgTertiary }]} onPress={onClose}>
                <Text style={[styles.buttonTextCancel, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.accent }]} onPress={handleSubmit}>
                <Text style={styles.buttonTextCreate}>Create & Open</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Directory Picker Sub-modal */}
          <DirectoryPickerModal
            visible={isDirectoryPickerVisible}
            initialPath={customDirectoryPath}
            onClose={() => setDirectoryPickerVisible(false)}
            onSelectDirectory={(chosenPath) => setCustomDirectoryPath(chosenPath)}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  bottomSheet: {
    backgroundColor: '#252526',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#3c3c3c',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  input: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    fontSize: 15,
    marginBottom: 16,
    borderWidth: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  templateChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
  },
  templateChipText: {
    fontSize: 13,
  },
  locationToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  locationTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  locationTypeBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  customDirBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  customDirLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  customDirInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  customDirInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    fontSize: 13,
    fontFamily: 'monospace',
  },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 6,
    gap: 5,
  },
  browseBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  previewPathBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 8,
  },
  previewPathText: {
    fontSize: 11.5,
    fontFamily: 'monospace',
    flex: 1,
  },
  customDirHint: {
    fontSize: 11,
    marginTop: 6,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonTextCancel: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonTextCreate: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
