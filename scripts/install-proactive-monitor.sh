#!/usr/bin/env bash
# install-proactive-monitor.sh
# Install the proactive monitor as a macOS LaunchAgent.

set -euo pipefail

POLLER_SCRIPT="$HOME/Documents/studio/scripts/proactive-monitor.mjs"
NODE_BIN="$(which node)"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_PATH="$LAUNCH_AGENTS_DIR/com.day14.proactive-monitor.plist"
LOG_DIR="$HOME/Documents/businesses/_shared/poller"

if [ ! -f "$POLLER_SCRIPT" ]; then
  echo "ERROR: $POLLER_SCRIPT not found"
  exit 1
fi
if [ -z "$NODE_BIN" ]; then
  echo "ERROR: node not in PATH"
  exit 1
fi

mkdir -p "$LAUNCH_AGENTS_DIR" "$LOG_DIR"

cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.day14.proactive-monitor</string>
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
    <integer>30</integer>
    <key>StandardOutPath</key>
    <string>$HOME/Library/Logs/day14/proactive-monitor.stdout.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME/Library/Logs/day14/proactive-monitor.stderr.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
    </dict>
</dict>
</plist>
EOF

echo "✓ wrote $PLIST_PATH"

if launchctl list 2>/dev/null | grep -q "com.day14.proactive-monitor"; then
  launchctl unload "$PLIST_PATH" 2>/dev/null || true
fi
launchctl load "$PLIST_PATH"
echo "✓ loaded launch agent"
echo
echo "Logs: $LOG_DIR/proactive-monitor.{stdout,stderr,log}"
echo "State: $HOME/Documents/businesses/_shared/founder-ops/proactive-monitor-state.json"
