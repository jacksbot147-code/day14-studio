#!/usr/bin/env bash
# install-hot-flash-co-agents.sh
# Wire all Hot Flash Co automation as macOS LaunchAgents:
#   - hot-flash-co-daily-engine     → runs daily at 9am ET (1 new product draft)
#   - hot-flash-co-marketing-engine → runs daily at 11am ET (3 social drafts)
#   - hot-flash-co-orders-watcher   → runs continuously, polls hourly

set -euo pipefail

STUDIO="$HOME/Documents/studio"
SCRIPTS="$STUDIO/scripts"
NODE_BIN="$(which node)"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
LOG_DIR="$HOME/Documents/businesses/_shared/poller"

GREEN="\033[0;32m"
RESET="\033[0m"
ok() { printf "${GREEN}✓${RESET} %s\n" "$1"; }

if [ -z "$NODE_BIN" ]; then
  echo "ERROR: node not in PATH"
  exit 1
fi

mkdir -p "$LAUNCH_AGENTS_DIR" "$LOG_DIR"

# ----- Daily product engine — 9am ET -----
PLIST_DAILY="$LAUNCH_AGENTS_DIR/com.day14.hot-flash-co.daily-engine.plist"
cat > "$PLIST_DAILY" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.day14.hot-flash-co.daily-engine</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$SCRIPTS/hot-flash-co-daily-engine.mjs</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>9</integer>
    <key>Minute</key><integer>0</integer>
  </dict>
  <key>RunAtLoad</key><false/>
  <key>StandardOutPath</key>
  <string>$HOME/Library/Logs/day14/hot-flash-co-daily-engine.stdout.log</string>
  <key>StandardErrorPath</key>
  <string>$HOME/Library/Logs/day14/hot-flash-co-daily-engine.stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
  </dict>
</dict>
</plist>
EOF

# ----- Marketing engine — 11am ET -----
PLIST_MARKETING="$LAUNCH_AGENTS_DIR/com.day14.hot-flash-co.marketing-engine.plist"
cat > "$PLIST_MARKETING" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.day14.hot-flash-co.marketing-engine</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$SCRIPTS/hot-flash-co-marketing-engine.mjs</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>11</integer>
    <key>Minute</key><integer>0</integer>
  </dict>
  <key>RunAtLoad</key><false/>
  <key>StandardOutPath</key>
  <string>$HOME/Library/Logs/day14/hot-flash-co-marketing.stdout.log</string>
  <key>StandardErrorPath</key>
  <string>$HOME/Library/Logs/day14/hot-flash-co-marketing.stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
  </dict>
</dict>
</plist>
EOF

# ----- Orders watcher — continuous -----
PLIST_ORDERS="$LAUNCH_AGENTS_DIR/com.day14.hot-flash-co.orders-watcher.plist"
cat > "$PLIST_ORDERS" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.day14.hot-flash-co.orders-watcher</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$SCRIPTS/hot-flash-co-orders-watcher.mjs</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key><false/>
    <key>Crashed</key><true/>
  </dict>
  <key>ThrottleInterval</key><integer>60</integer>
  <key>StandardOutPath</key>
  <string>$HOME/Library/Logs/day14/hot-flash-co-orders-watcher.stdout.log</string>
  <key>StandardErrorPath</key>
  <string>$HOME/Library/Logs/day14/hot-flash-co-orders-watcher.stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
  </dict>
</dict>
</plist>
EOF

for PLIST in "$PLIST_DAILY" "$PLIST_MARKETING" "$PLIST_ORDERS"; do
  LABEL=$(basename "$PLIST" .plist)
  if launchctl list 2>/dev/null | grep -q "$LABEL"; then
    launchctl unload "$PLIST" 2>/dev/null || true
  fi
  launchctl load "$PLIST"
  ok "loaded $LABEL"
done

echo
echo "Schedule:"
echo "  • daily-engine     → every day at 9:00am local ($SCRIPTS/hot-flash-co-daily-engine.mjs)"
echo "  • marketing-engine → every day at 11:00am local ($SCRIPTS/hot-flash-co-marketing-engine.mjs)"
echo "  • orders-watcher   → continuous, hourly polls + heartbeat"
echo
echo "Logs: $LOG_DIR/hot-flash-co-*.log"
echo "Audit: $HOME/Documents/businesses/hot-flash-co/audit-log.jsonl"
