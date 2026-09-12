import { useState, useEffect, useRef } from "react";
import {
  EditorSettings,
  DEFAULT_EDITOR_SETTINGS,
  loadEditorSettings,
  loadKeyboardMouseMode,
  subscribeConfigChanges,
} from "../../services/configService";

export interface EditorConfigState {
  editorSettings: EditorSettings;
  keyboardMouseMode: boolean;
}

/**
 * Hook to manage reactive editor settings and peripheral modes.
 * Subscribes to global config changes and maintains synced refs for low-latency keystroke loops.
 */
export function useEditorConfig() {
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(DEFAULT_EDITOR_SETTINGS);
  const [keyboardMouseMode, setKeyboardMouseMode] = useState(false);
  const keyboardMouseModeRef = useRef(false);
  const editorSettingsRef = useRef(DEFAULT_EDITOR_SETTINGS);

  useEffect(() => {
    loadEditorSettings().then((s) => {
      editorSettingsRef.current = s;
      setEditorSettings(s);
    });
    loadKeyboardMouseMode().then((val) => {
      keyboardMouseModeRef.current = val;
      setKeyboardMouseMode(val);
    });

    const unsub = subscribeConfigChanges((cfg) => {
      if (cfg.editorSettings) {
        const merged: EditorSettings = {
          ...DEFAULT_EDITOR_SETTINGS,
          ...cfg.editorSettings,
        };
        editorSettingsRef.current = merged;
        setEditorSettings(merged);
      }
      if (cfg.keyboardMouseMode !== undefined) {
        keyboardMouseModeRef.current = !!cfg.keyboardMouseMode;
        setKeyboardMouseMode(!!cfg.keyboardMouseMode);
      }
    });

    return unsub;
  }, []);

  return {
    editorSettings,
    editorSettingsRef,
    keyboardMouseMode,
    keyboardMouseModeRef,
  };
}
