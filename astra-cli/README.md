# Antigravity CLI & Gemini CLI Source Backup

This folder contains the complete installed source codes, scripts, builtin skills, and binaries for Antigravity CLI.

---

## 📁 Directory Structure

```
antigravity-cli/
├── cli-binary/
│   └── agy                               # Standalone executable binary (Linux x86_64)
│
├── gemini-cli-source/
│   ├── bundle/                           # Bundled CLI JavaScript engine & modules
│   │   ├── gemini.js                     # Main executable script
│   │   ├── docs/                         # CLI reference and guides
│   │   ├── policies/                     # Security and permission policies (TOML)
│   │   ├── examples/                     # Custom extensions, skills & MCP server examples
│   │   └── builtin/                      # Skill creator & Antigravity support skills
│   ├── package.json                      # Node.js package definition (@google/gemini-cli)
│   ├── README.md                         # Gemini CLI documentation
│   └── LICENSE                           # Apache-2.0 License
│
└── antigravity-config-and-skills/
    ├── bin/                              # Helper scripts (agentapi, webm_encoder)
    ├── builtin/                          # Antigravity built-in skills
    │   └── skills/
    │       ├── agy-customizations/       # Customization guide & docs
    │       ├── antigravity_guide/        # Comprehensive guide, SDK & CLI references
    │       ├── generative_ui/            # Generative UI skill
    │       ├── migrate-workflows/        # Workflow migration tools
    │       └── permissioned-github/      # GitHub integration skill
    └── settings.json                     # CLI configuration & settings
```

---

## 🚀 How to Run

### 1. Run via Bundled Script
```bash
cd gemini-cli-source
node bundle/gemini.js
```

### 2. Run via agy Binary
```bash
./cli-binary/agy
```
