# Project Information (`PROJECT_INFO.md`)

## Overview
- **Project Name:** `Astra` (formerly `ai-coder`)
- **Tech Stack:** React Native, Expo SDK 54, TypeScript
- **Architecture & Principles:** Defined in `agent.md` (Modular, <500 lines per file, zero bloat, simplicity first).
- **Progress Tracking:** Maintained in `PROGRESS.md`.

## Project Concept & Vision
- **App Type:** All-in-one mobile coding IDE (VS Code style for mobile).
- **Core Separation:** 
  - `src/ide/`: VS Code-like UI components, file explorer, code editor view, local workspace persistence, and project picker.
  - `src/ai/`: Agentic terminal, multi-provider LLM gateway, and 3-Tier Execution Gateway (`src/ai/runner/`).

## Execution Gateway Architecture (3-Tier Runner)
1. **Tier 1 (Client-Side Sandbox):** Instant offline JS/TS script execution.
2. **Tier 2 (Piston / Public API):** Multi-language script runner (PHP, Python, Ruby, C++, etc.) using free public execution engines.
3. **Tier 3 (Embedded Alpine Linux PRoot):** Full-stack rootfs process execution, Node.js runtime, and Astra CLI agent engine running directly inside the app sandbox.

## Built-in Alpine Linux & PRoot Environment (Android)
`ai-coder` provisions a full Alpine Linux container embedded directly within the app sandbox via PRoot:
1. **Zero External Dependencies:** No need for external terminal apps.
2. **Automatic Provisioning:** Embedded rootfs with developer toolchain (Node.js, PHP, Python, Git, Ripper, etc.).
3. **Integrated Astra CLI:** `/bin/astra` is provisioned inside Alpine Linux for autonomous agentic task execution.
4. **Workspace Sandboxing:** File explorer and workspaces are mounted directly into `/workspace` and `/workspaces`.
