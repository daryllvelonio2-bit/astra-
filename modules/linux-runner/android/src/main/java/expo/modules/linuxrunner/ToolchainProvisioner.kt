package expo.modules.linuxrunner

import android.content.Context
import android.os.Build
import android.util.Log
import java.io.File
import java.util.concurrent.TimeUnit

data class ProvisioningStatus(
    val isProvisioning: Boolean,
    val stageName: String,
    val stageIndex: Int,
    val totalStages: Int = 4,
    val attempt: Int,
    val maxRetries: Int,
    val currentPackage: String,
    val lastOutput: String,
    val isComplete: Boolean,
    val hasError: Boolean,
    val errorMessage: String? = null
)

/**
 * Background developer-toolchain provisioning (apk stages + Astra CLI rebuild).
 * Stages are time-bounded and the active stage process is tracked so Stop can
 * reach it — an untracked `npm rebuild` once ground for 74+ min under PRoot.
 */
object ToolchainProvisioner {
    private const val TAG = "ToolchainProvisioner"
    private const val STAGE_TIMEOUT_MINUTES = 10L
    private val isProvisioning = java.util.concurrent.atomic.AtomicBoolean(false)
    @Volatile private var provisioningProcess: Process? = null

    var onProgressUpdate: ((ProvisioningStatus) -> Unit)? = null

    @Volatile private var currentStatus = ProvisioningStatus(
        isProvisioning = false,
        stageName = "Idle",
        stageIndex = 0,
        totalStages = 4,
        attempt = 0,
        maxRetries = 0,
        currentPackage = "",
        lastOutput = "",
        isComplete = false,
        hasError = false,
        errorMessage = null
    )

    private fun extractPackage(line: String): String? {
        val installingPrefix = "Installing "
        val idx = line.indexOf(installingPrefix)
        if (idx != -1) {
            val sub = line.substring(idx + installingPrefix.length).trim()
            val spaceIdx = sub.indexOf(' ')
            return if (spaceIdx != -1) sub.substring(0, spaceIdx) else sub
        }
        return null
    }

    /** Stop an in-flight stage, killing its whole subtree. True if stopped. */
    fun cancel(): Boolean {
        val proc = provisioningProcess ?: run {
            isProvisioning.set(false)
            return false
        }
        return try {
            val pid = ProcessTreeKiller.pidOf(proc)
            try {
                proc.destroyForcibly()
            } catch (_: Exception) {}
            ProcessTreeKiller.killTree(pid)
            provisioningProcess = null
            isProvisioning.set(false)
            currentStatus = currentStatus.copy(
                isProvisioning = false,
                stageName = "Cancelled",
                lastOutput = "Provisioning cancelled by user",
                hasError = false
            )
            onProgressUpdate?.invoke(currentStatus)
            true
        } catch (_: Exception) {
            false
        }
    }

    fun getStatus(context: Context): Map<String, Any?> {
        val filesDir = context.filesDir
        val alpineDir = File(filesDir, "alpine")
        val markerFile = File(alpineDir, ".developer_toolchain_ready_v4")
        val nodeBin = File(alpineDir, "usr/bin/node")
        val phpBin = File(alpineDir, "usr/bin/php")
        val gitBin = File(alpineDir, "usr/bin/git")
        val pythonBin = File(alpineDir, "usr/bin/python3")
        val isReady = markerFile.exists() && nodeBin.exists() && phpBin.exists() && gitBin.exists() && pythonBin.exists()

        val active = isProvisioning.get()
        val status = currentStatus
        return mapOf(
            "isProvisioning" to active,
            "stageName" to if (active) status.stageName else (if (isReady) "Completed" else "Idle"),
            "stageIndex" to if (active) status.stageIndex else (if (isReady) 4 else 0),
            "totalStages" to 4,
            "attempt" to status.attempt,
            "maxRetries" to status.maxRetries,
            "currentPackage" to status.currentPackage,
            "lastOutput" to status.lastOutput,
            "isComplete" to isReady,
            "hasError" to status.hasError,
            "errorMessage" to (status.errorMessage ?: ""),
            "nodeExists" to nodeBin.exists(),
            "phpExists" to phpBin.exists(),
            "gitExists" to gitBin.exists(),
            "pythonExists" to pythonBin.exists(),
            "arch" to (Build.SUPPORTED_ABIS.firstOrNull() ?: "arm64-v8a")
        )
    }

