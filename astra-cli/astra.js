/**
 * Astra CLI Node.js Integration Module
 * Enables programmatic invocation of Astra CLI powered by Google Antigravity (agy) base binary.
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function resolveAgyBin() {
  const localAgy = path.join(__dirname, "cli-binary", "agy");
  if (fs.existsSync(localAgy)) {
    return localAgy;
  }
  const homeAgy = path.join(process.env.HOME || "", ".local", "bin", "agy");
  if (fs.existsSync(homeAgy)) {
    return homeAgy;
  }
  return "agy";
}

export const COGNITIVE_DIRECTIVES = {
  fast: "[SYSTEM COGNITIVE DIRECTIVE: FAST MODE]\nPrioritize immediate response speed. Be concise, direct, and zero-filler. Provide production-ready code with minimal surrounding fluff.\n\n",
  medium: "[SYSTEM COGNITIVE DIRECTIVE: MEDIUM MODE]\nProvide clean, idiomatic, well-structured code with necessary context and standard code explanations.\n\n",
  slow: "[SYSTEM COGNITIVE DIRECTIVE: SLOW MODE (DEEP REASONING & VERIFICATION)]\nEngage deep analytical reasoning. Write complete, robust implementations with comprehensive docstrings, explicit edge-case handling, and thorough unit tests. Run shell/test commands where applicable to verify.\n\n",
  spec: "[SYSTEM COGNITIVE DIRECTIVE: 10X SUPER DEEP - KIRO SPEC-DRIVEN DEVELOPMENT (SDD)]\nExecute with the Kiro Spec-Driven Planning methodology:\n1. Requirements Analysis: Define functional and non-functional requirements with strict acceptance criteria.\n2. Architecture & Design: Detail architecture, data structures, invariants, and failure recovery modes.\n3. Task Decomposition: Create a structured, step-by-step task list and execute each systematically.\n4. Verification: Author comprehensive property-based/unit test suites and verify via terminal commands.\n\n",
  superdeep: "[SYSTEM COGNITIVE DIRECTIVE: 10X SUPER DEEP - KIRO SPEC-DRIVEN DEVELOPMENT (SDD)]\nExecute with the Kiro Spec-Driven Planning methodology:\n1. Requirements Analysis: Define functional and non-functional requirements with strict acceptance criteria.\n2. Architecture & Design: Detail architecture, data structures, invariants, and failure recovery modes.\n3. Task Decomposition: Create a structured, step-by-step task list and execute each systematically.\n4. Verification: Author comprehensive property-based/unit test suites and verify via terminal commands.\n\n",
  godot: "[SYSTEM COGNITIVE DIRECTIVE: GODOT 4.X GAME ENGINE MODE]\nTarget Godot 4.x using clean, statically-typed GDScript 2.0 or C#. Adhere to the Godot node lifecycle, composition over inheritance, signal decoupling, Custom Resources (@export var data: CustomResource), and caching node references with @onready. Avoid web/enterprise frameworks and adhere to game loop performance.\n\n",
  "godot-mobile": "[SYSTEM COGNITIVE DIRECTIVE: GODOT 4.X MOBILE OPTIMIZATION MODE]\nTarget lightweight mobile rendering (gl_compatibility / mobile). Optimize for low draw calls, zero allocations in _process/_physics_process, object pooling, and battery efficiency. Implement touch controls (InputEventScreenTouch), virtual joysticks, responsive UI anchors, and safe area handling (DisplayServer.get_display_safe_area()).\n\n",
  "godot-desktop": "[SYSTEM COGNITIVE DIRECTIVE: GODOT 4.X DESKTOP OPTIMIZATION MODE]\nTarget high-fidelity desktop rendering (Forward+ / Mobile). Support windowing modes (exclusive/borderless fullscreen, VSync, ultrawide). Provide simultaneous Keyboard/Mouse and Gamepad input mapping with runtime rebinding. Ensure save data and settings persistence via ConfigFile to user://.\n\n"
};

export const EFFORT_MAP = {
  fast: "low",
  medium: "medium",
  slow: "high",
  spec: "high",
  superdeep: "high"
};

export function callAstra({
  prompt,
  sessionId,
  mode = "medium",
  model,
  effort,
  outputFormat = "json",
  cwd = process.cwd(),
  autoApprove = true,
  extraFlags = [],
}) {
  return new Promise((resolve, reject) => {
    const agyBin = resolveAgyBin();
    const args = [];
    
    if (autoApprove) args.push("--dangerously-skip-permissions");
    if (sessionId) args.push("--conversation", sessionId);
    if (model) args.push("--model", model);
    if (outputFormat) args.push("--output-format", outputFormat);
    
    const resolvedEffort = effort || (mode ? EFFORT_MAP[mode] : null);
    if (resolvedEffort) args.push("--effort", resolvedEffort);
    
    if (extraFlags && extraFlags.length > 0) args.push(...extraFlags);

    const directive = mode && COGNITIVE_DIRECTIVES[mode] ? COGNITIVE_DIRECTIVES[mode] : "";
    const formattedPrompt = `${directive}${prompt}`;
    args.push("--print", formattedPrompt);

    const child = spawn(agyBin, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });

    child.on("close", (code) => {
      if (outputFormat === "json") {
        try {
          resolve(JSON.parse(stdout));
        } catch {
          resolve({ raw_output: stdout, stderr, exit_code: code });
        }
      } else {
        resolve({ output: stdout, stderr, exit_code: code });
      }
    });

    child.on("error", (err) => reject(err));
  });
}

export default callAstra;
