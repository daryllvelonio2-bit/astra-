import React, { useState, useEffect } from "react";
import { LogBox, View, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ProjectPicker } from "./src/ide/components/ProjectPicker";
import { IDELayout } from "./src/ide/components/IDELayout";
import { PRootService } from "./src/ide/services/prootService";
import { ThemeProvider } from "./src/theme/themeContext";
import { ideActionService } from "./src/ide/services/ideActionService";
import { StartupWizard } from "./src/onboarding/StartupWizard";
import { AppBootScreen } from "./src/onboarding/AppBootScreen";
import { loadAstraEnabled, loadHasCompletedStartup, subscribeConfigChanges } from "./src/ide/services/configService";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<"picker" | "editor">("picker");
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [hasCompletedStartup, setHasCompletedStartup] = useState<boolean | null>(null);
  const [bootVisible, setBootVisible] = useState(true);
  const [bootPhase, setBootPhase] = useState("Loading settings…");
  // True only when settings AND sandbox are actually ready — the splash
  // waits for this (not just its timer) so the phase text stays truthful.
  const [bootDone, setBootDone] = useState(false);
  const [astraEnabled, setAstraEnabled] = useState(true);
  // Keep-alive: editor stays mounted once opened and is only hidden.
  const [visited, setVisited] = useState<Set<"editor">>(new Set());

  const showScreen = (screen: "picker" | "editor") => {
    if (screen === "editor") {
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
    // Phase labels pace the 3s wave (1s each) so every stage gets screen
    // time; dismissal still waits for real readiness below.
    setBootPhase("Loading settings…");
    loadHasCompletedStartup()
      .then((completed) => {
        setHasCompletedStartup(completed);
        setBootPhase("Preparing sandbox…");
        return PRootService.ensureReady().catch(() => {});
      })
      .then(() => {
        setBootPhase("Readying workspace…");
        setBootDone(true);
      });
    // Safety: never trap the user on the splash if init hangs
    const bootFallback = setTimeout(() => setBootDone(true), 15000);
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
      clearTimeout(bootFallback);
      unsubSwitchWs();
      unsubConfig();
    };
  }, []);

  const handleOpenWorkspace = (workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    showScreen("editor");
  };

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        {bootVisible && (
          <AppBootScreen
            isReady={bootDone}
            phase={bootPhase}
            onAnimationEnd={() => setBootVisible(false)}
          />
        )}
        {hasCompletedStartup === false ? (
          <StartupWizard onComplete={() => setHasCompletedStartup(true)} />
        ) : (
          <>
            {currentScreen === "picker" && (
              <ProjectPicker
                onOpenWorkspace={handleOpenWorkspace}
                onRerunStartup={() => setHasCompletedStartup(false)}
              />
            )}
            {visited.has("editor") && (
              <View style={[styles.screen, currentScreen !== "editor" && styles.hidden]}>
                <IDELayout
                  workspaceId={activeWorkspaceId || undefined}
                  onBackToPicker={() => showScreen("picker")}
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
