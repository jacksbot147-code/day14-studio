#!/usr/bin/env bash
# install-auto-todo.sh — copy + load the auto-todo LaunchAgent.
#
# Idempotent: safe to re-run after edits to the plist.
#
# What it does:
#   1. Ensures ~/Documents/studio/logs/ exists (the plist writes auto-todo.log there).
#   2. Copies com.day14.auto-todo.plist to ~/Library/LaunchAgents/.
#   3. Unloads any prior version, then loads the new one.
#   4. Prints `launchctl list | grep auto-todo` so you can see the PID + last-exit code.
#
# Usage:
#   bash ~/Documents/studio/scripts/launch-agents/install-auto-todo.sh

set -euo pipefail

LABEL="com.day14.auto-todo"
SRC="$HOME/Documents/studio/scripts/launch-agents/${LABEL}.plist"
DST="$HOME/Library/LaunchAgents/${LABEL}.plist"

if [ ! -f "$SRC" ]; then
  echo "✗ source plist not found: $SRC" >&2
  exit 1
fi

mkdir -p "$HOME/Documents/studio/logs"
mkdir -p "$HOME/Library/LaunchAgents"

cp "$SRC" "$DST"
echo "✓ copied $SRC -> $DST"

# launchctl unload is noisy when nothing is loaded — quiet the noise.
launchctl unload "$DST" 2>/dev/null || true
launchctl load "$DST"
echo "✓ loaded $LABEL"

echo
echo "Status:"
launchctl list | grep "$LABEL" || echo "  (not yet listed — check ~/Documents/studio/logs/auto-todo.log)"
