import React, { useState, useEffect } from "react";
import { LogBox, AppRegistry } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

// LogBox.ignoreAllLogs();
import { AstraChatScreen } from "./src/ai/components/AstraChatScreen";
import { ProjectPicker } from "./src/ide/components/ProjectPicker";
import { IDELayout } from "./src/ide/components/IDELayout";
import { PRootService } from "./src/ide/services/prootService";
import { FloatingChatOverlay } from "./src/ai/components/FloatingChatOverlay";
import { ThemeProvider } from "./src/theme/themeContext";
import { ideActionService } from "./src/ide/services/ideActionService";

// Register Android System Overlay Root Component
AppRegistry.registerComponent("FloatingChatOverlay", () => FloatingChatOverlay);

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<"chat" | "picker" | "editor">("picker");
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    PRootService.ensureReady().catch(() => {});

    const unsubSwitchWs = ideActionService.subscribe("SWITCH_WORKSPACE", ({ workspaceId }) => {
      if (workspaceId) {
        handleOpenWorkspace(workspaceId);
      }
    });

    return () => {
      unsubSwitchWs();
    };
  }, []);

  const handleOpenWorkspace = (workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    setCurrentScreen("editor");
  };

  const handleNavigateToChat = (workspaceId?: string) => {
    if (workspaceId) {
      setActiveWorkspaceId(workspaceId);
    }
    setCurrentScreen("chat");
  };

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        {currentScreen === "chat" && (
          <AstraChatScreen
            workspaceId={activeWorkspaceId || undefined}
            onNavigateToWorkspaces={() => setCurrentScreen("picker")}
            onNavigateToEditor={() => setCurrentScreen("editor")}
          />
        )}
        {currentScreen === "picker" && (
          <ProjectPicker
            onOpenWorkspace={handleOpenWorkspace}
            onNavigateToChat={() => handleNavigateToChat()}
          />
        )}
        {currentScreen === "editor" && (
          <IDELayout
            workspaceId={activeWorkspaceId || undefined}
            onBackToPicker={() => setCurrentScreen("picker")}
            onOpenFullChat={() => handleNavigateToChat(activeWorkspaceId || undefined)}
          />
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
