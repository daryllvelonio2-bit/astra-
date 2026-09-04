package expo.modules.linuxrunner

import android.content.Context
import android.os.Build
import android.util.Log
import java.io.File
import java.io.InputStream

object EnvironmentAstraHelper {
    private const val TAG = "EnvironmentAstraHelper"
    const val CURRENT_VERSION_MARKER = ".astra_cli_version_v14"

    fun ensureAstraCli(
        context: Context,
        alpineDir: File,
        openDecompressedStream: (InputStream) -> InputStream,
        extractTarStream: (InputStream, File) -> Unit
    ) {
        try {
            // 1. Purge legacy bundled AI CLIs and obsolete binaries from earlier app versions
            purgeLegacyClis(alpineDir)

            val astraTargetDir = File(alpineDir, "usr/local/share/astra-cli")
            val bundleEntry = File(astraTargetDir, "bundle/gemini.js")
            val geminiSourceEntry = File(astraTargetDir, "gemini-cli-source/bundle/gemini.js")
            val versionMarker = File(astraTargetDir, CURRENT_VERSION_MARKER)

            if (!versionMarker.exists() || (!bundleEntry.exists() && !geminiSourceEntry.exists())) {
                Log.i(TAG, "Unpacking fresh Astra CLI bundle into ${astraTargetDir.absolutePath}...")
                if (astraTargetDir.exists()) astraTargetDir.deleteRecursively()
                astraTargetDir.mkdirs()

                val abi = Build.SUPPORTED_ABIS.firstOrNull() ?: "arm64-v8a"
                val arch = if (abi.contains("x86_64") || abi.contains("x86")) "x86_64" else "aarch64"

                val candidatePaths = mutableListOf<String>()
                val archList = context.assets.list("linux/$arch") ?: emptyArray()
                for (item in archList) {
                    if (item.startsWith("astra-cli")) {
                        candidatePaths.add("linux/$arch/$item")
                    }
                }
                val rootList = context.assets.list("linux") ?: emptyArray()
                for (item in rootList) {
                    if (item.startsWith("astra-cli")) {
                        candidatePaths.add("linux/$item")
                    }
                }
                candidatePaths.add("linux/$arch/astra-cli.tar")
                candidatePaths.add("linux/$arch/astra-cli.tar.gz")
                candidatePaths.add("linux/astra-cli.tar")
                candidatePaths.add("linux/astra-cli.tar.gz")

                var extracted = false
                for (path in candidatePaths.distinct()) {
                    try {
                        context.assets.open(path).use { rawStream ->
                            val inStream = openDecompressedStream(rawStream)
                            extractTarStream(inStream, astraTargetDir)
                        }
                        if (bundleEntry.exists() || geminiSourceEntry.exists()) {
                            Log.i(TAG, "Extracted Astra CLI bundle from asset: $path into ${astraTargetDir.absolutePath}")
                            extracted = true
                            versionMarker.writeText("v7\n")
                            break
                        }
                    } catch (e: Exception) {
                        Log.d(TAG, "Asset candidate $path failed: ${e.message}")
                    }
                }
                if (!extracted) {
                    Log.w(TAG, "Could not extract Astra CLI bundle from candidate assets")
                }
            }

            // Ensure bundle symlink exists if extracted into gemini-cli-source/bundle
            if (!bundleEntry.exists() && geminiSourceEntry.exists()) {
                try {
                    android.system.Os.symlink("gemini-cli-source/bundle", bundleEntry.absolutePath)
                } catch (e: Exception) {
                    Log.d(TAG, "Could not symlink bundle: ${e.message}")
                }
            }

            // Ensure node_modules symlink exists if located in gemini-cli-source/node_modules
            val nodeModulesEntry = File(astraTargetDir, "node_modules")
            val geminiNodeModules = File(astraTargetDir, "gemini-cli-source/node_modules")
            if (!nodeModulesEntry.exists() && geminiNodeModules.exists()) {
                try {
                    android.system.Os.symlink("gemini-cli-source/node_modules", nodeModulesEntry.absolutePath)
                } catch (e: Exception) {
                    Log.d(TAG, "Could not symlink node_modules: ${e.message}")
                }
            }

            // Ensure .env exists
            val astraEnv = File(astraTargetDir, ".env")
            if (!astraEnv.exists()) {
                astraEnv.writeText("# Astra CLI environment configuration\n")
            }

            // Create executable /bin/astra and /usr/bin/astra wrapper scripts
            val binDir = File(alpineDir, "bin")
            if (!binDir.exists()) binDir.mkdirs()
            val astraBin = File(binDir, "astra")
            val bundledAstraScript = File(astraTargetDir, "astra")
            if (bundledAstraScript.exists() && bundledAstraScript.length() > 500) {
                bundledAstraScript.copyTo(astraBin, overwrite = true)
            } else {
                astraBin.writeText("""#!/bin/sh
export LC_ALL=C.UTF-8
export LANG=C.UTF-8
export NODE_PATH=/usr/local/share/astra-cli/node_modules:/usr/lib/node_modules
export NODE_OPTIONS="--dns-result-order=ipv4first"
if [ -z "${'$'}GEMINI_API_KEY" ] && [ -f /usr/local/share/astra-cli/.env ]; then
    export ${'$'}(grep -v '^#' /usr/local/share/astra-cli/.env | xargs 2>/dev/null)
fi
NODE_BIN=${'$'}(which node 2>/dev/null || which nodejs 2>/dev/null || echo /usr/bin/node)
exec "${'$'}NODE_BIN" /usr/local/share/astra-cli/bundle/gemini.js "$@"
""")
            }
            astraBin.setExecutable(true, false)
            astraBin.setReadable(true, false)

            val usrBinDir = File(alpineDir, "usr/bin")
            if (!usrBinDir.exists()) usrBinDir.mkdirs()
            val usrAstraBin = File(usrBinDir, "astra")
            astraBin.copyTo(usrAstraBin, overwrite = true)
            usrAstraBin.setExecutable(true, false)
            usrAstraBin.setReadable(true, false)

            Log.i(TAG, "Astra CLI wrapper installed to /bin/astra and /usr/bin/astra")
        } catch (e: Exception) {
            Log.w(TAG, "Could not provision Astra CLI into Alpine Linux: ${e.message}")
        }
    }

    private fun purgeLegacyClis(alpineDir: File) {
        val legacyDirs = listOf(
            File(alpineDir, "usr/local/share/mahiru-cli"),
            File(alpineDir, "usr/local/share/gemini-cli"),
            File(alpineDir, "usr/local/share/pyxis-cli")
        )
        for (dir in legacyDirs) {
            if (dir.exists()) {
                Log.i(TAG, "Purged legacy CLI directory: ${dir.absolutePath}")
                dir.deleteRecursively()
            }
        }

        val legacyBins = listOf(
            File(alpineDir, "bin/mahiru"),
            File(alpineDir, "usr/bin/mahiru"),
            File(alpineDir, "bin/gemini-cli"),
            File(alpineDir, "usr/bin/gemini-cli"),
            File(alpineDir, "bin/pyxis"),
            File(alpineDir, "usr/bin/pyxis")
        )
        for (bin in legacyBins) {
            if (bin.exists()) {
                Log.i(TAG, "Purged legacy CLI binary: ${bin.absolutePath}")
                bin.delete()
            }
        }
    }
}
