#!/usr/bin/env bash
# install-lawn-care-gm.sh <tenant-slug>
# Installs the Lawn-Care GM agent as a macOS LaunchAgent that runs the whole
# cluster (pipeline / scheduling / CRM / portal) every 30 minutes. Idempotent.

set -euo pipefail

SLUG="${1:-}"
if [ -z "$SLUG" ]; then
  echo "Usage: install-lawn-care-gm.sh <tenant-slug>"
  exit 1
fi

GM_SCRIPT="$HOME/Documents/studio/scripts/verticals/lawn-care/gm-agent.mjs"
NODE_BIN="$(which node)"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
LABEL="com.day14.lawn-care-gm-$SLUG"
PLIST_PATH="$LAUNCH_AGENTS_DIR/$LABEL.plist"
LOG_DIR="$HOME/Documents/businesses/_shared/poller"

if [ ! -f "$GM_SCRIPT" ]; then
  echo "ERROR: $GM_SCRIPT not found"
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
    <string>$LABEL</string>
    <key>ProgramArguments</key>
    <array>
        <string>$NODE_BIN</string>
        <string>$GM_SCRIPT</string>
        <string>$SLUG</string>
    </array>
    <key>RunAtLoad</key><true/>
    <key>StartInterval</key>
    <integer>1800</integer>
    <key>ThrottleInterval</key>
    <integer>30</integer>
    <key>StandardOutPath</key>
    <string>$LOG_DIR/lawn-care-gm-$SLUG.stdout.log</string>
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/lawn-care-gm-$SLUG.stderr.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
    </dict>
</dict>
</plist>
EOF

echo "✓ wrote $PLIST_PATH"

if launchctl list | grep -q "$LABEL"; then
  echo "· unloading existing instance"
  launchctl unload "$PLIST_PATH" 2>/dev/null || true
fi

launchctl load "$PLIST_PATH"
echo "✓ loaded — Lawn-Care GM runs every 30 min for tenant: $SLUG"
