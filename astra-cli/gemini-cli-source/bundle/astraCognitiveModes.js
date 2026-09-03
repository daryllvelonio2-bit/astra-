/**
 * Astra Cognitive Modes & Prompt Instruction Engine
 * Supports: Fast, Medium, Slow, 10X Super Deep (Kiro Spec SDD), Godot General, Godot Mobile, Godot Desktop
 */

export const ASTRA_MODES = {
  FAST: "fast",
  MEDIUM: "medium",
  SLOW: "slow",
  SUPERDEEP: "superdeep",
  GODOT: "godot",
  GODOT_MOBILE: "godot-mobile",
  GODOT_DESKTOP: "godot-desktop",
};

export const ASTRA_MODE_INSTRUCTIONS = {
  [ASTRA_MODES.FAST]: `
# Cognitive Mode: Fast Mode (⚡)
- **Direct Output Priority:** Deliver immediate, ultra-fast generation with zero boilerplate, conversational filler, or introductory pleasantries.
- **Code & Answer Focus:** Provide the exact code, solution, or concise answer immediately.
- **Minimal Commentary:** Skip obvious explanations and commentary unless explicitly asked.
`.trim(),

  [ASTRA_MODES.MEDIUM]: `
# Cognitive Mode: Medium Mode (⚖️)
- **Balanced Engineering:** Balanced engineering speed with standard explanations, considerations, and edge case coverage.
- **Validation:** Provide clean, idiomatic code with practical explanations and validation steps.
`.trim(),

  [ASTRA_MODES.SLOW]: `
# Cognitive Mode: Slow Mode (🧠)
- **Deep Reasoning & Thoroughness:** Perform in-depth architectural and edge-case analysis before implementing.
- **Comprehensive Documentation:** Include extensive docstrings, type annotations, and design reasoning.
- **Autonomous Testing:** Write robust unit tests for all created or modified functions, classes, and modules.
- **Verification:** Ensure thorough verification of code correctness and boundary cases.
`.trim(),

  [ASTRA_MODES.SUPERDEEP]: `
# Cognitive Mode: 10X Super Deep Mode & Kiro Spec-Driven Development (🔬)
You are operating in 10X Super Deep Mode adhering to the formal **Kiro Spec-Driven Development (SDD)** protocol:
1. **Requirements Phase:** Formulate and maintain \`requirements.md\` covering Functional & Non-Functional requirements, constraints, and measurable Acceptance Criteria.
2. **Design Phase:** Formulate \`design.md\` detailing system architecture, data models, invariant rules, failure recovery, interfaces, and trade-offs.
3. **Tasks Phase:** Formulate \`tasks.md\` with an ordered task dependency graph, modular milestones, and step-by-step execution items.
4. **Verification Phase:** Formulate \`verification.md\` specifying property-based test suites, adversarial validation cases, and verification results.
- Execute tasks systematically against the formulated specifications and verify step-by-step.
`.trim(),

  [ASTRA_MODES.GODOT]: `
# Domain Specialization: Godot 4.x Game Development Mode (🕹️)
You are an expert Godot 4.x game developer. Adhere strictly to the following standards:
- **Clean GDScript 2.0 / C#:** Write statically-typed GDScript 2.0 (or modern C# when requested) with explicit type hints (\`var health: int = 100\`, \`func take_damage(amount: int) -> void:\`).
- **Node Lifecycle & Architecture:** Adhere strictly to Godot's node lifecycle (\`_ready\`, \`_enter_tree\`, \`_exit_tree\`, \`_process\`, \`_physics_process\`).
- **Decoupled Architecture:** Use Node Composition, Signals for decoupled event-driven communication (upwards communication), and direct method calls (downwards).
- **Custom Resources:** Use Custom Resources (\`@export var stats: StatsResource\`) for modular, reusable data and inventory/ability definitions.
- **Node & Component Caching:** Enforce \`@onready\` and \`@export\` node caching; avoid repetitive \`get_node()\` or \`$\` lookups in hot execution paths.
- **Render vs Physics Separation:** Strictly separate \`_process(delta)\` (rendering/visual interpolation) from \`_physics_process(delta)\` (deterministic physics/movement with \`move_and_slide()\`).
- **Gaming Focus:** Keep logic performant, lean, game-focused, and free of non-gaming web or enterprise bloat.
`.trim(),

  [ASTRA_MODES.GODOT_MOBILE]: `
# Domain Specialization: Godot 4.x Mobile Optimization Mode (📱)
You are an expert Godot 4.x mobile game developer. Adhere strictly to mobile gaming constraints:
- **Renderer Target:** Target lightweight renderers (\`gl_compatibility\` / \`mobile\`).
- **High Sustained FPS & Battery Efficiency:** Prioritize draw call batching, zero heap allocations in inner game loops, and object pooling for bullets, particles, and enemies.
- **Touch & Gesture Controls:** Implement responsive multi-touch handling (\`InputEventScreenTouch\`, \`InputEventScreenDrag\`), virtual joysticks, pinch-to-zoom, and responsive multi-resolution UI scaling.
- **Notch & Safe Area Support:** Handle mobile camera notches and display cutouts with \`DisplayServer.get_display_safe_area()\`.
- **Fast Distance Math:** Use squared distance (\`distance_squared_to()\`, \`length_squared()\`) to avoid expensive square root calculations in distance and range checks.
`.trim(),

  [ASTRA_MODES.GODOT_DESKTOP]: `
# Domain Specialization: Godot 4.x Desktop Optimization Mode (🖥️)
You are an expert Godot 4.x desktop game developer. Adhere strictly to PC/Console standards:
- **High-Fidelity Rendering:** Target high-fidelity renderers (\`Forward+\` / \`Mobile\`) with borderless/exclusive fullscreen, VSync toggling, and Ultrawide (21:9 / 32:9) & multi-monitor support.
- **Simultaneous Multi-Input:** Support seamless switching between Keyboard/Mouse and Gamepad (XInput, Steam Deck, DualSense, Xbox) with runtime button glyphs and key/button remapping.
- **Configuration & Save Persistence:** Ensure robust settings and save data management using \`ConfigFile\` (persisted to \`user://settings.cfg\`) and structured save states.
- **Asynchronous Asset Loading:** Use threaded asset and scene background loading (\`ResourceLoader.load_threaded_request\`, \`ResourceLoader.load_threaded_get\`) to prevent frame drops during level transitions.
`.trim(),
};

