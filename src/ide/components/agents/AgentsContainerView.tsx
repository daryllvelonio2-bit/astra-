import React from "react";
import { View, StyleSheet } from "react-native";
import { AstraChatScreen } from "../../../ai/components/AstraChatScreen";
import { AgentsDisabledView } from "../AgentsDisabledView";
import { Workspace } from "../../services/workspaceService";

interface AgentsContainerViewProps {
  workspace?: Workspace | null;
  astraEnabled: boolean;
  onNavigateToWorkspaces?: () => void;
  onNavigateToEditor?: () => void;
  onOpenSettings: () => void;
  onOpenMarketplace?: () => void;
  visible?: boolean;
}

export function AgentsContainerView({
  workspace,
  astraEnabled,
  onNavigateToWorkspaces,
  onNavigateToEditor,
  onOpenSettings,
  visible = true,
}: AgentsContainerViewProps) {
  return (
    <View style={[styles.container, !visible && styles.hidden]}>
      {astraEnabled ? (
        <AstraChatScreen
          workspaceId={workspace?.id}
          onNavigateToWorkspaces={onNavigateToWorkspaces}
          onNavigateToEditor={onNavigateToEditor}
        />
      ) : (
        <AgentsDisabledView onOpenSettings={onOpenSettings} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hidden: { display: "none" },
});
