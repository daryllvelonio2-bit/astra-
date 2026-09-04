import { executeCommand } from "../../../modules/linux-runner/src";
import { GitBranch, GitCommit, GitFileStatus, GitRepoStatus } from "../components/git/types";

function formatRelativeTime(epochSeconds: number): string {
  const diff = Math.max(0, Math.floor(Date.now() / 1000 - epochSeconds));
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(epochSeconds * 1000).toLocaleDateString();
}

export async function checkIsGitRepo(workspaceId?: string): Promise<boolean> {
  try {
    const res = await executeCommand("git rev-parse --is-inside-work-tree", workspaceId);
    return (res.stdout || "").trim() === "true";
  } catch (_) {
    return false;
  }
}

export async function initGitRepo(workspaceId?: string): Promise<boolean> {
  try {
    const res = await executeCommand("git init && git branch -M main", workspaceId);
    return res.exitCode === 0;
  } catch (_) {
    return false;
  }
}

export async function getGitStatus(workspaceId?: string): Promise<GitRepoStatus> {
  const isRepo = await checkIsGitRepo(workspaceId);
  if (!isRepo) {
    return {
      isRepo: false,
      currentBranch: "none",
      ahead: 0,
      behind: 0,
      files: [],
    };
  }

  try {
    const res = await executeCommand("git status --porcelain=v1 -b", workspaceId);
    const lines = (res.stdout || "").split(/\r?\n/).filter(Boolean);

    let currentBranch = "main";
    let upstreamBranch: string | undefined;
    let ahead = 0;
    let behind = 0;
    const files: GitFileStatus[] = [];

    if (lines.length > 0 && lines[0].startsWith("##")) {
      const header = lines[0].replace(/^##\s*/, "");
      if (header.includes("No commits yet on ")) {
        currentBranch = header.replace("No commits yet on ", "").trim();
      } else if (header.includes("Initial commit on ")) {
        currentBranch = header.replace("Initial commit on ", "").trim();
      } else {
        const match = header.match(/^([^\s.]+)(?:\.\.\.([^\s]+))?(?:\s+\[ahead\s+(\d+)(?:,\s*behind\s+(\d+))?\]|\s+\[behind\s+(\d+)\])?/);
        if (match) {
          currentBranch = match[1] || "main";
          upstreamBranch = match[2];
          ahead = match[3] ? parseInt(match[3], 10) : 0;
          behind = match[4] ? parseInt(match[4], 10) : match[5] ? parseInt(match[5], 10) : 0;
        }
      }
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.length < 3) continue;
      const x = line[0];
      const y = line[1];
      const pathPart = line.slice(3).trim();

      let path = pathPart;
      let oldPath: string | undefined;
      if (pathPart.includes(" -> ")) {
        const parts = pathPart.split(" -> ");
        oldPath = parts[0];
        path = parts[1];
      }

      const filename = path.split("/").pop() || path;
      const isStaged = x !== " " && x !== "?";
      let status: GitFileStatus["status"] = "modified";

      if (x === "?" && y === "?") {
        status = "untracked";
      } else if (x === "A" || y === "A") {
        status = "added";
      } else if (x === "D" || y === "D") {
        status = "deleted";
      } else if (x === "R" || y === "R") {
        status = "renamed";
      } else {
        status = "modified";
      }

      files.push({
        path,
        filename,
        status,
        staged: isStaged,
        oldPath,
      });
    }

    return {
      isRepo: true,
      currentBranch,
      upstreamBranch,
      ahead,
      behind,
      files,
    };
  } catch (_) {
    return {
      isRepo: true,
      currentBranch: "main",
      ahead: 0,
      behind: 0,
      files: [],
    };
  }
}

export async function getGitFileDiff(
  workspaceId: string | undefined,
  filePath: string,
  staged: boolean
): Promise<string> {
  try {
    const cachedFlag = staged ? "--cached" : "";
    const res = await executeCommand(
      `git diff ${cachedFlag} -- "${filePath}"`,
      workspaceId
    );
    const diff = (res.stdout || "").trim();
    if (diff) return diff;

    // Fallback for untracked new files
    const untrackedRes = await executeCommand(
      `git diff --no-index /dev/null "${filePath}" 2>/dev/null || true`,
      workspaceId
    );
    const untrackedDiff = (untrackedRes.stdout || "").trim();
    if (untrackedDiff) return untrackedDiff;

    // Fallback if file is empty or git diff --no-index produced nothing
    const catRes = await executeCommand(`cat "${filePath}" 2>/dev/null`, workspaceId);
    if (catRes.exitCode === 0) {
      const rawContent = catRes.stdout || "";
      if (rawContent.trim().length === 0) {
        return "Empty file (no content).";
      }
      const lines = rawContent.split(/\r?\n/);
      return `--- /dev/null\n+++ b/${filePath}\n@@ -0,0 +1,${lines.length} @@\n` +
        lines.map((l) => `+${l}`).join("\n");
    }
    return "No changes detected.";
  } catch (e: any) {
    return `Error loading diff: ${e?.message || e}`;
  }
}

