import { Workspace } from "../../ide/services/workspaceService";
import { runningTasksService } from "../services/runningTasksService";

export interface AstraPromptOptions {
  query: string;
  workingDir: string;
  workspace?: Workspace;
  activeFileName?: string;
}

/**
 * Constructs contextual prompt headers with working directory, active tasks, and IDE capabilities.
 */
export function buildAstraPrompt({
  query,
  workingDir,
  workspace,
  activeFileName,
}: AstraPromptOptions): string {
  if (query.includes("[WORKSPACE CONTEXT:")) {
    return query;
  }

  const workspaceName = workspace?.name || (workspace?.id ? workspace.id : "Default Workspace");
  const activeTasks = runningTasksService.getRunningTasks();
  const taskListStr =
    activeTasks.length > 0
      ? activeTasks
          .map(
            (t) =>
              `• ${t.command} (URL: ${t.url || `http://127.0.0.1:${t.port}`}, Port: ${t.port || "N/A"}, Status: ${t.status})`
          )
          .join("\n")
      : "None";

  let contextHeader = `[WORKSPACE CONTEXT: Working Directory = "${workingDir}", Project = "${workspaceName}"]
[ACTIVE RUNNING SERVERS/TASKS:
${taskListStr}
]
[APP & IDE CONTROL: You have direct control over the app UI. When you create or modify files, the IDE will automatically open and display them in the editor. When you start dev servers ('expo start', 'php artisan serve', 'vite', 'http.server'), the IDE will automatically switch to the Browser tab and load the preview. You can also explicitly emit action tags if needed: [IDE_ACTION: OPEN_FILE <path>], [IDE_ACTION: OPEN_BROWSER <url>], [IDE_ACTION: SWITCH_TAB <editor|terminal|browser>], [IDE_ACTION: SWITCH_WORKSPACE <workspace-id>].]
[GLOBAL ACCESS: You have full root execution permissions inside Alpine Linux to install global tools ('apk add <pkg>', 'npm install -g <pkg>', 'pip install <pkg>') or manage local project dependencies inside "${workingDir}" ('npm install', 'composer require', etc.).]
[RUNNING APPS & SERVERS: When asked to run an app or dev server ('npx expo start', 'npm start', 'npm run dev', 'vite', 'php artisan serve', 'python -m http.server'), ALWAYS run the server in the background using is_background: true on run_shell_command. For React Native in Web mode ('expo start --web'), ensure web dependencies are installed first: run 'npx expo install react-dom react-native-web' if missing, then start 'npx expo start --web --port 8085'. For Expo Go mobile app, run 'npx expo start --lan' or 'npx expo start --localhost --port 8085' with is_background: true (using port 8085 or LAN to avoid debug port 8081) and provide the Expo Go exp://127.0.0.1:8085 link. For web apps, provide http://127.0.0.1:<port>. Never run persistent servers synchronously in the foreground!]
[DIRECTORY PRESENTATION: When listing or reporting files and directory contents, format them using clean markdown bullet lists with icons (📁 for folders, 📄 for files, 🎮 for game files), grouping folders first, rather than printing raw unformatted ls -la terminal output blocks.]
`;

  if (activeFileName) {
    contextHeader += `[ACTIVE FILE: "${activeFileName}"]\n`;
  }

  return `${contextHeader}\n${query}`;
}

/**
 * Safely escapes prompt string for bash shell argument pass-through.
 */
export function escapeShellPrompt(prompt: string): string {
  return prompt.replace(/"/g, '\\"').replace(/\$/g, "\\$").replace(/`/g, "\\`");
}
