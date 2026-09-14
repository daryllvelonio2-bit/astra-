# Performance Optimization Plan — faster / snappier, zero functionality loss

Goal: cut startup, navigation, editor typing, chat streaming, terminal flood, file/git ops latency. No UI/UX removal, no feature cuts. Measure before/after each phase. Phase-by-phase, verify exit gate before next (per `agents.md`).

## Phase 0 — Baseline (measure only) — DONE 2026-09-14
- [x] Log boot timings: `loadHasCompletedStartup`, `PRootService.ensureReady`, first picker paint, first editor paint.
- [x] Log workspace scan: dirs scanned, ms, `SCAN_TIMEOUT_MS` hits (`workspaceService.ts:182-260`).
- [x] Log bundle: JS bundle bytes, Hermes bytecode, `monacoEngineHtml.json` 3.9M + `xtermHtml.generated.ts` 296K copies.
- [x] Log chat: `onTextDelta` setState/sec, `AstraChatScreen.tsx` remaps/sec during stream.
- [x] Log terminal: `XtermView.tsx` injects/sec, `AnsiRenderer.tsx` parse ms/chunk, `runningTasksService.ts` poll ms.

## Phase 1 — React render quick wins (no behavior change) — DONE 2026-09-14
- [x] `IDELayout.tsx`: stable `handleContentChange` (ref, no per-keystroke recreate), `handleBackToPicker`/`refreshWorkspace`/`handleSelectFile`/`handleEditModeChange` + 16 extracted callbacks (`useIDELayoutCallbacks.ts`), memoized styles/count (`useIDELayoutStyles.ts`), running-tasks signature guard.
- [x] Memo defeats: `AgentMessageItem` (memoized step filters via `useAgentMessageData.ts`, stable toggles), `StepCard` (memoized port scan, stable collapse/output toggles), `GitFileItem` verified memo (parent callbacks stable). `FileExplorer` full virtualization → Phase 2.
- [x] Theme: `getTokenColors` cached by theme identity (`syntaxTokenizer.ts`), `CodeSyntaxHighlighter` memoized + palette memoized, midnight bubble `shadow*` removed (modals keep theirs).
- [x] Chat (`useChatSession`, `AstraChatScreen`): delta batching ~100ms (`useDeltaBatch.ts`), `handleSend` stable (no `messages` dep, uses ref), memoized `visibleMessages`, stable scroll/paginate callbacks.
- [ ] `MarkdownMessageView.tsx:434`: deep parse memo → Phase 2 (old rows already skip via memo + stable slice; streaming re-parse is inherent to new text).
- [x] 1Hz tick: stable slice + memo rows isolate timer; `scrollToEnd({animated:false})` everywhere during stream/keyboard; `LayoutAnimation` removed from `LiveAgentStatusBar`/`RunningTasksBar` (snap expand); task subscriptions signature-guarded (ignore output-text notifies).
- [x] `AnsiRenderer.tsx`: palettes/parse/font memoized, input capped 60k chars, spans capped 1500.
- [x] `EditorView`: verified already memoized (`rawLines`/`offsets`/`chunk`) + `useEditorAssists` debounced; caps kept (800/1500/250). No change needed.
- [ ] `FileExplorer.tsx:387`: full `renderNode` virtualization + drag throttle → Phase 2 (measurement path left untouched for stability).

## Phase 2 — Lists + mount policy (biggest snappiness gain)
- [ ] Virtualize unbounded lists: chat, file tree, `GitDiffViewer:449`, `ProblemsPanel`, diff/history. Use `FlatList` + `keyExtractor` (already) + add `getItemLayout`, `windowSize`, `maxToRenderPerBatch`, `removeClippedSubviews` (copy `ProjectPicker:411` tuning). No `ScrollView+.map` for unbounded data.
- [ ] `IDELayout.tsx`: evict `visitedTabs` (LRU, keep max 2-3 WebViews live); suspend hidden WebView intervals (`XtermView` flush 80ms, `VSCodeView` guard 600/2000ms, `DesktopView` logs).
- [ ] Lazy-mount `DesktopView:379` / `VSCodeView:306` / `WebBrowserPreview:287` on first visit only; keep editor mounted (current keep-alive is correct).

