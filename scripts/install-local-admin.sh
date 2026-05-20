#!/usr/bin/env bash
# install-local-admin.sh
# Runs the Day14 admin as an always-on local service on the Mac, so the
# realty dashboard (and any other write actions) work directly — no Telegram.
# Auto-starts at login, self-restarts on crash. Idempotent.
#
#   Local admin:  http://localhost:3000/admin
#   Realty board: http://localhost:3000/admin/realty

set -euo pipefail

STUDIO="$HOME/Documents/studio"
NODE_BIN="$(which node || true)"
NPM_BIN="$(which npm || true)"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_PATH="$LAUNCH_AGENTS_DIR/com.day14.local-admin.plist"
LOG_DIR="$HOME/Documents/businesses/_shared/poller"

# ---- preflight ----
if [ ! -d "$STUDIO" ]; then
  echo "ERROR: studio repo not found at $STUDIO"
  exit 1
fi
if [ -z "$NODE_BIN" ] || [ -z "$NPM_BIN" ]; then
  echo "ERROR: node / npm not in PATH. Install via 'brew install node@20' first."
  exit 1
fi
if [ ! -d "$STUDIO/node_modules" ]; then
  echo "· node_modules missing — installing dependencies (one-time)…"
  (cd "$STUDIO" && "$NPM_BIN" install)
fi
if [ ! -f "$STUDIO/.env.local" ]; then
  echo "ERROR: $STUDIO/.env.local missing — the admin needs ADMIN_PASSWORD set there."
  exit 1
fi

NODE_DIR="$(dirname "$NODE_BIN")"
mkdir -p "$LAUNCH_AGENTS_DIR"
mkdir -p "$LOG_DIR"

# ---- write the plist ----
cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.day14.local-admin</string>

    <key>ProgramArguments</key>
    <array>
        <string>$NPM_BIN</string>
        <string>run</string>
        <string>dev</string>
    </array>

    <key>WorkingDirectory</key>
    <string>$STUDIO</string>

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
    <integer>15</integer>

    <key>StandardOutPath</key>
    <string>$LOG_DIR/local-admin.stdout.log</string>

    <key>StandardErrorPath</key>
    <string>$LOG_DIR/local-admin.stderr.log</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>$NODE_DIR:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
        <key>NODE_ENV</key>
        <string>development</string>
    </dict>
</dict>
</plist>
EOF

echo "✓ wrote $PLIST_PATH"

# ---- load / reload ----
if launchctl list | grep -q "com.day14.local-admin"; then
  echo "· already loaded — unloading first"
  launchctl unload "$PLIST_PATH" 2>/dev/null || true
fi

launchctl load "$PLIST_PATH"
echo "✓ loaded launch agent"

# ---- verify (next dev takes a few seconds to come up) ----
echo "· waiting for the dev server to start…"
sleep 8
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/admin/login" | grep -qE "200|307|308"; then
  echo "✓ local admin is up"
else
  echo "· not answering yet — first compile can take ~30s. Check the log if it stays down:"
  echo "    tail -f $LOG_DIR/local-admin.stderr.log"
fi

echo
echo "Local admin:   http://localhost:3000/admin"
echo "Realty board:  http://localhost:3000/admin/realty"
echo
echo "To stop:    launchctl unload $PLIST_PATH"
echo "To restart: launchctl kickstart -k gui/\$(id -u)/com.day14.local-admin"
