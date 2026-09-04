import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  Keyboard,
} from "react-native";
import { useTerminalSession } from "./terminal/useTerminalSession";
import { AnsiRenderer } from "./terminal/AnsiRenderer";
import { TerminalHeader } from "./terminal/TerminalHeader";
import { ExtraKeysBar } from "./terminal/ExtraKeysBar";
import { XtermView, XtermViewHandle } from "./terminal/XtermView";
import { getBannerTitle } from "./terminal/terminalBuffer";
import { PTY_XTERM_ENABLED } from "./terminal/ptyConfig";
import { ThemePickerModal } from "./terminal/ThemePickerModal";
import {
  estimateTerminalGrid,
  buildViewportExport,
  sameGrid,
  TerminalGrid,
} from "./terminal/terminalGeometry";
import { useTheme } from "../../theme/themeContext";
import { useOrientation } from "../../theme/useOrientation";

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

  const [rawInputValue, setRawInputValue] = useState<string>(" ");
  const [currentInput, setCurrentInput] = useState<string>("");
  // Soft-keyboard height for pinning the shortcut row above it. The manifest
  // says adjustResize, but edge-to-edge leaves the layout unshrunk, so the
  // keys row ends up behind the keyboard — pad manually instead.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  // Full (keyboard-closed) window height. If the OS did shrink the layout,
  // only pad the difference so we never double-shift.
  const closedHeightRef = useRef(windowHeight);
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  useEffect(() => {
    if (keyboardHeight === 0 && windowHeight > 0) {
      closedHeightRef.current = Math.max(closedHeightRef.current, windowHeight);
    }
  }, [keyboardHeight, windowHeight]);
  const osReclaimed = Math.max(0, closedHeightRef.current - windowHeight);
  const keyboardPad = Math.max(0, keyboardHeight - osReclaimed);
  const [isFocused, setIsFocused] = useState<boolean>(true);
  const [showThemeModal, setShowThemeModal] = useState<boolean>(false);
  const inputRef = useRef<TextInput>(null);
  const lastTapRef = useRef<number>(0);
  const viewportSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const sentGridRef = useRef<Record<string, TerminalGrid>>({});
  // Synchronous mirror of the echo buffer. State lags a render behind, so
  // submit paths must read the ref — otherwise a fast type+Enter drops the
  // last keystroke (it hadn't reached state yet when Enter fired).
  const currentInputRef = useRef<string>("");
  const setEchoInput = (next: string) => {
    currentInputRef.current = next;
    setCurrentInput(next);
  };
  // Last native catcher text actually observed. The catcher holds a rotating
  // blank sentinel so every programmatic reset changes the value (defeats
  // React's same-value bailout and forces the keyboard to converge).
  const SENTINELS = [" ", " \u200B"];
  const sentinelIdxRef = useRef<number>(0);
  const lastNativeRef = useRef<string>(" ");
  const resetCatcher = () => {
    sentinelIdxRef.current = (sentinelIdxRef.current + 1) % SENTINELS.length;
    const s = SENTINELS[sentinelIdxRef.current];
    lastNativeRef.current = s;
    // Land the reset natively first: at burst speed React's controlled-value
    // round-trip lags behind the IME, commits pile onto stale text, and the
    // differ then re-sends already-sent bytes (shell receives duplicated
    // input). setNativeProps applies immediately; the state sync below keeps
    // React's recorded value consistent so later renders don't fight it.
    try {
      inputRef.current?.setNativeProps({ text: s });
    } catch (_) {}
    setRawInputValue(s);
  };

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

  // Stable identity so the memoized XtermView doesn't re-render with us.
  // Focus is synchronous: any deferred window drops taps (e.g. send) that
  // land between the terminal tap and the keyboard catching up.
  const handleFocusTerminal = useCallback(() => {
    setIsFocused(true);
    // The soft keyboard always lives on the RN catcher — in xterm mode too
    // (xterm's textarea is disabled). Never blur a focused input: the old
    // blur+refocus cycle opened a ~40ms window that ate keystrokes.
    if (inputRef.current?.isFocused()) return;
    inputRef.current?.focus();
  }, []);

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
    const cmd = currentInputRef.current;
    setEchoInput("");
    if (cmd.trim()) {
      runCommandDirectly(cmd);
    } else {
      sendInput("\n");
    }
  };

  // Shared native-text differ: onChangeText races programmatic resets and
  // coalesces strokes, so compare against the last observed text. Returns
  // backspaced count + genuinely new tail.
  const diffNativeText = (text: string): { removed: number; added: string } => {
    const prev = lastNativeRef.current;
    lastNativeRef.current = text;
    let i = 0;
    while (i < prev.length && i < text.length && prev[i] === text[i]) i++;
    return { removed: prev.length - i, added: text.slice(i) };
  };
  // Drop-proof ingestion for the pipe shell. Backspace stays handled here
  // only (never onKeyPress).
  const handlePipeInput = (text: string) => {
    const { removed, added } = diffNativeText(text);

    let echo = currentInputRef.current;
    if (removed > 0) echo = echo.slice(0, Math.max(0, echo.length - removed));

    if (added.includes("\n") || added.includes("\r")) {
      // Multi-line paste: submit each complete line, keep the tail echoing.
      const parts = added.split(/[\n\r]+/);
      const trailingPartial = /[\n\r]$/.test(added) ? "" : (parts.pop() as string);
      setIsCtrlActive(false);
      setIsAltActive(false);
      for (const seg of parts) {
        setEchoInput(echo + seg);
        submitCurrentInput();
        echo = "";
      }
      setEchoInput(echo + trailingPartial);
      resetCatcher();
      return;
    }

    if (added.length === 1 && (isCtrlActive || isAltActive)) {
      // Pending Ctrl/Alt toggle turns the next key into a control sequence.
      if (removed > 0) setEchoInput(echo);
      if (isCtrlActive && added.toUpperCase() === "C") setEchoInput("");
      sendInput(added);
      resetCatcher();
      return;
    }

    if (added || removed > 0) {
      if (added) {
        setIsCtrlActive(false);
        setIsAltActive(false);
        setEchoInput(echo + added);
      } else {
        setEchoInput(echo);
      }
    }
    resetCatcher();
  };

  // PTY mode: the soft keyboard lives on the RN catcher (xterm's textarea
  // is disabled — its async composition handling drops fast Gboard input).
  // Same diff ingestion, but bytes go raw to the pty: the line discipline
  // echoes, so backspaces become DELs and newlines execute in the shell.
  const handleXtermInput = (text: string) => {
    const { removed, added } = diffNativeText(text);
    if (__DEV__ && (removed > 0 || added)) {
      console.log(`[xterm-in] removed=${removed} added=${JSON.stringify(added)} t=${Date.now()}`);
    }
    if (removed > 0) {
      sendInput("\x7f".repeat(Math.min(removed, 256)));
    }
    // A lone newline is the soft keyboard's Enter key (Gboard commits "\n",
    // some IMEs "\r\n" — neither fires onKeyPress reliably). The pty must
    // receive CR: in canonical mode ICRNL turns it into a submit, and raw-mode
    // TUIs (opencode, vim, htop) bind submit to CR while LF means Ctrl+J /
    // "insert newline". Multi-char additions are pastes — their LFs stay raw
    // so the shell still executes line-by-line.
    if (added === "\n" || added === "\r\n") {
      sendInput("\r");
    } else if (added) {
      sendInput(added);
    }
    resetCatcher();
  };

  const handleDirectInput = (text: string) => {
    if (isXterm) {
      handleXtermInput(text);
      return;
    }
    handlePipeInput(text);
  };

  // Termux-style extra-keys routing. Pipe mode: printables join the local
  // echo buffer (no tty echo on pipes), control sequences go raw. PTY mode:
  // everything goes raw — the pty line discipline echoes and readline owns
  // history/completion, exactly like Termux.
  const handleExtraPrintable = (ch: string) => {
    if (isXterm || isCtrlActive || isAltActive) {
      sendInput(ch);
    } else {
      setEchoInput(currentInputRef.current + ch);
    }
    handleFocusTerminal();
  };

  const handleExtraRaw = (data: string) => {
    if (!isXterm && data === "\t" && currentInputRef.current) {
      // Flush the echoed line first so Tab completes the real text.
      setIsCtrlActive(false);
      setIsAltActive(false);
      sendInput(`${currentInputRef.current}\t`);
      return;
    }
    setIsCtrlActive(false);
    setIsAltActive(false);
    sendInput(data);
    handleFocusTerminal();
  };

  const handleExtraEnter = () => {
    if (isXterm) {
      sendInput("\r");
      handleFocusTerminal();
    } else {
      submitCurrentInput();
    }
  };

  const handleKeyPress = (e: any) => {
    const key = e.nativeEvent.key;
    if (isXterm) {
      // xterm owns the keyboard; the catcher is a safety net only. Enter is
      // deliberately NOT sent here: every keyboard (soft + hardware) also
      // commits the newline as text, and handleXtermInput translates that
      // single commit to CR. Sending here too would double-submit.
      if (key === "ArrowUp") sendInput("\x1b[A");
      else if (key === "ArrowDown") sendInput("\x1b[B");
      return;
    }
    // Note: Backspace is handled solely in handleDirectInput (onChangeText "")
    // to avoid double-deleting on Android soft keyboards which fire both events.
    if (key === "Enter") {
      submitCurrentInput();
    } else if (key === "ArrowUp") {
      const prevCmd = navigateHistory("up");
      if (prevCmd !== null) {
        setEchoInput(prevCmd);
      }
    } else if (key === "ArrowDown") {
      const nextCmd = navigateHistory("down");
      if (nextCmd !== null) {
        setEchoInput(nextCmd);
      }
    }
  };

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
          if (isXterm) {
            sendInput("clear\n");
            return;
          }
          setEchoInput("");
          clearActiveSession();
        }}
        onOpenThemePicker={() => setShowThemeModal(true)}
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
          background={theme.background}
          foreground={theme.foreground}
          cursor={theme.cursor}
          banner={getBannerTitle(workspaceId)}
          onRequestKeyboard={handleFocusTerminal}
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
        value={rawInputValue}
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
        onSubmitEditing={() => {
          if (isXterm) sendInput("\r");
          else submitCurrentInput();
        }}
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
    minHeight: 0,
    minWidth: 0,
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