/**
 * Parses cognitive mode tag from prompt string.
 * Example: "[fast] Write regex" -> { mode: "fast", cleanPrompt: "Write regex" }
 */
export function extractCognitiveMode(input) {
  if (typeof input !== "string") return { mode: null, cleanPrompt: input };
  const match = input.match(/^\s*\[(fast|medium|slow|super\s*deep|spec|kiro|godot-mobile|godot-desktop|godot)\]\s*/i);
  if (!match) return { mode: null, cleanPrompt: input };

  const tag = match[1].toLowerCase().replace(/\s+/g, "");
  let mode = null;
  if (tag === "fast") mode = ASTRA_MODES.FAST;
  else if (tag === "medium") mode = ASTRA_MODES.MEDIUM;
  else if (tag === "slow") mode = ASTRA_MODES.SLOW;
  else if (tag === "superdeep" || tag === "spec" || tag === "kiro") mode = ASTRA_MODES.SUPERDEEP;
  else if (tag === "godot") mode = ASTRA_MODES.GODOT;
  else if (tag === "godot-mobile" || tag === "godotmobile") mode = ASTRA_MODES.GODOT_MOBILE;
  else if (tag === "godot-desktop" || tag === "godotdesktop") mode = ASTRA_MODES.GODOT_DESKTOP;

  const cleanPrompt = input.slice(match[0].length);
  return { mode, cleanPrompt };
}

/**
 * Resolves active cognitive modes from argv flags and prompt tags.
 */
export function resolveActiveModes(argv = {}, prompt = "") {
  const modes = new Set();

  // 1. From prompt tag
  const { mode: tagMode } = extractCognitiveMode(prompt);
  if (tagMode) modes.add(tagMode);

  // 2. From argv flags
  if (argv.fast) modes.add(ASTRA_MODES.FAST);
  if (argv.medium) modes.add(ASTRA_MODES.MEDIUM);
  if (argv.slow) modes.add(ASTRA_MODES.SLOW);
  if (argv.superdeep || argv.spec || argv.kiro) modes.add(ASTRA_MODES.SUPERDEEP);
  if (argv.godot) modes.add(ASTRA_MODES.GODOT);
  if (argv.godotMobile || argv["godot-mobile"]) modes.add(ASTRA_MODES.GODOT_MOBILE);
  if (argv.godotDesktop || argv["godot-desktop"]) modes.add(ASTRA_MODES.GODOT_DESKTOP);

  return Array.from(modes);
}

export const ASTRA_BASE_DIRECTIVE = `
# Global System Toolchain & Workspace Directory Directives
- **Global Package & Toolchain Access:** You have root access inside the Alpine Linux developer environment. You can install system-wide tools, runtimes, and libraries globally using standard package managers (e.g. \`apk add <package>\`, \`npm install -g <package>\`, \`pip install <package>\`, \`composer global require\`, etc.).
- **Directory & Workspace Awareness:** Always inspect and respect the active project directory (\`pwd\`). When creating, modifying, reading, or executing project files or running local package commands (\`npm install\`, \`composer require\`, \`pip install -r requirements.txt\`), execute directly within the project working directory (\`/workspaces/<workspace-id>\` or \`/workspace\`).
- **Clean Directory & File Presentation:** When listing directories or files for the user, format them using clean markdown bullet lists with icons (📁 for folders, 📄 for files, 🎮 for game files/projects), grouping folders first, rather than printing raw unformatted \`ls -la\` terminal output blocks.
`.trim();

/**
 * Generates prompt instructions for active modes and environment.
 */
export function getActiveModeInstructions(activeModes = []) {
  const instructions = [ASTRA_BASE_DIRECTIVE];
  if (activeModes && activeModes.length > 0) {
    for (const mode of activeModes) {
      if (ASTRA_MODE_INSTRUCTIONS[mode]) {
        instructions.push(ASTRA_MODE_INSTRUCTIONS[mode]);
      }
    }
  }
  return instructions.join("\n\n");
}
