import { ideActionService } from "../../ide/services/ideActionService";

export interface FormattedToolAction {
  title: string;
  detail: string;
  icon: string;
}

/**
 * Formats a raw Astra CLI / agy tool call into human-friendly UI titles, descriptions, and icons.
 */
export function formatToolAction(
  toolName: string,
  args: Record<string, any> = {}
): FormattedToolAction {
  const tool = (toolName || "").toLowerCase();
  const filePath =
    args.TargetFile ||
    args.file_path ||
    args.path ||
    args.file ||
    args.AbsolutePath ||
    "";
  const filename = filePath ? filePath.split("/").pop() || filePath : "";

  if (/command|shell|exec|bash/i.test(tool)) {
    const cmd = (args.command || args.cmd || "").replace(/\s+/g, " ").trim();
    return {
      title: cmd ? `$ ${cmd}` : "Command",
      detail: cmd ? `$ ${cmd.slice(0, 45)}${cmd.length > 45 ? "..." : ""}` : "Running command...",
      icon: "terminal-outline",
    };
  }
  if (/write|create_file/i.test(tool)) {
    return {
      title: filename ? `Write ${filename}` : "Write File",
      detail: filePath ? `Writing ${filePath.slice(0, 40)}` : "Writing file...",
      icon: "document-text-outline",
    };
  }
  if (/replace|edit|modify|patch/i.test(tool)) {
    return {
      title: filename ? `Edit ${filename}` : "Edit File",
      detail: filePath ? `Modifying ${filePath.slice(0, 40)}` : "Modifying file...",
      icon: "create-outline",
    };
  }
  if (/view|read|cat/i.test(tool)) {
    return {
      title: filename ? `Read ${filename}` : "Read File",
      detail: filePath ? `Inspecting ${filePath.slice(0, 40)}` : "Reading file...",
      icon: "eye-outline",
    };
  }
  if (/list|find|ls/i.test(tool)) {
    return {
      title: "Scan Directory",
      detail: args.DirectoryPath || args.SearchDirectory || "Searching files...",
      icon: "folder-open-outline",
    };
  }
  if (/grep|search/i.test(tool)) {
    return {
      title: "Search Workspace",
      detail: args.Query ? `Searching "${args.Query}"` : "Searching codebase...",
      icon: "search-outline",
    };
  }

  const clean = (toolName || "tool")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { title: clean, detail: `Invoking ${clean}...`, icon: "construct-outline" };
}

/**
 * Parses embedded [IDE_ACTION: ...] command tags from AI agent streams and executes them in the IDE.
 */
export function parseAndExecuteIdeActions(text: string, workspaceId?: string): void {
  if (!text) return;
  const fM = text.match(/\[IDE_ACTION:\s*OPEN_FILE\s+([^\]\n]+)\]/i);
  if (fM) ideActionService.openFile(fM[1].trim(), undefined, workspaceId);

  const bM = text.match(/\[IDE_ACTION:\s*OPEN_BROWSER\s+([^\]\n]+)\]/i);
  if (bM) ideActionService.openBrowser(bM[1].trim());

  const tM = text.match(/\[IDE_ACTION:\s*SWITCH_TAB\s+(editor|terminal|browser)\]/i);
  if (tM) ideActionService.switchTab(tM[1].toLowerCase() as any);

  const wM = text.match(/\[IDE_ACTION:\s*SWITCH_WORKSPACE\s+([^\]\n]+)\]/i);
  if (wM) ideActionService.switchWorkspace(wM[1].trim());
}
