<#
.SYNOPSIS
Astra CLI - Autonomous Agentic AI Coding Engine Runner for PowerShell
Base Engine: Google Antigravity CLI (agy)
#>

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Resolve agy binary
$AgyBin = $null
$LocalBinWin = Join-Path $ScriptDir "cli-binary\agy.exe"
$LocalBinLinux = Join-Path $ScriptDir "cli-binary\agy"

if (Test-Path $LocalBinWin) {
    $AgyBin = $LocalBinWin
} elseif (Test-Path $LocalBinLinux) {
    $AgyBin = $LocalBinLinux
} elseif (Get-Command agy -ErrorAction SilentlyContinue) {
    $AgyBin = "agy"
} else {
    $HomeAgy = Join-Path $env:USERPROFILE ".local\bin\agy.exe"
    if (Test-Path $HomeAgy) {
        $AgyBin = $HomeAgy
    } else {
        $AgyBin = "agy"
    }
}

$AgyArgs = @()
$Prompt = ""
$PromptInteractive = ""
$Effort = ""
$CognitiveMode = ""
$GodotMode = ""

$i = 0
while ($i -lt $args.Count) {
    $arg = $args[$i]
    switch -Regex ($arg) {
        '^(-p|--prompt|--print)$' {
            $Prompt = $args[$i + 1]
            $i++
        }
        '^(-i|--prompt-interactive)$' {
            $PromptInteractive = $args[$i + 1]
            $i++
        }
        '^(-y|--yolo|--dangerously-skip-permissions)$' {
            $AgyArgs += "--dangerously-skip-permissions"
        }
        '^(--session-id|--conversation)$' {
            $AgyArgs += "--conversation"
            $AgyArgs += $args[$i + 1]
            $i++
        }
        '^--effort$' {
            $Effort = $args[$i + 1]
            $i++
        }
        '^--fast$' {
            $CognitiveMode = "fast"
        }
        '^--medium$' {
            $CognitiveMode = "medium"
        }
        '^--slow$' {
            $CognitiveMode = "slow"
        }
        '^(--superdeep|--spec|--kiro)$' {
            $CognitiveMode = "spec"
        }
        '^--godot$' {
            $GodotMode = "godot"
        }
        '^--godot-mobile$' {
            $GodotMode = "godot-mobile"
        }
        '^--godot-desktop$' {
            $GodotMode = "godot-desktop"
        }
        '^--skip-trust$' {
            # Ignored
        }
        Default {
            $AgyArgs += $arg
        }
    }
    $i++
}

$TargetPrompt = if ($Prompt) { $Prompt } else { $PromptInteractive }

