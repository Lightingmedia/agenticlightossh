#!/usr/bin/env bash
# LightOS Baseline Sidecar — one-command install.
# No root, no vendor account, works on any machine with python3 and curl.
#
#   curl -fsSL <published-url>/install.sh | bash
#
# Installs into ~/.lightos/bin (user-writable, no sudo) and runs a 60s
# baseline immediately. Set LIGHTOS_BASELINE_SECONDS to change the window.
set -euo pipefail

INSTALL_DIR="${LIGHTOS_HOME:-$HOME/.lightos}/bin"
TOOL_URL="${LIGHTOS_BASELINE_URL:-https://agentic.lightos.sh/sidecar/lightos-baseline.py}"
SECONDS_WINDOW="${LIGHTOS_BASELINE_SECONDS:-60}"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required but not found. Install python3 (no root needed via your distro's user packages) and retry." >&2
  exit 1
fi

mkdir -p "$INSTALL_DIR"
echo "Downloading LightOS baseline sidecar to $INSTALL_DIR ..."
curl -fsSL "$TOOL_URL" -o "$INSTALL_DIR/lightos-baseline"
chmod +x "$INSTALL_DIR/lightos-baseline"

echo "Running a ${SECONDS_WINDOW}s baseline (read-only; nothing is installed or sent anywhere) ..."
python3 "$INSTALL_DIR/lightos-baseline" --seconds "$SECONDS_WINDOW" --json "$INSTALL_DIR/last-baseline.json"

echo
echo "Done. Re-run any time with:  python3 $INSTALL_DIR/lightos-baseline"
