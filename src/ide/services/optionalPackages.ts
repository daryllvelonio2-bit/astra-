/**
 * Curated catalog of OPTIONAL Alpine Linux packages users can one-tap install
 * from Settings → Linux → Optional Extras.
 *
 * These are intentionally NOT part of the base provisioning stages in
 * ToolchainProvisioner.kt — they install on demand, after provisioning.
 * Package names are pinned to Alpine v3.21 (see setup-linux-assets.sh):
 *  - `redis` was replaced by `valkey` (+ `valkey-compat` for the redis-cli name)
 *  - `mysql-client` does not exist; MariaDB provides `mariadb-client`
 *  - Postgres clients are versioned (`postgresql17-client`)
 *  - `mongosh` has no apk (needs glibc); `mongodb-tools` covers the use case
 */

export interface OptionalPackage {
  /** Stable id for install-state tracking */
  id: string;
  /** apk package name(s) to install */
  apk: string[];
  /** Binary probed with `command -v` to detect "installed" */
  bin: string;
  /** When set, `apk info -e` on this package is probed instead (header-only packages with no binary) */
  probeApk?: string;
  /** Display name */
  name: string;
  /** Plain-language "what it does for you" */
  desc: string;
  /** True when the download is large — UI shows a storage warning */
  heavy?: boolean;
}

export interface OptionalGroup {
  id: string;
  title: string;
  icon: string;
  blurb: string;
  packages: OptionalPackage[];
}

export const OPTIONAL_GROUPS: OptionalGroup[] = [
  {
    id: "cli",
    title: "CLI Power Tools",
    icon: "terminal-outline",
    blurb: "Everyday terminal upgrades for faster shell work",
    packages: [
      { id: "neovim", apk: ["neovim"], bin: "nvim", name: "Neovim", desc: "Modal code editor for fast terminal edits when the full editor is overkill." },
      { id: "tmux", apk: ["tmux"], bin: "tmux", name: "tmux", desc: "Persistent multi-pane shell sessions — detach and reattach without losing work." },
      { id: "fzf", apk: ["fzf"], bin: "fzf", name: "fzf", desc: "Fuzzy finder — jump to files and recall shell history in a few keystrokes." },
      { id: "bat", apk: ["bat"], bin: "bat", name: "bat", desc: "cat with syntax highlighting, line numbers and git markers." },
      { id: "eza", apk: ["eza"], bin: "eza", name: "eza", desc: "Modern ls replacement with icons, git status and tree view." },
      { id: "htop", apk: ["htop"], bin: "htop", name: "htop", desc: "Interactive process viewer — spot runaway builds eating phone CPU and RAM." },
      { id: "jq", apk: ["jq"], bin: "jq", name: "jq", desc: "Slice and filter JSON API responses right in the terminal." },
      { id: "yq", apk: ["yq"], bin: "yq", name: "yq", desc: "jq for YAML — inspect and edit app configs and CI files from the shell." },
      { id: "ncdu", apk: ["ncdu"], bin: "ncdu", name: "ncdu", desc: "Visual disk-usage explorer to reclaim tight phone storage." },
      { id: "rsync", apk: ["rsync"], bin: "rsync", name: "rsync", desc: "Fast incremental sync and deploy of project folders." },
    ],
  },
  {
    id: "languages",
    title: "Extra Languages",
    icon: "code-slash-outline",
    blurb: "Toolchains beyond the built-in Node, Python and PHP",
    packages: [
      { id: "go", apk: ["go"], bin: "go", name: "Go", desc: "Go toolchain — build fast CLIs and backend services.", heavy: true },
      { id: "rust", apk: ["rust", "cargo"], bin: "rustc", name: "Rust", desc: "Rust compiler plus Cargo for systems programming.", heavy: true },
      { id: "openjdk17", apk: ["openjdk17"], bin: "java", name: "Java 17", desc: "Java runtime and compiler for Android tooling and JVM backends.", heavy: true },
      { id: "ruby", apk: ["ruby"], bin: "ruby", name: "Ruby", desc: "Ruby scripting and static site generators like Jekyll." },
      { id: "lua", apk: ["lua5.4"], bin: "lua5.4", name: "Lua 5.4", desc: "Tiny embeddable scripting language, great for automation glue." },
    ],
  },
  {
    id: "databases",
    title: "Database Clients",
    icon: "server-outline",
    blurb: "Shells for the databases your apps talk to",
    packages: [
      { id: "pg", apk: ["postgresql17-client"], bin: "psql", name: "PostgreSQL", desc: "psql interactive shell for remote PostgreSQL databases." },
      { id: "mariadb", apk: ["mariadb-client"], bin: "mariadb", name: "MySQL / MariaDB", desc: "Connect to MySQL and MariaDB servers; dump and restore databases." },
      { id: "valkey", apk: ["valkey", "valkey-compat"], bin: "redis-cli", name: "Valkey / Redis", desc: "redis-cli compatible shell for caches, queues and sessions." },
      { id: "mongo", apk: ["mongodb-tools"], bin: "mongostat", name: "MongoDB Tools", desc: "Inspect and manage remote MongoDB servers (mongostat, mongodump)." },
    ],
  },
  {
    id: "media",
    title: "Media & Docs",
    icon: "image-outline",
    blurb: "Asset pipelines and document conversion",
    packages: [
      { id: "ffmpeg", apk: ["ffmpeg"], bin: "ffmpeg", name: "FFmpeg", desc: "Convert, trim and compress audio and video assets for your apps.", heavy: true },
      { id: "imagemagick", apk: ["imagemagick"], bin: "magick", name: "ImageMagick", desc: "Resize, convert and optimize images from the shell." },
      { id: "pandoc", apk: ["pandoc"], bin: "pandoc", name: "Pandoc", desc: "Convert Markdown docs to PDF, HTML and Word." },
      { id: "graphviz", apk: ["graphviz"], bin: "dot", name: "Graphviz", desc: "Render architecture diagrams from plain text descriptions." },
      { id: "poppler", apk: ["poppler-utils"], bin: "pdftotext", name: "PDF Utils", desc: "Read PDFs in the terminal and extract their text." },
    ],
  },
];

