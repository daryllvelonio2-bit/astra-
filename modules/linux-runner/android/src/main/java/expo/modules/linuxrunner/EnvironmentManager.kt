package expo.modules.linuxrunner

import android.content.Context
import android.os.Build
import android.util.Log
import org.apache.commons.compress.archivers.tar.TarArchiveEntry
import org.apache.commons.compress.archivers.tar.TarArchiveInputStream
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.util.zip.GZIPInputStream

object EnvironmentManager {
    private const val TAG = "EnvironmentManager"
    private val isProvisioning = java.util.concurrent.atomic.AtomicBoolean(false)

    fun getProotPath(context: Context): String {
        val nativeLibProot = File(context.applicationInfo.nativeLibraryDir, "libproot.so")
        if (nativeLibProot.exists()) {
            Log.i(TAG, "Using native library PRoot at: ${nativeLibProot.absolutePath}")
            return nativeLibProot.absolutePath
        }
        val fileProot = File(context.filesDir, "proot")
        Log.w(TAG, "Native libproot.so not in ${context.applicationInfo.nativeLibraryDir}, falling back to: ${fileProot.absolutePath}")
        return fileProot.absolutePath
    }

    fun isEnvironmentReady(context: Context): Boolean {
        val filesDir = context.filesDir
        val alpineDir = File(filesDir, "alpine")
        val busybox = File(alpineDir, "bin/busybox")
        val sh = File(alpineDir, "bin/sh")
        val libc = File(alpineDir, "lib/ld-musl-aarch64.so.1")
        val libcAlt = File(alpineDir, "lib/ld-musl-x86_64.so.1")
        val nativeLib = File(context.applicationInfo.nativeLibraryDir, "libproot.so")
        val astraBundle = File(alpineDir, "usr/local/share/astra-cli/bundle/gemini.js")
        val hasMusl = libc.exists() || libcAlt.exists()
        val isAlpineValid = (busybox.exists() && busybox.length() > 50000) && (sh.exists()) && hasMusl && astraBundle.exists()
        return isAlpineValid && nativeLib.exists()
    }

    private fun openDecompressedStream(rawStream: InputStream): InputStream {
        val buffered = java.io.BufferedInputStream(rawStream, 65536)
        buffered.mark(4)
        val b1 = buffered.read()
        val b2 = buffered.read()
        buffered.reset()
        // Check for GZIP magic header: 0x1F, 0x8B
        return if (b1 == 0x1F && b2 == 0x8B) {
            GZIPInputStream(buffered, 65536)
        } else {
            buffered
        }
    }

