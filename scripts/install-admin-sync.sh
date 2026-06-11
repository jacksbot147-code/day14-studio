#!/usr/bin/env bash
# install-admin-sync.sh
# Wires sync-empire-state.mjs as a LaunchAgent that runs every 15 min and pushes to git.

set -euo pipefail
NODE_BIN="$(which node)"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
LOG_DIR="$HOME/Documents/businesses/_shared/poller"
STUDIO="$HOME/Documents/studio"
mkdir -p "$LAUNCH_AGENTS_DIR" "$LOG_DIR"

PLIST="$LAUNCH_AGENTS_DIR/com.day14.admin-sync.plist"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.day14.admin-sync</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$STUDIO/scripts/sync-empire-state.mjs</string>
    <string>--push</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>StartInterval</key><integer>900</integer>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/day14/admin-sync.stdout.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/day14/admin-sync.stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
    <key>HOME</key><string>$HOME</string>
  </dict>
  <key>WorkingDirectory</key><string>$STUDIO</string>
</dict>
</plist>
EOF

if launchctl list 2>/dev/null | grep -q "com.day14.admin-sync"; then
  launchctl unload "$PLIST" 2>/dev/null || true
fi
launchctl load "$PLIST"
echo "✓ loaded com.day14.admin-sync (runs every 15 min, auto-commits + pushes empire-state.json)"
echo
echo "Manual run: cd ~/Documents/studio && node scripts/sync-empire-state.mjs --push"