## Phase 3 — WebView bridges
- [ ] `XtermView:331`: adaptive flush (batch more than 80ms when flooding), keep `WRITE_SLICE=65536` / `MAX_QUEUE=512` drop-front, remove `__DEV__` grid logs, dedupe resize (already clamps cols>=20/rows>=10 — keep).
- [ ] `monacoEngineService.ts:148` + `MonacoEngineHost:44`: lazy-init hidden tokenizer, cache tokens per file+hash, debounce full-source `injectJavaScript(JSON(src))` (~300ms, cancel prior), keep `MAX_CODE_CHARS=400k` / `REQUEST_TIMEOUT_MS=8000` fallbacks.
- [ ] `VSCodeView` / `WebBrowserPreview` / `DesktopView`: avoid `key={url/reloadKey}` full remount; use `reload()` / `goBack()`; unsubscribe `runningTasksService` when hidden; ring buffer for logs (no `[...prev,line].slice(-200)` copy per line).
- [ ] Guard all `onMessage JSON.parse` with try/catch.

## Phase 4 — FS / services / PRoot (fewer spawns, fewer writes)
- [ ] `workspaceService:462`: cache tree + incremental refresh (tighten `useWorkspaceAutoRefresh`), batch `readDirEntries` (fewer per-dir bridge calls), throttle `onProgress` callbacks.
- [ ] Registries (`workspace registry`, `configService:375`, `conversationService:227`, avatar cache): write only on change, debounce saves (settings autosave, per-message session save → batch ~1s), no wholesale `JSON.parse/stringify` on UI thread per event.
- [ ] `gitService:481`: batch `rev-parse + status --porcelain -b + rev-list --count` into fewer PRoot calls; cache status 2-3s; debounce explorer refresh after file side-effects.
- [ ] `runningTasksService:451`: poll 5s → 8-10s when idle, skip `ps/netstat` + `fetch 1200ms` probes when zero tasks, `notify()` only on shallow-change, avoid `output.slice(-40000)` full copy per append.
- [ ] `nativeFs.ts:175`: keep sync-native-first + `fsRace 3s`, add small stat/dir cache with TTL.
- [ ] Native (`LinuxRunnerModule.kt`, `ProcessExecutor`, `ProotSessionConfig`, `EnvironmentManager`): skip `ensureSystemConfigs` rewrite (resolv/hosts/shims/launcher) when marker fresh (~30s TTL); cache DNS (`getprop` + `LinkProperties`); avoid `mkdirs` per call; one persistent shell for frequent `command -v` / `rev-parse` probes instead of one PRoot process per call. Respect invariant: daemons only from supervisor PTY (`desktop-svc`, `vscode-svc`), never `executeCommand` (see `architecture.md`).

## Phase 5 — Bundle + startup (faster cold start)
- [ ] Metro (`metro.config.js:19`): keep `typescript@5.3.3 (23M)` out of bundle (lazy-require already, but still bundled) — use bracket-scan fallback / native LSP only; add `blockList` guard against accidental `monaco-editor (101M)` imports.
- [ ] `monacoEngineHtml.json (4.0M)`: stop `import …json` (Metro inlines + `replaceAll` copy + WebView copy = 3x RAM); load via `expo-asset` / `FileSystem` at runtime, cache built HTML, rebuild only on theme change.
- [ ] `xtermHtml.generated.ts (296K)`: same — build once, cache, rebuild only on theme/font change.
- [ ] Boot (`App.tsx`, `AppBootScreen:177`): parallelize `loadHasCompletedStartup + loadAstraEnabled + PRootService.ensureReady`; paint picker ASAP, don't block on sandbox; shorten 15s fallback; defer `ToolchainProvisioner` apk stages to background after first frame.
- [ ] Remove/unused deps check (`@expo/ngrok`, `jszip`, `monaco-editor` in `package.json` vs offline esbuild page); enable Hermes bytecode + preload only needed fonts/assets.

## Exit gates (every phase)
- `tsc` clean, no file >500 lines, no hardcoded theme colors, boot/list/type/stream manually verified snappier with zero feature loss. Update `PROGRESS.md` after each phase.
