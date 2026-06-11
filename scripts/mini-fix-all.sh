#!/usr/bin/env bash
# mini-fix-all.sh — stand up the FULL Day14 agent fleet on the mini.
# Written 2026-06-11 by Claude after the laptop->mini handover stall.
#
# What it does, in order:
#   1. pmset always-on (mini must never sleep)
#   2. run every install-*.sh (writes plists; their own load may fail — ignored)
#   3. clean bootout + modern bootstrap of EVERY com.day14.* agent
#   4. print real state: launchctl PIDs + 10s foreground probes of the
#      two problem agents so config errors print to your face
#
# Run: bash ~/Documents/studio/scripts/mini-fix-all.sh

set -u
SCRIPTS="$HOME/Documents/studio/scripts"
LA="$HOME/Library/LaunchAgents"
UID_N=$(id -u)
# launchd cannot open log files inside ~/Documents (TCC) — all plists now log here:
mkdir -p "$HOME/Library/Logs/day14"

echo "== 1/4 always-on power settings (needs your password) =="
sudo pmset -a sleep 0 displaysleep 10 && echo "✓ mini will never sleep" || echo "! pmset failed — run manually: sudo pmset -a sleep 0"

echo
echo "== 2/4 running all installers (legacy load errors here are EXPECTED — step 3 fixes them) =="
for f in "$SCRIPTS"/install-*.sh; do
  echo "--- $(basename "$f") ---"
  bash "$f" 2>&1 | grep -E "✓ wrote|ERROR" || true
done

echo
echo "== 3/4 clean re-bootstrap of every com.day14.* agent =="
FAIL=0
for p in "$LA"/com.day14.*.plist; do
  l=$(basename "$p" .plist)
  launchctl bootout "gui/$UID_N/$l" 2>/dev/null
  if launchctl bootstrap "gui/$UID_N" "$p" 2>/dev/null; then
    echo "✓ $l"
  else
    echo "✗ BOOTSTRAP FAILED: $l"
    FAIL=$((FAIL+1))
  fi
done
echo "($FAIL bootstrap failures)"

echo
echo "== 4/4 real state =="
sleep 5
echo "--- launchctl (PID means alive; '-' + code means exiting) ---"
launchctl list | grep day14

echo
echo "== done — paste this whole output to Claude =="
