import React, { useState, useEffect } from "react";
import { LogBox, AppRegistry, View, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

// LogBox.ignoreAllLogs();
import { AstraChatScreen } from "./src/ai/components/AstraChatScreen";
import { ProjectPicker } from "./src/ide/components/ProjectPicker";
import { IDELayout } from "./src/ide/components/IDELayout";
import { PRootService } from "./src/ide/services/prootService";
import { FloatingChatOverlay } from "./src/ai/components/FloatingChatOverlay";
import { ThemeProvider } from "./src/theme/themeContext";
import { ideActionService } from "./src/ide/services/ideActionService";
import { StartupWizard } from "./src/onboarding/StartupWizard";
import { loadAstraEnabled, loadHasCompletedStartup, subscribeConfigChanges } from "./src/ide/services/configService";

// Register Android System Overlay Root Component
AppRegistry.registerComponent("FloatingChatOverlay", () => FloatingChatOverlay);

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<"chat" | "picker" | "editor">("picker");
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [hasCompletedStartup, setHasCompletedStartup] = useState<boolean | null>(null);
  const [astraEnabled, setAstraEnabled] = useState(true);
  // Keep-alive: chat + editor stay mounted once opened and are only hidden.
  // Conditional unmounting used to orphan in-flight agent turns (the dead
  // hook instance kept streaming into discarded state while the remount
  // showed a frozen "thinking" message) and kill terminal WebViews.
  const [visited, setVisited] = useState<Set<"chat" | "editor">>(new Set());

  const showScreen = (screen: "chat" | "picker" | "editor") => {
    if (screen === "chat" || screen === "editor") {
      setVisited((prev) => {
        if (prev.has(screen)) return prev;
        const next = new Set(prev);
        next.add(screen);
        return next;
      });
    }
    setCurrentScreen(screen);
  };

  useEffect(() => {
    PRootService.ensureReady().catch(() => {});
    loadHasCompletedStartup().then(setHasCompletedStartup);
    loadAstraEnabled().then(setAstraEnabled);

    const unsubSwitchWs = ideActionService.subscribe("SWITCH_WORKSPACE", ({ workspaceId }) => {
      if (workspaceId) {
        handleOpenWorkspace(workspaceId);
      }
    });
    const unsubConfig = subscribeConfigChanges((cfg) => {
      setAstraEnabled(cfg.astraEnabled ?? true);
    });

    return () => {
      unsubSwitchWs();
      unsubConfig();
    };
  }, []);

  const handleOpenWorkspace = (workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    showScreen("editor");
  };

  const handleNavigateToChat = (workspaceId?: string) => {
    if (!astraEnabled) return;
    if (workspaceId) {
      setActiveWorkspaceId(workspaceId);
    }
    showScreen("chat");
  };

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        {hasCompletedStartup === false ? (
          <StartupWizard onComplete={() => setHasCompletedStartup(true)} />
        ) : (
          <>
            {astraEnabled && visited.has("chat") && (
              <View style={[styles.screen, currentScreen !== "chat" && styles.hidden]}>
                <AstraChatScreen
                  workspaceId={activeWorkspaceId || undefined}
                  onNavigateToWorkspaces={() => showScreen("picker")}
                  onNavigateToEditor={() => showScreen("editor")}
                />
              </View>
            )}
            {currentScreen === "picker" && (
              <ProjectPicker
                onOpenWorkspace={handleOpenWorkspace}
                onNavigateToChat={() => handleNavigateToChat()}
                onRerunStartup={() => setHasCompletedStartup(false)}
              />
            )}
            {visited.has("editor") && (
              <View style={[styles.screen, currentScreen !== "editor" && styles.hidden]}>
                <IDELayout
                  workspaceId={activeWorkspaceId || undefined}
                  onBackToPicker={() => showScreen("picker")}
                  onOpenFullChat={astraEnabled ? () => handleNavigateToChat(activeWorkspaceId || undefined) : undefined}
                />
              </View>
            )}
          </>
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  hidden: {
    display: "none",
  },
});
