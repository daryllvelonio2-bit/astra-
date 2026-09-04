package expo.modules.linuxrunner

import android.content.Context
import android.util.Log
import java.io.File
import java.util.concurrent.TimeUnit

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

    /** Stop an in-flight stage, killing its whole subtree. True if stopped. */
    fun cancel(): Boolean {
        val proc = provisioningProcess ?: return false
        return try {
            val pid = ProcessTreeKiller.pidOf(proc)
            try {
                proc.destroyForcibly()
            } catch (_: Exception) {}
            ProcessTreeKiller.killTree(pid)
            provisioningProcess = null
            isProvisioning.set(false)
            true
        } catch (_: Exception) {
            false
        }
    }

    fun ensure(context: Context, alpineDir: File) {
        // Reap proot trees orphaned by a previous dead app process first.
        try {
            ProcessTreeKiller.reapOrphanedProot(alpineDir.absolutePath)
        } catch (_: Exception) {}
        val markerFile = File(alpineDir, ".developer_toolchain_ready_v4")
        val nodeBin = File(alpineDir, "usr/bin/node")
        val phpBin = File(alpineDir, "usr/bin/php")
        val gitBin = File(alpineDir, "usr/bin/git")
        val pythonBin = File(alpineDir, "usr/bin/python3")

        if (markerFile.exists() && nodeBin.exists() && phpBin.exists() && gitBin.exists() && pythonBin.exists()) {
            return
        }

        if (!isProvisioning.compareAndSet(false, true)) {
            return
        }

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

                fun runStage(stageName: String, command: String, maxRetries: Int = 3): Boolean {
                    for (attempt in 1..maxRetries) {
                        try {
                            try {
                                File(alpineDir, "lib/apk/db/lock").delete()
                                File(alpineDir, "var/run/apk.lock").delete()
                                File(alpineDir, "tmp/apk.lock").delete()
                            } catch (_: Exception) {}

                            Log.i(TAG, "Starting toolchain stage: $stageName (attempt $attempt/$maxRetries)...")
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
                            env["PROOT_LOADER"] = loaderPath
                            env["PROOT_LOADER_32"] = loader32Path
                            env["LD_LIBRARY_PATH"] = nativeLibDir

                            val process = pb.start()
                            provisioningProcess = process
                            process.inputStream.bufferedReader().useLines { lines ->
                                lines.forEach { Log.d(TAG, "[$stageName]: $it") }
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
                                Thread.sleep(2000)
                                continue
                            }
                            val exitCode = process.exitValue()
                            if (exitCode == 0) {
                                Log.i(TAG, "Stage completed successfully: $stageName")
                                return true
                            }
                            Log.w(TAG, "Stage $stageName returned exit code $exitCode (attempt $attempt/$maxRetries)")
                        } catch (e: Exception) {
                            Log.w(TAG, "Stage $stageName exception on attempt $attempt: ${e.message}")
                        }
                        Thread.sleep(2000)
                    }
                    return false
                }

                // Stage 1: Core CLI Utilities & Node.js
                val stage1Cmd = "export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin; export HOME=/root; export LC_ALL=C.UTF-8; export LANG=C.UTF-8; export NODE_OPTIONS=\"--dns-result-order=ipv4first\"; rm -f /lib/apk/db/lock /var/run/apk.lock 2>/dev/null; apk update && apk add --no-cache bash coreutils findutils grep sed gawk ripgrep tar gzip zip unzip tree ca-certificates curl wget git openssh-client sqlite nodejs npm"
                runStage("CoreUtilities", stage1Cmd, maxRetries = 3)

                // Stage 2: Languages (Python3 & PHP 8.3 + Composer)
                val stage2Cmd = "export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin; export HOME=/root; export LC_ALL=C.UTF-8; export LANG=C.UTF-8; export NODE_OPTIONS=\"--dns-result-order=ipv4first\"; rm -f /lib/apk/db/lock /var/run/apk.lock 2>/dev/null; apk add --no-cache python3 py3-pip php83 php83-sqlite3 php83-pdo_sqlite php83-curl php83-openssl php83-json php83-phar php83-mbstring php83-dom php83-xml composer"
                runStage("Languages", stage2Cmd, maxRetries = 3)

                // Stage 3: Build Tools & Headers (Non-blocking)
                val stage3Cmd = "export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin; export HOME=/root; export LC_ALL=C.UTF-8; export LANG=C.UTF-8; export NODE_OPTIONS=\"--dns-result-order=ipv4first\"; rm -f /lib/apk/db/lock /var/run/apk.lock 2>/dev/null; apk add --no-cache make gcc g++ linux-headers icu-data-full icu-libs"
                runStage("BuildTools", stage3Cmd, maxRetries = 2)

                // Stage 4: Astra CLI Rebuild (Non-blocking)
                val stage4Cmd = "if [ -d /usr/local/share/astra-cli ]; then cd /usr/local/share/astra-cli && (npm rebuild || true); fi"
                runStage("AstraRebuild", stage4Cmd, maxRetries = 1)

                // Verify toolchain
                if (nodeBin.exists() && gitBin.exists() && phpBin.exists() && pythonBin.exists()) {
                    markerFile.writeText("OK")
                    Log.i(TAG, "Developer toolchain auto-provisioned and verified successfully!")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Toolchain auto-provisioning exception", e)
            } finally {
                provisioningProcess = null
                try {
                    File(alpineDir, "lib/apk/db/lock").delete()
                    File(alpineDir, "var/run/apk.lock").delete()
                    File(alpineDir, "tmp/apk.lock").delete()
                } catch (_: Exception) {}
                isProvisioning.set(false)
            }
        }.start()
    }
}
