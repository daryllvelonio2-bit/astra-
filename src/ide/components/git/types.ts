export type GitFileChangeType =
  | "modified"
  | "added"
  | "deleted"
  | "untracked"
  | "renamed";

export interface GitFileStatus {
  path: string;
  filename: string;
  status: GitFileChangeType;
  staged: boolean;
  oldPath?: string;
}

export interface GitBranch {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  authorName: string;
  authorEmail: string;
  timestamp: number;
  message: string;
  relativeTime: string;
}

export interface GitRepoStatus {
  isRepo: boolean;
  currentBranch: string;
  upstreamBranch?: string;
  ahead: number;
  behind: number;
  files: GitFileStatus[];
}

export interface GitCredentials {
  token: string;
  username: string;
  email: string;
}
