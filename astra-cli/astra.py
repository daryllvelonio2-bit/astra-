"""
Astra CLI Python Integration Module
Enables programmatic invocation of Astra CLI powered by Google Antigravity (agy) base binary.
"""

import subprocess
import json
import os
import shutil
from pathlib import Path
from typing import Optional, Dict, Any, List

def resolve_agy_bin() -> str:
    script_dir = Path(__file__).parent
    local_agy = script_dir / "cli-binary" / "agy"
    if local_agy.exists() and os.access(local_agy, os.X_OK):
        return str(local_agy)
    sys_agy = shutil.which("agy")
    if sys_agy:
        return sys_agy
    home_agy = Path.home() / ".local" / "bin" / "agy"
    if home_agy.exists():
        return str(home_agy)
    return "agy"

COGNITIVE_DIRECTIVES = {
    "fast": "[SYSTEM COGNITIVE DIRECTIVE: FAST MODE]\nPrioritize immediate response speed. Be concise, direct, and zero-filler. Provide production-ready code with minimal surrounding fluff.\n\n",
    "medium": "[SYSTEM COGNITIVE DIRECTIVE: MEDIUM MODE]\nProvide clean, idiomatic, well-structured code with necessary context and standard code explanations.\n\n",
    "slow": "[SYSTEM COGNITIVE DIRECTIVE: SLOW MODE (DEEP REASONING & VERIFICATION)]\nEngage deep analytical reasoning. Write complete, robust implementations with comprehensive docstrings, explicit edge-case handling, and thorough unit tests. Run shell/test commands where applicable to verify.\n\n",
    "spec": "[SYSTEM COGNITIVE DIRECTIVE: 10X SUPER DEEP - KIRO SPEC-DRIVEN DEVELOPMENT (SDD)]\nExecute with the Kiro Spec-Driven Planning methodology:\n1. Requirements Analysis: Define functional and non-functional requirements with strict acceptance criteria.\n2. Architecture & Design: Detail architecture, data structures, invariants, and failure recovery modes.\n3. Task Decomposition: Create a structured, step-by-step task list and execute each systematically.\n4. Verification: Author comprehensive property-based/unit test suites and verify via terminal commands.\n\n",
    "superdeep": "[SYSTEM COGNITIVE DIRECTIVE: 10X SUPER DEEP - KIRO SPEC-DRIVEN DEVELOPMENT (SDD)]\nExecute with the Kiro Spec-Driven Planning methodology:\n1. Requirements Analysis: Define functional and non-functional requirements with strict acceptance criteria.\n2. Architecture & Design: Detail architecture, data structures, invariants, and failure recovery modes.\n3. Task Decomposition: Create a structured, step-by-step task list and execute each systematically.\n4. Verification: Author comprehensive property-based/unit test suites and verify via terminal commands.\n\n",
    "godot": "[SYSTEM COGNITIVE DIRECTIVE: GODOT 4.X GAME ENGINE MODE]\nTarget Godot 4.x using clean, statically-typed GDScript 2.0 or C#. Adhere to the Godot node lifecycle, composition over inheritance, signal decoupling, Custom Resources (@export var data: CustomResource), and caching node references with @onready. Avoid web/enterprise frameworks and adhere to game loop performance.\n\n",
    "godot-mobile": "[SYSTEM COGNITIVE DIRECTIVE: GODOT 4.X MOBILE OPTIMIZATION MODE]\nTarget lightweight mobile rendering (gl_compatibility / mobile). Optimize for low draw calls, zero allocations in _process/_physics_process, object pooling, and battery efficiency. Implement touch controls (InputEventScreenTouch), virtual joysticks, responsive UI anchors, and safe area handling (DisplayServer.get_display_safe_area()).\n\n",
    "godot-desktop": "[SYSTEM COGNITIVE DIRECTIVE: GODOT 4.X DESKTOP OPTIMIZATION MODE]\nTarget high-fidelity desktop rendering (Forward+ / Mobile). Support windowing modes (exclusive/borderless fullscreen, VSync, ultrawide). Provide simultaneous Keyboard/Mouse and Gamepad input mapping with runtime rebinding. Ensure save data and settings persistence via ConfigFile to user://.\n\n"
}

EFFORT_MAP = {
    "fast": "low",
    "medium": "medium",
    "slow": "high",
    "spec": "high",
    "superdeep": "high"
}

def call_astra(
    prompt: str,
    session_id: Optional[str] = None,
    mode: Optional[str] = "medium",
    model: Optional[str] = None,
    output_format: str = "json",
    cwd: Optional[str] = None,
    auto_approve: bool = True,
    effort: Optional[str] = None,
    extra_flags: Optional[List[str]] = None
) -> Optional[Dict[str, Any]]:
    """
    Programmatic call to Astra CLI powered by Antigravity (agy).
    """
    agy_bin = resolve_agy_bin()
    cmd = [agy_bin]
    
    if auto_approve:
        cmd.append("--dangerously-skip-permissions")
    if session_id:
        cmd.extend(["--conversation", session_id])
    if model:
        cmd.extend(["--model", model])
    if output_format:
        cmd.extend(["--output-format", output_format])
        
    resolved_effort = effort or (EFFORT_MAP.get(mode) if mode else None)
    if resolved_effort:
        cmd.extend(["--effort", resolved_effort])
        
    if extra_flags:
        cmd.extend(extra_flags)
        
    directive = COGNITIVE_DIRECTIVES.get(mode, "") if mode else ""
    final_prompt = f"{directive}{prompt}"
    cmd.extend(["--print", final_prompt])
    
    res = subprocess.run(cmd, capture_output=True, text=True, cwd=cwd)
    
    if output_format == "json":
        try:
            return json.loads(res.stdout)
        except Exception:
            return {"raw_output": res.stdout, "stderr": res.stderr, "exit_code": res.returncode}
    return {"output": res.stdout, "stderr": res.stderr, "exit_code": res.returncode}

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        prompt_arg = " ".join(sys.argv[1:])
        result = call_astra(prompt_arg, output_format="text")
        if result and "output" in result:
            print(result["output"])
        elif result and "raw_output" in result:
            print(result["raw_output"])