export async function stageGitFile(
  workspaceId: string | undefined,
  filePath: string
): Promise<boolean> {
  try {
    const res = await executeCommand(`git add -- "${filePath}"`, workspaceId);
    return res.exitCode === 0;
  } catch (_) {
    return false;
  }
}

export async function unstageGitFile(
  workspaceId: string | undefined,
  filePath: string
): Promise<boolean> {
  try {
    const res = await executeCommand(
      `git restore --staged -- "${filePath}" 2>/dev/null || git reset HEAD -- "${filePath}" 2>/dev/null`,
      workspaceId
    );
    return res.exitCode === 0;
  } catch (_) {
    return false;
  }
}

export async function stageAllGitFiles(workspaceId?: string): Promise<boolean> {
  try {
    const res = await executeCommand("git add -A", workspaceId);
    return res.exitCode === 0;
  } catch (_) {
    return false;
  }
}

export async function unstageAllGitFiles(workspaceId?: string): Promise<boolean> {
  try {
    const res = await executeCommand(
      "git restore --staged . 2>/dev/null || git reset HEAD . 2>/dev/null",
      workspaceId
    );
    return res.exitCode === 0;
  } catch (_) {
    return false;
  }
}

export async function commitGitChanges(
  workspaceId: string | undefined,
  summary: string,
  description?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanSummary = summary.replace(/"/g, '\\"');
    const descArg = description?.trim()
      ? ` -m "${description.trim().replace(/"/g, '\\"')}"`
      : "";
    const res = await executeCommand(
      `git commit -m "${cleanSummary}"${descArg}`,
      workspaceId
    );
    if (res.exitCode === 0) return { success: true };
    return { success: false, error: res.stdout || "Commit failed" };
  } catch (e: any) {
    return { success: false, error: e?.message || "Commit failed" };
  }
}

export async function getGitCommitHistory(
  workspaceId?: string,
  limit = 50
): Promise<GitCommit[]> {
  try {
    const res = await executeCommand(
      `git log -n ${limit} --pretty=format:"%H|%h|%an|%ae|%at|%s"`,
      workspaceId
    );
    if (res.exitCode !== 0) return [];
    return (res.stdout || "")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const [hash, shortHash, authorName, authorEmail, epochStr, message] = line.split("|");
        const timestamp = parseInt(epochStr || "0", 10);
        return {
          hash: hash || "",
          shortHash: shortHash || "",
          authorName: authorName || "Unknown",
          authorEmail: authorEmail || "",
          timestamp,
          message: message || "No commit message",
          relativeTime: formatRelativeTime(timestamp),
        };
      });
  } catch (_) {
    return [];
  }
}

export async function getGitCommitDiff(
  workspaceId: string | undefined,
  hash: string
): Promise<string> {
  try {
    const res = await executeCommand(`git show --stat --patch ${hash}`, workspaceId);
    return res.stdout || "No commit diff available.";
  } catch (e: any) {
    return `Error loading commit: ${e?.message || e}`;
  }
}

export async function getGitBranches(workspaceId?: string): Promise<GitBranch[]> {
  try {
    const res = await executeCommand("git branch -a", workspaceId);
    if (res.exitCode !== 0) return [];
    return (res.stdout || "")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const trimmed = line.trim();
        const isCurrent = line.startsWith("*");
        const cleanName = trimmed.replace(/^\*\s*/, "").replace(/^remotes\//, "");
        return {
          name: cleanName,
          isCurrent,
          isRemote: trimmed.startsWith("remotes/"),
        };
      });
  } catch (_) {
    return [];
  }
}

export async function switchGitBranch(
  workspaceId: string | undefined,
  branchName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await executeCommand(`git checkout "${branchName}"`, workspaceId);
    if (res.exitCode === 0) return { success: true };
    return { success: false, error: res.stdout || "Branch switch failed" };
  } catch (e: any) {
    return { success: false, error: e?.message || "Branch switch failed" };
  }
}

export async function createGitBranch(
  workspaceId: string | undefined,
  branchName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await executeCommand(`git checkout -b "${branchName}"`, workspaceId);
    if (res.exitCode === 0) return { success: true };
    return { success: false, error: res.stdout || "Failed to create branch" };
  } catch (e: any) {
    return { success: false, error: e?.message || "Failed to create branch" };
  }
}

export async function fetchGitRemote(
  workspaceId?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await executeCommand("git fetch --all --prune", workspaceId);
    return {
      success: res.exitCode === 0,
      message: res.stdout || (res.exitCode === 0 ? "Fetched from remote" : "Fetch failed"),
    };
  } catch (e: any) {
    return { success: false, message: e?.message || "Fetch failed" };
  }
}

