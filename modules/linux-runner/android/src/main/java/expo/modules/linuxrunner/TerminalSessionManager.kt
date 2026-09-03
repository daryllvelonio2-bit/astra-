package expo.modules.linuxrunner

import android.content.Context
import android.util.Log
import java.io.File
import java.io.InputStream
import java.io.OutputStream
import java.util.concurrent.ConcurrentHashMap
import kotlin.concurrent.thread

class TerminalSession(
    val sessionId: String,
    private val process: Process,
    private val outputStream: OutputStream,
    private val onData: (String) -> Unit
) {
    private val historyBuffer = StringBuilder()
    private val lock = Any()
    var isRunning: Boolean = true
        private set

    init {
        thread(start = true, name = "TerminalReader-$sessionId") {
            try {
                val buffer = ByteArray(2048)
                val inputStream = process.inputStream
                var bytesRead: Int
                while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                    val data = String(buffer, 0, bytesRead, Charsets.UTF_8)
                    synchronized(lock) {
                        historyBuffer.append(data)
                        if (historyBuffer.length > 100000) {
                            historyBuffer.delete(0, historyBuffer.length - 80000)
                        }
                    }
                    onData(data)
                }
            } catch (e: Exception) {
                Log.e("TerminalSession", "Stream closed for session $sessionId", e)
            } finally {
                isRunning = false
                val endMsg = "\r\n[Process completed]\r\n"
                synchronized(lock) {
                    historyBuffer.append(endMsg)
                }
                onData(endMsg)
            }
        }
    }

    fun write(data: String) {
        try {
            val converted = data.replace("\r\n", "\n").replace("\r", "\n")
            outputStream.write(converted.toByteArray(Charsets.UTF_8))
            outputStream.flush()
        } catch (e: Exception) {
            Log.e("TerminalSession", "Error writing to session $sessionId", e)
        }
    }

    fun getHistory(): String {
        synchronized(lock) {
            return historyBuffer.toString()
        }
    }

    fun stop() {
        try {
            isRunning = false
            outputStream.close()
            process.destroyForcibly()
        } catch (e: Exception) {
            Log.e("TerminalSession", "Error stopping session $sessionId", e)
        }
    }
}

object TerminalSessionManager {
    private val sessions = ConcurrentHashMap<String, TerminalSession>()

    fun startSession(
        context: Context,
        sessionId: String,
        workspaceId: String? = null,
        onData: (String) -> Unit
    ) {
        // If an active session exists, return cached history
        val existing = sessions[sessionId]
        if (existing != null && existing.isRunning) {
            val hist = existing.getHistory()
            if (hist.isNotEmpty()) {
                onData(hist)
            }
            return
        }

        stopSession(sessionId)

        val filesDir = context.filesDir
        val prootPath = EnvironmentManager.getProotPath(context)
        val alpineDir = File(filesDir, "alpine").absolutePath
        val workspacesDir = File(filesDir, "workspaces").absolutePath
        val workspaceDir = File(filesDir, "workspace").absolutePath
        val tmpDir = File(filesDir, "tmp").absolutePath

        if (!File(filesDir, "workspaces").exists()) File(filesDir, "workspaces").mkdirs()
        if (!File(filesDir, "workspace").exists()) File(filesDir, "workspace").mkdirs()
        if (!File(filesDir, "tmp").exists()) File(filesDir, "tmp").mkdirs()

        val targetDir = if (!workspaceId.isNullOrBlank()) {
            val clean = workspaceId.removePrefix("file://").trimEnd('/')
            if (clean.startsWith("/")) {
                val dir = File(clean)
                if (!dir.exists()) dir.mkdirs()
                clean
            } else {
                val specificWs = File(filesDir, "workspaces/$workspaceId")
                if (!specificWs.exists()) specificWs.mkdirs()
                "/workspaces/$workspaceId"
            }
        } else {
            "/workspace"
        }

        val nativeLibDir = context.applicationInfo.nativeLibraryDir
        val loaderPath = "$nativeLibDir/libproot-loader.so"
        val loader32Path = "$nativeLibDir/libproot-loader32.so"

        val pbArgs = mutableListOf(
            prootPath,
            "--link2symlink",
            "-r", alpineDir,
            "-0",
            "-w", targetDir,
            "-b", "/dev",
            "-b", "/proc",
            "-b", "/sys",
            "-b", "$workspacesDir:/workspaces",
            "-b", "$workspaceDir:/workspace",
            "-b", "$tmpDir:/tmp"
        )
        if (File("/sdcard").exists()) {
            pbArgs.add("-b")
            pbArgs.add("/sdcard")
        }
        if (File("/storage").exists()) {
            pbArgs.add("-b")
            pbArgs.add("/storage")
        }
        if (targetDir.startsWith("/") &&
            !targetDir.startsWith("/workspaces") &&
            !targetDir.startsWith("/workspace") &&
            !targetDir.startsWith("/sdcard") &&
            !targetDir.startsWith("/storage") &&
            File(targetDir).exists()) {
            pbArgs.add("-b")
            pbArgs.add("$targetDir:$targetDir")
        }
        pbArgs.add("/bin/sh")
        pbArgs.add("-l")

        val pb = ProcessBuilder(pbArgs)
        pb.directory(File(alpineDir))
        pb.redirectErrorStream(true)
        val env = pb.environment()
        env["PATH"] = "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/root/.local/bin:/root/.npm-global/bin"
        env["NODE_PATH"] = "/usr/local/share/astra-cli/node_modules:/usr/local/lib/node_modules:/usr/lib/node_modules"
        env["HOME"] = "/root"
        env["USER"] = "root"
        env["SHELL"] = "/bin/bash"
        env["CI"] = "1"
        env["EXPO_NO_TELEMETRY"] = "1"
        env["EXPO_USE_LOCAL_CLI"] = "1"
        env["TERM"] = "xterm-256color"
        env["LANG"] = "C.UTF-8"
        env["LC_ALL"] = "C.UTF-8"
        env["ENV"] = "/root/.profile"
        env["PS1"] = "\u001b[1;32mastra\u001b[0m:\u001b[1;34m$targetDir\u001b[0m# "
        env["PROOT_TMP_DIR"] = tmpDir
        env["PROOT_LOADER"] = loaderPath
        env["PROOT_LOADER_32"] = loader32Path
        env["LD_LIBRARY_PATH"] = nativeLibDir
        env.remove("LD_PRELOAD")

        try {
            val process = pb.start()
            val session = TerminalSession(sessionId, process, process.outputStream, onData)
            sessions[sessionId] = session
        } catch (e: Exception) {
            Log.e("TerminalSessionManager", "Failed to start terminal session $sessionId", e)
            onData("\r\n\u001b[31m[Failed to launch Alpine PRoot session: ${e.message}]\u001b[0m\r\n")
        }
    }

    fun writeInput(sessionId: String, data: String) {
        sessions[sessionId]?.write(data)
    }

    fun getSessionHistory(sessionId: String): String {
        return sessions[sessionId]?.getHistory() ?: ""
    }

    fun listActiveSessions(): List<String> {
        return sessions.keys().toList()
    }

    fun stopSession(sessionId: String) {
        sessions.remove(sessionId)?.stop()
    }
}