if ($TargetPrompt) {
    if (-not $CognitiveMode) {
        if ($TargetPrompt -match '^\[fast\]') { $CognitiveMode = "fast"; $TargetPrompt = $TargetPrompt -replace '^\[fast\]\s*', '' }
        elseif ($TargetPrompt -match '^\[medium\]') { $CognitiveMode = "medium"; $TargetPrompt = $TargetPrompt -replace '^\[medium\]\s*', '' }
        elseif ($TargetPrompt -match '^\[slow\]') { $CognitiveMode = "slow"; $TargetPrompt = $TargetPrompt -replace '^\[slow\]\s*', '' }
        elseif ($TargetPrompt -match '^\[(super deep|superdeep|spec|kiro)\]') { $CognitiveMode = "spec"; $TargetPrompt = $TargetPrompt -replace '^\[(super deep|superdeep|spec|kiro)\]\s*', '' }
    }

    if (-not $GodotMode) {
        if ($TargetPrompt -match '^\[godot\]') { $GodotMode = "godot"; $TargetPrompt = $TargetPrompt -replace '^\[godot\]\s*', '' }
        elseif ($TargetPrompt -match '^\[godot-mobile\]') { $GodotMode = "godot-mobile"; $TargetPrompt = $TargetPrompt -replace '^\[godot-mobile\]\s*', '' }
        elseif ($TargetPrompt -match '^\[godot-desktop\]') { $GodotMode = "godot-desktop"; $TargetPrompt = $TargetPrompt -replace '^\[godot-desktop\]\s*', '' }
    }

    $Injection = ""
    switch ($CognitiveMode) {
        "fast" {
            if (-not $Effort) { $Effort = "low" }
            $Injection += "[SYSTEM COGNITIVE DIRECTIVE: FAST MODE]`nPrioritize immediate response speed. Be concise, direct, and zero-filler. Provide production-ready code with minimal surrounding fluff.`n`n"
        }
        "medium" {
            if (-not $Effort) { $Effort = "medium" }
            $Injection += "[SYSTEM COGNITIVE DIRECTIVE: MEDIUM MODE]`nProvide clean, idiomatic, well-structured code with necessary context and standard code explanations.`n`n"
        }
        "slow" {
            if (-not $Effort) { $Effort = "high" }
            $Injection += "[SYSTEM COGNITIVE DIRECTIVE: SLOW MODE (DEEP REASONING & VERIFICATION)]`nEngage deep analytical reasoning. Write complete, robust implementations with comprehensive docstrings, explicit edge-case handling, and thorough unit tests. Run shell/test commands where applicable to verify.`n`n"
        }
        "spec" {
            if (-not $Effort) { $Effort = "high" }
            $Injection += "[SYSTEM COGNITIVE DIRECTIVE: 10X SUPER DEEP - KIRO SPEC-DRIVEN DEVELOPMENT (SDD)]`nExecute with the Kiro Spec-Driven Planning methodology:`n1. Requirements Analysis: Define functional and non-functional requirements with strict acceptance criteria.`n2. Architecture & Design: Detail architecture, data structures, invariants, and failure recovery modes.`n3. Task Decomposition: Create a structured, step-by-step task list and execute each systematically.`n4. Verification: Author comprehensive property-based/unit test suites and verify via terminal commands.`n`n"
        }
    }

    switch ($GodotMode) {
        "godot" {
            $Injection += "[SYSTEM COGNITIVE DIRECTIVE: GODOT 4.X GAME ENGINE MODE]`nTarget Godot 4.x using clean, statically-typed GDScript 2.0 or C#. Adhere to the Godot node lifecycle, composition over inheritance, signal decoupling, Custom Resources (@export var data: CustomResource), and caching node references with @onready. Avoid web/enterprise frameworks and adhere to game loop performance.`n`n"
        }
        "godot-mobile" {
            $Injection += "[SYSTEM COGNITIVE DIRECTIVE: GODOT 4.X MOBILE OPTIMIZATION MODE]`nTarget lightweight mobile rendering (gl_compatibility / mobile). Optimize for low draw calls, zero allocations in _process/_physics_process, object pooling, and battery efficiency. Implement touch controls (InputEventScreenTouch), virtual joysticks, responsive UI anchors, and safe area handling (DisplayServer.get_display_safe_area()).`n`n"
        }
        "godot-desktop" {
            $Injection += "[SYSTEM COGNITIVE DIRECTIVE: GODOT 4.X DESKTOP OPTIMIZATION MODE]`nTarget high-fidelity desktop rendering (Forward+ / Mobile). Support windowing modes (exclusive/borderless fullscreen, VSync, ultrawide). Provide simultaneous Keyboard/Mouse and Gamepad input mapping with runtime rebinding. Ensure save data and settings persistence via ConfigFile to user://.`n`n"
        }
    }

    $FinalPrompt = "$Injection$TargetPrompt"
    if ($Effort) {
        $AgyArgs += "--effort"
        $AgyArgs += $Effort
    }
    if ($Prompt) {
        $AgyArgs += "--print"
        $AgyArgs += $FinalPrompt
    } elseif ($PromptInteractive) {
        $AgyArgs += "-i"
        $AgyArgs += $FinalPrompt
    }
}

& $AgyBin @AgyArgs