/**
 * Packages Astra itself needs to work. Mirrors the base provisioning stages
 * in ToolchainProvisioner.kt (which auto-downloads these on first launch
 * unless the user turns auto-download off). Listed here so users can verify
 * or reinstall each piece by hand — every install stays a user choice.
 * `desc` explains why the app needs it.
 */
export const REQUIRED_GROUPS: OptionalGroup[] = [
  {
    id: "req-core",
    title: "Core Shell & Tools",
    icon: "terminal-outline",
    blurb: "Terminal, file commands, search and downloads",
    packages: [
      { id: "r-bash", apk: ["bash"], bin: "bash", name: "Bash", desc: "Shell behind the terminal and Run commands — scripts and sessions need it." },
      { id: "r-coreutils", apk: ["coreutils"], bin: "ls", name: "Coreutils", desc: "Basic file commands (ls, cp, mv, mkdir) the IDE and terminal rely on." },
      { id: "r-findutils", apk: ["findutils"], bin: "find", name: "Findutils", desc: "File search used by workspace scanning and the AI agent." },
      { id: "r-grep", apk: ["grep"], bin: "grep", name: "grep", desc: "Text search inside files, logs and command output." },
      { id: "r-sed", apk: ["sed"], bin: "sed", name: "sed", desc: "Stream editing used by setup scripts and the agent." },
      { id: "r-gawk", apk: ["gawk"], bin: "awk", name: "gawk", desc: "Text processing for scripts and tool-output parsing." },
      { id: "r-ripgrep", apk: ["ripgrep"], bin: "rg", name: "ripgrep", desc: "Fast code search behind the editor and agent." },
      { id: "r-tar", apk: ["tar"], bin: "tar", name: "tar", desc: "Extracts the Alpine rootfs itself plus project archives." },
      { id: "r-gzip", apk: ["gzip"], bin: "gzip", name: "gzip", desc: "Decompression for downloads and the rootfs." },
      { id: "r-zip", apk: ["zip", "unzip"], bin: "unzip", name: "zip / unzip", desc: "Archives for project export, import and sharing." },
      { id: "r-tree", apk: ["tree"], bin: "tree", name: "tree", desc: "Directory listings shown around the IDE." },
      { id: "r-cacerts", apk: ["ca-certificates"], bin: "", probeApk: "ca-certificates", name: "CA Certificates", desc: "TLS trust roots — HTTPS downloads, git, npm all fail without these." },
      { id: "r-curl", apk: ["curl"], bin: "curl", name: "curl", desc: "File downloads and API calls from scripts." },
      { id: "r-wget", apk: ["wget"], bin: "wget", name: "wget", desc: "Backup downloader for provisioning and scripts." },
      { id: "r-git", apk: ["git"], bin: "git", name: "Git", desc: "Powers the Git tab — clone, stage, commit, push." },
      { id: "r-ssh", apk: ["openssh-client"], bin: "ssh", name: "SSH Client", desc: "SSH remotes, deploy keys and git-over-SSH URLs." },
      { id: "r-sqlite", apk: ["sqlite"], bin: "sqlite3", name: "SQLite", desc: "Bundled databases and running .sql files." },
    ],
  },
  {
    id: "req-lang",
    title: "Built-in Runtimes",
    icon: "code-slash-outline",
    blurb: "Languages the Run button and agent execute",
    packages: [
      { id: "r-node", apk: ["nodejs"], bin: "node", name: "Node.js", desc: "Runs JavaScript files and the Astra CLI bridge.", heavy: true },
      { id: "r-npm", apk: ["npm"], bin: "npm", name: "npm", desc: "Installs JavaScript project dependencies." },
      { id: "r-python", apk: ["python3"], bin: "python3", name: "Python 3", desc: "Runs Python files and serves HTML previews." },
      { id: "r-pip", apk: ["py3-pip"], bin: "pip3", name: "pip", desc: "Installs Python packages." },
      { id: "r-php", apk: ["php83"], bin: "php", name: "PHP 8.3", desc: "Runs PHP files and Laravel projects." },
      { id: "r-phpext", apk: ["php83-sqlite3", "php83-pdo_sqlite", "php83-curl", "php83-openssl", "php83-json", "php83-phar", "php83-mbstring", "php83-dom", "php83-xml"], bin: "php", name: "PHP Extensions", desc: "Database, network and XML support PHP apps expect." },
      { id: "r-composer", apk: ["composer"], bin: "composer", name: "Composer", desc: "Installs PHP project dependencies." },
    ],
  },
  {
    id: "req-build",
    title: "Build Tools",
    icon: "construct-outline",
    blurb: "Compilers for native modules and C/C++ runs",
    packages: [
      { id: "r-make", apk: ["make"], bin: "make", name: "make", desc: "Drives C/C++ and native-module builds." },
      { id: "r-gcc", apk: ["gcc", "g++"], bin: "gcc", name: "GCC / G++", desc: "Compiles C/C++ runs and node-pty for the terminal.", heavy: true },
      { id: "r-headers", apk: ["linux-headers"], bin: "", probeApk: "linux-headers", name: "Linux Headers", desc: "Kernel headers native code compiles against." },
      { id: "r-icu", apk: ["icu-libs", "icu-data-full"], bin: "", probeApk: "icu-libs", name: "ICU Libraries", desc: "Unicode data Node.js needs to start at all.", heavy: true },
    ],
  },
];
