import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Keyboard,
} from "react-native";
import { terminalViewStyles as styles } from "./terminal/terminalViewStyles";
import { useTerminalSession } from "./terminal/useTerminalSession";
import { useTerminalKeyboardPad } from "./terminal/useTerminalKeyboardPad";
import { AnsiRenderer } from "./terminal/AnsiRenderer";
import { TerminalHeader } from "./terminal/TerminalHeader";
import { ExtraKeysBar } from "./terminal/ExtraKeysBar";
import { XtermView, XtermViewHandle } from "./terminal/XtermView";
import { getBannerTitle } from "./terminal/terminalBuffer";
import { PTY_XTERM_ENABLED } from "./terminal/ptyConfig";
import { useTerminalInput } from "./terminal/useTerminalInput";
import {
  estimateTerminalGrid,
  buildViewportExport,
  sameGrid,
  TerminalGrid,
} from "./terminal/terminalGeometry";
import { loadKeyboardMouseMode, subscribeConfigChanges } from "../services/configService";
import { useTheme } from "../../theme/themeContext";
import { useOrientation } from "../../theme/useOrientation";

interface TerminalViewProps {
  workspaceId?: string;
  /** Hidden tab: pause xterm bridge flush until visible. Sessions keep running. */
  visible?: boolean;
}

