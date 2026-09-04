/**
 * Astra Interactive Approval Engine
 * Enables real-time user action confirmation for dangerous/modifying tool calls.
 */
import fs from "node:fs";

export async function checkAstraInteractiveApproval(toolName, toolInput, signal, config2) {
  const isYolo = (config2?.getApprovalMode?.() === "yolo") || (process.env.ASTRA_YOLO === "true");
  if (isYolo) {
    return { approved: true };
  }

  const name = (toolName || "").toLowerCase();
  // Internal session bookkeeping: narrative only, zero side effects.
  // Auto-approve so the agent never blocks 10 min with no UI to answer it
  // (the app intentionally shows no modal for these).
  if (name === "update_topic" || name === "set_topic") {
    return { approved: true };
  }
  const isReadOnly = (
    name === "read_file" ||
    name === "read_many_files" ||
    name === "view_file" ||
    name === "list_dir" ||
    name === "list_directory" ||
    name === "glob" ||
    name === "find_by_name" ||
    name === "grep_search" ||
    name === "grep" ||
    name === "search" ||
    name === "google_web_search" ||
    name === "web_search" ||
    name === "web_fetch" ||
    name === "cat" ||
    name === "ls" ||
    name === "find" ||
    name === "get_file" ||
    name === "file_search" ||
    name === "read" ||
    name === "look" ||
    name === "inspect"
  );
  if (isReadOnly) {
    return { approved: true };
  }

  const approvalFile = "/tmp/astra-approval.json";

  // Clean old approval file before starting to wait
  try {
    if (fs.existsSync(approvalFile)) {
      fs.unlinkSync(approvalFile);
    }
  } catch (_) {}

  // Wait for user decision from the app UI modal
  const startTime = Date.now();
  const TIMEOUT_MS = 600000; // 10 minutes

  while (Date.now() - startTime < TIMEOUT_MS) {
    if (signal?.aborted) {
      return { approved: false, reason: "Aborted by user" };
    }
    if (fs.existsSync(approvalFile)) {
      try {
        const content = fs.readFileSync(approvalFile, "utf8").trim();
        if (content) {
          const parsed = JSON.parse(content);
          try { fs.unlinkSync(approvalFile); } catch (_) {}
          if (parsed.approved === true || parsed.outcome === "proceed_once" || parsed.outcome === "always") {
            return { approved: true };
          } else {
            return { approved: false, reason: parsed.reason || "Action rejected by user." };
          }
        }
      } catch (_) {}
    }
    await new Promise((resolve) => setTimeout(resolve, 80));
  }

  return { approved: false, reason: "Timed out waiting for user approval." };
}

export default checkAstraInteractiveApproval;
