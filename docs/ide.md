# IDE

`src/ide/` holds the workspace UI. `src/theme/` holds the global theme
(`themeContext.tsx`, `useOrientation.ts`). App navigation lives in `App.tsx`
(picker / chat / editor; chat+editor stay mounted once opened so agent turns
and PTY sessions survive navigation).

## Workspaces

- **Location:** app-private `workspaces/` under `FileSystem.documentDirectory`
  (`workspaceService.ts`, `storagePaths.ts`). Platform-aware quick paths and
  picker defaults live in `storagePaths.ts`.
- **Registry:** `workspaces_registry.json` maps `id → { name, dirPath,
  template?, createdAt }`. `listWorkspaces()` unions the directory scan with
  registry keys.
- **Custom locations:** `createWorkspace(name, customPath?)` creates a folder
  inside a chosen parent; `openExistingDirectoryAsProject(dirPath)` registers
  an existing directory (e.g. `/sdcard/...`, cloned repos) in place.
- **Loading:** `loadWorkspace()` recursively scans to depth 6, skipping
  `node_modules`, `vendor`, `.git`, `dist`, `build`, caches, and dotfiles
  (except `.env`/`.gitignore`), yielding to the event loop every 12
  directories, with a 45s timeout. File bodies load lazily on open.
- **Reactivity:** mutations call `notifyWorkspaceChanged()`; explorers
  refresh via `subscribeWorkspaceChanges` / `useWorkspaceAutoRefresh`.
- **FS layer** (`nativeFs.ts`): sync-native-first through `linux-runner`,
  expo-file-system as a 3s-raced fallback; external paths (outside the app
  sandbox) always go native.

## Project picker

`ProjectPicker.tsx` lists workspace metas as cards (`ProjectCard.tsx`) with
search, backed by `listWorkspaceMetas()`. Creation and opening go through
modals:

- `CreateProjectModal.tsx` — name + Default Storage / Specific Directory
  toggle; keyboard-aware bottom sheet (lifts above the soft keyboard,
  auto-scrolls the focused field).
- `DirectoryPickerModal.tsx` — on-device directory browser with quick jumps
  (`/sdcard/...` on Android only), typed-path entry, and inline folder creation.
- `CloneRepoModal.tsx` — clone any GitHub URL or `user/repo` shorthand over
  HTTPS/SSH, with inline token/SSH-key auth recovery and live progress.
- `ProjectInspectorModal.tsx` — details, open, and destructive delete
  (deletes the directory + its saved conversation).

## Editor tab

- `EditorView.tsx` — virtualized viewer (`WINDOW_SIZE = 100` lines) with a
  transparent `TextInput` over token-colored rendering.
- `CodeSyntaxHighlighter.tsx` + `syntaxTokenizer.ts` — regex tokenizer with
  separate dark/light palettes; `codeDiagnosticsService.ts` — bracket
  matching and error/warning analysis shown in `ProblemsPanel.tsx`.
- `EditorTabBar.tsx` — file title, edit/view badge, problem counts, format,
  run, and the ⋮ overflow menu.
- `FileExplorer.tsx` (+ `fileExplorerUtils`, `useFileDragDrop`,
  `useWorkspaceFileActions`, `useSidebarResizer`, `FileActionModal`) —
  tree with expand/collapse, inline create, drag-drop move, long-press
  actions, animated resizable sidebar.
- `chatFileLinkService.ts` — normalizes agent/PRoot/`file://` paths to
  workspace-relative paths; `ideActionService.ts` is the event bus the agent
  uses to open files, browser URLs, the terminal, or switch tabs.

## Terminal tab

- `TerminalView.tsx` — multi-session host; `useTerminalSession.ts` owns
  session state, history folding, clipboard, zoom, and task-tab sync.
- **PTY shell sessions** render with xterm.js (`XtermView.tsx`, offline HTML
  built by `scripts/build-xterm-html.js`); **task tabs** use the legacy
  `AnsiRenderer` scrollback. Gated by `PTY_XTERM_ENABLED` (`ptyConfig.ts`).
- `ExtraKeysBar.tsx` — Termux-style ESC/TAB/CTRL/ALT/arrows + symbols with
  sticky modifiers; the shortcut row pins itself above the soft keyboard.
- `TerminalHeader.tsx` — session tabs, restart/clear, theme picker, zoom,
  copy/paste. `terminalBuffer.ts` — 100k cap, honest history merging, and the
  ASTRA fastfetch-style banner. `terminalThemes.ts` — independent terminal
  color schemes (follow the app theme mode by default).

## Browser tab

`WebBrowserPreview.tsx` — WebView with nav bar, running-task port chips,
and error view. Localhost URLs are normalized; dev servers started by the
agent are detected (`runningTasksInspect.ts`) and can auto-open here.

## Git tab

A GitHub-Desktop-style client backed by the guest `git` binary:

- `GitHubDesktopView.tsx` — responsive container (side-by-side in landscape,
  master-detail in portrait) composing header, changes, history, diff, and
  branch/credentials/remote modals.
- `gitService.ts` — status, stage/unstage, commit, log/show, branches,
  fetch/pull/push, remotes, credentials, SSH key management.
- `GitChangesList.tsx` — file staging + AI-generated commit summary
  (`gitCommitSummary.ts`, uses your own Gemini key) with a keyboard-aware
  commit box; `GitDiffViewer.tsx` + `diffParser.ts` — unified diff with
  dual gutters; `GitHistoryList.tsx`, `GitCommitFilesList.tsx`,
  `GitBranchModal.tsx`, `GitRemoteModal.tsx`.
- `gitCloneService.ts` — non-interactive clone with auth-error detection;
  `GitCredentialsModal.tsx` + `GitTokenTab` / `GitSshKeyTab` — fine-grained
  PAT and ed25519 SSH onboarding.
- The floating AI button auto-hides on this tab to keep diffs unobstructed.

## Desktop tab

`DesktopView.tsx` + `desktopService.ts` — on-demand XFCE desktop (Xvnc +
websockify + bundled noVNC, ~1GB provision) viewed in a WebView over
localhost-only ports with a random per-install VNC password. Starts from a
persistent supervisor PTY session with pidfile-verified readiness and full
diagnostics on failure. Landscape auto-engages fullscreen (status bar,
insets, bottom bar, and AI button all hide).

## Bottom navigation + floating button

`IDEBottomBar.tsx` — Editor / Terminal / Browser / Git / Desktop.
`AiAssistantMenu.tsx` — floating Astra button opening fullscreen chat or the
system-overlay chathead (long-press), with a stop item while running.
Visibility is user-configurable, see [configuration](configuration.md).

## Settings

`SettingsModal.tsx` — tabbed sheet (`SettingsTabBar.tsx`) with debounced
autosave and a Saved indicator:

| Tab | Contents |
|---|---|
| Theme | `AppearanceSection` — dark / light / midnight |
| Keys | `ApiKeyManager` — multiple Gemini keys, masked display |
| Model | `ModelSection` — `SUPPORTED_MODELS` picker |
| Linux | `EnvironmentSection` — toolchain stages, live APK log, binary health |
| Tabs | `NavigationSection` — bottom-tab + AI-button visibility |

All values persist in `config.json` via `configService.ts`.

## Theming

Every component styles through `useTheme()` tokens (`bg*`, `text*`,
`accent*`, borders, overlays) — no hardcoded colors. `useOrientation()`
drives landscape-compact bars, the collapsible sidebar, and desktop
fullscreen. Syntax colors (`syntaxTokenizer.ts`) and terminal themes
(`terminalThemes.ts`) are the only separate palettes, both with dark/light
variants.
