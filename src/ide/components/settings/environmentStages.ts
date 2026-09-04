export interface StageMeta {
  index: number;
  name: string;
  title: string;
  desc: string;
  packages: string[];
}

export const STAGES: StageMeta[] = [
  {
    index: 1,
    name: "CoreUtilities",
    title: "Stage 1: Core CLI & Node.js",
    desc: "bash, coreutils, git, ripgrep, sqlite, nodejs v20, npm",
    packages: [
      "bash", "coreutils", "findutils", "grep", "sed", "gawk",
      "ripgrep", "tar", "gzip", "zip", "unzip", "tree",
      "ca-certificates", "curl", "wget", "git", "openssh-client",
      "sqlite", "nodejs", "npm",
    ],
  },
  {
    index: 2,
    name: "Languages",
    title: "Stage 2: Python 3 & PHP 8.3",
    desc: "python3, py3-pip, php83, sqlite3, curl, composer",
    packages: [
      "python3", "py3-pip", "php83", "php83-sqlite3", "php83-pdo_sqlite",
      "php83-curl", "php83-openssl", "php83-json", "php83-phar",
      "php83-mbstring", "php83-dom", "php83-xml", "composer",
    ],
  },
  {
    index: 3,
    name: "BuildTools",
    title: "Stage 3: C/C++ Build Tools",
    desc: "make, gcc, g++, linux-headers, icu-libs",
    packages: ["make", "gcc", "g++", "linux-headers", "icu-data-full", "icu-libs"],
  },
  {
    index: 4,
    name: "AstraRebuild",
    title: "Stage 4: Astra CLI Rebuild",
    desc: "Native node-pty compilation for PTY terminal emulation",
    packages: ["node-pty", "pty.node (ARM64)"],
  },
];