    private fun extractTarStream(stream: InputStream, destDir: File) {
        if (!destDir.exists()) destDir.mkdirs()
        var count = 0
        val deferredSymlinks = mutableListOf<Pair<String, String>>() // cleanName -> linkTarget
        TarArchiveInputStream(stream).use { tarIn ->
            var entry: TarArchiveEntry? = tarIn.nextTarEntry
            while (entry != null) {
                val cleanName = entry.name.removePrefix("./").removePrefix("/")
                if (cleanName.isNotEmpty()) {
                    val destFile = File(destDir, cleanName)
                    if (entry.isDirectory) {
                        destFile.mkdirs()
                    } else if (entry.isSymbolicLink) {
                        // Defer symlink creation until all files are extracted
                        deferredSymlinks.add(cleanName to entry.linkName)
                    } else {
                        destFile.parentFile?.mkdirs()
                        FileOutputStream(destFile).use { out ->
                            tarIn.copyTo(out)
                        }
                        if (entry.mode and 0b001001001 != 0 || cleanName.contains("bin/") || cleanName.contains("sbin/") || cleanName.contains("lib/")) {
                            destFile.setExecutable(true, false)
                            destFile.setReadable(true, false)
                        }
                    }
                    count++
                }
                entry = tarIn.nextTarEntry
            }
        }
        Log.i(TAG, "Extracted $count entries into ${destDir.absolutePath}")

        // Create symlinks: convert absolute targets to relative paths within rootfs
        for ((cleanName, linkTarget) in deferredSymlinks) {
            val destFile = File(destDir, cleanName)
            destFile.parentFile?.mkdirs()
            if (destFile.exists()) destFile.delete()

            // Convert absolute target (e.g. /bin/busybox) to relative within rootfs
            val resolvedTarget = if (linkTarget.startsWith("/")) {
                val targetClean = linkTarget.removePrefix("/")
                val targetFile = File(destDir, targetClean)
                if (targetFile.exists()) {
                    // Compute relative path from destFile's parent to targetFile
                    val parentPath = destFile.parentFile!!.toPath()
                    val targetPath = targetFile.toPath()
                    try {
                        parentPath.relativize(targetPath).toString()
                    } catch (e: Exception) {
                        linkTarget
                    }
                } else {
                    linkTarget
                }
            } else {
                linkTarget
            }

            try {
                android.system.Os.symlink(resolvedTarget, destFile.absolutePath)
            } catch (e: Exception) {
                Log.d(TAG, "Symlink $cleanName -> $resolvedTarget: ${e.message}")
                // Fallback: if target exists, copy it
                val fallbackTarget = if (linkTarget.startsWith("/")) {
                    File(destDir, linkTarget.removePrefix("/"))
                } else {
                    File(destFile.parentFile, linkTarget)
                }
                if (fallbackTarget.exists() && fallbackTarget.isFile) {
                    try {
                        fallbackTarget.copyTo(destFile, overwrite = true)
                        destFile.setExecutable(true, false)
                        destFile.setReadable(true, false)
                    } catch (copyE: Exception) {
                        Log.d(TAG, "Symlink fallback copy failed for $cleanName: ${copyE.message}")
                    }
                }
            }
        }
        Log.i(TAG, "Created ${deferredSymlinks.size} symlinks")

        // Ensure /bin/sh is always a real executable (not a dangling symlink)
        val busybox = File(destDir, "bin/busybox")
        val sh = File(destDir, "bin/sh")
        if (busybox.exists()) {
            busybox.setExecutable(true, false)
            busybox.setReadable(true, false)
            // If /bin/sh is a symlink (dangling or not), replace with real copy
            val shIsSymlink = try { android.system.Os.lstat(sh.absolutePath).st_mode and 0xF000 == 0xA000 } catch (_: Exception) { false }
            if (!sh.exists() || sh.length() == 0L || shIsSymlink) {
                try {
                    if (sh.exists() || shIsSymlink) sh.delete()
                    busybox.copyTo(sh, overwrite = true)
                    sh.setExecutable(true, false)
                    sh.setReadable(true, false)
                    Log.i(TAG, "Copied busybox -> bin/sh as real binary")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to copy busybox to bin/sh", e)
                }
            }
        }
    }

    @Synchronized
    fun initialize(context: Context): Boolean {
        val filesDir = context.filesDir
        val alpineDir = File(filesDir, "alpine")
        val prootFile = File(filesDir, "proot")
        val workspaceDir = File(filesDir, "workspace")
        val workspacesDir = File(filesDir, "workspaces")
        val tmpDir = File(filesDir, "tmp")

        if (!workspaceDir.exists()) workspaceDir.mkdirs()
        if (!workspacesDir.exists()) workspacesDir.mkdirs()
        if (!tmpDir.exists()) tmpDir.mkdirs()

        val abi = Build.SUPPORTED_ABIS.firstOrNull() ?: "arm64-v8a"
        val arch = if (abi.contains("x86_64") || abi.contains("x86")) "x86_64" else "aarch64"
        Log.i(TAG, "Provisioning Linux environment. Detected ABI: $abi -> Arch: $arch")

        try {
            val nativeLibProot = File(context.applicationInfo.nativeLibraryDir, "libproot.so")
            if (nativeLibProot.exists()) {
                if (prootFile.exists()) {
                    prootFile.delete()
                }
            } else if (!prootFile.exists()) {
                val assetProotPath = "linux/$arch/proot"
                try {
                    context.assets.open(assetProotPath).use { input ->
                        FileOutputStream(prootFile).use { output ->
                            input.copyTo(output)
                        }
                    }
                    prootFile.setExecutable(true, false)
                    prootFile.setReadable(true, false)
                    Log.i(TAG, "PRoot binary extracted to ${prootFile.absolutePath}")
                } catch (e: Exception) {
                    Log.w(TAG, "Could not extract proot asset: ${e.message}")
                }
            }

            if (isEnvironmentReady(context)) {
                Log.i(TAG, "Alpine Linux & PRoot already provisioned and ready.")
                ensureSystemConfigs(context, alpineDir)
                ensureDeveloperToolchain(context, alpineDir)
                return true
            }

            Log.i(TAG, "Environment not ready. Cleaning and unpacking rootfs...")
            if (alpineDir.exists()) {
                alpineDir.deleteRecursively()
            }
            alpineDir.mkdirs()

            // 2. Extract Alpine RootFS dynamically matching archive format (.tar or .tar.gz)
            val list = context.assets.list("linux/$arch") ?: emptyArray()
            Log.i(TAG, "Available assets in linux/$arch: ${list.joinToString(", ")}")
            val tarFile = list.firstOrNull { it.startsWith("alpine-rootfs") } ?: "alpine-rootfs.tar"
            val assetTarPath = "linux/$arch/$tarFile"
            Log.i(TAG, "Extracting Alpine RootFS from asset: $assetTarPath ...")
            context.assets.open(assetTarPath).use { rawStream ->
                val inStream = openDecompressedStream(rawStream)
                extractTarStream(inStream, alpineDir)
            }

            ensureSystemConfigs(context, alpineDir)
            ensureDeveloperToolchain(context, alpineDir)
            Log.i(TAG, "Alpine Linux environment provisioned successfully.")
            return true
        } catch (e: Exception) {
            Log.e(TAG, "Exception during environment provisioning", e)
            return false
        }
    }

