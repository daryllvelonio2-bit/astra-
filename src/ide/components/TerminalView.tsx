import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
} from "react-native";
import { useTerminalSession } from "./terminal/useTerminalSession";
import { AnsiRenderer } from "./terminal/AnsiRenderer";
import { TerminalHeader } from "./terminal/TerminalHeader";
import { ThemePickerModal } from "./terminal/ThemePickerModal";
import { useTheme } from "../../theme/themeContext";

interface TerminalViewProps {
  workspaceId?: string;
}

export function TerminalView({ workspaceId }: TerminalViewProps) {
  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    activeOutput,
    fontSize,
    theme,
    themeId,
    setThemeId,
    toastMessage,
    scrollRef,
    sendInput,
    runCommandDirectly,
    navigateHistory,
    zoomIn,
    zoomOut,
    addNewSession,
    closeSession,
    restartActiveSession,
    clearActiveSession,
  } = useTerminalSession({ workspaceId });
  const { theme: appTheme } = useTheme();

  const [rawInputValue, setRawInputValue] = useState<string>(" ");
  const [currentInput, setCurrentInput] = useState<string>("");
  const [isFocused, setIsFocused] = useState<boolean>(true);
  const [showThemeModal, setShowThemeModal] = useState<boolean>(false);
  const inputRef = useRef<TextInput>(null);
  const lastTapRef = useRef<number>(0);

  const handleFocusTerminal = () => {
    setIsFocused(true);
    inputRef.current?.blur();
    setTimeout(() => {
      inputRef.current?.focus();
    }, 40);
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 450;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      handleFocusTerminal();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  const submitCurrentInput = () => {
    const cmd = currentInput;
    setCurrentInput("");
    if (cmd.trim()) {
      runCommandDirectly(cmd);
    } else {
      sendInput("\n");
    }
  };

  const handleDirectInput = (text: string) => {
    if (text === "") {
      setCurrentInput((prev) => prev.slice(0, -1));
    } else if (text.length > 1) {
      const typed = text.startsWith(" ") ? text.slice(1) : text;
      if (typed.includes("\n") || typed.includes("\r")) {
        submitCurrentInput();
      } else {
        setCurrentInput((prev) => prev + typed);
      }
    } else if (text !== " ") {
      setCurrentInput((prev) => prev + text);
    }
    setRawInputValue(" ");
  };

  const handleKeyPress = (e: any) => {
    const key = e.nativeEvent.key;
    // Note: Backspace is handled solely in handleDirectInput (onChangeText "")
    // to avoid double-deleting on Android soft keyboards which fire both events.
    if (key === "Enter") {
      submitCurrentInput();
    } else if (key === "ArrowUp") {
      const prevCmd = navigateHistory("up");
      if (prevCmd !== null) {
        setCurrentInput(prevCmd);
      }
    } else if (key === "ArrowDown") {
      const nextCmd = navigateHistory("down");
      if (nextCmd !== null) {
        setCurrentInput(nextCmd);
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: appTheme.bgPrimary }]}>
      {/* Terminal Header Bar */}
      <TerminalHeader
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onAddSession={addNewSession}
        onCloseSession={closeSession}
        onRestartSession={restartActiveSession}
        onClearSession={() => {
          setCurrentInput("");
          clearActiveSession();
        }}
        onOpenThemePicker={() => setShowThemeModal(true)}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
      />

      {/* Terminal Viewport */}
      <ScrollView
        ref={scrollRef}
        style={[styles.viewport, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.viewportContent}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={handleDoubleTap} style={styles.viewportInner}>
          <AnsiRenderer
            rawText={activeOutput + currentInput}
            isFocused={isFocused}
            fontSize={fontSize}
            theme={theme}
          />
        </Pressable>
      </ScrollView>

      {/* Toast Feedback Notification */}
      {toastMessage && (
        <View
          style={[
            styles.toastContainer,
            { backgroundColor: appTheme.bgElevated, borderColor: appTheme.border },
          ]}
        >
          <Text style={[styles.toastText, { color: appTheme.textPrimary }]}>
            {toastMessage}
          </Text>
        </View>
      )}

      {/* Invisible Direct Terminal Input Catcher */}
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={rawInputValue}
        onChangeText={handleDirectInput}
        onKeyPress={handleKeyPress}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        multiline={false}
        blurOnSubmit={false}
        disableFullscreenUI={true}
        caretHidden={true}
        keyboardType="default"
        returnKeyType="send"
        onSubmitEditing={() => submitCurrentInput()}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />

      {/* Theme Modal */}
      <ThemePickerModal
        visible={showThemeModal}
        themeId={themeId}
        activeTheme={theme}
        onSelectTheme={setThemeId}
        onClose={() => setShowThemeModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  viewport: {
    flex: 1,
  },
  viewportInner: {
    flex: 1,
    minHeight: "100%",
  },
  viewportContent: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: "100%",
  },
  toastContainer: {
    position: "absolute",
    top: 40,
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    zIndex: 999,
    opacity: 0.95,
  },
  toastText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "monospace",
  },
  hiddenInput: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    opacity: 0.01,
  },
});
