#!/usr/bin/env bash
# install-growth-watcher.sh
# Installs the growth-watcher as a macOS LaunchAgent.
# Idempotent.

set -euo pipefail

POLLER_SCRIPT="$HOME/Documents/studio/scripts/growth-watcher.mjs"
NODE_BIN="$(which node)"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_PATH="$LAUNCH_AGENTS_DIR/com.day14.growth-watcher.plist"
LOG_DIR="$HOME/Documents/businesses/_shared/poller"

if [ ! -f "$POLLER_SCRIPT" ]; then
  echo "ERROR: $POLLER_SCRIPT not found"
  exit 1
fi
if [ -z "$NODE_BIN" ]; then
  echo "ERROR: node not in PATH"
  exit 1
fi

mkdir -p "$HOME/Library/Logs/day14"
mkdir -p "$HOME/Library/Logs/day14" "$LAUNCH_AGENTS_DIR" "$LOG_DIR"

cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.day14.growth-watcher</string>
    <key>ProgramArguments</key>
    <array>
        <string>$NODE_BIN</string>
        <string>$POLLER_SCRIPT</string>
    </array>
    <key>RunAtLoad</key><true/>
    <key>StartInterval</key>
    <integer>900</integer>
    <key>ThrottleInterval</key>
    <integer>30</integer>
    <key>StandardOutPath</key>
    <string>$HOME/Library/Logs/day14/growth-watcher.stdout.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME/Library/Logs/day14/growth-watcher.stderr.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
    </dict>
</dict>
</plist>
EOF

echo "✓ wrote $PLIST_PATH"

if launchctl list | grep -q "com.day14.growth-watcher"; then
  echo "· unloading existing instance"
  launchctl unload "$PLIST_PATH" 2>/dev/null || true
fi

launchctl load "$PLIST_PATH"
echo "✓ loaded launch agent"

sleep 2
if launchctl list | grep -q "com.day14.growth-watcher"; then
  echo "✓ growth-watcher running"
  echo
  echo "Logs:"
  echo "  $LOG_DIR/growth-watcher.stdout.log"
  echo "  $LOG_DIR/growth-watcher.stderr.log"
  echo
  echo "To stop:    launchctl unload $PLIST_PATH"
  echo "To restart: launchctl unload $PLIST_PATH && launchctl load $PLIST_PATH"
else
  echo "✗ growth-watcher did NOT start. Check $LOG_DIR/growth-watcher.stderr.log"
  exit 1
fi
