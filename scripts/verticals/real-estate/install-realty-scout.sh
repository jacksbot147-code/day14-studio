#!/usr/bin/env bash
# install-realty-scout.sh <segment-slug>
# Installs the Real-Estate Deal Scout as a macOS LaunchAgent that runs the
# funnel (intake -> enrichment -> evaluation) every hour. Idempotent.

set -euo pipefail

SLUG="${1:-day14-realty}"
SCOUT="$HOME/Documents/studio/scripts/verticals/real-estate/scout-agent.mjs"
NODE_BIN="$(which node)"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
LABEL="com.day14.realty-scout-$SLUG"
PLIST_PATH="$LAUNCH_AGENTS_DIR/$LABEL.plist"
LOG_DIR="$HOME/Documents/businesses/_shared/poller"

if [ ! -f "$SCOUT" ]; then echo "ERROR: $SCOUT not found"; exit 1; fi
if [ -z "$NODE_BIN" ]; then echo "ERROR: node not in PATH"; exit 1; fi

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
        <string>$SCOUT</string>
        <string>$SLUG</string>
    </array>
    <key>RunAtLoad</key><true/>
    <key>StartInterval</key>
    <integer>3600</integer>
    <key>ThrottleInterval</key>
    <integer>30</integer>
    <key>StandardOutPath</key>
    <string>$LOG_DIR/realty-scout-$SLUG.stdout.log</string>
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/realty-scout-$SLUG.stderr.log</string>
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
echo "✓ loaded — Real-Estate Scout runs hourly for segment: $SLUG"