    fun ensureSystemConfigs(context: Context, alpineDir: File) {
        try {
            // Configure DNS resolv.conf dynamically from Android network
            val etcDir = File(alpineDir, "etc")
            if (!etcDir.exists()) etcDir.mkdirs()
            val resolvFile = File(etcDir, "resolv.conf")
            val dnsServers = EnvironmentDnsHelper.getActiveDnsServers(context)
            val resolvContent = dnsServers.joinToString("\n") { "nameserver $it" } + "\noptions timeout:2 attempts:3 rotate\n"
            resolvFile.writeText(resolvContent)

            // Configure hosts
            val hostsFile = File(etcDir, "hosts")
            hostsFile.writeText("127.0.0.1 localhost\n::1 localhost\n")

            // Ensure /bin/bash and /usr/bin/bash exist safely without Busybox applet collision
            val binDir = File(alpineDir, "bin")
            if (!binDir.exists()) binDir.mkdirs()
            val usrBinDir = File(alpineDir, "usr/bin")
            if (!usrBinDir.exists()) usrBinDir.mkdirs()

            val binBash = File(binDir, "bash")
            val binSh = File(binDir, "sh")
            val usrBinBash = File(usrBinDir, "bash")

            // If a previous Busybox binary copy exists in /usr/bin/bash, remove it
            if (usrBinBash.exists() && binSh.exists() && usrBinBash.length() == binSh.length()) {
                usrBinBash.delete()
            }

            if (!binBash.exists()) {
                try {
                    // Create shell wrapper script so Busybox never throws "applet not found"
                    binBash.writeText("#!/bin/sh\nexec /bin/sh \"$@\"\n")
                    binBash.setExecutable(true, false)
                } catch (_: Exception) {}
            }

            if (!usrBinBash.exists()) {
                try {
                    usrBinBash.writeText("#!/bin/sh\nif [ -x /bin/bash ]; then exec /bin/bash \"$@\"; else exec /bin/sh \"$@\"; fi\n")
                    usrBinBash.setExecutable(true, false)
                } catch (_: Exception) {}
            }

            // Configure root profile for built-in Alpine Linux shell experience
            val rootDir = File(alpineDir, "root")
            if (!rootDir.exists()) rootDir.mkdirs()
            val profileFile = File(rootDir, ".profile")
            val bashrcFile = File(rootDir, ".bashrc")
            val profileText = """
export TERM=xterm-256color
export HOME=/root
export USER=root
export SHELL=/bin/bash
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/root/.local/bin:/root/.npm-global/bin
export NODE_PATH=/usr/local/share/astra-cli/node_modules:/usr/local/lib/node_modules:/usr/lib/node_modules
export LANG=C.UTF-8
export LC_ALL=C.UTF-8
export CI=1
export EXPO_NO_TELEMETRY=1
export EXPO_USE_LOCAL_CLI=1
export PS1='\[\033[01;32m\]astra\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]# '
export NODE_OPTIONS="--dns-result-order=ipv4first"
alias ll='ls -la'
alias l='ls -lh'
alias la='ls -A'
""".trimIndent() + "\n"
            profileFile.writeText(profileText)
            bashrcFile.writeText(profileText)

            val etcProfile = File(etcDir, "profile")
            etcProfile.writeText(profileText)

            // Configure npm for mobile / cellular networks (IPv4 preference + higher timeouts)
            val npmrcFile = File(rootDir, ".npmrc")
            npmrcFile.writeText("""
fetch-retry-mintimeout=20000
fetch-retry-maxtimeout=120000
fetch-timeout=300000
fetch-retries=5
""".trimIndent() + "\n")

            // Ensure universal smart CLI tool wrappers in /usr/local/bin for reliable project execution
            try {
                val usrLocalBin = File(alpineDir, "usr/local/bin")
                if (!usrLocalBin.exists()) usrLocalBin.mkdirs()

                val genericLauncher = """#!/bin/sh
CMD_NAME="${'$'}(basename "${'$'}0")"
if [ -f "./node_modules/.bin/${'$'}CMD_NAME" ]; then
  exec node "./node_modules/.bin/${'$'}CMD_NAME" "${'$'}@"
elif [ -f "./node_modules/${'$'}CMD_NAME/bin/${'$'}CMD_NAME.js" ]; then
  exec node "./node_modules/${'$'}CMD_NAME/bin/${'$'}CMD_NAME.js" "${'$'}@"
elif [ -f "./node_modules/${'$'}CMD_NAME/bin/${'$'}CMD_NAME" ]; then
  exec node "./node_modules/${'$'}CMD_NAME/bin/${'$'}CMD_NAME" "${'$'}@"
elif [ -f "./node_modules/${'$'}CMD_NAME/bin/cli.js" ]; then
  exec node "./node_modules/${'$'}CMD_NAME/bin/cli.js" "${'$'}@"
elif [ -f "./node_modules/@expo/cli/build/bin/index.js" ] && [ "${'$'}CMD_NAME" = "expo" ]; then
  exec node "./node_modules/@expo/cli/build/bin/index.js" "${'$'}@"
elif [ -f "./node_modules/expo/bin/cli" ] && [ "${'$'}CMD_NAME" = "expo" ]; then
  exec node "./node_modules/expo/bin/cli" "${'$'}@"
else
  exec npx --yes "${'$'}CMD_NAME" "${'$'}@"
fi
""".trimIndent() + "\n"

                val smartTools = listOf("expo", "vite", "next", "tsc", "nodemon")
                for (tool in smartTools) {
                    val toolFile = File(usrLocalBin, tool)
                    toolFile.writeText(genericLauncher)
                    toolFile.setExecutable(true, false)
                }

                val legacyExpoDir = File(alpineDir, "usr/local/lib/node_modules/expo-cli")
                if (legacyExpoDir.exists()) {
                    legacyExpoDir.deleteRecursively()
                }
            } catch (_: Exception) {}

            // Proactively clear any stale APK lock files from previous runs
            try {
                File(alpineDir, "lib/apk/db/lock").delete()
                File(alpineDir, "var/run/apk.lock").delete()
                File(alpineDir, "tmp/apk.lock").delete()
            } catch (_: Exception) {}

            // Ensure Astra CLI is bundled and executable inside Alpine rootfs
            EnvironmentAstraHelper.ensureAstraCli(context, alpineDir, ::openDecompressedStream, ::extractTarStream)
        } catch (e: Exception) {
            Log.w(TAG, "Could not configure profile/dns: ${e.message}")
        }
    }

    fun ensureDeveloperToolchain(context: Context, alpineDir: File) {
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
                val prootPath = getProotPath(context)
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
                            process.inputStream.bufferedReader().useLines { lines ->
                                lines.forEach { Log.d(TAG, "[$stageName]: $it") }
                            }
                            val exitCode = process.waitFor()
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
