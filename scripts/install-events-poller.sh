#!/usr/bin/env bash
# install-events-poller.sh
# Installs the events-poller as a macOS LaunchAgent.
# Idempotent.

set -euo pipefail

POLLER_SCRIPT="$HOME/Documents/studio/scripts/events-poller.mjs"
NODE_BIN="$(which node)"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_PATH="$LAUNCH_AGENTS_DIR/com.day14.events-poller.plist"
LOG_DIR="$HOME/Documents/businesses/_shared/poller"

if [ ! -f "$POLLER_SCRIPT" ]; then
  echo "ERROR: $POLLER_SCRIPT not found"
  exit 1
fi
if [ -z "$NODE_BIN" ]; then
  echo "ERROR: node not in PATH"
  exit 1
fi
if [ ! -f "$HOME/Documents/studio/.env.local" ]; then
  echo "ERROR: .env.local missing"
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
    <string>com.day14.events-poller</string>
    <key>ProgramArguments</key>
    <array>
        <string>$NODE_BIN</string>
        <string>$POLLER_SCRIPT</string>
    </array>
    <key>RunAtLoad</key><true/>
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key><false/>
        <key>Crashed</key><true/>
    </dict>
    <key>ThrottleInterval</key>
    <integer>10</integer>
    <key>StandardOutPath</key>
    <string>$HOME/Library/Logs/day14/events-poller.stdout.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME/Library/Logs/day14/events-poller.stderr.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
    </dict>
</dict>
</plist>
EOF

echo "✓ wrote $PLIST_PATH"

if launchctl list | grep -q "com.day14.events-poller"; then
  echo "· unloading existing instance first"
  launchctl unload "$PLIST_PATH" 2>/dev/null || true
fi

launchctl load "$PLIST_PATH"
echo "✓ loaded launch agent"

sleep 2
if launchctl list | grep -q "com.day14.events-poller"; then
  echo "✓ poller running"
  echo
  echo "Logs:"
  echo "  $LOG_DIR/events-poller.stdout.log"
  echo "  $LOG_DIR/events-poller.stderr.log"
  echo
  echo "To stop:    launchctl unload $PLIST_PATH"
  echo "To restart: launchctl unload $PLIST_PATH && launchctl load $PLIST_PATH"
else
  echo "✗ poller did NOT start. Check $LOG_DIR/events-poller.stderr.log"
  exit 1
fi
