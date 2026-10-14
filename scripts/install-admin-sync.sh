#!/usr/bin/env bash
# install-admin-sync.sh
# RETIRED. Unloads the 15-minute empire-state LaunchAgent.
# The agent is what produced `sync: empire state` commits. It does not live
# in GitHub Actions — it runs on the Mac that has ~/Documents/studio checked out.
# scripts/sync-empire-state.mjs also refuses --push, so a still-loaded agent
# that picks up this copy of the script will not commit.

set -euo pipefail

PLIST="$HOME/Library/LaunchAgents/com.day14.admin-sync.plist"

if launchctl list 2>/dev/null | grep -q "com.day14.admin-sync"; then
  launchctl unload "$PLIST" 2>/dev/null || true
  echo "unloaded com.day14.admin-sync"
else
  echo "com.day14.admin-sync is not loaded on this machine"
fi

echo "Empire-state git push is disabled. Do not reinstall this agent onto a working branch."
