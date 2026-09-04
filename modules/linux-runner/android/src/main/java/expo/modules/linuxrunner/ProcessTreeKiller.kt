package expo.modules.linuxrunner

import android.os.Build
import android.system.Os
import android.system.OsConstants
import android.util.Log
import java.io.File

/**
 * Kills whole process trees, not just the direct child.
 *
 * `Process.destroyForcibly()` only signals the proot binary itself; the guest
 * subtree (sh -> npm -> tsc x45) gets orphaned and keeps burning CPU after the
 * app is closed or a stop is requested. Everything here runs as our own UID so
 * signaling our own processes is always permitted.
 */
object ProcessTreeKiller {
    private const val TAG = "ProcessTreeKiller"

    /** PID of a [Process]; reflection fallback for API < 26. Returns -1 if unknown. */
    fun pidOf(process: Process): Long {
        // NOTE: Process.pid() needs API 26+ SDK symbols to compile; use
        // reflection so this module keeps compiling on lower compile SDKs.
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val m = process.javaClass.getMethod("pid")
                val pid = (m.invoke(process) as? Long) ?: -1L
                if (pid > 0) return pid
            }
        } catch (_: Exception) {}
        try {
            val field = process.javaClass.getDeclaredField("pid").apply { isAccessible = true }
            val pid = (field.get(process) as? Int)?.toLong() ?: -1L
            if (pid > 0) return pid
        } catch (_: Exception) {}
        return -1L
    }

    private data class ProcInfo(val pid: Int, val ppid: Int, val uid: Int)

    private fun snapshot(): Map<Int, ProcInfo> {
        val out = mutableMapOf<Int, ProcInfo>()
        val procDir = File("/proc")
        val entries = procDir.listFiles() ?: return out
        for (entry in entries) {
            val pid = entry.name.toIntOrNull() ?: continue
            try {
                val stat = File(entry, "stat").readText()
                // comm may contain spaces/parens: parse PPID after the LAST ')'.
                val closeParen = stat.lastIndexOf(')')
                if (closeParen < 0) continue
                val after = stat.substring(closeParen + 1).trim().split(Regex("\\s+"))
                // after[0] = state, after[1] = ppid
                if (after.size < 2) continue
                val ppid = after[1].toIntOrNull() ?: continue
                var uid = -1
                try {
                    File(entry, "status").bufferedReader().useLines { lines ->
                        val uidLine = lines.firstOrNull { it.startsWith("Uid:") }
                        uid = uidLine?.trim()?.split(Regex("\\s+"))?.getOrNull(1)?.toIntOrNull() ?: -1
                    }
                } catch (_: Exception) {}
                out[pid] = ProcInfo(pid, ppid, uid)
            } catch (_: Exception) {}
        }
        return out
    }

    private fun signal(pid: Int, sig: Int): Boolean {
        return try {
            Os.kill(pid, sig)
            true
        } catch (_: Exception) {
            false
        }
    }

    private fun isAlive(pid: Int): Boolean {
        return try {
            Os.kill(pid, 0)
            true
        } catch (_: Exception) {
            false
        }
    }

    /**
     * SIGTERM the whole tree (leaves first), then SIGKILL survivors.
     * Only touches processes owned by our UID. Returns kill count.
     */
    fun killTree(rootPid: Long, graceMs: Long = 1500): Int {
        if (rootPid <= 0) return 0
        val myUid = android.os.Process.myUid()
        return try {
            val snap = snapshot()
            val root = rootPid.toInt()
            // Never touch a root we don't own.
            val rootUid = snap[root]?.uid
            if (rootUid != null && rootUid != myUid) return 0
            // Collect descendants (BFS) + root, restricted to our UID.
            val targets = LinkedHashSet<Int>()
            val queue = ArrayDeque<Int>()
            queue.add(root)
            while (queue.isNotEmpty()) {
                val cur = queue.removeFirst()
                if (!targets.add(cur)) continue
                for ((pid, info) in snap) {
                    if (info.ppid == cur && info.uid == myUid && pid != cur) {
                        queue.add(pid)
                    }
                }
            }
            // TERM leaves first (reverse = deepest last-added first is not
            // guaranteed; order by depth: descendants before root).
            val ordered = targets.sortedBy { it == root }
            for (pid in ordered) signal(pid, OsConstants.SIGTERM)
            try {
                Thread.sleep(graceMs)
            } catch (_: Exception) {}
            var killed = 0
            for (pid in ordered) {
                if (!isAlive(pid)) {
                    killed++
                    continue
                }
                val knownUid = snap[pid]?.uid
                if (knownUid == null || knownUid == myUid) {
                    if (signal(pid, OsConstants.SIGKILL)) killed++
                }
            }
            killed
        } catch (e: Exception) {
            Log.w(TAG, "killTree($rootPid) failed: ${e.message}")
            0
        }
    }

    fun killTreeOf(process: Process, graceMs: Long = 1500): Int {
        return killTree(pidOf(process), graceMs)
    }

    /**
     * Kill stale proot trees orphaned by a dead app process (PPID == 1) that
     * still match our alpine dir. Safe: never touches our live children.
     */
    fun reapOrphanedProot(alpineAbsolutePath: String): Int {
        var reaped = 0
        try {
            val myUid = android.os.Process.myUid()
            val snap = snapshot()
            for ((pid, info) in snap) {
                if (info.ppid != 1 || info.uid != myUid) continue
                val cmdline = try {
                    File("/proc/$pid/cmdline").readText().replace('\u0000', ' ')
                } catch (_: Exception) {
                    ""
                }
                if (cmdline.contains("libproot") || cmdline.contains(alpineAbsolutePath)) {
                    Log.i(TAG, "Reaping orphaned proot tree at PID $pid")
                    reaped += killTree(pid.toLong(), 500)
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "reapOrphanedProot failed: ${e.message}")
        }
        return reaped
    }
}
