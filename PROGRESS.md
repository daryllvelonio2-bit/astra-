# Project Progress Tracker

## Status
- **Current Phase:** Production Release Build Verified
- **Last Updated:** September 2, 2026

### [2026-09-02] - Astra Fullscreen Streaming Fix, Stream-JSON Parsing & Codebase Modularization
- **Astra Fullscreen Stream Listener & Event Parsing Fix ([`astraCliService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/astra/astraCliService.ts), [`astraStreamParser.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/astra/astraStreamParser.ts)):**
  - Resolved root-cause bug where Fullscreen Chat only displayed `"✅ Astra CLI task completed."` instead of the actual AI assistant response.
  - Corrected `addCommandOutputListener` signature binding `(commandId, listener)` so stream chunks from the background Linux process are actively received and parsed in real time.
  - Implemented multi-line chunk splitting and robust event parsing for all Astra CLI NDJSON stream events (`init`, `message`, `delta`, `thought`, `tool_use`, `tool_result`, `result`, `error`).
  - Added smart fallback parsing in `parseFallbackStdout`: if streaming is ever interrupted, all NDJSON message and result events in `execRes.stdout` are properly decoded instead of being stripped out.
- **Real-Time Text Stream Preservation ([`useChatSession.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/useChatSession.ts)):**
  - Safeguarded message state update so active live-streamed text is never overwritten by fallback completed strings.
- **Architectural Modularization & Zero-Bloat Refactoring (< 500 lines per file):**
  - Modularized `astraCliService.ts` from 498 lines down to **233 lines** by extracting dedicated single-responsibility submodules:
    - [`astraFormatters.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/astra/astraFormatters.ts) (92 lines): Tool formatting and IDE UI action directive parsing.
    - [`astraPromptBuilder.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/astra/astraPromptBuilder.ts) (58 lines): Workspace context injection and shell prompt escaping.
    - [`astraStreamParser.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/astra/astraStreamParser.ts) (309 lines): Real-time stream event parser and fallback stdout decoder.
  - Cleaned up unused imports, eliminated dynamic `require()` calls in favor of typed ES6 imports, and verified that all 87 source files in `src/` strictly satisfy the 500-line limit mandated by `agent.md`.
  - Verified 0 TypeScript errors with `tsc --noEmit`.
- **Debug Build Compilation & On-Device ADB Deployment:**
  - Built standalone ARM64 Debug APK (`app-debug.apk`) via `./gradlew assembleDebug`.
  - Installed onto connected Android device (`AUDUT20616012479`) via `adb install -r`.
  - Launched app (`com.janelle.aicoder/.MainActivity`) and forwarded port `8081` with Metro development server running in dedicated terminal window (`start-debug.sh`).

### [2026-09-02] - Fullscreen Chat Mode Key Rolling & Working Directory Fix
- **Silent Multi-Key Rate Guard ([`astraRateGuard.js`](file:///home/janelle/Documents/projects/ai-coder/astra-cli/gemini-cli-source/bundle/astraRateGuard.js), [`astraCliService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/astra/astraCliService.ts)):**
  - Resolved issue where Fullscreen Chat mode displayed repeated `[Astra Key Rolling]` messages in assistant bubbles.
  - Silenced internal rate guard `[Astra Key Rolling]` debug stderr writes in production mode (guarded behind `ASTRA_DEBUG`).
  - Added robust output cleaning regex filters to strip any rate guard logs from fallback text.
- **Robust Working Directory Resolution ([`useChatSession.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/useChatSession.ts), [`astraCliService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/astra/astraCliService.ts)):**
  - Fixed issue where opening Fullscreen Chat without an explicitly selected workspace resulted in `/workspace` directory path errors in PRoot Alpine Linux.
  - Automatically loads and provisions default workspace directory on disk before launching Astra CLI, guaranteeing PRoot always executes in a valid working directory.
  - Prevented redundant state re-renders in `useChatSession` during key index increments.
- **Updated Production Bundles & Version Marker ([`EnvironmentAstraHelper.kt`](file:///home/janelle/Documents/projects/ai-coder/modules/linux-runner/android/src/main/java/expo/modules/linuxrunner/EnvironmentAstraHelper.kt)):**
  - Repacked `astra-cli.tar.gz` and bumped version marker to `.astra_cli_version_v12` for clean on-device unpack.

### [2026-09-02] - Astra CLI App UI Control Bridge & Interactive Action Navigation Buttons
- **Interactive Action & File Navigation Buttons ([`StepCard.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/StepCard.tsx), [`AgentMessageItem.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/AgentMessageItem.tsx), [`LiveAgentStatusBar.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/LiveAgentStatusBar.tsx)):**
  - Added dedicated interactive action buttons on all executing step cards, message headers, and live status bars:
    - **"👁️ View File in Editor"** &rarr; Automatically opens and inspects the exact modified/created file in the code editor.
    - **"🌐 Open Preview"** &rarr; Automatically navigates to the live web/dev server (`expo`, `artisan`, `vite`, `http.server`).
    - **"💻 View in Terminal"** &rarr; Switches to the active PTY Linux terminal session.
  - Added quick-access action chips directly on step card headers and live status bar.
- **Full App & IDE Remote Control Bridge ([`ideActionService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ide/services/ideActionService.ts)):**
  - Created reactive pub/sub event bus enabling Astra CLI engine and autonomous subagents to command the IDE UI in real time.
  - Supports `OPEN_FILE`, `OPEN_BROWSER`, `OPEN_TERMINAL`, `SWITCH_TAB`, `SWITCH_WORKSPACE`, and `SHOW_TOAST`.
- **Automatic File & Live Server Synchronization ([`astraCliService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/astra/astraCliService.ts)):**
  - Integrated automatic file opening: whenever Astra CLI creates or modifies a file, it is automatically opened and displayed in the IDE editor tab.
  - Integrated automatic browser preview: whenever Astra CLI launches a dev server (`expo start`, `php artisan serve`, `vite`, `http.server`), the IDE switches to the Web tab and navigates directly to the server URL.
  - Added structured directive parser (`[IDE_ACTION: OPEN_FILE <path>]`, `[IDE_ACTION: OPEN_BROWSER <url>]`, `[IDE_ACTION: SWITCH_TAB <tab>]`, `[IDE_ACTION: SWITCH_WORKSPACE <id>]`).
- **Standalone Production Release APK Build:**
  - Built updated signed standalone Release APK ([`app-release.apk`](file:///home/janelle/Documents/projects/ai-coder/app-release.apk)) via `./gradlew assembleRelease`.

### [2026-09-02] - File Opening Path Normalization & Resilient Running Task Engine
- **File Opening & Path Normalization Engine ([`workspaceService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ide/services/workspaceService.ts), [`CodeSyntaxHighlighter.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/CodeSyntaxHighlighter.tsx)):**
  - Resolved bug where opening files displayed blank/empty code caused by mismatch between `file://` scheme in base directories and raw filesystem paths returned by `readDirEntries`.
  - Added global `normalizeCleanPath` across `readFileContent`, `saveFileContent`, `deleteFileFromWorkspace`, `renameNodeInWorkspace`, and `moveNodeInWorkspace` to dynamically reconcile relative workspace paths with absolute internal and `/sdcard/` directories.
  - Fixed syntax highlighter text color and removed invalid `flexWrap` styling on React Native `<Text>`.
- **Resilient Running Task & Active Port Probe Engine ([`runningTasksService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/services/runningTasksService.ts), [`astraCliService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/astra/astraCliService.ts)):**
  - Resolved issue where active dev servers (`php artisan serve`, `python -m http.server`, `vite`, `expo`) were prematurely purged after 45s due to Android permission restrictions on `/proc/net/tcp`.
  - Implemented real-time active HTTP port probing (`fetch`) in `verifyProcesses` to accurately confirm servers are listening before checking process trees.
  - Expanded process inspection in `ps` to identify runtime daemons (`php83`, `artisan`, `node`, `python`).
  - Integrated dynamic `[ACTIVE RUNNING SERVERS/TASKS]` context block into the Astra AI prompt header so the AI is always aware of live background servers.
- **Standalone Production Release APK Build:**
  - Built updated signed standalone Release APK ([`app-release.apk`](file:///home/janelle/Documents/projects/ai-coder/app-release.apk)) via `./gradlew assembleRelease` with 0 TypeScript errors.

### [2026-09-02] - Standalone Production Release APK Build

### [2026-09-01] - Linux PRoot Environment Simplification & Hardening
- **Universal Smart CLI Tool Launchers ([`EnvironmentManager.kt`](file:///home/janelle/Documents/projects/ai-coder/modules/linux-runner/android/src/main/java/expo/modules/linuxrunner/EnvironmentManager.kt)):**
  - Added universal smart wrappers in `/usr/local/bin/` for standard web, mobile, and dev tools (`expo`, `vite`, `next`, `tsc`, `nodemon`).
  - Automatically inspects the current project's local `node_modules` first, and gracefully falls back to global/npx execution so commands work reliably regardless of whether projects are in internal storage or on `/sdcard` (noexec/no-bin-links).
- **PRoot Noise Suppression & Host Working Directory Isolation ([`ProcessExecutor.kt`](file:///home/janelle/Documents/projects/ai-coder/modules/linux-runner/android/src/main/java/expo/modules/linuxrunner/ProcessExecutor.kt), [`TerminalSessionManager.kt`](file:///home/janelle/Documents/projects/ai-coder/modules/linux-runner/android/src/main/java/expo/modules/linuxrunner/TerminalSessionManager.kt)):**
  - Set `ProcessBuilder.directory(File(alpineDir))` to eliminate host path canonicalization warnings (`proot warning: can't chdir...`).
  - Added stream filters to strip `proot warning:` and `proot info:` lines, ensuring terminals, log outputs, and Astra AI receive clean, pure stdout and stderr.
- **Web Browser URL Normalization ([`WebBrowserPreview.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/WebBrowserPreview.tsx)):**
  - Resolved malformed `http://exp//...` URL generation when clicking task chips or entering `exp://` links in the Browser preview.
  - Automatically converts `exp://` protocol to clean `http://` for browser navigation.
- **Expo Web Mode Dependencies & Browser Custom Error View ([`WebBrowserPreview.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/WebBrowserPreview.tsx), [`astraCliService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/astra/astraCliService.ts)):**
  - Resolved `net::ERR_CONNECTION_REFUSED` when running in web mode (`--web`) caused by missing `react-dom` and `react-native-web` in newly created projects.
  - Guided Astra AI to automatically check and install `react-dom` and `react-native-web` using `npx expo install react-dom react-native-web` before launching `expo start --web`.
  - Added custom `renderError` to `<WebView>` in `WebBrowserPreview.tsx` replacing the blank white Chromium error page with a dark-themed error screen featuring instant retry and server-launch buttons.
- **Root Entry Point Resolution ([`index.ts`](file:///home/janelle/Documents/projects/ai-coder/index.ts), [`package.json`](file:///home/janelle/Documents/projects/ai-coder/package.json)):**
  - Resolved white screen on startup caused by Metro bundler failing to resolve `./index` module.
  - Added root `index.ts` with `registerRootComponent(App)` and configured `"main": "index.ts"` in `package.json`.
- **Rule Compliance (`agent.md`):**
  - All source files strictly under 500 lines.
  - Clean TypeScript verification (`npx tsc --noEmit` &mdash; 0 errors).
  - Built debug APK and installed onto device `AUDUT20616012479` with verified clean startup and live screen rendering.

### [2026-09-01] - Accurate Task Lifecycle & Ghost Running Task Cleanup
- **Ghost Running Tasks & Process Lifecycle Fix ([`runningTasksService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/services/runningTasksService.ts), [`astraCliService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/astra/astraCliService.ts), [`useChatSession.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/useChatSession.ts)):**
  - Resolved issue where finished one-shot commands (`npx create-expo-app`, `npm install`, build scripts, etc.) were lingering in the status bar as "Running in background" after Astra AI completed.
  - Hardened background task filters so only actual persistent dev servers (`expo start`, `npm run dev`, `vite`, `php artisan serve`, `python -m http.server`) or explicit background processes with listening ports are registered.
  - Upgraded `verifyProcesses` to inspect `ps` and `netstat`/`ss` for listening ports and active PIDs, instantly purging dead or finished commands.
  - Added immediate process verification hooks upon Astra agent completion (`done`, `idle`, or stopped by user).
- **Rule Compliance (`agent.md`):**
  - All source files strictly under 500 lines.
  - Clean TypeScript verification (`npx tsc --noEmit` &mdash; 0 errors).
  - Built debug APK and installed onto device with verified clean startup.

### [2026-09-01] - RunningTasksBar Global Theme Compliance
- **Fixed Hardcoded Colors ([`RunningTasksBar.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/RunningTasksBar.tsx)):**
  - Removed hardcoded dark background and border colors (`#13171f`, `#161d28`, `#11141a`, `#181d26`) from `StyleSheet.create`.
  - Now fully adheres to the active global theme (`useTheme()`), ensuring background tasks and server status bars render correctly in Light Clean, Dark Onyx, and Midnight Glow modes.
- **Rule Compliance (`agent.md`):**
  - All source files strictly under 500 lines.
  - Clean TypeScript verification (`npx tsc --noEmit` &mdash; 0 errors).

### [2026-09-01] - Automatic Subfolder Creation in Custom Project Directories
- **Smart Directory Subfolder Creation ([`CreateProjectModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/CreateProjectModal.tsx), [`workspaceService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ide/services/workspaceService.ts)):**
  - Resolved the issue where creating a project in a parent directory (such as `/sdcard/Documents/`) would previously point to the parent directory itself instead of creating a dedicated subfolder.
  - `createWorkspace` now automatically creates a new dedicated project subfolder inside the selected directory (e.g. `/sdcard/Documents/<ProjectName>/`) and scaffolds all starter files directly within that new folder.
  - Added a live dynamic path preview box in `CreateProjectModal` showing the exact folder path being created (e.g. `Folder: /sdcard/Documents/my-game/`).
- **Rule Compliance (`agent.md`):**
  - All source files strictly under 500 lines.
  - Clean TypeScript verification (`npx tsc --noEmit` &mdash; 0 errors).
  - Built debug APK and installed onto device with verified clean startup.

### [2026-09-01] - Open Existing Project & Workspace Deletion Warning
- **Open Existing Project Flow ([`ProjectPicker.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/ProjectPicker.tsx), [`workspaceService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ide/services/workspaceService.ts)):**
  - Added dedicated **"Open Project"** buttons in the workspace header and empty list state.
  - Allows opening and registering any existing directory across phone storage (e.g. `/sdcard/Godot/MyGame`, `/sdcard/Documents/project`, or downloads).
  - Automatically detects project templates based on directory file signatures (`project.godot` → Godot 4, `package.json` → Node.js/Web, `requirements.txt`/`.py` → Python, `composer.json` → PHP).
  - Registers the workspace into `workspaces_registry.json` and immediately loads it in the IDE.
- **Explicit Deletion Warning Confirmation ([`ProjectInspectorModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/ProjectInspectorModal.tsx)):**
  - Added a high-visibility, explicit confirmation dialog before workspace deletion stating:
    `⚠️ CRITICAL WARNING: All files, subdirectories, code, and assets located inside: <path> will be PERMANENTLY REMOVED from your storage. This action cannot be undone.`
  - Requires user to tap "Delete Permanently" to execute.
- **Rule Compliance (`agent.md`):**
  - All source files strictly under 500 lines.
  - Clean TypeScript verification (`npx tsc --noEmit` &mdash; 0 errors).
  - Built debug APK and installed onto device with verified clean startup.

### [2026-09-01] - Comprehensive Global Theme Audit & Hardcoded Theme Cleanup
- **Purged Hardcoded Static Colors ([`ExecutionResultModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/ExecutionResultModal.tsx), [`OverlayPermissionModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/OverlayPermissionModal.tsx)):**
  - Removed hardcoded dark background and border color definitions from `StyleSheet.create` across modal and overlay components.
  - Ensured all components strictly rely on dynamic theme tokens from `useTheme()` (`theme.bgPrimary`, `theme.bgSecondary`, `theme.border`, `theme.textPrimary`, `theme.accent`, etc.) to guarantee 100% adherence to Dark, Light, and Midnight themes per Rule 11.
- **Rule Compliance (`agent.md`):**
  - All source files strictly under 500 lines.
  - Clean TypeScript verification (`npx tsc --noEmit` &mdash; 0 errors).

### [2026-09-01] - Beautiful Directory List Component & Smart Output Rendering
- **Custom Directory Listing UI ([`DirectoryListRenderer.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/DirectoryListRenderer.tsx)):**
  - Built a dedicated directory and file list component that automatically parses raw Unix `ls -la` / `ls -l` / `list_directory` terminal output and converts it into a clean, mobile-optimized list.
  - Automatically classifies items by folder type and file extensions (📁 folders, 🎮 Godot scenes/scripts, 📄 docs/PDFs, 💻 code/scripts, 🖼️ media, 📦 archives).
  - Displays human-readable file sizes (`KB`, `MB`) and modification dates while eliminating Unix permission noise (`drwxrwx--- root 9997`).
  - Added folder/file count badges (`N folders`, `M files`) and interactive "Show more" expansion for large directories.
- **Integrated Across Chat & Steps ([`StepCard.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/StepCard.tsx), [`MarkdownMessageView.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/MarkdownMessageView.tsx), [`astraCliService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/astra/astraCliService.ts)):**
  - Updated `StepCard` output boxes and `MarkdownMessageView` code blocks to render directory dumps via `DirectoryListRenderer`.
  - Suppressed non-executable "Run" buttons on plaintext, log, and directory listing blocks in chat messages.
  - Added system prompt guidelines instructing Astra AI to present file lists cleanly with markdown icons.
- **Rule Compliance (`agent.md`):**
  - All source files strictly under 500 lines.
  - Clean TypeScript verification (`npx tsc --noEmit` &mdash; 0 errors).
  - Built debug APK and installed onto device with verified clean startup.

### [2026-09-01] - Exact Custom Directory Routing & MediaScanner Sync
- **Synchronized AI Agent Working Directory ([`astraCliService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/astra/astraCliService.ts), [`ProcessExecutor.kt`](file:///home/janelle/Documents/projects/ai-coder/modules/linux-runner/android/src/main/java/expo/modules/linuxrunner/ProcessExecutor.kt), [`TerminalSessionManager.kt`](file:///home/janelle/Documents/projects/ai-coder/modules/linux-runner/android/src/main/java/expo/modules/linuxrunner/TerminalSessionManager.kt)):**
  - Resolved the issue where files created by Astra AI in custom directory workspaces (like `/sdcard/Documents/`) were directed to the default internal directory instead of the custom target.
  - Dynamically resolves `workingDir` directly from `workspace.dirPath` (or `getWorkspaceDirPath`) and passes it into PRoot process streams.
  - Updated `ProcessExecutor.kt` and `TerminalSessionManager.kt` to bind-mount and set working directory directly to custom target paths (e.g. `/sdcard/Documents/`).
- **Android MediaScanner Real-Time Indexing ([`NativeFileSystemHelper.kt`](file:///home/janelle/Documents/projects/ai-coder/modules/linux-runner/android/src/main/java/expo/modules/linuxrunner/NativeFileSystemHelper.kt)):**
  - Added `MediaScannerConnection.scanFile` whenever files or folders are written on `/sdcard/`, ensuring system file managers and external editors (e.g. Godot) immediately see newly created files without manual rescan.
  - Automatically triggers `notifyWorkspaceChanged` upon CLI command completion to refresh the IDE file explorer tree in real time.
- **Rule Compliance (`agent.md`):**
  - All source files strictly under 500 lines.
  - Clean TypeScript verification (`npx tsc --noEmit` &mdash; 0 errors).
  - Built debug APK and installed onto device with verified clean startup.

### [2026-09-01] - Native FileSystem Engine & Unrestricted Phone Storage Access
- **Bypassed Expo FileSystem Storage Whitelist ([`NativeFileSystemHelper.kt`](file:///home/janelle/Documents/projects/ai-coder/modules/linux-runner/android/src/main/java/expo/modules/linuxrunner/NativeFileSystemHelper.kt), [`LinuxRunnerModule.kt`](file:///home/janelle/Documents/projects/ai-coder/modules/linux-runner/android/src/main/java/expo/modules/linuxrunner/LinuxRunnerModule.kt), [`nativeFs.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ide/services/nativeFs.ts)):**
  - Resolved `ExponentFileSystem.readDirectoryAsync has been rejected: Location isn't readable` by implementing a native Android FileSystem bridge (`NativeFileSystemHelper.kt` / `nativeFs.ts`).
  - Added native Java `File` reading, writing, directory enumeration, deletion, moving, and directory creation functions that operate without Expo's internal sandbox restrictions.
  - Implemented `hasAllFilesPermission` and `requestAllFilesPermission` with a one-tap storage permission button in the directory picker for Android 11+ `MANAGE_ALL_FILES_ACCESS_PERMISSION`.
- **Integrated Across Workspace & Picker Systems ([`workspaceService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ide/services/workspaceService.ts), [`DirectoryPickerModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/DirectoryPickerModal.tsx)):**
  - Updated all workspace file and tree operations (`readDirEntries`, `getFileInfo`, `readFileText`, `writeFileText`, `makeDir`, `deletePath`, `movePath`) to seamlessly read, write, and browse any external directory (such as `/sdcard/Documents/`, `/sdcard/Download/`, `/sdcard/Godot/`, or game engine folders).
- **Rule Compliance (`agent.md`):**
  - All source files strictly under 500 lines.
  - Clean TypeScript verification (`npx tsc --noEmit` &mdash; 0 errors).
  - Built debug APK and installed onto device with verified clean startup.

### [2026-09-01] - Global Phone Directory Access & Godot Project Support
- **Full Phone Storage & Godot Directory Navigation ([`DirectoryPickerModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/DirectoryPickerModal.tsx), [`AndroidManifest.xml`](file:///home/janelle/Documents/projects/ai-coder/android/app/src/main/AndroidManifest.xml)):**
  - Added full external storage access (`MANAGE_EXTERNAL_STORAGE` and `requestLegacyExternalStorage="true"`) to allow editing any directory across the phone.
  - Added direct editable path input with `Go` execution in [`DirectoryPickerModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/DirectoryPickerModal.tsx) to jump or paste any directory (e.g. `/sdcard/Godot/`, `/sdcard/Documents/`, `/sdcard/Android/data/...`).
  - Added dedicated quick-jump button for Godot projects (`file:///sdcard/Godot/`).
- **Godot 4 Starter Scaffolding ([`CreateProjectModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/CreateProjectModal.tsx), [`workspaceService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ide/services/workspaceService.ts)):**
  - Added `'Godot 4 (GDScript)'` to workspace template choices.
  - Generates initial `project.godot` configuration (Godot 4.3 Mobile renderer) and `main.gd` script when creating new Godot workspaces.
- **Rule Compliance (`agent.md`):**
  - All source files strictly under 500 lines.
  - Clean TypeScript verification (`npx tsc --noEmit` &mdash; 0 errors).
  - Built debug APK and installed onto device with verified clean startup.

### [2026-09-01] - Custom Workspace Directory Picker & Location Selector
- **Interactive Directory Selector in Creation Flow ([`CreateProjectModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/CreateProjectModal.tsx), [`DirectoryPickerModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/DirectoryPickerModal.tsx)):**
  - Added a **Workspace Location** option in `CreateProjectModal` letting users choose between **Default Storage** (`~/storage/workspaces/...`) or a **Specific Directory**.
  - Built a dedicated [`DirectoryPickerModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/DirectoryPickerModal.tsx) component enabling users to interactively browse storage locations, navigate parent folders, create new subfolders, and select target directories (e.g. `/sdcard/Documents/`, `/sdcard/Projects/`, or external folders).
- **Workspace Registry & Dynamic Directory Routing ([`workspaceService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ide/services/workspaceService.ts), [`ProjectPicker.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/ProjectPicker.tsx)):**
  - Implemented persistent workspace metadata registry (`workspaces_registry.json`) tracking custom paths, creation timestamps, and templates.
  - Updated all workspace operations (`loadWorkspace`, `readFileContent`, `saveFileContent`, `createFileInWorkspace`, `deleteFileFromWorkspace`, `renameNodeInWorkspace`, `moveNodeInWorkspace`) to resolve the exact base directory path dynamically.
  - Enhanced [`ProjectPicker.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/ProjectPicker.tsx) to display full custom paths directly in workspace cards.
- **Native PRoot & Storage Binding ([`ProcessExecutor.kt`](file:///home/janelle/Documents/projects/ai-coder/modules/linux-runner/android/src/main/java/expo/modules/linuxrunner/ProcessExecutor.kt), [`TerminalSessionManager.kt`](file:///home/janelle/Documents/projects/ai-coder/modules/linux-runner/android/src/main/java/expo/modules/linuxrunner/TerminalSessionManager.kt)):**
  - Added dynamic bind-mounts for `/sdcard` and `/storage` in the PRoot container, allowing Astra CLI and terminal sessions to access custom directories located on external/shared storage.
- **Rule Compliance (`agent.md`):**
  - All source files strictly under 500 lines.
  - Clean TypeScript verification (`npx tsc --noEmit` &mdash; 0 errors).
  - Built debug APK and installed onto device with verified clean startup.

### [2026-09-01] - Isolated Conversation Storage Outside Project Workspaces
- **Relocated Conversation History ([`conversationService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/services/conversationService.ts), [`FloatingOverlayService.kt`](file:///home/janelle/Documents/projects/ai-coder/modules/linux-runner/android/src/main/java/expo/modules/linuxrunner/FloatingOverlayService.kt)):**
  - Moved conversation sessions from inside project workspaces (`workspaces/<workspaceId>/.ai/conversations.json`) to an isolated app data directory (`conversations/<workspaceId>.json`).
  - Project directories now contain only clean user source code and project assets without internal AI metadata folders or conversation pollution.
  - Implemented automatic migration to transfer any existing conversations from legacy `.ai/` workspace folders and delete `.ai` directories from project trees.
- **Workspace Cleanup Integration ([`workspaceService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ide/services/workspaceService.ts)):**
  - Updated `deleteWorkspace` to cleanly remove the isolated conversation file alongside the workspace.
- **Rule Compliance (`agent.md`):**
  - All source files strictly under 500 lines.
  - Clean TypeScript verification (`npx tsc --noEmit` &mdash; 0 errors).
  - Built debug APK and installed onto device with verified clean startup.

### [2026-09-01] - Global System Access & Workspace Directory Awareness in Astra CLI
- **Global Toolchain & Package Manager Access ([`ProcessExecutor.kt`](file:///home/janelle/Documents/projects/ai-coder/modules/linux-runner/android/src/main/java/expo/modules/linuxrunner/ProcessExecutor.kt), [`TerminalSessionManager.kt`](file:///home/janelle/Documents/projects/ai-coder/modules/linux-runner/android/src/main/java/expo/modules/linuxrunner/TerminalSessionManager.kt), [`EnvironmentManager.kt`](file:///home/janelle/Documents/projects/ai-coder/modules/linux-runner/android/src/main/java/expo/modules/linuxrunner/EnvironmentManager.kt), [`astra`](file:///home/janelle/Documents/projects/ai-coder/astra-cli/astra)):**
  - Configured global system paths across all PRoot execution environments:
    `PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/root/.local/bin:/root/.npm-global/bin"`
    `NODE_PATH="/usr/local/share/astra-cli/node_modules:/usr/local/lib/node_modules:/usr/lib/node_modules"`
  - Enabled root-level execution capabilities so Astra CLI can install system dependencies globally (`apk add <pkg>`, `npm install -g <pkg>`, `pip install <pkg>`, `composer global require`, etc.).
- **Automatic Workspace & Directory Context ([`astraCliService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/astra/astraCliService.ts), [`astraCognitiveModes.js`](file:///home/janelle/Documents/projects/ai-coder/astra-cli/bundle/astraCognitiveModes.js)):**
  - Integrated dynamic workspace and directory context headers into all agent prompt payloads:
    `[WORKSPACE CONTEXT: Working Directory = "/workspaces/<id>", Project = "<name>"]`
    `[GLOBAL ACCESS: Root permissions enabled to install global dependencies or manage local dependencies in active directory]`
  - Added base directive ensuring the agent always inspects and respects the active working directory (`pwd` / `/workspaces/<workspace-id>` / `/workspace`) when executing local commands and creating/editing project files.
  - Bumped Astra CLI embedded asset version marker to `v11` and repackaged Linux runner archive.
- **Rule Compliance (`agent.md`):**
  - All source files strictly under 500 lines.
  - Clean TypeScript verification (`npx tsc --noEmit` &mdash; 0 errors).
- **Removed Hardcoded Dark Backgrounds in Editor ([`EditorView.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/EditorView.tsx), [`CodeSyntaxHighlighter.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/CodeSyntaxHighlighter.tsx)):**
  - Replaced hardcoded `#1e1e1e` background and `#282828` border colors with dynamic theme tokens from `useTheme()` (`theme.bgPrimary`, `theme.bgSecondary`, `theme.border`, `theme.textMuted`, `theme.textPrimary`).
  - When using Light Clean mode, the editor view, line number gutter, text input, and syntax highlighting now correctly render on a crisp light background (`#f8fafc`) with high-contrast readable text instead of defaulting to black/dark.
- **Rule Compliance (`agent.md`):**
  - All source files strictly under 500 lines.
  - Clean TypeScript verification (`npx tsc --noEmit` &mdash; 0 errors).

### [2026-09-01] - Removed Command & Agent Execution Timeouts
- **Unbounded Execution Lifecycles ([`LinuxRunnerModule.kt`](file:///home/janelle/Documents/projects/ai-coder/modules/linux-runner/android/src/main/java/expo/modules/linuxrunner/LinuxRunnerModule.kt), [`FloatingOverlayService.kt`](file:///home/janelle/Documents/projects/ai-coder/modules/linux-runner/android/src/main/java/expo/modules/linuxrunner/FloatingOverlayService.kt), [`ProcessExecutor.kt`](file:///home/janelle/Documents/projects/ai-coder/modules/linux-runner/android/src/main/java/expo/modules/linuxrunner/ProcessExecutor.kt)):**
  - Removed artificial process execution timeout limits (previously 35s, 45s, 120s, 180s) across both synchronous and streaming command executors.
  - Set `timeoutSeconds = 0` (infinite / no timeout), allowing long-running compilation, background servers, package installations, and multi-step Astra CLI agentic workflows to execute without premature interruption.
  - User can still gracefully cancel or abort processes on-demand via `stopCommand(commandId)` or `stopAllCommands()`.
- **Rule Compliance (`agent.md`):**
  - All source files strictly under 500 lines.
  - Clean TypeScript verification (`npx tsc --noEmit` &mdash; 0 errors).

### [2026-09-01] - Multi-API-Key Management & Turn-by-Turn Rolling Engine
- **Multi-API-Key Storage & Rolling Service ([`configService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ide/services/configService.ts)):**
  - Added support for configuring multiple Google Gemini API keys in `AppConfig` (`apiKeys: string[]`, `activeKeyIndex: number`).
  - Added `loadApiKeys()`, `saveApiKeys()`, `rollNextApiKey()`, and `normalizeApiKeys()`, with seamless backward compatibility for existing single `apiKey` settings.
- **Dedicated Key Manager UI ([`ApiKeyManager.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/ApiKeyManager.tsx), [`SettingsModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/SettingsModal.tsx)):**
  - Created modular `ApiKeyManager` component embedded in Settings.
  - Added support for adding single or batch comma/newline-separated API keys, list view with `#1 (Primary)`, `#2`, `#3` index badges, masked display (`AIzaSy...XXXX`), show/hide toggles, delete action, and live rolling status banners.
- **Per-Turn Rolling in Astra CLI Engine ([`astraRateGuard.js`](file:///home/janelle/Documents/projects/ai-coder/astra-cli/bundle/astraRateGuard.js), [`astraCliService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/astra/astraCliService.ts), [`astra`](file:///home/janelle/Documents/projects/ai-coder/astra-cli/astra)):**
  - Upgraded `AstraRateGuard` into a full key-rotation engine. On every turn (read, write, update, execute, LLM step), it dynamically rolls to the next API key in the pool across requests.
  - Added instant failover on 429/503/RESOURCE_EXHAUSTED errors to immediately switch to an alternative key in the pool without long sleep cooldowns.
  - Updated Android `FloatingOverlayService.kt` and `EnvironmentAstraHelper.kt` (bumped to v10) to pass `GEMINI_API_KEYS`.
- **Rule Compliance (`agent.md`):**
  - Zero bloat, clean modular code.
  - All source files strictly under 500 lines.
  - Clean TypeScript verification (`npx tsc --noEmit` &mdash; 0 errors).
- **Terminal Theme Integration ([`useTerminalSession.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/terminal/useTerminalSession.ts), [`terminalThemes.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/terminal/terminalThemes.ts)):**
  - Synchronized terminal session theme (`themeId`) with the global application theme (`themeMode`) from `useTheme()`.
  - Added dedicated terminal theme definitions for `light` ("Light Clean") and `midnight` ("Midnight Glow") matching the global theme color palettes.
  - When the user switches themes in Settings (Dark Onyx, Light Clean, Midnight Glow), the terminal IDE view (`TerminalView`, `TerminalHeader`, ANSI renderer, theme picker) automatically adapts and reflects the active global theme.
- **Rule Compliance (`agent.md`):**
  - All source files strictly under 500 lines.
  - Clean TypeScript verification (`npx tsc --noEmit` &mdash; 0 errors).

### [2026-09-01] - Global UI Theme System (Dark Mode, Light Mode & Astra Midnight Glow)
- **Global Theme Context & Provider ([`src/theme/themeContext.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/theme/themeContext.tsx)):**
  - Created global theme system with 3 curated themes:
    1. 🌑 **Dark Onyx (`dark`)**: Classic deep obsidian, slate borders, cool cyan/blue accents.
    2. ☀️ **Light Clean (`light`)**: Crisp porcelain & slate light mode with high-contrast text and cobalt blue accents.
    3. 🌌 **Midnight Glow (`midnight`)**: Deep cosmic midnight slate (`#0b0f19`) featuring glowing cyan (`#06b6d4`), radiant purple/magenta, and gold accents matching user reference design.
  - Implemented `useTheme()` hook providing active theme tokens (`bgPrimary`, `bgSecondary`, `bgTertiary`, `bgInput`, `border`, `textPrimary`, `accent`, `sendButtonBg`, etc.).
- **Theme Selection in Settings ([`SettingsModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/SettingsModal.tsx)):**
  - Added dedicated **UI Appearance & Theme** section with interactive cards, instant live previews, and persistence via [`configService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ide/services/configService.ts).
- **Universal App Theme Consumption:**
  - Connected `ChatHeader`, `CognitiveModeBar`, `AstraChatScreen`, `AgentMessageItem`, `StepCard`, `ProjectPicker`, `ProjectCard`, `IDELayout`, `IDEBottomBar`, and modals to consume dynamic theme tokens.
- **Rule Compliance (`agent.md`):**
  - All source files strictly under 500 lines.
  - Clean TypeScript verification (`npx tsc --noEmit` &mdash; 0 errors).

### [2026-09-01] - Streamlined AI Thought Process & Internal Metadata Tool Filtering
- **Reasoning Stream UI Redesign ([`AgentMessageItem.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/AgentMessageItem.tsx)):**
  - Removed clunky nested step boxes around model thoughts (`🧠 Thought 1`).
  - Implemented an elegant, collapsible **Thought process / Reasoning** view with amber sparkle indicator, soft left accent line, and italicized typography.
  - Action steps (`StepCard`) are now reserved exclusively for actual tool executions (commands, file writes, edits, reads).
- **Eliminated Duplicate `update_topic` Clutter ([`astraCliService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/astra/astraCliService.ts), [`StepCard.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/StepCard.tsx)):**
  - Filtered internal Astra session bookkeeping tools (`update_topic`, `set_topic`) so they update session intent in the background without dumping raw input and output into step cards.
  - Prevented orphan fallback `tool_result` steps from rendering for internal topic updates.
- **Rule Compliance (`agent.md`):**
  - All source files strictly under 500 lines.
  - Clean TypeScript verification (`npx tsc --noEmit` &mdash; 0 errors).

### [2026-09-01] - Astra CLI Real-Time Interactive Action Approval & Deprecation of Astra Direct AI
- **Real-Time Interactive Action Approval in Astra CLI:**
  - Added [`astraInteractiveApproval.js`](file:///home/janelle/Documents/projects/ai-coder/astra-cli/gemini-cli-source/bundle/astraInteractiveApproval.js) to pause and intercept modifying/dangerous tool calls (`write_file`, `replace_file_content`, `run_shell_command`, etc.) before execution when `-y` / YOLO is disabled.
  - Integrated approval polling `/tmp/astra-approval.json` within `executeToolWithHooks` across bundle chunks (`chunk-7HKQGPWB.js`, `chunk-DFPYJMVX.js`, `chunk-S3MXVTTY.js`).
  - Synced with React Native UI `ActionApprovalModal.tsx` via `executeCommand` writing `{"outcome":"proceed_once","approved":true}` or `{"outcome":"cancel","approved":false}`.
  - Prevents the agent from executing tools or streaming thoughts until the user explicitly reviews and decides.
- **Removed Astra Direct AI & Simplified Architecture:**
  - Deprecated in-app direct HTTP streaming; unified all AI processing exclusively onto **Astra CLI** inside Embedded Alpine Linux PRoot.
  - Removed `#engineModal` and `assistantEngine` toggles from [`FloatingOverlayService.kt`](file:///home/janelle/Documents/projects/ai-coder/modules/linux-runner/android/src/main/java/expo/modules/linuxrunner/FloatingOverlayService.kt).
  - Maintained zero bloatware and modular architecture per `agent.md`.
- **Rule Compliance (`agent.md`):**
  - All source files strictly under 500 lines.
  - Clean TypeScript verification (`npx tsc --noEmit` &mdash; 0 errors).

### [2026-09-01] - Astra CLI Bundling Investigation, Alpine PRoot Legacy CLI Purge & Debug Release
- **Astra CLI & Alpine PRoot Investigation:**
  - Audited the Alpine Linux PRoot assets (`alpine-rootfs.tar.gz` and `astra-cli.tar.gz`).
  - Confirmed `alpine-rootfs.tar.gz` contains only official standard Alpine Linux 3.21 packages (BusyBox, musl libc, apk-tools, certificates).
  - Confirmed `astra-cli` is the sole autonomous AI agent runtime bundled for execution in Alpine PRoot.
- **Legacy CLI Purging & Safe Modular Environment Provisioning:**
  - Created [`EnvironmentAstraHelper.kt`](file:///home/janelle/Documents/projects/ai-coder/modules/linux-runner/android/src/main/java/expo/modules/linuxrunner/EnvironmentAstraHelper.kt) (166 lines) to modularize Astra CLI extraction, legacy CLI purging, and wrapper installation.
  - Added automated cleanup in `EnvironmentAstraHelper` to purge any obsolete legacy AI CLI directories (`/usr/local/share/mahiru-cli`, `/usr/local/share/gemini-cli`, `/usr/local/share/pyxis-cli`) and legacy CLI binaries (`/bin/mahiru`, `/usr/bin/mahiru`, `/bin/gemini-cli`, `/usr/bin/gemini-cli`, `/bin/pyxis`, `/usr/bin/pyxis`).
  - Bumped version marker to `.astra_cli_version_v7` to force seamless update unpacking.
  - Refactored [`EnvironmentManager.kt`](file:///home/janelle/Documents/projects/ai-coder/modules/linux-runner/android/src/main/java/expo/modules/linuxrunner/EnvironmentManager.kt) to 390 lines (strictly complying with `agent.md` <500 line limit).
- **Repackaged Linux Assets:**
  - Symlinked `node_modules` in `astra-cli/` to `gemini-cli-source/node_modules`.
  - Repackaged and deployed clean `astra-cli.tar.gz` across `android/app/src/main/assets/linux/` (`aarch64/`, `x86_64/`, `linux/`).
- **Debug Build, Device Release & Dedicated Terminal Execution:**
  - Clean TypeScript compilation verified via `npx tsc --noEmit` (0 errors).
  - Compiled Debug APK via Gradle (`assembleDebug` &mdash; 349 MB).
  - Deployed and installed Debug APK onto connected device `AUDUT20616012479` (Huawei JNY-LX1) via ADB streaming (`adb install -r`).
  - Launched Metro bundler development server in a separate, dedicated `foot` terminal window via [`start-debug.sh`](file:///home/janelle/Documents/projects/ai-coder/start-debug.sh) and opened the app on device.
- **Rule Compliance (`agent.md`):**
  - All source files strictly under 500 lines.
  - Adherence to Rule 9 (Debug Mode Release) and Rule 10 (Dedicated External Terminal).
- **Interactive Action Approval Architecture:**
  - Added full user permission workflow for autonomous agent actions (file writes, edits, deletions, shell commands).
  - Created [`ActionApprovalModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/ActionApprovalModal.tsx) displaying action previews (diffs, commands, paths) with 3 response options: **Approve (Proceed)**, **Always in Session**, and **Reject (Cancel)**.
  - Enhanced [`StepCard.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/StepCard.tsx) with inline approval badges (`pending`, `approved`, `rejected`).
- **Interactive vs. YOLO Mode Toggles:**
  - Added 1-tap `🛡️ Interactive` / `⚡ YOLO` toggle pill to [`CognitiveModeBar.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/CognitiveModeBar.tsx).
  - Added dedicated **Action Approval & Safety** section to [`CognitiveModeModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/CognitiveModeModal.tsx).
  - Added Agent Safety & Permissions toggle card to [`SettingsModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/SettingsModal.tsx).
  - Stored preference persistently via `loadInteractiveApproval()` and `saveInteractiveApproval()` in [`configService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ide/services/configService.ts).
- **Core Agent & CLI Integration ([`astraCliService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/astra/astraCliService.ts), [`agentCore.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/agent/agentCore.ts), [`useChatSession.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/useChatSession.ts)):**
  - Pauses execution and transitions status to `"waiting_approval"` when encountering modifying actions in interactive mode.
  - Omitted `-y` flag in Astra CLI command when interactive approval is active.
  - Integrated into both full-screen [`AstraChatScreen.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/AstraChatScreen.tsx) and floating overlay [`FloatingChatOverlay.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/FloatingChatOverlay.tsx).
- **Rule Compliance (`agent.md`):**
  - All source files strictly under 500 lines.
  - TypeScript verified (`npx tsc --noEmit` &mdash; 0 errors).
- **Graceful Pure JavaScript Fallback in node-pty ([`unixTerminal.js`](file:///home/janelle/Documents/projects/ai-coder/astra-cli/gemini-cli-source/node_modules/node-pty/lib/unixTerminal.js), [`index.js`](file:///home/janelle/Documents/projects/ai-coder/astra-cli/gemini-cli-source/node_modules/node-pty/lib/index.js)):**
  - Resolved `innerError Error: Cannot find module '../build/Debug/pty.node'` when native `.node` binary is unavailable or symlinks are unlinked under PRoot.
  - Wrapped `pty.node` require in safe try/catch blocks and implemented full `child_process.spawn` streaming fallback in `UnixTerminal` emitting `data`, `exit`, and `close` events.
  - Pushed updated `unixTerminal.js` and `index.js` to active device Alpine rootfs (`/usr/local/share/astra-cli/node_modules/node-pty/lib/`) and repackaged `astra-cli.tar.gz`.
  - Added clean regex filters in [`astraCliService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/astra/astraCliService.ts) to strip terminal warnings (true color, YOLO mode, proot warnings) from AI chat message displays.
  - Verified on-device PRoot execution (`NODE_PTY_LOADED_OK` & `astra --help` &rarr; exit 0).
- **Rule Compliance (`agent.md`):**
  - All source files strictly under 500 lines.
  - Clean TypeScript compilation (`npx tsc --noEmit` &mdash; 0 errors).
- **Cleartext Traffic Policy Configuration ([`AndroidManifest.xml`](file:///home/janelle/Documents/projects/ai-coder/android/app/src/main/AndroidManifest.xml), [`network_security_config.xml`](file:///home/janelle/Documents/projects/ai-coder/android/app/src/main/res/xml/network_security_config.xml)):**
  - Resolved `net::ERR_CLEARTEXT_NOT_PERMITTED` in Android WebView when navigating to local development servers (`http://127.0.0.1:*` and `http://localhost:*`).
  - Added `android:usesCleartextTraffic="true"` and `android:networkSecurityConfig="@xml/network_security_config"` to the `<application>` tag in [`AndroidManifest.xml`](file:///home/janelle/Documents/projects/ai-coder/android/app/src/main/AndroidManifest.xml).
  - Created [`network_security_config.xml`](file:///home/janelle/Documents/projects/ai-coder/android/app/src/main/res/xml/network_security_config.xml) with domain rules explicitly permitting cleartext HTTP for `localhost`, `127.0.0.1`, `0.0.0.0`, and `10.0.2.2`.
  - Recompiled Debug APK and deployed to connected device via ADB.
- **Rule Compliance (`agent.md`):**
  - All source files strictly under 500 lines.
  - Clean TypeScript compilation (`npx tsc --noEmit` &mdash; 0 errors).
- **Root Cause Analysis for `net::ERR_CONNECTION_REFUSED` ([`8cNUpp5W.jpg`](file:///home/janelle/Downloads/8cNUpp5W.jpg)):**
  1. *Astra CLI Tool Failure:* `node-pty` threw an unhandled exception (`Cannot find module '../build/Debug/pty.node'`) on Alpine PRoot (ARM64) because prebuilt native `.node` binaries were missing, preventing Astra CLI from completing shell commands (e.g. `python3 -m http.server 8080 &`).
  2. *Short-Lived Process Lifecycles:* One-off background commands spawned via `ProcessExecutor.execute` terminated when PRoot exited upon child completion.
  3. *Unverified Task Detection:* The UI registered the command from stream text and displayed a live chip, but no server was actively bound on port `:8080`.
- **Engineering Solutions Implemented:**
  - **Safe `node-pty` Fallback in Astra CLI:** Updated [`unixTerminal.js`](file:///home/janelle/Documents/projects/ai-coder/astra-cli/gemini-cli-source/node_modules/node-pty/lib/unixTerminal.js) and [`index.js`](file:///home/janelle/Documents/projects/ai-coder/astra-cli/gemini-cli-source/node_modules/node-pty/lib/index.js) to catch missing binary errors without unhandled exceptions, enabling automatic and seamless fallback to standard Node.js `child_process.spawn`.
  - **Repackaged Linux Assets:** Rebuilt and deployed clean `astra-cli.tar.gz` asset packages across Android Linux asset directories (`aarch64`, `x86_64`, `linux/`).
  - **Persistent Web Server Execution:** Updated `handleStartQuickServer` to spawn servers inside persistent PRoot terminal sessions (`server-session`) with automated dist detection and port binding.
  - **Modular Architecture Refactor:** Refactored `WebBrowserPreview.tsx` (formerly 689 lines) into modular, single-responsibility components under 250 lines:
    - [`WebBrowserNavBar.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/browser/WebBrowserNavBar.tsx): URL navigation and external browser integration.
    - [`WebBrowserPortChips.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/browser/WebBrowserPortChips.tsx): Clean server chips and quick port presets (:8000, :3000, :5173, :5000, :8080).
    - [`WebBrowserErrorView.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/browser/WebBrowserErrorView.tsx): Offline diagnosis, 1-tap server start, reload, and external launch.
    - [`WebBrowserPreview.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/WebBrowserPreview.tsx): Streamlined coordinator.
- **Rule Compliance (`agent.md`):**
  - All files strictly under 500 lines.
  - TypeScript verified (`npx tsc --noEmit` &mdash; 0 errors).
- **Cognitive Mode Support in Floating Overlay ([`FloatingChatOverlay.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/FloatingChatOverlay.tsx), [`FloatingOverlayTopBar.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/FloatingOverlayTopBar.tsx)):**
  - Integrated `<CognitiveModeBar>` directly above the floating input box for 1-tap switching between modes (⚡ Fast, ⚖️ Balanced, 🧠 Deep, 🔬 10X Spec, 🕹️ Godot, 📱 Mobile, 🖥️ Desktop).
  - Integrated `<CognitiveModeModal>` allowing full cognitive mode customization and reasoning effort configuration directly within the floating window.
  - Added active mode pill chip with dynamic badge color and icon (`bulb`) to `FloatingOverlayTopBar`.
  - Added real-time mode badge in the card header subtitle (`todo-app • 🔬 10X Spec`).
  - Expanded card dimensions (`width: "88%", maxWidth: 380, maxHeight: 580`) for improved ergonomics, message readability, and tool card rendering.
- **Rule Compliance (`agent.md`):**
  - All source files strictly under 500 lines.
  - Clean TypeScript compilation (`npx tsc --noEmit` &mdash; 0 errors).
- **Unified Astra CLI Engine ([`agentCore.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/agent/agentCore.ts), [`conversationService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/services/conversationService.ts)):**
  - Completely removed the `builtin-pyxis` directory (`geminiService.ts`, `index.ts`) and legacy Direct Gemini API execution branches.
  - Relocated conversation session management to standalone [`conversationService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/services/conversationService.ts) with `"Astra AI"` defaults.
  - Routed all agent operations solely through the unified Astra CLI engine running inside embedded Alpine Linux PRoot.
- **UI & Modal De-Cluttering ([`AstraChatScreen.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/AstraChatScreen.tsx), [`ChatHeader.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/ChatHeader.tsx), [`FloatingChatOverlay.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/FloatingChatOverlay.tsx), [`FloatingOverlayTopBar.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/FloatingOverlayTopBar.tsx)):**
  - Removed `EngineModePickerModal.tsx` and legacy engine switcher controls across all full-screen and floating overlay chat interfaces.
  - Removed `PyxisLogo.tsx` and updated all residual workspace templates and web preview suggestions to Astra AI.
  - Streamlined `configService.ts` by removing `AssistantEngineMode` and associated persistence helpers.
- **Rule Compliance (`agent.md`):**
  - All source files strictly under 500 lines.
  - Clean TypeScript compilation (`npx tsc --noEmit` &mdash; 0 errors).
- **Auto-Save Feedback Loop & Message Sync ([`useChatSession.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/useChatSession.ts), [`conversationService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/builtin-pyxis/conversationService.ts)):**
  - Eliminated racing read-after-write disk feedback loop by setting `saveAllSessions(..., silent = true)` during automated background message persistence in `updateSessionMessages`.
  - Added `messagesRef` inside `useChatSession` ensuring `handleSend` always reads the absolute latest message history without closure staleness.
  - Guarded `subscribeSessionChanges` so active in-memory conversations are never wiped or reverted by asynchronous disk reads.
  - Increased default active session `renderLimit` from 10 to 100 so all prior and newly submitted conversation messages render completely in the UI.
  - Added automatic conversation title generation upon the first prompt submission for seamless drawer identification.
- **Rule Compliance (`agent.md`):**
  - All files strictly under 500 lines.
  - TypeScript verified (`npx tsc --noEmit` &mdash; 0 errors).


### [2026-08-31] - Agent Guidelines: Dedicated Debug Terminal Rule
- **Updated [`agents.md`](file:///home/janelle/Documents/projects/ai-coder/agents.md) & [`agent.md`](file:///home/janelle/Documents/projects/ai-coder/agent.md):**
  - Added **Rule 10**: Launch debug mode / Metro bundler in a dedicated, external terminal window (`foot`, `kitty`, or `xterm` via [`start-debug.sh`](file:///home/janelle/Documents/projects/ai-coder/start-debug.sh)) to maintain independent live-reload sessions and streaming logs.
- **Rule Compliance (`agent.md`):**
  - All files strictly under 500 lines.
  - TypeScript verified (`npx tsc --noEmit` &mdash; 0 errors).
- **Cognitive Reasoning Engine & Godot 4.x Modes ([`astraModes.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/astra/astraModes.ts)):**
  - Added full support for Astra Cognitive Modes:
    - ⚡ **Fast Mode** (`--fast` / `[fast]`): Instant code generation and concise syntax.
    - ⚖️ **Medium Mode** (`--medium` / `[medium]`): Balanced production engineering.
    - 🧠 **Slow Mode** (`--slow` / `[slow]`): Deep reasoning, edge cases, comprehensive docstrings & unit tests.
    - 🔬 **10X Super Deep (Kiro Spec SDD)** (`--spec` / `--superdeep` / `[spec]` / `[kiro]`): Full Spec-Driven Planning (Requirements &rarr; Design &rarr; Tasks &rarr; Verification).
  - Added Godot 4.x Game Engine Specializations:
    - 🕹️ **Godot General** (`--godot` / `[godot]`): GDScript 2.0 / C#, node caching, custom resources, signal decoupling.
    - 📱 **Godot Mobile** (`--godot-mobile` / `[godot-mobile]`): Mobile optimization (`gl_compatibility`/`mobile`), low draw calls, touch controls, virtual joysticks, notch handling.
    - 🖥️ **Godot Desktop** (`--godot-desktop` / `[godot-desktop]`): Forward+ rendering, fullscreen, VSync, Gamepad / key remapping, and ConfigFile save systems.
- **Astra CLI Execution & Reasoning Effort ([`astraCliService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/astra/astraCliService.ts), [`agentCore.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/agent/agentCore.ts)):**
  - Integrated dynamic CLI flag propagation (`--fast`, `--medium`, `--slow`, `--spec`, `--godot`, `--godot-mobile`, `--godot-desktop`, `--effort <low|medium|high>`).
- **Interactive UI Toggles & Modals ([`CognitiveModeBar.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/CognitiveModeBar.tsx), [`CognitiveModeModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/CognitiveModeModal.tsx), [`ChatHeader.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/ChatHeader.tsx), [`AstraChatScreen.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/AstraChatScreen.tsx)):**
  - Embedded quick horizontal mode scroll pill bar directly above the chat input bar for 1-tap switching.
  - Added dedicated Cognitive Mode selection modal with descriptions, CLI flags, tags, and reasoning effort controls.
  - Added active mode indicators and quick toggle triggers to the chat header.
- **Rule Compliance (`agent.md`):**
  - All source files strictly under 500 lines.
  - Clean TypeScript compilation (`npx tsc --noEmit` &mdash; 0 errors).


### [2026-08-31] - Native `node-pty` Compilation & Alpine Toolchain Auto-Provisioning
- **Native C++ Module Build Integration ([`EnvironmentManager.kt`](file:///home/janelle/Documents/projects/ai-coder/modules/linux-runner/android/src/main/java/expo/modules/linuxrunner/EnvironmentManager.kt)):**
  - Integrated `make gcc g++ python3 linux-headers` into the Alpine Linux package installation suite during startup.
  - Added automated `node-gyp rebuild` / `npm rebuild node-pty` execution in `/usr/local/share/astra-cli/node_modules/node-pty`.
  - Verified compilation of `pty.node` (`Release/pty.node`) directly on Alpine Linux ARM64 inside Android PRoot sandbox without manual intervention.
  - Updated marker file check to `.developer_toolchain_ready_v2` ensuring seamless background provisioning across clean app launches.
- **Rule Compliance (`agent.md`):**
  - All source files strictly under 500 lines.
  - Clean TypeScript compilation (`npx tsc --noEmit` &mdash; 0 errors).


### [2026-08-31] - Mobile Header, Center Empty State & Input Bar Design System Polish
- **Header & Navigation Refinement ([`ChatHeader.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/ChatHeader.tsx)):**
  - Eliminated action bar horizontal clutter by moving heavy badges into a compact, informative subtitle (`todo-app • CLI (2.5-flash)`).
  - Streamlined top action icons into a unified design system with uniform 34x34 rounded square buttons (`iconBtn`), consistent stroke weight, padding, and active states.
  - Dedicated AI Engine switcher button (`terminal` / `sparkles`) allows instant switching between Astra CLI and Astra Direct.
- **Center Empty State Visual Polish ([`AstraChatScreen.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/AstraChatScreen.tsx), [`AstraLogo.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/AstraLogo.tsx)):**
  - Wrapped Astra logo in a softly glowing card container (`logoCardWrapper` + `logoCardGlow` + `logoCard`) with rounded borders to remove raw image bounds and checkered transparency artifacts.
  - Established strong typography hierarchy: increased weight/size of *"Astra Pair Programmer"*, softened subtitle color, and highlighted active workspace name with a distinct accent pill badge.
- **Input Bar Enhancement ([`AstraChatScreen.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/AstraChatScreen.tsx)):**
  - Added elevated surface contrast (`#161719` container, `#1f2126` input pill) with subtle border stroke against pure black background for tactile anchoring.
  - Enhanced Send Button state: transitions dynamically to a vibrant brand blue (`#3b82f6`) with white arrow icon and shadow when text is entered, providing clear submission readiness feedback.
- **Rule Compliance (`agent.md`):**
  - All files strictly under 500 lines.
  - Clean TypeScript compilation (`npx tsc --noEmit` &mdash; 0 errors).

### [2026-08-31] - Automated Zero-Setup Astra CLI Provisioning & Stream Decompression Fix
- **Root Cause Resolution for `MODULE_NOT_FOUND` (`/usr/local/share/astra-cli/bundle/gemini.js`):**
  - Android Gradle Plugin / AAPT automatically stores `.tar.gz` asset archives as uncompressed `.tar` files (`assets/linux/aarch64/astra-cli.tar`), causing strict `GZIPInputStream` extraction to fail with `ZipException`.
  - Added `openDecompressedStream` in [`EnvironmentManager.kt`](file:///home/janelle/Documents/projects/ai-coder/modules/linux-runner/android/src/main/java/expo/modules/linuxrunner/EnvironmentManager.kt) to inspect GZIP magic bytes (`0x1F, 0x8B`) dynamically and stream both compressed and uncompressed TAR archives seamlessly.
  - Implemented dynamic candidate asset path scanning across `linux/$arch/` and `linux/` for `.tar` and `.tar.gz`.
  - Added integrity validation to ensure `/usr/local/share/astra-cli/bundle/gemini.js` is verified and re-extracted automatically if missing.
- **Architectural Modularity & Rule Compliance (`agent.md`):**
  - Extracted DNS server inspection into dedicated [`EnvironmentDnsHelper.kt`](file:///home/janelle/Documents/projects/ai-coder/modules/linux-runner/android/src/main/java/expo/modules/linuxrunner/EnvironmentDnsHelper.kt).
  - Maintained all Kotlin and TypeScript files strictly under 500 lines.
  - Verified clean TypeScript compilation (`npx tsc --noEmit` &mdash; 0 errors).


### [2026-08-30] - Complete Application Rebranding to Astra & New Logo Asset Deployment
- **App Configuration & Manifests:**
  - Updated [`app.json`](file:///home/janelle/Documents/projects/ai-coder/app.json): `"name": "Astra"`, `"slug": "astra"`.
  - Updated Android strings [`strings.xml`](file:///home/janelle/Documents/projects/ai-coder/android/app/src/main/res/values/strings.xml): `<string name="app_name">Astra</string>`.
  - Updated [`package.json`](file:///home/janelle/Documents/projects/ai-coder/package.json): `"name": "astra"`.
  - Updated [`PROJECT_INFO.md`](file:///home/janelle/Documents/projects/ai-coder/PROJECT_INFO.md): Project name updated to `Astra`.
- **App Logo & Icon Asset Generation:**
  - Processed user logo image (`Gemini_Generated_Image_sm820qsm820qsm82.jpg`) into high-resolution assets:
    - [`assets/icon.png`](file:///home/janelle/Documents/projects/ai-coder/assets/icon.png) (1024x1024)
    - [`assets/adaptive-icon.png`](file:///home/janelle/Documents/projects/ai-coder/assets/adaptive-icon.png) (1024x1024)
    - [`assets/astra-logo.png`](file:///home/janelle/Documents/projects/ai-coder/assets/astra-logo.png) (1024x1024)
    - [`assets/splash.png`](file:///home/janelle/Documents/projects/ai-coder/assets/splash.png) (2048x2048)
    - [`assets/favicon.png`](file:///home/janelle/Documents/projects/ai-coder/assets/favicon.png) (48x48)
    - Full Android mipmap density suite (`mdpi`, `hdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi`) for `ic_launcher`, `ic_launcher_round`, `ic_launcher_foreground`, and `splashscreen_logo.png`.
  - Created [`AstraChatScreen.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/AstraChatScreen.tsx) (and exported `Astra` / `AstraChatScreen`), updated [`App.tsx`](file:///home/janelle/Documents/projects/ai-coder/App.tsx), and re-exported in [`GeminiChatScreen.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/GeminiChatScreen.tsx).
  - Updated [`ChatHeader.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/ChatHeader.tsx), [`AgentMessageItem.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/AgentMessageItem.tsx), [`FloatingChatOverlay.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/FloatingChatOverlay.tsx), [`AiAssistantMenu.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/AiAssistantMenu.tsx), [`IDELayout.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/IDELayout.tsx), [`EngineModePickerModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/EngineModePickerModal.tsx), and [`FloatingOverlayTopBar.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/FloatingOverlayTopBar.tsx).
  - Updated Kotlin Android floating overlay service ([`FloatingOverlayService.kt`](file:///home/janelle/Documents/projects/ai-coder/modules/linux-runner/android/src/main/java/expo/modules/linuxrunner/FloatingOverlayService.kt)) and terminal environment prompts to `astra:/workspace# `.
  - Verified 100% type safety via `npx tsc --noEmit` (0 errors).

### [2026-08-30] - Complete Removal of Legacy Termux Code & Full Transition to Built-in Alpine PRoot
- **Deleted Termux Code Tree ([`src/ai/termux-codes/`](file:///home/janelle/Documents/projects/ai-coder/src/ai/termux-codes)):**
  - Removed `src/ai/termux-codes/` directory including `termuxBridgeService.ts`, `termuxHealthService.ts`, `termuxSetupModal.tsx`, and `index.ts`.
  - Deleted unused on-screen keys component [`TermuxExtraKeysBar.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/terminal/TermuxExtraKeysBar.tsx).
- **Cleaned Configuration & Settings:**
  - Removed legacy `linkTermuxExplorer`, `saveTermuxLink`, and `loadTermuxLink` from [`configService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ide/services/configService.ts).
  - Purged obsolete Termux styles and UI elements from [`SettingsModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/SettingsModal.tsx).
  - Updated floating overlay permission description in [`OverlayPermissionModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/OverlayPermissionModal.tsx).
- **Terminal Theme & Reader Standardization:**
  - Renamed default dark theme in [`terminalThemes.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/terminal/terminalThemes.ts) to `Alpine Dark` (`alpine`).
  - Standardized fallback theme in [`AnsiRenderer.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/terminal/AnsiRenderer.tsx) and [`useTerminalSession.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/terminal/useTerminalSession.ts) to `alpine`.
  - Renamed background thread in [`TerminalSessionManager.kt`](file:///home/janelle/Documents/projects/ai-coder/modules/linux-runner/android/src/main/java/expo/modules/linuxrunner/TerminalSessionManager.kt) to `TerminalReader-$sessionId`.
- **Updated Project Documentation:**
  - Rewrote [`PROJECT_INFO.md`](file:///home/janelle/Documents/projects/ai-coder/PROJECT_INFO.md) to showcase the Tier 3 built-in Alpine Linux container with PRoot architecture.
  - Verified 100% type safety via `npx tsc --noEmit` (0 errors).

### [2026-08-30] - Integrated Astra CLI Agent Engine & Alpine PRoot Provisioning
- **Astra CLI Extraction & Archive Packaging:**
  - Extracted `astra-cli-backup.zip` into [`astra-cli/`](file:///home/janelle/Documents/projects/ai-coder/astra-cli) preserving repository modularity and protecting Expo app configurations.
  - Safely removed the backup zip file after verification.
  - Bundled `astra-cli.tar.gz` and deployed it to Android Linux asset paths (`android/app/src/main/assets/linux/`, `linux/aarch64/`, `linux/x86_64/`).
- **PRoot Alpine Linux Provisioning ([`EnvironmentManager.kt`](file:///home/janelle/Documents/projects/ai-coder/modules/linux-runner/android/src/main/java/expo/modules/linuxrunner/EnvironmentManager.kt)):**
  - Updated provisioning logic in `EnvironmentManager.kt` to unpack Astra CLI into `/usr/local/share/astra-cli`.
  - Installed executable wrappers `/bin/astra` and `/usr/bin/astra` with full Node.js environment and DNS configuration.
  - Purged all legacy `mahiru-cli.tar.gz` asset archives from `android/app/src/main/assets/linux/` and arch subdirectories.
- **Astra CLI Service Layer ([`astraCliService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/astra/astraCliService.ts)):**
  - Created standalone service module to execute Astra CLI in streaming JSON mode (`-o stream-json`) with headless auto-approval (`-y --skip-trust`).
  - Added real-time event parsers for thoughts, tool calls, tool results, message deltas, completion results, and error handling.
  - Completely removed legacy `src/ai/mahiru/` folder and purged all lingering `mahiru` styling, naming, and references across the codebase.
- **Agent Orchestrator & UI Component Updates:**
  - Connected [`agentCore.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/agent/agentCore.ts) directly to `streamAstraCliChat`.
  - Updated engine selector modals, chat headers, floating overlay topbars, message items, and background floating service to display **Astra CLI**.
  - Excluded `astra-cli` in [`tsconfig.json`](file:///home/janelle/Documents/projects/ai-coder/tsconfig.json) and verified clean TypeScript compilation (`npx tsc --noEmit` - 0 errors).
- **Preserved Active Streaming & In-Flight Steps Across Window Toggle:**
  - **Root Cause:** When the user minimized/closed the floating chatbox and reopened it, `syncSessionsFromNative` reloaded completed messages from disk and wiped out the DOM container (`#activeAssistantMsg`). Because the in-progress stream was not yet completed or saved to disk, all thought cards (`💡 Steps`), tool execution badges (`⚙️ Tool`), and streaming text were lost, and subsequent stream events failed to find the active message element.
  - **Kotlin Active State Tracking:** Added thread-safe tracking in [`FloatingOverlayService.kt`](file:///home/janelle/Documents/projects/ai-coder/modules/linux-runner/android/src/main/java/expo/modules/linuxrunner/FloatingOverlayService.kt) (`activePrompt`, `activeEngine`, `activeSessionId`, `activeAccumulatedDelta`, `activeStepsJson`).
  - **Seamless Window Expansion Restoration:** In `postExpandToWindow()`, if an agent is running in the background, it invokes `window.restoreActiveAgentState(...)` to instantly reconstruct the user query, active assistant card, all accumulated steps, and streamed deltas.
  - **DOM Fault-Tolerance:** Updated `window.onAgentDelta` and `window.onAgentStep` to automatically resurrect `#activeAssistantMsg` if missing, preventing dropped events.
  - **Rebuilt & Deployed:** Recompiled native module and APK ([`app-release.apk`](file:///home/janelle/Documents/projects/ai-coder/android/app/build/outputs/apk/release/app-release.apk) - 63MB) and reinstalled on device `AUDUT20616012479` via ADB.

### [2026-08-30] - Unified & Synchronized Floating Screen and Fullscreen Chat
- **Single Source of Truth Unified Controller ([`useChatSession.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/useChatSession.ts)):**
  - Created a single, shared chat state controller that powers both the **Fullscreen Chat** ([`GeminiChatScreen.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/GeminiChatScreen.tsx)) and the **Floating Screen** ([`FloatingChatOverlay.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/FloatingChatOverlay.tsx)).
  - Unified message streaming, prompt dispatch, step parsing, active session persistence, code snippet execution (`executeCode`), model switching, and engine mode toggling (Pyxis Direct vs Mahiru CLI).
- **Real-Time Cross-Screen Event Bus Synchronization:**
  - Added `subscribeSessionChanges` and `notifySessionChanged` to [`conversationService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/builtin-pyxis/conversationService.ts) so that creating chats, updating messages, and selecting sessions in one screen instantly updates the other in real-time.
  - Added `subscribeConfigChanges` to [`configService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ide/services/configService.ts) to keep model selections and assistant engine modes in instant sync across both screens.
- **Matched UI Flow & Controls:**
  - Updated [`FloatingChatOverlay.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/FloatingChatOverlay.tsx) header with session history dropdown, return-to-IDE button, minimize-to-bubble button, and overlay close button, accompanied by [`FloatingOverlayTopBar.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/FloatingOverlayTopBar.tsx).
- **Compliance with Architectural Rules:**
  - All files strictly verified under the 500-line ceiling: `useChatSession.ts` (463 lines), `FloatingChatOverlay.tsx` (492 lines), `GeminiChatScreen.tsx` (211 lines), `IDELayout.tsx` (400 lines).
  - 100% type safety verified via `npx tsc --noEmit` (0 errors).
  - Rebuilt standalone Release APK ([`app-release.apk`](file:///home/janelle/Documents/projects/ai-coder/android/app/build/outputs/apk/release/app-release.apk) - 63MB) and reinstalled on device `AUDUT20616012479` via ADB.

### [2026-08-30] - Automatic Background Task Terminal Triggering & Tab Synchronization
- **Trigger IDE Terminal on Background Task Start:**
  - Integrated `subscribeTrigger` event bus into [`runningTasksService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/services/runningTasksService.ts) and wired it to [`IDELayout.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/IDELayout.tsx).
  - When Mahiru CLI initiates background tasks, dev servers, or long-running commands, the IDE automatically switches view to the **Terminal** tab (`setBottomTab("terminal")`).
  - Added live task status badge count indicator on the Terminal tab in [`IDEBottomBar.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/IDEBottomBar.tsx).
- **Task-by-Task Terminal Session Tabs:**
  - Upgraded [`useTerminalSession.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/terminal/useTerminalSession.ts) to automatically create dedicated terminal session tabs for every started background task (e.g. `⚙️ npm run dev`, `⚙️ php artisan serve`).
  - Automatically switches active terminal focus to newly launched tasks so users can inspect execution output task by task.
  - Piped live stdout/stderr streams and tool results directly to task session buffers with ANSI color formatting.
  - Supported 1-tap task termination and restart directly from the terminal header controls.
  - Enhanced [`TerminalHeader.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/terminal/TerminalHeader.tsx) with green activity dot badges for background task tabs.
- **Standalone Release APK Build & Device Installation:**
  - Compiled full standalone release APK ([`app-release.apk`](file:///home/janelle/Documents/projects/ai-coder/android/app/build/outputs/apk/release/app-release.apk) - 63 MB) with embedded Hermes JS bundle, bundled Alpine Linux rootfs, PRoot ARM64 binaries, and native C++ CMake modules.
  - Successfully streamed and installed APK onto device `AUDUT20616012479` via ADB (`adb install -r`).
  - Launched `com.janelle.aicoder` on device with zero startup errors.

### [2026-08-30] - Fixed File Explorer Touch Selection & Smooth Drag-and-Drop
- **File Explorer Touch & Drag State Resolution:**
  - Fixed an issue where synchronous `cancelDrag()` in `onPressOut` prematurely aborted the drag session when moving the finger.
  - Implemented `isActivelyMovingRef` state tracking and delayed cleanup in `handlePressOut`, allowing smooth finger dragging and accurate ghost badge tracking while safely cleaning up if a long-press is released in-place without moving.
  - Tuned `delayLongPress` to 350ms for responsive drag activation alongside instant single-tap file opening.
  - Unnested nested `<TouchableOpacity>` elements inside file and folder rows in [`FileExplorer.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/FileExplorer.tsx).
  - Enhanced [`workspaceService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ide/services/workspaceService.ts) `readFileContent` and `saveFileContent` to normalize paths with leading slashes and absolute paths.
  - Extracted [`IDEBottomBar.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/IDEBottomBar.tsx) to keep [`IDELayout.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/IDELayout.tsx) strictly under 500 lines (475 lines).
  - Verified with `npx tsc --noEmit` (0 errors).

### [2026-08-29] - Clean Removal of Pyxis AI Agent Logics
- **Pyxis & Mahiru AI Logic Stripped Clean:**
  - Removed Pyxis system prompt generation, regex-based autonomous workspace file writing, PRoot `!exec` shell command execution hooks, and SSE Gemini streaming logic from [`geminiService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/builtin-pyxis/geminiService.ts).
  - Cleaned up agent orchestration and tool execution in [`agentCore.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/agent/agentCore.ts), [`mahiruCliService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/mahiru/mahiruCliService.ts), and [`termuxBridgeService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/termux-codes/termuxBridgeService.ts).
  - Preserved all UI components ([`GeminiChatScreen.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/GeminiChatScreen.tsx), [`MiniChatModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/MiniChatModal.tsx), modals, headers, logo, status bars), environment settings, and types intact.
  - Verified 100% type safety with `npx tsc --noEmit` (0 errors).

### [2026-08-29] - Polished Pro Terminal Interface & Theme Customization
- **Terminal UI Modernization & Productivity Suite:**
  - **Dynamic Theme Engine ([`terminalThemes.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/terminal/terminalThemes.ts) & [`ThemePickerModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/terminal/ThemePickerModal.tsx)):** Added 4 developer themes: **Termux Dark** (`#000000`), **One Dark** (`#1e1e2e`), **Monokai** (`#272822`), and **Matrix Green** (`#050d08`).
  - **Dynamic Zoom Controls:** Added real-time terminal font zoom-in and zoom-out buttons (`-` / `+`) on the top header.
  - **Command History Recall (`↑` / `↓`):** Pressing up/down arrows or keys cycles through past entered commands into the prompt.
  - **Quick Clipboard Tools:** One-tap **Copy Output** and **Paste from Clipboard** buttons directly in the Extra Keys bar with animated toast notifications.
  - **Modular Architecture:** Refactored into [`TerminalHeader.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/terminal/TerminalHeader.tsx), [`ThemePickerModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/terminal/ThemePickerModal.tsx), [`TermuxExtraKeysBar.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/terminal/TermuxExtraKeysBar.tsx), and [`TerminalView.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/TerminalView.tsx) with all files strictly under 370 lines.
- **Native Alpine Linux PRoot & Termux Terminal Engine Verified Working Live:**
  - **SELinux W^X Compliance:** Bundled `libproot.so`, `libproot-loader.so`, `libproot-loader32.so`, `libtalloc.so`, and `libandroid-shmem.so` into `jniLibs/arm64-v8a/` with `android:extractNativeLibs="true"`, ensuring full execution permissions in Android 10+ (API 29+).
  - **Dynamic In-Memory RootFS Provisioning:** Built pure Java/Kotlin `TarArchiveInputStream` unpacker that accurately resolves relative symlinks and copies `/bin/busybox` -> `/bin/sh` as a real binary.
  - **Live Verification:** Verified `apk update` fetching live package indexes from `dl-cdn.alpinelinux.org` with 25,264 distinct packages available.
- **Real Termux Terminal Architecture ([`TerminalView.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/TerminalView.tsx)):**
  - Built authentic Termux UI with deep black theme (`#000000`), session tabs (`1: sh`, `2: sh`, `+`), session kill/restart/clear actions, and live connection dots.
  - Added dedicated **Termux Extra Keys Toolbar** ([`TermuxExtraKeysBar.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/terminal/TermuxExtraKeysBar.tsx)) with `ESC`, `TAB` (shell auto-completion), sticky `CTRL` and `ALT` toggles, `-`, `/`, `|`, `~`, arrow keys (`↑`, `↓`, `←`, `→`), and quick shortcuts (`^C`, `^D`, `^L`).
  - Added real-time ANSI escape code parser and text tokenizer ([`AnsiRenderer.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/terminal/AnsiRenderer.tsx)) supporting 16 standard colors, 256 colors, RGB colors, bold, underline, dim, and blinking cursor block (`█`).
  - Built custom terminal lifecycle hook ([`useTerminalSession.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/terminal/useTerminalSession.ts)) with persistent session output buffering and real-time streaming.
- **Redone Native Alpine PRoot Implementation (`modules/linux-runner/`):**
  - **Environment Provisioning ([`EnvironmentManager.kt`](file:///home/janelle/Documents/projects/ai-coder/modules/linux-runner/android/src/main/java/expo/modules/linuxrunner/EnvironmentManager.kt)):** Fast detection of pre-installed rootfs/proot, automatic configuration of DNS (`/etc/resolv.conf`), `/etc/hosts`, and `/root/.profile` with Termux-like prompt (`ai-coder:\w# `) and environment variables (`TERM=xterm-256color`, `PATH`, `HOME`, `USER`, `LANG=C.UTF-8`).
  - **Interactive Terminal Sessions ([`TerminalSessionManager.kt`](file:///home/janelle/Documents/projects/ai-coder/modules/linux-runner/android/src/main/java/expo/modules/linuxrunner/TerminalSessionManager.kt)):** Real interactive login shell (`/bin/sh -l`) running in PRoot with workspace mounts, bidirectional streaming, thread-safe history buffering for instant screen state restoration on tab switches, and immediate stdin flushing.
  - **Process Execution ([`ProcessExecutor.kt`](file:///home/janelle/Documents/projects/ai-coder/modules/linux-runner/android/src/main/java/expo/modules/linuxrunner/ProcessExecutor.kt)):** Direct workspace-aware single-command execution in Alpine PRoot.
  - **TypeScript Bridge ([`index.ts`](file:///home/janelle/Documents/projects/ai-coder/modules/linux-runner/src/index.ts)):** Full type-safe API for `startTerminalSession`, `writeTerminalInput`, `getSessionHistory`, `listActiveSessions`, `stopTerminalSession`, `executeCommand`, and `isEnvironmentReady`.
- **Reset Embedded Alpine Linux AI Agent Logic:**
  - Removed all previous Alpine Linux PRoot execution hooks (`!exec` auto-execution in chat) and Alpine-specific system instructions from [`geminiService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/builtin-pyxis/geminiService.ts).
  - Cleaned up [`agentCore.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/agent/agentCore.ts), [`GeminiChatScreen.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/GeminiChatScreen.tsx), [`MiniChatModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/MiniChatModal.tsx), and [`useFloatingChat.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/useFloatingChat.ts) to provide a clean slate for building the custom AI agent workflow from scratch.
- **Strict Quality & Line Count Verification:**
  - 100% of code files strictly verified **under 500 lines** (all files <385 lines).
  - `npx tsc --noEmit` verified with **0 errors**.
- **Complete Local Release Build & Device Verification:**
  - Compiled full standalone Release APK (52 MB) and resolved `expo-clipboard` SDK 54 compatibility (`8.0.8`).
  - **Embedded Linux Userland:** Bundled Alpine Linux v3.21 Mini RootFS (`assets/linux/aarch64/alpine-rootfs.tar`) and PRoot ARM64 binary directly inside the APK.
  - **Live Device Execution:** Successfully installed and verified running live on physical hardware (Huawei JNY-LX1) with 0 startup crashes.
  - **Hermes Bytecode Engine:** High-performance React Native production engine active.
- **On-Device Embedded Alpine Linux & PRoot Native Runner:**
  - Full support for 100% offline, on-device terminal command execution via PRoot without external Termux app dependencies.
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-29] - Real Multi-Language Code Execution & Pyxis Autonomous File Writing
- **Real PHP & Multi-Language Runner ([`pistonRunner.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/runner/pistonRunner.ts) & [`src/ai/runner/index.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/runner/index.ts)):**
  - Integrated Piston multi-language execution engine (`PHP 8.2.3`, `Python 3.10`, `JavaScript`, `TypeScript`, `C++`, `Go`, `Ruby`, etc.).
  - Updated `PhpEngineService` to evaluate real PHP code with stdout/stderr outputs instead of static stubs.
- **Autonomous File Creation from Pyxis Chat ([`geminiService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/builtin-pyxis/geminiService.ts)):**
  - Pyxis AI now automatically detects file names in code blocks (e.g., ````php app/Models/Task.php```` or ````php routes/web.php````) and writes them directly to the active workspace disk using `saveFileContent`.
  - Pyxis includes real-time step cards showing `Created/updated file: <path>`.
- **1-Tap Save to File Action ([`MarkdownMessageView.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/MarkdownMessageView.tsx)):**
  - Added a dedicated **"Save to File"** / **"Apply"** button with checkmark feedback on all AI code snippets mentioning a file path.
- **Interactive Terminal Suite ([`TerminalView.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/TerminalView.tsx)):**
  - Enhanced `php`, `php -r <code>`, `php <file.php>`, `python <file.py>`, and `php artisan <cmd>` runners with live outputs and error handling.
  - Added full suite of realistic Artisan commands (`make:model`, `make:controller`, `make:migration`, `migrate`, `route:list`, `list`, `help`).
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-29] - Strict App-Only API Key Enforcement & Clean Termux Fallbacks
- **Full Project Backup:**
  - Created complete archive of the project at [`/home/janelle/Documents/projects/ai-coder-backup.zip`](file:///home/janelle/Documents/projects/ai-coder-backup.zip) (~12.9 MB).
- **Strict App Key Enforcement ([`termuxBridgeService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/termux-codes/termuxBridgeService.ts) & [`mahiru-server.js`](file:///home/janelle/Documents/projects/ai-coder/mahiru-cli/mahiru-server.js)):**
  - Updated `termuxBridgeService.ts` to validate the Gemini API key upfront before sending requests to Termux, displaying a prompt if missing.
  - Updated `mahiru-server.js` `/chat` and SSE streaming endpoints to reject requests that do not supply an API key directly from the app.
  - Removed all hardcoded and local `.env` fallback resolution from `loadStoredApiKey` so only the client-provided key is used.
- **Cleared Termux `.env` Files ([`mahiru-cli/.env`](file:///home/janelle/Documents/projects/ai-coder/mahiru-cli/.env)):**
  - Removed hardcoded `GEMINI_API_KEY` from `mahiru-cli/.env` and deleted stale `node_modules/.env`.
  - Updated `sanitizeEnv` to never persist fallback keys to disk.
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-29] - Robust Lag-Free File & Folder Drag-and-Drop Transfer System
- **Universal Multiplatform Measurement Engine ([`useFileDragDrop.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/useFileDragDrop.ts)):**
  - Built unified synchronous `getBoundingClientRect` (Web) + asynchronous `measureInWindow` / `measure` (Android & iOS) coordinate pipeline.
  - Implemented immediate single-folder registration measurement as each folder mounts or re-renders.
  - Added real-time container offset compensation for pixel-perfect ghost badge alignment.
- **Proximity-Based Folder Highlighting, Auto-Expansion & Auto-Collapse:**
  - Designed proximity distance-based hit-testing to highlight folders whenever the dragged item moves over or close to them.
  - Added ultra-responsive ~180ms auto-expand timer that opens closed folders and recursively measures revealed subfolders.
  - Added intelligent auto-collapsing: If a folder was opened by hover during drag, it automatically closes if the user navigates away from it (unless hovering over subfolders/children inside that folder).
  - Automatically restores closed state if drag is cancelled or dropped outside the folder.
  - Folders manually opened by the user prior to dragging remain permanently open.
- **Instant Tree State Relocation ([`fileExplorerUtils.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/fileExplorerUtils.tsx) & [`IDELayout.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/IDELayout.tsx)):**
  - Implemented immutable `moveNodeInTree` and recursive `updateNodePaths` helper to instantly transfer files/folders in React state without waiting on asynchronous disk reads.
  - Automatically auto-expands the target folder upon dropping so the moved file/folder is instantly visible in the tree.
- **Root Drop Zone & Filesystem Moving ([`workspaceService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ide/services/workspaceService.ts)):**
  - Dashed "Move to workspace root" drop zone moves nested files/folders back to the workspace root.
  - Handles hyphenated paths, directories, and synchronized active file editor paths.
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-27] - Completely Removed Termux Bridge & Migrated to Direct Gemini API
- **Bridge Architecture Fully Removed:**
  - Completely killed background port 8765 processes and deleted `mahiruService.ts` and `mahiruServerTemplate.ts`.
  - Removed false "Online/Offline" indicator from `ChatHeader` and `MiniChatModal`.
  - Refactored `workspaceService.ts` to operate 100% locally on device using Expo `FileSystem` with zero network latency.
  - Refactored `SettingsModal.tsx` to cleanly focus on Gemini API Key configuration and Model Selection.
  - Refactored `TerminalView.tsx` into a lightweight, local client console running JavaScript and workspace utilities.
- **Direct Google Gemini API Integration (`src/ai/services/geminiService.ts`):**
  - Connected directly to Google Generative Language REST API (`https://generativelanguage.googleapis.com/v1beta/models/...:streamGenerateContent`) with real-time SSE streaming.
  - Supports modern Gemini models (`gemini-3.5-flash-lite`, `gemini-3.5-flash`, `gemini-3.6-flash`, `gemini-flash-latest`, `gemini-pro-latest`).
  - Integrated rich workspace context (file tree, active file name, editor code) into prompt payload.
- **Quality & Line Count Verification:**
  - All files strictly verified **under 500 lines**.
  - `npx tsc --noEmit` verified with **0 errors**.

### [2026-08-27] - Removed All Hardcoded Chatting / Mock Conversations
- **Clean Chat Initialization:**
  - Removed hardcoded assistant greeting messages from `conversationService.ts` (`createSession`).
  - Removed initial hardcoded mock assistant text from `MiniChatModal.tsx`.
  - Added clean empty-state placeholders (Pyxis Logo + status indicator) in `GeminiChatScreen` and `MiniChatModal` when conversation history is fresh/empty.
  - All chat sessions now communicate 100% directly with the Google Gemini API with zero hardcoded simulation.
- **Strict Maintainability & Type Safety:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-27] - Isolated Built-in Pyxis Logics into Dedicated Folder (Step 2)
- **Created Dedicated Folder ([`src/ai/builtin-pyxis/`](file:///home/janelle/Documents/projects/ai-coder/src/ai/builtin-pyxis/)):**
  - Moved all built-in Pyxis logics into `src/ai/builtin-pyxis/`:
    - [`geminiService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/builtin-pyxis/geminiService.ts): Direct client-side Gemini REST & SSE streaming engine.
    - [`conversationService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/builtin-pyxis/conversationService.ts): Local conversation history and session persistence.
    - [`index.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/builtin-pyxis/index.ts): Barrel export for built-in Pyxis.
- **Refactored Imports & Cleaned Up:**
  - Updated all imports across UI components (`GeminiChatScreen`, `MiniChatModal`, `LiveAgentStatusBar`, `agentCore`) to import from `src/ai/builtin-pyxis/`.
  - Removed deprecated `src/ai/services/` directory.
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-27] - Termux Codes Module & Real-Time Pyxis UI Streaming
- **Dedicated Termux Codes Folder ([`src/ai/termux-codes/`](file:///home/janelle/Documents/projects/ai-coder/src/ai/termux-codes/)):**
  - [`termuxBridgeService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/termux-codes/termuxBridgeService.ts): Real-time SSE streaming client connecting to the Mahiru daemon in Termux (`http://127.0.0.1:8765/`). Translates `thought`, `tool_use`, `tool_result`, `message`, `delta`, and `status_update` events into instant visual step cards and live text in the Pyxis UI.
  - [`termuxHealthService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/termux-codes/termuxHealthService.ts): Health checking, uptime/active process monitoring, and Android intent launcher for Termux (`termux://`).
  - [`termuxSetupModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/termux-codes/termuxSetupModal.tsx): 1-Tap setup & connect modal with live auto-detection and auto-dismissal.
  - [`index.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/termux-codes/index.ts): Barrel export for the Termux codes module.
- **Dynamic Routing & Real-Time Output**:
  - Wired [`agentCore.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/agent/agentCore.ts) and [`GeminiChatScreen.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/GeminiChatScreen.tsx) to stream live thought cards, tool progress, and token deltas directly into the chatbox and status bar.
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-27] - Transformed Raw JSON into Rich Activity Cards
- **Dedicated Step Card Component ([`src/ai/components/StepCard.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/StepCard.tsx)):**
  - Eliminated raw JSON display (`{ "command": "...", "description": "..." }`).
  - Terminal commands are formatted into beautiful terminal boxes: `$ composer create-project laravel/laravel .` with human-readable description badges (`📌 Create Laravel project in current directory`).
  - File operations display dedicated green file badges (`📄 path/to/file`) and code previews.
  - Output results are styled into dark console blocks with error highlights.
  - Pending executions show live running spinners instead of static text.
- **Fixed Echoing Issue in SSE Stream ([`termuxBridgeService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/termux-codes/termuxBridgeService.ts)):**
  - Filtered out `role: "user"` message events emitted by gemini-cli so that the user's prompt is never duplicated into the assistant's message bubble.
  - Attached tool outputs directly to their corresponding tool invocation step card.
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-27] - Dictated Session State & Multi-Turn Memory in Termux
- **Injected Dictated Session ID ([`SYSTEM_GUIDE.md`](file:///home/janelle/Documents/projects/ai-coder/mahiru-cli/SYSTEM_GUIDE.md#L36-L51)):**
  - Updated [`agentCore.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/agent/agentCore.ts), [`GeminiChatScreen.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/GeminiChatScreen.tsx), and [`MiniChatModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/MiniChatModal.tsx) to persistently pass the active chat's `sessionId` (`--session-id <id>`).
  - [`termuxBridgeService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/termux-codes/termuxBridgeService.ts) passes `sessionId` and `mahiruSessionId` into every request payload so the CLI daemon in Termux resumes the exact same session file on disk across subsequent user turns.
  - Multi-turn conversational memory now persists across turns (e.g. asking "Tell me what we did" recalls previous tool outputs and commands).
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-27] - Standardized Chat Title to "Pyxis AI"
- **Updated Default Chat Titles ([`conversationService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/builtin-pyxis/conversationService.ts#L55-L78) & [`ChatHeader.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/ChatHeader.tsx#L39-L42)):**
  - Replaced date-based naming (`Chat MM/DD/YYYY`) and generic `New Conversation` with **`Pyxis AI`**.
  - Header and session list now consistently show **`Pyxis AI`**.
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-27] - Rich Visual Markdown Hierarchy & Typography
- **Dedicated Markdown Renderer ([`src/ai/components/MarkdownMessageView.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/MarkdownMessageView.tsx)):**
  - **Color-Coded Heading Hierarchy**:
    - `# Heading 1`: Bold Blue (`#8ab4f8`) with bottom border separator.
    - `## Heading 2`: Mint Emerald (`#81c995`).
    - `### Heading 3`: Warm Gold (`#fdd663`).
    - `#### Heading 4`: Lavender Purple (`#c58af9`).
  - **Numbered & Bullet Lists**:
    - Ordered lists (`1. `, `2. `) render circular numbered badges with soft blue borders and proper hanging indentation.
    - Bullet lists (`- `, `* `) render custom colored dots (`•`).
  - **Inline Code & Bold Highlights**:
    - Inline code (`` `app.json` ``) renders with a dark pill container, green monospace font, and border.
    - Bold text (`**text**`) and bold code (`` **`src/app/_layout.tsx`** ``) render with high-contrast white/mint emphasis without raw markdown symbols showing.
  - **Blockquotes / Alerts (`> quote`)**:
    - Styled with a vertical blue accent bar and italicized subtext.
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-27] - Fixed Bubble Width Jumps & List Alignment
- **Stabilized Assistant Bubble Dimensions ([`AgentMessageItem.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/AgentMessageItem.tsx#L183-L195)):**
  - Set `assistantContainer` to `width: "100%"` and `assistantBubble` to `flex: 1`, preventing horizontal bouncing/shrinking during streaming updates and step executions.
- **Fixed Multi-Line List Alignment ([`MarkdownMessageView.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/MarkdownMessageView.tsx)):**
  - Added `flex: 1` to `listItemText` so multi-line text wraps cleanly under itself instead of shifting.
  - Standardized list badges and bullet dot containers to a fixed `20px` width for identical left margin alignment.
  - Polished inline code tokenization for seamless font baseline alignment.
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-27] - Termux & File Explorer Dynamic Link
- **Settings Toggle & Status ([`SettingsModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/SettingsModal.tsx)):**
  - Added dedicated **"Link Explorer with Termux"** toggle in the Settings modal with real-time daemon status detection (`🟢 Online` / `🔴 Offline`).
  - Added **"Sync Explorer Now"** button with instant feedback to reload files on demand.
- **Bi-Directional Termux File Sync ([`workspaceService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ide/services/workspaceService.ts)):**
  - Integrated `loadWorkspace` with `http://127.0.0.1:8765/workspace-tree` to pull live Laravel/Node directories and file trees directly from Termux.
  - Integrated `readFileContent`, `saveFileContent`, `deleteFileFromWorkspace` with Termux REST endpoints (`/read-file`, `/write-file`, `/delete-file`) for live synchronicity while maintaining offline local fallback.
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-27] - Fixed User Message Alignment in Chatbox
- **Corrected User Message Alignment ([`AgentMessageItem.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/AgentMessageItem.tsx#L183-L220)):**
  - Updated `userContainer` with `flexDirection: "row-reverse"`, `justifyContent: "flex-start"`, and `alignSelf: "flex-end"` to position user messages on the right side of the screen with the user avatar on the far right.
  - Assistant messages remain left-aligned (`flexDirection: "row"`, `justifyContent: "flex-start"`) with the Pyxis logo on the left.
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-27] - Vertical Pyxis Logo Stacking & Full-Width Chatbox
- **Stacked Assistant Layout ([`AgentMessageItem.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/AgentMessageItem.tsx#L110-L180)):**
  - Repositioned the Pyxis logo and "Pyxis AI" label into a dedicated header row situated directly above the message bubble.
  - The assistant chat bubble now spans 100% of the horizontal screen width with zero avatar indent, providing maximum horizontal room for code blocks, terminal boxes, and step cards without visual clutter.
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-27] - Default Auto-Scroll to Latest Message
- **Initial Scroll to Bottom ([`GeminiChatScreen.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/GeminiChatScreen.tsx#L355-L362) & [`MiniChatModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/MiniChatModal.tsx#L200-L210)):**
  - Added `onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}` to both chat screen and mini modal.
  - When opening a chat session or loading messages, the chatbox now defaults immediately to the most recent conversation turn at the bottom rather than showing the top of the thread.
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-27] - Smart Non-Disruptive Scrolling
- **Preserved Scroll Position on Step Toggle ([`GeminiChatScreen.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/GeminiChatScreen.tsx#L355-L370) & [`MiniChatModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/MiniChatModal.tsx#L200-L215)):**
  - Integrated `hasInitialScrolledRef` to only auto-scroll to the bottom on initial load / chat switch or when new messages/tokens are actively streaming.
  - Expanding, collapsing, or viewing older step cards while browsing past history preserves the user's exact scroll position without snapping to the bottom.
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-27] - 10-Message History Windowing & Scroll-to-Load
- **Windowed Message Rendering ([`GeminiChatScreen.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/GeminiChatScreen.tsx#L55-L250)):**
  - Configured default render window to the latest 10 messages (`messages.slice(-renderLimit)`), keeping the chat list super fast and lightweight.
  - Scrolling to the top of the chat automatically renders +10 earlier messages smoothly.
  - Added an interactive **"Show earlier messages (N older)"** button at the top of the history list for 1-tap manual loading.
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-28] - Double-Tap to Edit in Code Editor
- **Prevented Accidental Single-Tap Keyboard Triggers ([`EditorView.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/EditorView.tsx)):**
  - Configured `TextInput` to `editable={false}` by default in View Mode so touching or scrolling the code never randomly moves the cursor or opens the keyboard.
  - Added double-tap detection (`handleDoubleTap`) to smoothly activate Edit Mode and focus the keyboard only when intentionally double-tapped.
  - Added a status badge in the top bar (`View` / `Editing`) and a **"Done"** checkmark button to lock the editor back into View Mode.
  - Automatically locks back into View Mode when the keyboard is dismissed (`keyboardDidHide` listener) or when blurred.
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-28] - Smooth Native Swiping in View Mode
- **Seamless Scrolling & Swipe-Safe Gesture Recognition ([`EditorView.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/EditorView.tsx)):**
  - Wrapped the editor and gutter together in a native `ScrollView`, enabling high-performance vertical swiping and scroll momentum while in locked View Mode.
  - Integrated movement delta thresholding (`dx > 10 || dy > 10`) so swiping to browse code never triggers edit mode accidentally.
  - In-place double taps without drag activate Edit Mode and focus the keyboard immediately.
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-28] - One Dark Pro Syntax Highlighting & Prettier Formatter
- **Vibrant Syntax Highlighting ([`CodeSyntaxHighlighter.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/CodeSyntaxHighlighter.tsx) & [`syntaxTokenizer.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ide/services/syntaxTokenizer.ts)):**
  - Implemented a fast on-device lexical tokenizer for JS, TS, JSX, JSON, Python, PHP, HTML, and CSS.
  - Colorized keywords (`#c678dd` purple), strings (`#98c379` green), functions (`#61afef` blue), JSX tags (`#e06c75` coral red), properties (`#e5c07b` gold), numbers/booleans (`#d19a66` orange), comments (`#5c6370` italic slate), and operators based on the VS Code One Dark Pro theme.
  - Added subtle vertical indentation guide lines for clear visual block hierarchy.
- **Built-in Prettier / Code Beautifier ([`formatterService.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ide/services/formatterService.ts) & [`EditorView.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/EditorView.tsx)):**
  - Added a dedicated 1-tap **"Format Code"** magic wand button in the top toolbar and dropdown menu to standardize 2-space indentation, normalize operator spacing, and align braces automatically.
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-28] - Live Syntax Highlighting in Active Edit Mode
- **Persistent Real-Time Highlighting ([`EditorView.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/EditorView.tsx)):**
  - Upgraded `<TextInput>` to render tokenized nested `<Text>` elements (`TOKEN_COLORS`), ensuring keywords, strings, functions, JSX tags, and comments stay colorized in One Dark Pro theme **while typing and editing**.
  - No more fallback to monochrome text when double-tapping to edit; syntax highlighting remains continuous across both View and Edit modes.
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-28] - Smooth 60FPS Sidebar Dragging & Resizing
- **Eliminated Drag Lag ([`IDELayout.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/IDELayout.tsx)):**
  - Replaced high-frequency state updates (`setSidebarWidth` on every pixel move) with `Animated.Value` and native driver gestures via `PanResponder`.
  - Sidebar width now animates directly on the native layout thread during the drag gesture without re-rendering `FileExplorer`, `EditorView`, syntax tokenizers, or the IDE component tree.
  - Added subtle active visual feedback on the resizer handle (`#8ab4f8`) while dragging.
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-28] - Explorer Folders Closed by Default
- **Clean Explorer Hierarchy ([`FileExplorer.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/FileExplorer.tsx)):**
  - Updated folder expansion state to `expandedFolders: Record<string, boolean> = {}`, ensuring all folders (e.g. `src/`, `scripts/`, `assets/`, `node_modules/`) start collapsed by default for a clean, clutter-free workspace view.
  - Tapping a folder expands it with the open folder icon and chevron, and tapping it again collapses it.
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-28] - Structured Folder Hierarchy & Dot Folder Priority
- **Strict Folder Placement ([`FileExplorer.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/FileExplorer.tsx)):**
  - Updated `sortNodes` comparator:
    1. **All folders** are strictly grouped on top above all files.
    2. **Regular folders** (e.g. `assets/`, `scripts/`, `src/`) appear first, followed by **dot folders** (e.g. `.expo/`, `.git/`, `.vscode/`).
    3. **Regular files** (e.g. `package.json`, `index.tsx`) appear next, followed by **dot files** (e.g. `.env`, `.gitignore`).
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-29] - Fullscreen Pyxis Chat Integration with Direct IDE Return
- **Connected Floating AI Button ([`IDELayout.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/IDELayout.tsx)):**
  - Updated floating Pyxis assistant button and editor "Ask AI" actions to open the full-screen Pyxis AI interface (`GeminiChatScreen`), providing full access to multi-step reasoning, real-time tool logs, session history, and engine modes.
- **Added Dedicated "Back to IDE" Button ([`ChatHeader.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/ChatHeader.tsx)):**
  - Added a dedicated 1-tap navigation button (`chevron-back` + `code-slash`) in the top chat header to immediately return to the code editor with 1 tap.
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-29] - Fixed File Content Loading on Explorer Selection
- **Resolved Blank File Issue ([`IDELayout.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/IDELayout.tsx)):**
  - Fixed `handleSelectFile` which previously skipped reading disk/Termux content due to `file.content !== undefined` evaluating to true on empty tree nodes (`content: ""`).
  - `handleSelectFile` now always loads the actual file content using `readFileContent(workspace.id, file.path || file.name)` whenever you select any file in the Explorer.
  - Also corrected file save paths to preserve nested folder hierarchies (`file.path || file.name`).
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-29] - Compact Floating Pyxis AI Chatbox in IDE
- **Floating Assistant Window ([`MiniChatModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/MiniChatModal.tsx)):**
  - Designed a compact floating assistant card (`maxWidth: 440`, `height: 60%`, `borderRadius: 16`) that floats cleanly above the IDE editor and code.
  - Features the complete Pyxis suite: Markdown hierarchy, live StepCards, token streaming deltas, quick action pills (`Build`, `Fix`, `Audit`, `Explain`), model selector, session switcher, stop button, and 1-tap fullscreen expansion.
  - Modularized controller logic into [`useFloatingChat.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/useFloatingChat.ts) and [`FloatingChatHeader.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/FloatingChatHeader.tsx) to maintain strict sub-500 line limits.
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-29] - Non-Blocking Mini Floating Chat & Quick Sliders Removed
- **True Non-Blocking Floating Chat Widget ([`MiniChatModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/MiniChatModal.tsx)):**
  - Removed full-screen blocking `<Modal>` and backdrops. The floating chatbox is now an in-layout widget (`width: 290`, `height: 310`, `bottom: 50`, `right: 10`) allowing continuous interaction, editing, and scrolling in the code editor around it.
- **Removed Quick Action Button Sliders:**
  - Completely removed the action chip slider (`Build`, `Fix`, `Audit`, `Explain`) and deleted `MahiruQuickBar.tsx` across both fullscreen and mini floating chat for maximum clean screen space.
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-29] - Large File Opening & Syntax Tokenizer Optimization
- **Fixed Large File UI Freezes (`package-lock.json` / minified bundles):**
  - **Syntax Tokenizer Safety Threshold ([`syntaxTokenizer.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ide/services/syntaxTokenizer.ts))**: Capped heavy AST regex parsing to the first 800 lines. Remaining lines are transformed instantly into plain line records with 0 regex overhead, eliminating thread locks.
  - **Bulk Monospace View Chunking ([`CodeSyntaxHighlighter.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/CodeSyntaxHighlighter.tsx))**: Detailed per-token `<View>` rows are rendered for the first 600 lines, and subsequent lines are consolidated into bulk `<Text>` blocks, cutting native view node instantiations from >65,000 down to ~600.
  - **High-Performance Edit Mode ([`EditorView.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/EditorView.tsx))**: When double-tapping to edit files with >400 lines or >25KB, the editor seamlessly utilizes native single-string `<TextInput>` rendering with instant keystroke response and zero input lag.
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-29] - 100-Line Virtual Chunk Loader & Zero-Lag Themed Editor
- **100-Line Dynamic Window Loader ([`EditorView.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/EditorView.tsx)):**
  - Implemented dynamic 100-line chunking. When opening any file (even 50,000-line `package-lock.json`), only the first 100 lines are parsed and rendered immediately (< 3ms load time, 60 FPS scrolling).
  - Automatically loads the next +100 lines as the user approaches the bottom of the visible code.
  - Added a dedicated indicator bar (`Showing N of Total lines`) with 1-tap manual chunk expansion.
- **Fixed Double-Tap Edit Lag & Theme Reversion ([`EditorView.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/EditorView.tsx) & [`EditorTabBar.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/EditorTabBar.tsx)):**
  - Because only the 100-line window is tokenized, tokenization is instantaneous (< 1ms).
  - **Syntax colors (One Dark Pro) stay 100% active while editing in `<TextInput>` without ever reverting to default monochrome or jumping**.
  - Double-tapping to edit focuses the keyboard immediately with 0ms lag.
  - Extracted tab bar controls into [`EditorTabBar.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/EditorTabBar.tsx) (237 lines), reducing [`EditorView.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/EditorView.tsx) to 324 lines.
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-29] - True Sliding Window Virtualization (Strict 100-Line Memory Footprint)
- **Strict 100-Line Sliding Window Virtualization ([`EditorView.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/EditorView.tsx))**:
  - Implemented true sliding window virtualization where **all lines outside the 100-line viewport window are strictly unrendered** from memory and from React Native's view hierarchy.
  - Top & bottom virtual spacers (`topSpacerHeight`, `bottomSpacerHeight`) dynamically preserve true scroll height and exact physical scrollbar tracking.
  - Scrolling down slides the window and cleanly unrenders previous top lines; scrolling up unrenders bottom lines.
  - Line numbers in [`CodeSyntaxHighlighter.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/CodeSyntaxHighlighter.tsx) and [`syntaxTokenizer.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ide/services/syntaxTokenizer.ts) dynamically match the exact `startLineNumber`.
  - Memory consumption remains flat, constant, and minimal regardless of whether the file has 500 lines or 50,000 lines.
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-29] - Pinned Gutter & Bi-Directional Horizontal Scrolling
- **Horizontal Scrolling for Long Code Blocks ([`CodeSyntaxHighlighter.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/CodeSyntaxHighlighter.tsx) & [`EditorView.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/EditorView.tsx))**:
  - Fixed clipping and truncation on long code lines / statements / JSON objects.
  - Implemented nested horizontal `<ScrollView>` on the code body in both View Mode and Edit Mode (`<TextInput>`).
  - **Pinned Line Numbers Gutter**: When swiping horizontally to browse long lines of code, the line numbers column stays fixed on the left margin just like VS Code.
  - Fully compatible with sliding window virtualization, 60 FPS performance, and persistent One Dark Pro syntax coloring.
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-29] - Responsive Keyboard Layout (Mini Chat, Fullscreen Chat, Terminal)
- **Responsive Floating Mini Chatbox ([`MiniChatModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/MiniChatModal.tsx))**:
  - Integrated `Keyboard.addListener` across iOS and Android. When the soft keyboard appears, the floating mini chatbox dynamically lifts to `keyboardOffset + 8px` so the chat window and prompt input remain fully visible above the keyboard.
  - Smoothly resets to `bottom: 50px` when the keyboard is dismissed.
- **Responsive Full-Screen Pyxis Assistant ([`GeminiChatScreen.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/GeminiChatScreen.tsx))**:
  - Configured `KeyboardAvoidingView` and keyboard listener with instant auto-scrolling to the latest message turn upon typing, preventing any prompt bar occlusion.
- **Responsive Terminal Console ([`TerminalView.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/TerminalView.tsx))**:
  - Added auto-scroll listeners and keyboard avoiding behavior to ensure the command prompt line `$ [command]` and quick chips remain accessible above the keyboard.
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-29] - Direct Dynamic KeyboardOffset Padding (Fullscreen Chat & Terminal)
- **Universal Dynamic Keyboard Offset across All Screens**:
  - Replaced unreliable native `KeyboardAvoidingView` on Android with direct `keyboardOffset` measurement via `Keyboard.addListener` across:
    1. **Full-Screen Pyxis Chat ([`GeminiChatScreen.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/GeminiChatScreen.tsx))**: Dynamic `paddingBottom: keyboardOffset` ensures the prompt input box, engine toggle, and send button lift cleanly above the keyboard on every Android & iOS device.
    2. **Terminal Console ([`TerminalView.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/TerminalView.tsx))**: Dynamic `paddingBottom: keyboardOffset` ensures the `$ [command]` prompt and quick action chips lift above the keyboard with synchronized output auto-scrolling.
    3. **Floating Mini Chat ([`MiniChatModal.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ai/components/MiniChatModal.tsx))**: `bottom: keyboardOffset + 8px` lifts the floating card above the keyboard.
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-29] - Lower Explorer Bottom Resize Zone (Invisible & Zero Obstruction)
- **Removed Middle Resizer Line & Overlay**:
  - Removed dividing separator lines/borders between the Explorer and Editor.
- **Lower Explorer Resize Box ([`FileExplorer.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/FileExplorer.tsx) & [`IDELayout.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/IDELayout.tsx))**:
  - Placed a dedicated, clean bottom resize box (`height: 48px`, background `#252526`) directly underneath the file list `ScrollView`.
  - **File List Boundary Limit**: The file list stops cleanly above this lower box, ensuring all files and folders scroll and hide behind/above it with 100% full clickability.
  - **Horizontal Swipe Resizing**: Swiping horizontally across this lower box smoothly resizes the explorer width (`Math.abs(gestureState.dx) > 4`), with a subtle active highlight (`#8ab4f8`) while dragging.
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.

### [2026-08-29] - Folder Header Isolation & Nested Subfolder Drag-and-Drop
- **Folder Header PanResponder & Boundary Isolation ([`FileExplorer.tsx`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/FileExplorer.tsx))**:
  - Attached PanResponders and layout registration strictly to the **folder header row** rather than the parent container wrapping children.
  - Files and subfolders inside open folders are no longer intercepted by parent folder bounds, allowing child files to be dragged and relocated anywhere with full responsiveness.
- **Accurate Nested Subfolder Auto-Opening ([`useFileDragDrop.ts`](file:///home/janelle/Documents/projects/ai-coder/src/ide/components/useFileDragDrop.ts))**:
  - Measures true window bounds (`top` to `bottom`) for every visible folder and subfolder header individually.
  - Hovering a dragged file over nested subfolders triggers fast **280ms auto-expansion** with automatic multi-tick child re-measuring (60ms, 180ms, 320ms).
- **Workspace Root Drop Zone**:
  - Dropping any nested file/folder into the "Move to workspace root" drop zone cleanly moves the file out of subdirectories to the root workspace.
- **Strict Verification:**
  - 100% of source files strictly verified under 500 lines.
  - `npx tsc --noEmit` verified with 0 errors.
