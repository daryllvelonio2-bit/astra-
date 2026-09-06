import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/themeContext";
import {
  provisionVSCode,
  isVSCodeProvisioned,
  isVSCodeRunning,
  startVSCodeServer,
  buildVSCodeUrl,
  getVSCodeDiagnostics,
  VSCodeProvisionProgress,
} from "../services/vscodeService";
import { VSCodeInstallCard } from "./VSCodeInstallCard";
import { INJECTED_KEYBOARD_GUARD } from "../services/vscodeKeyboardScript";

const MAX_LOG_LINES = 200;

type VSCodePhase = "checking" | "not-installed" | "installing" | "stopped" | "starting" | "running" | "error";

export function VSCodeView({
  workspaceDir,
  visible = true,
}: {
  workspaceDir?: string;
  visible?: boolean;
}) {
  const { theme } = useTheme();
  const [phase, setPhase] = useState<VSCodePhase>("checking");
  const [progress, setProgress] = useState<VSCodeProvisionProgress | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [statusNote, setStatusNote] = useState("");
  const mountedRef = useRef(true);
  const webViewRef = useRef<WebView>(null);
  const isKeyboardUnlockedRef = useRef(false);

  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "KEYBOARD_STATE") {
        isKeyboardUnlockedRef.current = !!data.unlocked;
        if (!data.unlocked) {
          Keyboard.dismiss();
        }
      }
    } catch (_) {}
  }, []);



  const injectGuard = useCallback(() => {
    try {
      webViewRef.current?.injectJavaScript(INJECTED_KEYBOARD_GUARD);
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (visible && phase === "running") {
      injectGuard();
      const t1 = setTimeout(injectGuard, 600);
      const t2 = setTimeout(injectGuard, 2000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [visible, phase, injectGuard]);

  const pushLog = useCallback((line: string) => {
    setLog((prev) => {
      const next = [...prev, line];
      return next.length > MAX_LOG_LINES ? next.slice(next.length - MAX_LOG_LINES) : next;
    });
  }, []);

  const handleStart = useCallback(async () => {
    setPhase("starting");
    setStatusNote("Opening VS Code…");
    const ok = await startVSCodeServer(pushLog, workspaceDir);
    if (!mountedRef.current) return;
    if (ok) {
      setPhase("running");
      setStatusNote("");
    } else {
      setPhase("error");
      setStatusNote("Start did not complete — tap Diagnose for details.");
    }
  }, [pushLog, workspaceDir]);

  const refreshState = useCallback(async () => {
    try {
      const provisioned = await isVSCodeProvisioned();
      if (!mountedRef.current) return;
      if (!provisioned) {
        setPhase("not-installed");
        return;
      }
      const running = await isVSCodeRunning();
      if (!mountedRef.current) return;
      if (running) {
        setPhase("running");
      } else {
        // Automatically start VS Code when provisioned
        handleStart();
      }
    } catch (_) {
      if (mountedRef.current) {
        setPhase("not-installed");
      }
    }
  }, [handleStart]);

  useEffect(() => {
    mountedRef.current = true;
    if (visible) {
      refreshState();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [visible, refreshState]);

  const handleInstall = useCallback(async () => {
    setLog([]);
    setProgress({ stage: "Preparing environment…", percent: 5 });
    setPhase("installing");
    pushLog("Starting VS Code installation…");
    const ok = await provisionVSCode(pushLog, (p) => {
      if (mountedRef.current) setProgress(p);
    });
    if (!mountedRef.current) return;
    if (ok) {
      pushLog("VS Code installed successfully — starting…");
      handleStart();
    } else {
      pushLog("Install failed — see log above.");
      setPhase("error");
    }
  }, [pushLog, handleStart]);

  const handleDiagnose = useCallback(async () => {
    pushLog("--- diagnostics ---");
    pushLog(await getVSCodeDiagnostics());
  }, [pushLog]);

  if (phase === "checking") {
    return (
      <View style={[styles.center, { backgroundColor: theme.bgPrimary }]}>
        <ActivityIndicator size="small" color={theme.accent} />
        <Text style={[styles.note, { color: theme.textSecondary }]}>Checking VS Code…</Text>
        <TouchableOpacity
          style={[styles.skipBtn, { backgroundColor: theme.bgTertiary }]}
          onPress={() => setPhase("not-installed")}
          activeOpacity={0.7}
        >
          <Text style={[styles.skipBtnText, { color: theme.textSecondary }]}>Skip check</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const targetUrl = buildVSCodeUrl(workspaceDir);

  if (phase === "running") {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
          <WebView
            ref={webViewRef}
            key={targetUrl}
            source={{ uri: targetUrl }}
            style={[styles.webview, { backgroundColor: theme.bgPrimary }]}
            originWhitelist={["*"]}
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            allowsInlineMediaPlayback
            startInLoadingState
            injectedJavaScriptBeforeContentLoaded={INJECTED_KEYBOARD_GUARD}
            injectedJavaScript={INJECTED_KEYBOARD_GUARD}
            onMessage={handleMessage}
            onLoadEnd={injectGuard}
            renderLoading={() => (
              <View style={[styles.center, { backgroundColor: theme.bgPrimary }]}>
                <ActivityIndicator size="large" color={theme.accent} />
                <Text style={[styles.note, { color: theme.accent }]}>Loading VS Code…</Text>
              </View>
            )}
          />
        </View>
      </KeyboardAvoidingView>
    );
  }

  if (phase === "installing") {
    return <VSCodeInstallCard progress={progress} log={log} />;
  }

  return (
    <View style={[styles.center, { backgroundColor: theme.bgPrimary }]}>
      <Ionicons
        name={phase === "starting" ? "play-circle-outline" : "code-slash-outline"}
        size={40}
        color={phase === "starting" ? theme.accent : theme.textMuted}
      />
      <Text style={[styles.title, { color: theme.textPrimary }]}>
        {phase === "starting" ? "Opening VS Code…" : "VS Code in your app"}
      </Text>
      <Text style={[styles.note, { color: theme.textSecondary }]}>
        {phase === "not-installed"
          ? "Real VS Code running inside Linux. No passwords needed."
          : phase === "starting"
            ? statusNote || "Starting server on localhost:8082…"
            : statusNote || "Something went wrong."}
      </Text>
      {(phase === "not-installed" || phase === "error" || phase === "stopped") && (
        <View style={styles.btnRow}>
          {phase === "not-installed" || phase === "error" ? (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.sendButtonBg }]}
              onPress={handleInstall}
              activeOpacity={0.8}
            >
              <Ionicons name="download-outline" size={14} color={theme.sendButtonIcon} />
              <Text style={[styles.actionBtnText, { color: theme.sendButtonIcon }]}>
                {phase === "error" ? "Retry install" : "Install (~230MB)"}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.sendButtonBg }]}
              onPress={handleStart}
              activeOpacity={0.8}
            >
              <Ionicons name="play" size={14} color={theme.sendButtonIcon} />
              <Text style={[styles.actionBtnText, { color: theme.sendButtonIcon }]}>Start VS Code</Text>
            </TouchableOpacity>
          )}
          {phase === "error" && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.bgTertiary }]}
              onPress={handleDiagnose}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionBtnText, { color: theme.textPrimary }]}>Diagnose</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.bgTertiary }]}
            onPress={() => {
              setPhase("checking");
              refreshState();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={14} color={theme.textPrimary} />
            <Text style={[styles.actionBtnText, { color: theme.textPrimary }]}>Recheck</Text>
          </TouchableOpacity>
        </View>
      )}
      {phase === "starting" && (
        <ActivityIndicator size="small" color={theme.accent} style={{ marginTop: 8 }} />
      )}
      {log.length > 0 && phase !== "starting" && (
        <ScrollView style={[styles.setupLog, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
          {log.slice(-60).map((line, i) => (
            <Text key={i} style={[styles.logLine, { color: theme.textSecondary }]} selectable>
              {line}
            </Text>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8, padding: 20 },
  title: { fontSize: 16, fontWeight: "700" },
  note: { fontSize: 12, textAlign: "center", lineHeight: 17 },
  skipBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 7, marginTop: 10 },
  skipBtnText: { fontSize: 12, fontWeight: "600" },
  btnRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8 },
  actionBtnText: { fontSize: 13, fontWeight: "700" },
  setupLog: { width: "100%", maxHeight: 220, marginTop: 8, borderRadius: 8, borderWidth: 1, padding: 8 },
  logLine: { fontSize: 10, fontFamily: "monospace", lineHeight: 14 },
  webview: { flex: 1 },
});
