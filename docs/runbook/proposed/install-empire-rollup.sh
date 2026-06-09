#!/usr/bin/env bash
# install-empire-rollup.sh  — PROPOSED (innovation-t8)
#
# Installs empire-state-daily-rollup.mjs as a LaunchAgent that runs once daily
# at 6:00 AM local time and folds state/auto into a single rollup commit on main.
#
# !! NOT RUN AUTOMATICALLY BY THE OVERNIGHT AGENT. This requires Jack's review
#    because the rollup job is the ONE thing allowed to push to main. Read
#    docs/runbook/EMPIRE-STATE-SYNC.md first, then run this by hand once you've
#    promoted scripts/empire-state-daily-rollup.mjs from the proposed/ folder.
#
# Mirrors the conventions in scripts/install-admin-sync.sh.

set -euo pipefail
NODE_BIN="$(which node)"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
LOG_DIR="$HOME/Documents/businesses/_shared/poller"
STUDIO="$HOME/Documents/studio"
ROLLUP="$STUDIO/scripts/empire-state-daily-rollup.mjs"
mkdir -p "$LAUNCH_AGENTS_DIR" "$LOG_DIR"

if [ ! -f "$ROLLUP" ]; then
  echo "ERROR: $ROLLUP not found."
  echo "Promote it first:  cp docs/runbook/proposed/empire-state-daily-rollup.mjs scripts/"
  exit 1
fi

PLIST="$LAUNCH_AGENTS_DIR/com.day14.empire-rollup.plist"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.day14.empire-rollup</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$ROLLUP</string>
    <string>--run</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>6</integer>
    <key>Minute</key><integer>0</integer>
  </dict>
  <key>StandardOutPath</key><string>$LOG_DIR/empire-rollup.stdout.log</string>
  <key>StandardErrorPath</key><string>$LOG_DIR/empire-rollup.stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
    <key>HOME</key><string>$HOME</string>
  </dict>
  <key>WorkingDirectory</key><string>$STUDIO</string>
</dict>
</plist>
EOF

if launchctl list 2>/dev/null | grep -q "com.day14.empire-rollup"; then
  launchctl unload "$PLIST" 2>/dev/null || true
fi
launchctl load "$PLIST"
echo "✓ loaded com.day14.empire-rollup (runs daily at 6:00 AM local)"
echo
echo "Dry-run any time:  cd ~/Documents/studio && node scripts/empire-state-daily-rollup.mjs"
echo "Force a rollup now: cd ~/Documents/studio && node scripts/empire-state-daily-rollup.mjs --run"