    fun forceRestart(context: Context, alpineDir: File) {
        cancel()
        try {
            File(alpineDir, ".developer_toolchain_ready_v4").delete()
            File(alpineDir, "lib/apk/db/lock").delete()
            File(alpineDir, "var/run/apk.lock").delete()
            File(alpineDir, "tmp/apk.lock").delete()
        } catch (_: Exception) {}
        ensure(context, alpineDir, force = true)
    }

    private const val PREFS_NAME = "astra_prefs"
    private const val KEY_AUTO_DOWNLOAD = "auto_toolchain_download"

    /** User choice: download the base toolchain automatically (default on). */
    fun isAutoDownloadEnabled(context: Context): Boolean {
        return try {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getBoolean(KEY_AUTO_DOWNLOAD, true)
        } catch (_: Exception) {
            true
        }
    }

    fun setAutoDownloadEnabled(context: Context, enabled: Boolean) {
        try {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit().putBoolean(KEY_AUTO_DOWNLOAD, enabled).apply()
        } catch (_: Exception) {}
    }

    fun ensure(context: Context, alpineDir: File, force: Boolean = false) {
        // Reap proot trees orphaned by a previous dead app process first.
        try {
            ProcessTreeKiller.reapOrphanedProot(alpineDir.absolutePath)
        } catch (_: Exception) {}
        val markerFile = File(alpineDir, ".developer_toolchain_ready_v4")
        val nodeBin = File(alpineDir, "usr/bin/node")
        val phpBin = File(alpineDir, "usr/bin/php")
        val gitBin = File(alpineDir, "usr/bin/git")
        val pythonBin = File(alpineDir, "usr/bin/python3")

        if (!force && markerFile.exists() && nodeBin.exists() && phpBin.exists() && gitBin.exists() && pythonBin.exists()) {
            currentStatus = currentStatus.copy(
                isProvisioning = false,
                stageName = "Completed",
                stageIndex = 4,
                isComplete = true
            )
            return
        }

        // Everything is user-chosen: when auto-download is off, skip the
        // background stages (manual Re-download still works via force=true).
        if (!force && !isAutoDownloadEnabled(context)) {
            Log.i(TAG, "Toolchain auto-download is disabled — leaving install to the user.")
            currentStatus = currentStatus.copy(
                isProvisioning = false,
                stageName = "Manual",
                stageIndex = 0,
                currentPackage = "",
                lastOutput = "Auto-download is off — install what you need from the lists below.",
                isComplete = false,
                hasError = false
            )
            onProgressUpdate?.invoke(currentStatus)
            return
        }

        if (!isProvisioning.compareAndSet(false, true)) {
            return
        }

        currentStatus = currentStatus.copy(
            isProvisioning = true,
            stageName = "Initializing",
            stageIndex = 1,
            isComplete = false,
            hasError = false,
            errorMessage = null,
            lastOutput = "Starting background developer toolchain provisioning..."
        )
        onProgressUpdate?.invoke(currentStatus)

        Thread {
            try {
                Log.i(TAG, "Provisioning developer toolchain in background (staged auto-download)...")
                val prootPath = EnvironmentManager.getProotPath(context)
                val nativeLibDir = context.applicationInfo.nativeLibraryDir
                val loaderPath = "$nativeLibDir/libproot-loader.so"
                val loader32Path = "$nativeLibDir/libproot-loader32.so"
                val tmpDir = File(context.filesDir, "tmp").absolutePath
                val workspaceDir = File(context.filesDir, "workspace").absolutePath
                val workspacesDir = File(context.filesDir, "workspaces").absolutePath

                fun runStage(stageName: String, stageIndex: Int, command: String, maxRetries: Int = 3): Boolean {
                    for (attempt in 1..maxRetries) {
                        try {
                            try {
                                File(alpineDir, "lib/apk/db/lock").delete()
                                File(alpineDir, "var/run/apk.lock").delete()
                                File(alpineDir, "tmp/apk.lock").delete()
                            } catch (_: Exception) {}

                            Log.i(TAG, "Starting toolchain stage: $stageName (attempt $attempt/$maxRetries)...")
                            currentStatus = currentStatus.copy(
                                isProvisioning = true,
                                stageName = stageName,
                                stageIndex = stageIndex,
                                attempt = attempt,
                                maxRetries = maxRetries,
                                lastOutput = "Starting stage: $stageName (attempt $attempt/$maxRetries)..."
                            )
                            onProgressUpdate?.invoke(currentStatus)

                            val pb = ProcessBuilder(
                                prootPath,
                                "--link2symlink",
                                "-r", alpineDir.absolutePath,
                                "-0",
                                "-w", "/root",
                                "-b", "/dev",
                                "-b", "/proc",
                                "-b", "/sys",
                                "-b", "$workspacesDir:/workspaces",
                                "-b", "$workspaceDir:/workspace",
                                "-b", "$tmpDir:/tmp",
                                "/bin/sh", "-c", command
                            )
                            pb.redirectErrorStream(true)
                            val env = pb.environment()
                            env["PATH"] = "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
                            env["HOME"] = "/root"
                            env["USER"] = "root"
                            env["SHELL"] = "/bin/bash"
                            env["LC_ALL"] = "C.UTF-8"
                            env["LANG"] = "C.UTF-8"
                            env["NODE_OPTIONS"] = "--dns-result-order=ipv4first"
                            env["PROOT_TMP_DIR"] = tmpDir
                            if (File(loaderPath).exists()) env["PROOT_LOADER"] = loaderPath
                            if (File(loader32Path).exists()) env["PROOT_LOADER_32"] = loader32Path
                            env["LD_LIBRARY_PATH"] = nativeLibDir

                            val process = pb.start()
                            provisioningProcess = process
                            process.inputStream.bufferedReader().useLines { lines ->
                                lines.forEach { line ->
                                    Log.d(TAG, "[$stageName]: $line")
                                    val pkg = extractPackage(line)
                                    currentStatus = currentStatus.copy(
                                        lastOutput = line,
                                        currentPackage = pkg ?: currentStatus.currentPackage
                                    )
                                    onProgressUpdate?.invoke(currentStatus)
                                }
                            }
                            val finished = process.waitFor(STAGE_TIMEOUT_MINUTES, TimeUnit.MINUTES)
                            provisioningProcess = null
                            if (!finished) {
                                Log.w(TAG, "Stage $stageName timed out after ${STAGE_TIMEOUT_MINUTES}min — killing its tree")
                                try {
                                    ProcessTreeKiller.killTreeOf(process)
                                } catch (_: Exception) {}
                                try {
                                    process.destroyForcibly()
                                } catch (_: Exception) {}
                                currentStatus = currentStatus.copy(
                                    hasError = true,
                                    errorMessage = "Stage $stageName timed out on attempt $attempt"
                                )
                                onProgressUpdate?.invoke(currentStatus)
                                Thread.sleep(2000)
                                continue
                            }
                            val exitCode = process.exitValue()
                            if (exitCode == 0) {
                                Log.i(TAG, "Stage completed successfully: $stageName")
                                currentStatus = currentStatus.copy(
                                    lastOutput = "Stage completed: $stageName"
                                )
                                onProgressUpdate?.invoke(currentStatus)
                                return true
                            }
                            Log.w(TAG, "Stage $stageName returned exit code $exitCode (attempt $attempt/$maxRetries)")
                            currentStatus = currentStatus.copy(
                                hasError = true,
                                errorMessage = "Stage $stageName returned exit code $exitCode"
                            )
                            onProgressUpdate?.invoke(currentStatus)
                        } catch (e: Exception) {
                            Log.w(TAG, "Stage $stageName exception on attempt $attempt: ${e.message}")
                            currentStatus = currentStatus.copy(
                                hasError = true,
                                errorMessage = "Stage exception: ${e.message}"
                            )
                            onProgressUpdate?.invoke(currentStatus)
                        }
                        Thread.sleep(2000)
                    }
                    return false
                }

                // Stage 1: Core CLI Utilities & Node.js
                val stage1Cmd = "export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin; export HOME=/root; export LC_ALL=C.UTF-8; export LANG=C.UTF-8; export NODE_OPTIONS=\"--dns-result-order=ipv4first\"; rm -f /lib/apk/db/lock /var/run/apk.lock 2>/dev/null; apk update && apk add --no-cache bash coreutils findutils grep sed gawk ripgrep tar gzip zip unzip tree ca-certificates curl wget git openssh-client sqlite nodejs npm"
                runStage("CoreUtilities", 1, stage1Cmd, maxRetries = 3)

                // Stage 2: Languages (Python3 & PHP 8.3 + Composer)
                val stage2Cmd = "export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin; export HOME=/root; export LC_ALL=C.UTF-8; export LANG=C.UTF-8; export NODE_OPTIONS=\"--dns-result-order=ipv4first\"; rm -f /lib/apk/db/lock /var/run/apk.lock 2>/dev/null; apk add --no-cache python3 py3-pip php83 php83-sqlite3 php83-pdo_sqlite php83-curl php83-openssl php83-json php83-phar php83-mbstring php83-dom php83-xml composer"
                runStage("Languages", 2, stage2Cmd, maxRetries = 3)

                // Stage 3: Build Tools & Headers (Non-blocking)
                val stage3Cmd = "export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin; export HOME=/root; export LC_ALL=C.UTF-8; export LANG=C.UTF-8; export NODE_OPTIONS=\"--dns-result-order=ipv4first\"; rm -f /lib/apk/db/lock /var/run/apk.lock 2>/dev/null; apk add --no-cache make gcc g++ linux-headers icu-data-full icu-libs"
                runStage("BuildTools", 3, stage3Cmd, maxRetries = 2)

                // Stage 4: Astra CLI Rebuild (Non-blocking)
                val stage4Cmd = "if [ -d /usr/local/share/astra-cli ]; then cd /usr/local/share/astra-cli && (npm rebuild || true); fi"
                runStage("AstraRebuild", 4, stage4Cmd, maxRetries = 1)

                // Verify toolchain
                if (nodeBin.exists() && gitBin.exists() && phpBin.exists() && pythonBin.exists()) {
                    markerFile.writeText("OK")
                    Log.i(TAG, "Developer toolchain auto-provisioned and verified successfully!")
                    currentStatus = currentStatus.copy(
                        isProvisioning = false,
                        stageName = "Completed",
                        stageIndex = 4,
                        currentPackage = "",
                        lastOutput = "All developer tools verified successfully (.developer_toolchain_ready_v4 OK)",
                        isComplete = true,
                        hasError = false
                    )
                    onProgressUpdate?.invoke(currentStatus)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Toolchain auto-provisioning exception", e)
                currentStatus = currentStatus.copy(
                    isProvisioning = false,
                    hasError = true,
                    errorMessage = e.message ?: "Unknown error"
                )
                onProgressUpdate?.invoke(currentStatus)
            } finally {
                provisioningProcess = null
                try {
                    File(alpineDir, "lib/apk/db/lock").delete()
                    File(alpineDir, "var/run/apk.lock").delete()
                    File(alpineDir, "tmp/apk.lock").delete()
                } catch (_: Exception) {}
                isProvisioning.set(false)
                if (!currentStatus.isComplete) {
                    currentStatus = currentStatus.copy(isProvisioning = false)
                    onProgressUpdate?.invoke(currentStatus)
                }
            }
        }.start()
    }
}
