#!/usr/bin/env bash
set -e

PROJECT_DIR="/home/janelle/Documents/projects/ai-coder"
TOOLS_DIR="/home/janelle/.local/share/android-build-tools"
JDK_DIR="$TOOLS_DIR/jdk17"
SDK_DIR="/home/janelle/Android/sdk"

export JAVA_HOME="$JDK_DIR"
export ANDROID_HOME="$SDK_DIR"
export ANDROID_SDK_ROOT="$SDK_DIR"
export PATH="$JAVA_HOME/bin:$SDK_DIR/cmdline-tools/latest/bin:$SDK_DIR/platform-tools:$PATH"

echo "=== Building Debug APK (ARM64) ==="
cd "$PROJECT_DIR/android"
chmod +x gradlew
./gradlew assembleDebug --no-daemon -Dorg.gradle.workers.max=1

echo "=== Build Complete! ==="
ls -lh app/build/outputs/apk/debug/app-debug.apk

echo "=== Installing Debug APK to connected device ==="
adb reverse tcp:8081 tcp:8081
adb install -r app/build/outputs/apk/debug/app-debug.apk

echo "=== Launching Debug App ==="
adb shell am start -n com.janelle.aicoder/.MainActivity

echo "=== Done! ==="
