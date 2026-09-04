package expo.modules.linuxrunner

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class LinuxRunnerModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("LinuxRunner")

        Events("onTerminalData", "onCommandOutput")

        Function("isEnvironmentReady") {
            val context = appContext.reactContext ?: return@Function false
            return@Function EnvironmentManager.isEnvironmentReady(context)
        }

        AsyncFunction("initializeEnvironment") {
            val context = appContext.reactContext ?: return@AsyncFunction false
            return@AsyncFunction EnvironmentManager.initialize(context)
        }

        AsyncFunction("executeCommand") { command: String, workspaceId: String? ->
            val context = appContext.reactContext ?: return@AsyncFunction mapOf(
                "stdout" to "Error: React context unavailable",
                "exitCode" to -1
            )
            EnvironmentManager.initialize(context)
            val result = ProcessExecutor.execute(context, command, workspaceId, 0)
            return@AsyncFunction mapOf(
                "stdout" to result.stdout,
                "exitCode" to result.exitCode
            )
        }

        AsyncFunction("executeCommandStream") { commandId: String, command: String, workspaceId: String? ->
            val context = appContext.reactContext ?: return@AsyncFunction mapOf(
                "stdout" to "Error: React context unavailable",
                "exitCode" to -1
            )
            EnvironmentManager.initialize(context)
            val result = ProcessExecutor.execute(context, command, workspaceId, 0, commandId) { line ->
                sendEvent("onCommandOutput", mapOf("commandId" to commandId, "line" to line))
            }
            return@AsyncFunction mapOf(
                "stdout" to result.stdout,
                "exitCode" to result.exitCode
            )
        }

        Function("stopCommand") { commandId: String ->
            return@Function ProcessExecutor.stopCommand(commandId)
        }

        Function("stopAllCommands") {
            return@Function ProcessExecutor.stopAll()
        }

        AsyncFunction("killProcessTree") { pid: Int ->
            return@AsyncFunction ProcessTreeKiller.killTree(pid.toLong(), 800)
        }

        AsyncFunction("startTerminalSession") { sessionId: String, workspaceId: String? ->
            val context = appContext.reactContext ?: return@AsyncFunction
            EnvironmentManager.initialize(context)
            TerminalSessionManager.startSession(context, sessionId, workspaceId) { data ->
                sendEvent("onTerminalData", mapOf("sessionId" to sessionId, "data" to data))
            }
        }

        Function("writeTerminalInput") { sessionId: String, data: String ->
            TerminalSessionManager.writeInput(sessionId, data)
        }

        Function("getSessionHistory") { sessionId: String ->
            return@Function TerminalSessionManager.getSessionHistory(sessionId)
        }

        Function("listActiveSessions") {
            return@Function TerminalSessionManager.listActiveSessions()
        }

        Function("stopTerminalSession") { sessionId: String ->
            TerminalSessionManager.stopSession(sessionId)
        }

        Function("copyToClipboard") { text: String ->
            val context = appContext.reactContext ?: return@Function false
            val clipboard = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
            val clip = android.content.ClipData.newPlainText("Copied Text", text)
            clipboard.setPrimaryClip(clip)
            return@Function true
        }

        Function("checkOverlayPermission") {
            val context = appContext.reactContext ?: return@Function false
            return@Function if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                android.provider.Settings.canDrawOverlays(context)
            } else {
                true
            }
        }

        Function("requestOverlayPermission") {
            val context = appContext.reactContext ?: return@Function false
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                val intent = android.content.Intent(
                    android.provider.Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    android.net.Uri.parse("package:${context.packageName}")
                ).apply {
                    flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(intent)
                return@Function true
            }
            return@Function false
        }

        Function("startFloatingOverlay") { options: Map<String, Any?>? ->
            val context = appContext.reactContext ?: return@Function false
            val intent = android.content.Intent(context, FloatingOverlayService::class.java).apply {
                if (options != null) {
                    val wsId = options["workspaceId"] as? String
                    val fileName = options["activeFileName"] as? String
                    if (wsId != null) putExtra(FloatingOverlayService.EXTRA_WORKSPACE_ID, wsId)
                    if (fileName != null) putExtra(FloatingOverlayService.EXTRA_ACTIVE_FILE_NAME, fileName)
                }
            }
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
            return@Function true
        }

        Function("stopFloatingOverlay") {
            val context = appContext.reactContext ?: return@Function false
            FloatingOverlayService.stop(context)
            return@Function true
        }

        Function("isFloatingOverlayRunning") {
            return@Function FloatingOverlayService.isRunning
        }

        Function("collapseOverlay") {
            FloatingOverlayService.collapseToBubble()
            return@Function true
        }

        Function("expandOverlay") {
            FloatingOverlayService.expandToWindow()
            return@Function true
        }

        Function("openMainApp") {
            val context = appContext.reactContext ?: return@Function false
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK or android.content.Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            if (launchIntent != null) {
                context.startActivity(launchIntent)
                return@Function true
            }
            return@Function false
        }

        Function("readDirectory") { rawPath: String ->
            return@Function NativeFileSystemHelper.readDirectory(rawPath)
        }

        Function("getFileInfo") { rawPath: String ->
            return@Function NativeFileSystemHelper.getFileInfo(rawPath)
        }

        Function("readFile") { rawPath: String ->
            return@Function NativeFileSystemHelper.readFile(rawPath)
        }

        Function("writeFile") { rawPath: String, content: String ->
            return@Function NativeFileSystemHelper.writeFile(rawPath, content)
        }

        Function("makeDirectory") { rawPath: String ->
            return@Function NativeFileSystemHelper.makeDirectory(rawPath)
        }

        Function("deletePath") { rawPath: String ->
            return@Function NativeFileSystemHelper.deletePath(rawPath)
        }

        Function("movePath") { fromRaw: String, toRaw: String ->
            return@Function NativeFileSystemHelper.movePath(fromRaw, toRaw)
        }

        Function("hasAllFilesPermission") {
            val context = appContext.reactContext ?: return@Function false
            return@Function NativeFileSystemHelper.hasAllFilesPermission(context)
        }

        Function("requestAllFilesPermission") {
            val context = appContext.reactContext ?: return@Function false
            return@Function NativeFileSystemHelper.requestAllFilesPermission(context)
        }
    }
}