export function TerminalView({ workspaceId, visible = true }: TerminalViewProps) {
  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    activeOutput,
    fontSize,
    theme,
    toastMessage,
    scrollRef,
    sendInput,
    runCommandDirectly,
    navigateHistory,
    copyActiveOutput,
    copyXtermSelection,
    pasteFromClipboard,
    isCtrlActive,
    isAltActive,
    setIsCtrlActive,
    setIsAltActive,
    isReady,
    zoomIn,
    zoomOut,
    addNewSession,
    closeSession,
    restartActiveSession,
    clearActiveSession,
  } = useTerminalSession({ workspaceId });
  const { theme: appTheme } = useTheme();
  const { width: windowWidth, height: windowHeight } = useOrientation();
  const isTaskTab = activeSessionId.startsWith("task-");
  // PTY mode: real terminal (xterm.js) for shell sessions; the RN scrollback
  // renderer stays for task tabs and as the flag-off fallback.
  const isXterm = PTY_XTERM_ENABLED && !isTaskTab;
  const xtermRef = useRef<XtermViewHandle>(null);

  const [keyboardMouseMode, setKeyboardMouseMode] = useState(false);
  const keyboardMouseModeRef = useRef(false);
  keyboardMouseModeRef.current = keyboardMouseMode;

  useEffect(() => {
    loadKeyboardMouseMode().then((val) => {
      keyboardMouseModeRef.current = val;
      setKeyboardMouseMode(val);
    });
    const unsub = subscribeConfigChanges((cfg) => {
      if (cfg.keyboardMouseMode !== undefined) {
        keyboardMouseModeRef.current = !!cfg.keyboardMouseMode;
        setKeyboardMouseMode(!!cfg.keyboardMouseMode);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", () => {
      if (keyboardMouseModeRef.current) {
        Keyboard.dismiss();
      }
    });
    return () => sub.remove();
  }, []);

  const keyboardPad = useTerminalKeyboardPad(windowHeight);
  const viewportSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const sentGridRef = useRef<Record<string, TerminalGrid>>({});

  const {
    currentInput,
    isFocused,
    setIsFocused,
    inputRef,
    handleFocusTerminal,
    handleDoubleTap,
    handleDirectInput,
    handleKeyPress,
    sendEnter,
    handleExtraPrintable,
    handleExtraRaw,
    handleExtraEnter,
    clearInput,
  } = useTerminalInput({
    isXterm,
    sendInput,
    runCommandDirectly,
    navigateHistory,
    isCtrlActive,
    isAltActive,
    setIsCtrlActive,
    setIsAltActive,
    activeSessionId,
  });

  // Publish COLUMNS/LINES once the native session is ready and whenever the
  // viewport grid changes (rotation, font zoom). Skipped in PTY mode: the
  // kernel window size (TIOCSWINSZ from xterm's fit) is authoritative there.
  useEffect(() => {
    if (!isReady || isTaskTab || isXterm) return;
    const { w, h } = viewportSizeRef.current;
    if (w <= 0 || h <= 0) return;
    const grid = estimateTerminalGrid(w, h, fontSize);
    if (sameGrid(sentGridRef.current[activeSessionId] || null, grid)) return;
    sentGridRef.current[activeSessionId] = grid;
    const timer = setTimeout(() => {
      sendInput(buildViewportExport(grid));
    }, 350);
    return () => clearTimeout(timer);
  }, [isReady, isTaskTab, isXterm, windowWidth, windowHeight, fontSize, activeSessionId, sendInput]);

  // Stray CTRL/ALT taps must not poison later typing (e.g. armed CTRL + "s"
  // = XOFF freeze). Disarm after a few idle seconds.
  useEffect(() => {
    if (!isCtrlActive && !isAltActive) return;
    const t = setTimeout(() => {
      setIsCtrlActive(false);
      setIsAltActive(false);
    }, 6000);
    return () => clearTimeout(t);
  }, [isCtrlActive, isAltActive, setIsCtrlActive, setIsAltActive]);

  return (
    <View style={[styles.container, { backgroundColor: appTheme.bgPrimary, paddingBottom: keyboardPad }]}>
      {/* Terminal Header Bar */}
      <TerminalHeader
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onAddSession={addNewSession}
        onCloseSession={closeSession}
        onRestartSession={restartActiveSession}
        onClearSession={() => {
          clearInput();
          if (isXterm) {
            sendInput("clear\n");
            return;
          }
          clearActiveSession();
        }}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onCopyOutput={
          isXterm
            ? () =>
                copyXtermSelection(() =>
                  xtermRef.current?.requestSelection().then((t) => t || "") ||
                  Promise.resolve("")
                )
            : copyActiveOutput
        }
        onPasteClipboard={pasteFromClipboard}
      />

      {/* Terminal Viewport: xterm grid for PTY sessions, scrollback otherwise */}
      {isXterm ? (
        <XtermView
          ref={xtermRef}
          sessionId={activeSessionId}
          fontSize={fontSize}
          theme={theme}
          background={theme.background}
          foreground={theme.foreground}
          cursor={theme.cursor}
          banner={getBannerTitle(workspaceId, theme.id !== "light")}
          onRequestKeyboard={handleFocusTerminal}
          visible={visible}
        />
      ) : (
      <ScrollView
        ref={scrollRef}
        style={[styles.viewport, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.viewportContent}
        keyboardShouldPersistTaps="handled"
        onLayout={(e) => {
          viewportSizeRef.current = {
            w: e.nativeEvent.layout.width,
            h: e.nativeEvent.layout.height,
          };
        }}
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
      )}

      {/* Termux-style extra keys row (hidden for read-only task tabs) */}
      <ExtraKeysBar
        ctrlActive={isCtrlActive}
        altActive={isAltActive}
        onToggleCtrl={() => setIsCtrlActive((v) => !v)}
        onToggleAlt={() => setIsAltActive((v) => !v)}
        onPrintable={handleExtraPrintable}
        onRaw={handleExtraRaw}
        onEnter={handleExtraEnter}
        disabled={isTaskTab}
      />

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
        defaultValue=" "
        showSoftInputOnFocus={!keyboardMouseMode}
        onChangeText={handleDirectInput}
        onKeyPress={handleKeyPress}
        autoCapitalize="none"
        autoCorrect={false}
        // visible-password forces third-party keyboards (SwiftKey/Gboard) to
        // drop predictions + auto-capitalization, both of which corrupt shell
        // input ("Vim" for "vim", mid-command rewrites).
        autoComplete="off"
        keyboardType="visible-password"
        spellCheck={false}
        multiline={false}
        blurOnSubmit={false}
        disableFullscreenUI={true}
        caretHidden={true}
        returnKeyType="send"
        onSubmitEditing={sendEnter}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </View>
  );
}
