import { AppTheme, EditorUiType } from "../ide/services/configService";

export type StartupStepId = "theme" | "astra" | "permissions" | "editor" | "github";

export interface StartupConfig {
  selectedTheme: AppTheme;
  astraEnabled: boolean;
  defaultEditorUi: EditorUiType;
  githubConfigured: boolean;
}
