# Astra CLI - Autonomous Agentic AI Coding Engine

Welcome to **Astra CLI** (`astra`), a high-performance autonomous coding assistant built on the **Google Antigravity (`agy`)** base platform. Astra CLI extends Antigravity with multi-tier cognitive reasoning, Kiro Spec-Driven Planning (SDD), Godot 4.x game engine specializations, and seamless multi-turn session persistence.

---

## 🚀 Quick Start

### 1. Set Your API Key
Export your Gemini / Antigravity API key in your terminal session:

```bash
# Linux / macOS (Bash)
export GEMINI_API_KEY="your-api-key-here"

# Windows (PowerShell)
$env:GEMINI_API_KEY="your-api-key-here"
```

---

## 🖥️ How to Use Astra CLI

### Option A: Interactive Terminal UI (TUI) Mode

Launch the full interactive terminal interface for real-time pair programming, live tool approval, and file inspection:

```bash
# Linux / Bash
./astra

# Windows / PowerShell
.\astra.ps1
```

#### Launch Interactive UI with Preloaded Prompt & Mode:
```bash
# Start an interactive Godot game dev session
./astra -i "Build an enemy AI state machine with GDScript 4" --godot

# Start an interactive Spec-Driven planning session
./astra -i "Architect an event-driven inventory system" --spec

# Interactive mode with auto-approved tools (YOLO)
./astra -y
```

> **Useful UI Shortcuts:**
> * `Ctrl+C` or `/exit` &mdash; Quit the CLI session.
> * `/help` &mdash; View in-session slash commands and tools.
> * `PageUp` / `PageDown` &mdash; Scroll conversation transcript.

---

### Option B: Headless / Autonomous Mode (`-p` / `-y`)

Execute prompts non-interactively in scripts, CI/CD pipelines, or automation workflows:

```bash
# Autonomous single-prompt execution (-y auto-approves tool actions)
./astra -y -p "Refactor auth.py to use async/await"

# Save response as JSON
./astra -y -o json -p "List all functions in utils.py"
```

---

## 🔁 Multi-Turn Session Continuity

Persist state and continue conversations across multiple runs using `--session-id`:

```bash
# Turn 1: Define context and database models
./astra -y --session-id "feature-auth" -p "Remember our user table schema uses UUID primary keys"

# Turn 2: Resume exact state in subsequent prompt
./astra -y --session-id "feature-auth" -p "Generate the registration endpoint SQL query based on the schema we discussed"
```

---

## 🧠 Cognitive Modes

Activate specialized cognitive profiles via CLI flags or prompt prefix tags:

| Mode | CLI Flag | Prompt Tag | Focus |
| :--- | :--- | :--- | :--- |
| **⚡ Fast** | `--fast` | `[fast]` | Ultra-fast generation, minimal filler, concise code. |
| **⚖️ Medium** | `--medium` | `[medium]` | Balanced everyday engineering with standard explanations. |
| **🧠 Slow** | `--slow` | `[slow]` | Deep reasoning, extensive docstrings, unit tests & verification. |
| **🔬 Super Deep (Kiro Spec)** | `--spec` / `--superdeep` | `[spec]` / `[kiro]` | 10X formal Kiro Spec-Driven Development (Requirements &rarr; Design &rarr; Tasks &rarr; Verification). |

### Examples:
```bash
# Fast mode for quick utilities
./astra -y --fast -p "Write a regex for parsing ISO 8601 timestamps"

# Slow mode with deep verification
./astra -y --slow -p "Build a thread-safe connection pool with comprehensive unit tests"

# 10X Super Deep Spec mode
./astra -y --spec -p "Build an event-sourcing engine with replay capabilities"
```

---

## 🎮 Godot 4.x Game Development Specializations

Astra CLI includes game-engine modes tailored for Godot 4.x (GDScript 2.0 / C#):

### 1. 🕹️ Godot General (`--godot` / `[godot]`)
* Adheres to Godot node lifecycle, `@onready` / `@export` node caching, signals, and Custom Resources (`@export var stats: StatsResource`).
* Separates `_process` (render) from `_physics_process` (fixed timestep physics).
```bash
./astra --godot -y -p "Create a modular 2D player state machine with state transitions"
```

### 2. 📱 Godot Mobile (`--godot-mobile` / `[godot-mobile]`)
* Targets lightweight renderers (`gl_compatibility` / `mobile`).
* Optimizes for low draw calls, zero allocations in game loops, and object pooling.
* Integrates touch controls (`InputEventScreenTouch`), virtual joysticks, and safe-area notch handling.
```bash
./astra --godot-mobile -y -p "Build a touch-friendly virtual joystick and bullet pool"
```

### 3. 🖥️ Godot Desktop (`--godot-desktop` / `[godot-desktop]`)
* Targets high-fidelity renderers (`Forward+` / `Mobile`) with borderless/exclusive fullscreen, VSync, and Ultrawide support.
* Simultaneous Keyboard/Mouse and Gamepad (XInput, Steam Deck, DualSense) mapping with runtime remapping.
```bash
./astra --godot-desktop -y -p "Build an options menu with resolution scaling, audio sliders, and keybinds"
```

---

## 🎛️ CLI Flags & Options Reference

| Flag | Short | Description |
| :--- | :--- | :--- |
| **`--prompt "<text>"`** | `-p` | Run headlessly with the given prompt. |
| **`--prompt-interactive "<text>"`** | `-i` | Launch interactive TUI preloaded with prompt. |
| **`--yolo`** | `-y` | Auto-approve all file edits and commands without confirmation. |
| **`--session-id "<id>"`** | &mdash; | Session ID for multi-turn conversational persistence. |
| **`--effort <low\|medium\|high>`** | &mdash; | Set agent reasoning effort. |
| **`--fast`** | &mdash; | Activate Fast cognitive mode. |
| **`--medium`** | &mdash; | Activate Medium cognitive mode. |
| **`--slow`** | &mdash; | Activate Slow cognitive mode. |
| **`--spec` / `--superdeep`** | &mdash; | Activate 10X Super Deep Kiro Spec-Driven Planning. |
| **`--godot`** | &mdash; | Activate Godot 4.x Game Development mode. |
| **`--godot-mobile`** | &mdash; | Activate Godot 4.x Mobile Optimization mode. |
| **`--godot-desktop`** | &mdash; | Activate Godot 4.x Desktop Optimization mode. |
| **`--output-format <fmt>`** | `-o` | Output format: `text` (default), `json`, `stream-json`. |
| **`--model <model>`** | `-m` | Specify AI model override. |

---

## 🔌 Programmatic Integration (Python & Node.js)

### Python (`astra.py`)
```python
from astra import call_astra

# Invoke with session continuity and Godot mode
result = call_astra(
    prompt="Create an inventory resource system and player equipment slot logic",
    session_id="game-session-01",
    mode="godot"
)

print(result["output"])
```

### Node.js (`astra.js`)
```javascript
import { callAstra } from "./astra.js";

const result = await callAstra({
  prompt: "Build an event-driven notification manager",
  sessionId: "service-01",
  mode: "spec",
  outputFormat: "json"
});

console.log(result);
```

---

## 🏗️ Architecture & Base Engine

Astra CLI is powered directly by the native **Google Antigravity (`agy` v1.1.22)** binary:
* **Antigravity Base (`agy`)**: Provides native workspace management, subagent delegation, sandboxing, tool permissions, and progressive skill loading.
* **Astra Layer**: Adds cognitive mode translation, Kiro Spec-Driven Planning prompts, Godot engine game design directives, and developer ergonomics across Bash, PowerShell, Python, and Node.js.


