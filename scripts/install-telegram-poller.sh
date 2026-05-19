#!/usr/bin/env bash
# install-telegram-poller.sh
# Installs the Telegram poller as a macOS LaunchAgent so it auto-starts at login
# and self-restarts on crash. Idempotent.

set -euo pipefail

POLLER_SCRIPT="$HOME/Documents/studio/scripts/telegram-poller.mjs"
NODE_BIN="$(which node)"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_PATH="$LAUNCH_AGENTS_DIR/com.day14.telegram-poller.plist"
LOG_DIR="$HOME/Documents/businesses/_shared/telegram"

# ---- preflight ----
if [ ! -f "$POLLER_SCRIPT" ]; then
  echo "ERROR: poller script not found at $POLLER_SCRIPT"
  exit 1
fi

if [ -z "$NODE_BIN" ]; then
  echo "ERROR: node not in PATH. Install via 'brew install node@20' first."
  exit 1
fi

if [ ! -f "$HOME/Documents/studio/.env.local" ]; then
  echo "ERROR: ~/Documents/studio/.env.local missing."
  echo "Create it from .env.local.example and add TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID."
  exit 1
fi

mkdir -p "$LAUNCH_AGENTS_DIR"
mkdir -p "$LOG_DIR"

# ---- write the plist ----
cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.day14.telegram-poller</string>

    <key>ProgramArguments</key>
    <array>
        <string>$NODE_BIN</string>
        <string>$POLLER_SCRIPT</string>
    </array>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
        <key>Crashed</key>
        <true/>
    </dict>

    <key>ThrottleInterval</key>
    <integer>10</integer>

    <key>StandardOutPath</key>
    <string>$LOG_DIR/poller.stdout.log</string>

    <key>StandardErrorPath</key>
    <string>$LOG_DIR/poller.stderr.log</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
    </dict>
</dict>
</plist>
EOF

echo "✓ wrote $PLIST_PATH"

# ---- load / reload ----
if launchctl list | grep -q "com.day14.telegram-poller"; then
  echo "· already loaded — unloading first"
  launchctl unload "$PLIST_PATH" 2>/dev/null || true
fi

launchctl load "$PLIST_PATH"
echo "✓ loaded launch agent"

# ---- verify ----
sleep 2
if launchctl list | grep -q "com.day14.telegram-poller"; then
  echo "✓ poller running"
  echo
  echo "Logs:"
  echo "  $LOG_DIR/poller.stdout.log"
  echo "  $LOG_DIR/poller.stderr.log"
  echo
  echo "To stop:    launchctl unload $PLIST_PATH"
  echo "To restart: launchctl unload $PLIST_PATH && launchctl load $PLIST_PATH"
else
  echo "✗ poller did NOT start. Check $LOG_DIR/poller.stderr.log"
  exit 1
fi
