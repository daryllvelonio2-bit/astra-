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