export async function pullGitRemote(
  workspaceId?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await executeCommand("git pull", workspaceId);
    return {
      success: res.exitCode === 0,
      message: res.stdout || (res.exitCode === 0 ? "Pulled latest changes" : "Pull failed"),
    };
  } catch (e: any) {
    return { success: false, message: e?.message || "Pull failed" };
  }
}

export async function pushGitRemote(
  workspaceId?: string,
  branchName?: string
): Promise<{ success: boolean; message: string }> {
  try {
    let res = await executeCommand("git push", workspaceId);
    if (res.exitCode === 0) {
      return {
        success: true,
        message: res.stdout || "Pushed commits to remote",
      };
    }
    // If push failed due to missing upstream tracking, retry with --set-upstream
    const branch = branchName || "main";
    res = await executeCommand(`git push -u origin "${branch}"`, workspaceId);
    return {
      success: res.exitCode === 0,
      message: res.stdout || (res.exitCode === 0 ? "Pushed commits to remote" : "Push failed"),
    };
  } catch (e: any) {
    return { success: false, message: e?.message || "Push failed" };
  }
}

export async function configureGitCredentials(
  token: string,
  username: string,
  email: string
): Promise<boolean> {
  try {
    const cmds = [
      `git config --global user.name "${username}"`,
      `git config --global user.email "${email}"`,
      `git config --global credential.helper store`,
      `echo "https://${encodeURIComponent(username)}:${encodeURIComponent(token)}@github.com" > ~/.git-credentials`,
      `chmod 600 ~/.git-credentials`,
    ];
    const res = await executeCommand(cmds.join(" && "));
    return res.exitCode === 0;
  } catch (_) {
    return false;
  }
}

export async function getSshPublicKey(): Promise<string | null> {
  try {
    const res = await executeCommand("cat ~/.ssh/id_ed25519.pub 2>/dev/null || cat ~/.ssh/id_rsa.pub 2>/dev/null");
    const key = (res.stdout || "").trim();
    return key || null;
  } catch (_) {
    return null;
  }
}

export async function generateSshKey(email?: string): Promise<{ success: boolean; publicKey?: string; error?: string }> {
  try {
    const comment = email?.trim() || "astra-git";
    const setupCmds = [
      "mkdir -p ~/.ssh",
      "chmod 700 ~/.ssh",
      `ssh-keygen -t ed25519 -C "${comment}" -f ~/.ssh/id_ed25519 -N "" -q`,
      "chmod 600 ~/.ssh/id_ed25519",
      "chmod 644 ~/.ssh/id_ed25519.pub",
      `printf "Host github.com\\n  StrictHostKeyChecking accept-new\\n  IdentityFile ~/.ssh/id_ed25519\\n" > ~/.ssh/config`,
      "chmod 600 ~/.ssh/config",
    ];
    const res = await executeCommand(setupCmds.join(" && "));
    if (res.exitCode !== 0) {
      return { success: false, error: res.stdout || "Failed to generate SSH key" };
    }
    const pub = await getSshPublicKey();
    return { success: !!pub, publicKey: pub || undefined };
  } catch (e: any) {
    return { success: false, error: e?.message || "Failed to generate SSH key" };
  }
}

export async function getGitRemoteUrl(workspaceId?: string): Promise<string | null> {
  try {
    const res = await executeCommand("git remote get-url origin", workspaceId);
    if (res.exitCode !== 0) return null;
    const url = (res.stdout || "").trim();
    if (!url || url.toLowerCase().startsWith("error") || url.toLowerCase().startsWith("fatal")) {
      return null;
    }
    return url;
  } catch (_) {
    return null;
  }
}

export async function setGitRemoteUrl(
  workspaceId: string | undefined,
  url: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      const removeRes = await executeCommand("git remote remove origin", workspaceId);
      return {
        success: removeRes.exitCode === 0,
        error: removeRes.exitCode === 0 ? undefined : removeRes.stdout,
      };
    }

    // Remove existing origin (if any) and add the new one
    const cmd = `(git remote remove origin 2>/dev/null || true) && git remote add origin "${cleanUrl}"`;
    const res = await executeCommand(cmd, workspaceId);
    if (res.exitCode === 0) {
      return { success: true };
    }

    // Fallback: try set-url if origin already exists
    const setRes = await executeCommand(`git remote set-url origin "${cleanUrl}"`, workspaceId);
    if (setRes.exitCode === 0) {
      return { success: true };
    }

    return {
      success: false,
      error: res.stdout || setRes.stdout || "Failed to set remote URL",
    };
  } catch (e: any) {
    return { success: false, error: e?.message || "Failed to set remote URL" };
  }
}
