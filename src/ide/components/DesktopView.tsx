import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  useWindowDimensions,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/themeContext";
import { useOrientation } from "../../theme/useOrientation";
import {
  provisionDesktop,
  isDesktopProvisioned,
  isDesktopRunning,
  startDesktop,
  stopDesktop,
  getDesktopViewerPassword,
  getDesktopDiagnostics,
  fitDesktopGeometry,
  buildViewerUrl,
} from "../services/desktopService";
import { DesktopSetupCard, DesktopPhase } from "./DesktopSetupCard";

const MAX_LOG_LINES = 200;

/**
 * XFCE desktop tab: Xvnc + startxfce4 + websockify run in the Alpine guest
 * (all localhost-only), rendered here through the bundled noVNC client.
 * In landscape mode, it displays full screen with no notification bar (status bar hidden),
 * with safe-area floating controls for refit and exiting fullscreen.
 */
export function DesktopView({
  visible,
  onFullscreenChange,
}: {
  visible: boolean;
  onFullscreenChange?: (fullscreen: boolean) => void;
}) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { width: winW, height: winH } = useWindowDimensions();
  const { isLandscape } = useOrientation();
  const geometry = fitDesktopGeometry(winW, winH);

  const [phase, setPhase] = useState<DesktopPhase>("checking");
  const [log, setLog] = useState<string[]>([]);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [startedGeometry, setStartedGeometry] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState("");
  const [fullscreen, setFullscreen] = useState(isLandscape);

  const webViewRef = useRef<WebView>(null);
  const mountedRef = useRef(true);
  const prevLandscapeRef = useRef(isLandscape);

  const pushLog = useCallback((line: string) => {
    setLog((prev) => {
      const next = [...prev, line];
      return next.length > MAX_LOG_LINES
        ? next.slice(next.length - MAX_LOG_LINES)
        : next;
    });
  }, []);

  const refreshState = useCallback(async () => {
    const provisioned = await isDesktopProvisioned();
    if (!mountedRef.current) return;
    if (!provisioned) {
      setPhase("not-installed");
      return;
    }
    const running = await isDesktopRunning();
    if (!mountedRef.current) return;
    if (running) {
      const pass = await getDesktopViewerPassword();
      if (!mountedRef.current) return;
      setViewerUrl(buildViewerUrl(pass));
      setPhase("running");
    } else {
      setPhase("stopped");
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refreshState();
    return () => {
      mountedRef.current = false;
    };
  }, [refreshState]);

  const handleInstall = useCallback(async () => {
    setLog([]);
    setPhase("installing");
    pushLog("Installing desktop stack (Xvnc + XFCE + noVNC, ~1GB)…");
    const ok = await provisionDesktop(pushLog);
    if (!mountedRef.current) return;
    pushLog(ok ? "Desktop stack installed." : "Install failed — see log above.");
    if (ok) {
      setPhase("stopped");
    } else {
      setPhase("error");
    }
  }, [pushLog]);

  const handleStart = useCallback(async () => {
    setPhase("starting");
    setStatusNote(`Starting Xvnc + XFCE @ ${geometry}…`);
    const ok = await startDesktop((line) => pushLog(line), geometry);
    if (!mountedRef.current) return;
    if (ok) {
      const pass = await getDesktopViewerPassword();
      if (!mountedRef.current) return;
      setViewerUrl(buildViewerUrl(pass));
      setStartedGeometry(geometry);
      setPhase("running");
      setStatusNote("");
    } else {
      setPhase("error");
      setStatusNote("Start did not complete — log above, Diagnose below.");
    }
  }, [pushLog, geometry]);

  const handleRefit = useCallback(async () => {
    // Resolution applies at Xvnc launch: stop, then start at the new aspect.
    await stopDesktop();
    if (!mountedRef.current) return;
    setViewerUrl(null);
    setStartedGeometry(null);
    handleStart();
  }, [handleStart]);

  const handleStop = useCallback(async () => {
    setFullscreen(false);
    StatusBar.setHidden(false, "slide");
    onFullscreenChange?.(false);
    await stopDesktop();
    if (!mountedRef.current) return;
    setViewerUrl(null);
    setStartedGeometry(null);
    setPhase("stopped");
  }, [onFullscreenChange]);

  const handleDiagnose = useCallback(async () => {
    pushLog("Collecting diagnostics…");
    const diag = await getDesktopDiagnostics();
    if (!mountedRef.current) return;
    for (const line of diag.split("\n")) pushLog(line);
  }, [pushLog]);

  const toggleFullscreen = useCallback(() => {
    setFullscreen((prev) => {
      const next = !prev;
      StatusBar.setHidden(next, "slide");
      onFullscreenChange?.(next);
      return next;
    });
  }, [onFullscreenChange]);

  // Landscape auto-fullscreen: rotating to landscape automatically enables
  // fullscreen and hides the notification bar; rotating back to portrait restores normal chrome.
  useEffect(() => {
    if (!visible) return;
    if (isLandscape !== prevLandscapeRef.current) {
      prevLandscapeRef.current = isLandscape;
      if (isLandscape) {
        setFullscreen(true);
        StatusBar.setHidden(true, "slide");
        onFullscreenChange?.(true);
      } else {
        setFullscreen(false);
        StatusBar.setHidden(false, "slide");
        onFullscreenChange?.(false);
      }
    }
  }, [isLandscape, visible, onFullscreenChange]);

  // When tab becomes visible, if already in landscape, ensure fullscreen is active.
  // Leaving the tab (or unmount) drops fullscreen and restores status bar.
  useEffect(() => {
    if (visible) {
      if (isLandscape) {
        setFullscreen(true);
        StatusBar.setHidden(true, "slide");
        onFullscreenChange?.(true);
      }
    } else if (fullscreen) {
      setFullscreen(false);
      StatusBar.setHidden(false, "slide");
      onFullscreenChange?.(false);
    }
  }, [visible]);

  useEffect(() => {
    return () => {
      StatusBar.setHidden(false);
      onFullscreenChange?.(false);
    };
  }, [onFullscreenChange]);

  const needsRefit =
    phase === "running" && startedGeometry !== null && startedGeometry !== geometry;

  if (phase === "running" && viewerUrl) {
    return (
      <View style={styles.viewerContainer}>
        {!fullscreen && (
          <View
            style={[
              styles.viewerBar,
              { backgroundColor: theme.bgSecondary, borderBottomColor: theme.border },
            ]}
          >
            <View style={styles.liveDotRow}>
              <View
                style={[styles.liveDot, { backgroundColor: theme.accentGreen }]}
              />
              <Text style={[styles.viewerBarText, { color: theme.textSecondary }]}>
                XFCE · {startedGeometry ?? geometry}
              </Text>
            </View>
            <View style={styles.viewerBarBtns}>
              {needsRefit && (
                <TouchableOpacity
                  style={styles.viewerBarBtn}
                  onPress={handleRefit}
                  accessibilityLabel="Restart desktop to fit rotated screen"
                >
                  <Ionicons name="scan-outline" size={16} color={theme.accent} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.viewerBarBtn}
                onPress={toggleFullscreen}
                accessibilityLabel="Fullscreen desktop"
              >
                <Ionicons name="expand-outline" size={16} color={theme.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.viewerBarBtn}
                onPress={() => webViewRef.current?.reload()}
                accessibilityLabel="Reconnect desktop"
              >
                <Ionicons name="refresh-outline" size={16} color={theme.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.viewerBarBtn}
                onPress={handleStop}
                accessibilityLabel="Stop desktop"
              >
                <Ionicons name="stop-circle-outline" size={16} color={theme.accentRed} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <WebView
          ref={webViewRef}
          source={{ uri: viewerUrl }}
          originWhitelist={["*"]}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mixedContentMode="always"
          allowsInlineMediaPlayback={true}
          androidLayerType="hardware"
          style={styles.webView}
        />

        {fullscreen && (
          <View
            style={[
              styles.floatingControls,
              {
                top: Math.max(10, insets.top),
                right: Math.max(10, insets.right),
              },
            ]}
          >
            {needsRefit && (
              <TouchableOpacity
                style={[
                  styles.floatingBtn,
                  { backgroundColor: `${theme.bgSecondary}E6`, borderColor: theme.accent },
                ]}
                onPress={handleRefit}
                accessibilityLabel="Restart desktop to fit screen"
                activeOpacity={0.7}
              >
                <Ionicons name="scan-outline" size={18} color={theme.accent} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.floatingBtn,
                { backgroundColor: `${theme.bgSecondary}E6`, borderColor: theme.border },
              ]}
              onPress={toggleFullscreen}
              accessibilityLabel="Exit fullscreen"
              activeOpacity={0.7}
            >
              <Ionicons name="contract-outline" size={18} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <DesktopSetupCard
      phase={phase}
      statusNote={statusNote}
      log={log}
      onInstall={handleInstall}
      onStart={handleStart}
      onRefresh={refreshState}
      onDiagnose={handleDiagnose}
    />
  );
}

const styles = StyleSheet.create({
  viewerContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  webView: {
    flex: 1,
    backgroundColor: "#000",
  },
  viewerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  liveDotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  viewerBarText: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  viewerBarBtns: {
    flexDirection: "row",
    gap: 12,
  },
  viewerBarBtn: {
    padding: 4,
  },
  floatingControls: {
    position: "absolute",
    flexDirection: "row",
    gap: 8,
    zIndex: 999,
  },
  floatingBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.85,
  },
});
