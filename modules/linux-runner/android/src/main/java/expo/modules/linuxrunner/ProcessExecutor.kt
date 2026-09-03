package expo.modules.linuxrunner

import android.content.Context
import java.io.File
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

data class ExecutionResult(val stdout: String, val exitCode: Int)

object ProcessExecutor {
    private val activeProcesses = ConcurrentHashMap<String, Process>()

    fun stopCommand(commandId: String): Boolean {
        val process = activeProcesses.remove(commandId) ?: return false
        try {
            process.destroyForcibly()
            return true
        } catch (_: Exception) {
            return false
        }
    }

    fun stopAll(): Boolean {
        var anyStopped = false
        val iterator = activeProcesses.entries.iterator()
        while (iterator.hasNext()) {
            val entry = iterator.next()
            try {
                entry.value.destroyForcibly()
                anyStopped = true
            } catch (_: Exception) {}
            iterator.remove()
        }
        return anyStopped
    }

    fun execute(
        context: Context,
        command: String,
        workspaceId: String? = null,
        timeoutSeconds: Long = 0,
        commandId: String? = null,
        onLine: ((String) -> Unit)? = null
    ): ExecutionResult {
        val filesDir = context.filesDir
        val prootPath = EnvironmentManager.getProotPath(context)
        val alpineDir = File(filesDir, "alpine").absolutePath
        val workspacesDir = File(filesDir, "workspaces").absolutePath
        val workspaceDir = File(filesDir, "workspace").absolutePath
        val tmpDir = File(filesDir, "tmp").absolutePath

        if (!File(filesDir, "workspaces").exists()) File(filesDir, "workspaces").mkdirs()
        if (!File(filesDir, "workspace").exists()) File(filesDir, "workspace").mkdirs()
        if (!File(filesDir, "tmp").exists()) File(filesDir, "tmp").mkdirs()

        EnvironmentManager.ensureSystemConfigs(context, File(filesDir, "alpine"))

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

        val fullCommand = "export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/root/.local/bin:/root/.npm-global/bin; export NODE_PATH=/usr/local/share/astra-cli/node_modules:/usr/local/lib/node_modules:/usr/lib/node_modules; export HOME=/root; export USER=root; export SHELL=/bin/bash; export CI=1; export EXPO_NO_TELEMETRY=1; export EXPO_USE_LOCAL_CLI=1; export NODE_OPTIONS=\"--dns-result-order=ipv4first\"; $command"
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
        pbArgs.add("-c")
        pbArgs.add(fullCommand)

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
        env["NODE_OPTIONS"] = "--dns-result-order=ipv4first"
        env["TERM"] = "xterm-256color"
        env["LANG"] = "C.UTF-8"
        env["LC_ALL"] = "C.UTF-8"
        env["PROOT_TMP_DIR"] = tmpDir
        env["PROOT_LOADER"] = loaderPath
        env["PROOT_LOADER_32"] = loader32Path
        env["LD_LIBRARY_PATH"] = nativeLibDir
        env.remove("LD_PRELOAD")

        var process: Process? = null
        try {
            process = pb.start()
            if (!commandId.isNullOrBlank()) {
                activeProcesses[commandId] = process
            }
            val output = StringBuilder()
            val readerThread = Thread {
                try {
                    process.inputStream.bufferedReader().use { reader ->
                        var line: String?
                        while (reader.readLine().also { line = it } != null) {
                            val l = line ?: ""
                            if (l.startsWith("proot warning:") || l.startsWith("proot info:")) {
                                continue
                            }
                            output.append(l).append("\n")
                            try {
                                onLine?.invoke(l)
                            } catch (_: Exception) {}
                        }
                    }
                } catch (_: Exception) {}
            }
            readerThread.start()

            val finished = if (timeoutSeconds > 0) {
                process.waitFor(timeoutSeconds, TimeUnit.SECONDS)
            } else {
                process.waitFor()
                true
            }
            readerThread.join(2000)

            if (!finished) {
                process.destroyForcibly()
                return ExecutionResult(output.toString() + "\nError: Execution timed out after ${timeoutSeconds}s", -1)
            }

            val exitCode = process.exitValue()
            return ExecutionResult(output.toString().trimEnd(), exitCode)
        } catch (e: Exception) {
            return ExecutionResult("Error executing command: ${e.message}", -1)
        } finally {
            if (!commandId.isNullOrBlank()) {
                activeProcesses.remove(commandId)
            }
            try {
                process?.destroyForcibly()
            } catch (_: Exception) {}
        }
    }
}
