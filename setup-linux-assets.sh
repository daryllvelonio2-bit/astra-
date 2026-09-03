#!/usr/bin/env bash
set -e

ASSETS_DIR="android/app/src/main/assets/linux"
mkdir -p "$ASSETS_DIR/aarch64" "$ASSETS_DIR/x86_64"

echo "=== Downloading Alpine Linux Mini RootFS (v3.21) ==="
curl -fSL "https://dl-cdn.alpinelinux.org/alpine/v3.21/releases/aarch64/alpine-minirootfs-3.21.0-aarch64.tar.gz" \
  -o "$ASSETS_DIR/aarch64/alpine-rootfs.tar.gz"
curl -fSL "https://dl-cdn.alpinelinux.org/alpine/v3.21/releases/x86_64/alpine-minirootfs-3.21.0-x86_64.tar.gz" \
  -o "$ASSETS_DIR/x86_64/alpine-rootfs.tar.gz"

echo "=== Downloading Static PRoot Binaries ==="
curl -fSL "https://raw.githubusercontent.com/proot-me/proot-static-build/master/static/proot-arm64" \
  -o "$ASSETS_DIR/aarch64/proot"
chmod +x "$ASSETS_DIR/aarch64/proot"

curl -fSL "https://raw.githubusercontent.com/proot-me/proot-static-build/master/static/proot-x86_64" \
  -o "$ASSETS_DIR/x86_64/proot"
chmod +x "$ASSETS_DIR/x86_64/proot"

echo "=== Linux Assets Provisioned Successfully ==="
ls -la "$ASSETS_DIR/aarch64"
ls -la "$ASSETS_DIR/x86_64"
