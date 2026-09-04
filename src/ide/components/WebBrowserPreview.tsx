import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import * as WebBrowser from "expo-web-browser";
import { runningTasksService, RunningTask } from "../../ai/services/runningTasksService";
import { PRootService } from "../services/prootService";
import { startTerminalSession, writeTerminalInput } from "../../../modules/linux-runner/src";
import { WebBrowserNavBar } from "./browser/WebBrowserNavBar";
import { WebBrowserPortChips } from "./browser/WebBrowserPortChips";
import { WebBrowserErrorView } from "./browser/WebBrowserErrorView";
import { useTheme } from "../../theme/themeContext";
import { useOrientation } from "../../theme/useOrientation";

interface WebBrowserPreviewProps {
  initialUrl?: string;
  activeHtmlContent?: string;
  activeFileName?: string;
  workspaceId?: string;
}

export function WebBrowserPreview({
  initialUrl = "http://127.0.0.1:8000",
  activeHtmlContent,
  activeFileName,
  workspaceId,
}: WebBrowserPreviewProps) {
  const { theme } = useTheme();
  const { isLandscape } = useOrientation();
  const [url, setUrl] = useState(initialUrl);
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [runningTasks, setRunningTasks] = useState<RunningTask[]>([]);
  const [isStartingServer, setIsStartingServer] = useState(false);

  const webViewRef = useRef<WebView>(null);

  const handleReload = () => {
    setHasError(false);
    setErrorMessage("");
    setReloadKey((k) => k + 1);
  };

  // Sync when initialUrl prop changes
  useEffect(() => {
    if (initialUrl) {
      const normalized = initialUrl.replace(/localhost/gi, "127.0.0.1").replace(/0\.0\.0\.0/g, "127.0.0.1");
      if (normalized !== url) {
        setUrl(normalized);
        setInputUrl(normalized);
        setHasError(false);
        setErrorMessage("");
        setReloadKey((k) => k + 1);
      }
    }
  }, [initialUrl]);

  // Subscribe to live background servers
  useEffect(() => {
    const unsub = runningTasksService.subscribe((tasks) => {
      setRunningTasks(tasks);
      if (tasks.length > 0) {
        const activeTask = tasks.find((t) => t.url || t.port) || tasks[0];
        let taskUrl = activeTask.url || (activeTask.port ? `http://127.0.0.1:${activeTask.port}` : undefined);
        if (taskUrl) {
          taskUrl = taskUrl.replace(/^exp:\/\//i, "http://").replace(/localhost/gi, "127.0.0.1").replace(/0\.0\.0\.0/g, "127.0.0.1");
          if (taskUrl !== url && (url === "http://127.0.0.1:8000" || url === "http://localhost:8000")) {
            setUrl(taskUrl);
            setInputUrl(taskUrl);
            setHasError(false);
            setReloadKey((k) => k + 1);
          }
        }
      }
    });
    return unsub;
  }, [url]);

  const handleNavigate = (targetUrl?: string) => {
    let finalUrl = (targetUrl || inputUrl).trim();
    if (!finalUrl) return;

    if (finalUrl.startsWith("exp://")) {
      finalUrl = finalUrl.replace(/^exp:\/\//i, "http://");
    }

    finalUrl = finalUrl.replace(/localhost/gi, "127.0.0.1").replace(/0\.0\.0\.0/g, "127.0.0.1");

    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      if (/^:?\d+$/.test(finalUrl)) {
        const port = finalUrl.replace(/^:/, "");
        finalUrl = `http://127.0.0.1:${port}`;
      } else {
        finalUrl = "http://" + finalUrl;
      }
    }
    setHasError(false);
    setErrorMessage("");
    setUrl(finalUrl);
    setInputUrl(finalUrl);
    setReloadKey((k) => k + 1);
  };

  const handleOpenExternal = async () => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      console.error("Failed to open external browser:", e);
    }
  };

  const setPort = (port: string) => {
    const newUrl = `http://127.0.0.1:${port}`;
    setInputUrl(newUrl);
    handleNavigate(newUrl);
  };

  const currentPort = (() => {
    try {
      const match = url.match(/:(\d+)/);
      return match ? match[1] : "8080";
    } catch (_) {
      return "8080";
    }
  })();

  const handleStartQuickServer = async () => {
    if (isStartingServer) return;
    setIsStartingServer(true);
    try {
      const port = currentPort || "8080";
      // Ensure persistent server session is active inside PRoot
      await startTerminalSession("server-session", workspaceId);
      const serverCmd = `pkill -f "http.server ${port}" 2>/dev/null; if [ -d dist ]; then python3 -m http.server ${port} -d dist & else python3 -m http.server ${port} & fi\n`;
      writeTerminalInput("server-session", serverCmd);

      // Register task in tracker
      runningTasksService.addTask({
        command: `python3 -m http.server ${port}`,
        port: parseInt(port, 10),
        url: `http://127.0.0.1:${port}`,
        workspaceId,
      });

      setTimeout(() => {
        setIsStartingServer(false);
        handleReload();
      }, 1500);
    } catch (_) {
      setIsStartingServer(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
      {/* Landscape: fullscreen content only — no nav bar, port chips, or loading bar. */}
      {!isLandscape && (
        <WebBrowserNavBar
          url={url}
          inputUrl={inputUrl}
          loading={loading}
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          hasError={hasError}
          onGoBack={() => webViewRef.current?.goBack()}
          onGoForward={() => webViewRef.current?.goForward()}
          onReload={handleReload}
          onInputChange={setInputUrl}
          onSubmit={() => handleNavigate()}
          onClearInput={() => setInputUrl("")}
          onOpenExternal={handleOpenExternal}
        />
      )}

      {!isLandscape && (
        <WebBrowserPortChips
          runningTasks={runningTasks}
          currentPort={currentPort}
          onSelectTask={(t) => handleNavigate(t.url || `http://127.0.0.1:${t.port || "8080"}`)}
          onSelectPort={setPort}
        />
      )}

      {loading && !isLandscape && (
        <View style={[styles.loadingBar, { backgroundColor: theme.bgTertiary, borderBottomColor: theme.border }]}>
          <ActivityIndicator size="small" color={theme.accent} style={{ transform: [{ scale: 0.7 }] }} />
          <Text style={[styles.loadingText, { color: theme.accent }]} numberOfLines={1}>Loading {url}...</Text>
        </View>
      )}

      <View style={[styles.previewContainer, { backgroundColor: theme.bgPrimary }]}>
        {hasError ? (
          <WebBrowserErrorView
            url={url}
            errorMessage={errorMessage}
            currentPort={currentPort}
            runningTasks={runningTasks}
            isStartingServer={isStartingServer}
            onNavigate={handleNavigate}
            onStartServer={handleStartQuickServer}
            onReload={handleReload}
            onOpenExternal={handleOpenExternal}
          />
        ) : (
          <WebView
            key={reloadKey}
            ref={webViewRef}
            source={{ uri: url }}
            style={[styles.webview, { backgroundColor: theme.bgPrimary }]}
            originWhitelist={["*"]}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            mixedContentMode="always"
            allowsInlineMediaPlayback={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={[styles.centerLoading, { backgroundColor: theme.bgPrimary }]}>
                <ActivityIndicator size="large" color={theme.accent} />
                <Text style={[styles.loadingUrl, { color: theme.accent }]}>{url}</Text>
              </View>
            )}
            renderError={(errorDomain, errorCode, errorDesc) => (
              <WebBrowserErrorView
                url={url}
                errorMessage={errorDesc || "net::ERR_CONNECTION_REFUSED"}
                currentPort={currentPort}
                runningTasks={runningTasks}
                isStartingServer={isStartingServer}
                onNavigate={handleNavigate}
                onStartServer={handleStartQuickServer}
                onReload={handleReload}
                onOpenExternal={handleOpenExternal}
              />
            )}
            onLoadStart={() => {
              setLoading(true);
              setHasError(false);
            }}
            onLoadEnd={() => setLoading(false)}
            onNavigationStateChange={(navState) => {
              setCanGoBack(navState.canGoBack);
              setCanGoForward(navState.canGoForward);
              setInputUrl(navState.url);
            }}
            onError={(e) => {
              setLoading(false);
              setHasError(true);
              setErrorMessage(e.nativeEvent.description || "net::ERR_CONNECTION_REFUSED");
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 3,
    gap: 6,
    borderBottomWidth: 1,
  },
  loadingText: {
    fontSize: 11,
  },
  previewContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  centerLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingUrl: {
    fontSize: 12,
    fontFamily: "monospace",
  },
});
