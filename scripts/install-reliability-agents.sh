#!/usr/bin/env bash
# install-reliability-agents.sh
# Installs the two reliability agents from the 2026-07-09 audit as
# macOS LaunchAgents:
#   com.day14.cadence-sentinel  — 30-min output-freshness watchdog
#   com.day14.provider-health   — hourly LLM-provider canary
# Idempotent. Logs go to ~/Library/Logs/day14/ (launchd cannot open log
# files inside ~/Documents — TCC; exit 78 otherwise).

set -euo pipefail

STUDIO="$HOME/Documents/studio"
NODE_BIN="$(which node)"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
LOG_DIR="$HOME/Library/Logs/day14"

if [ -z "$NODE_BIN" ]; then
  echo "ERROR: node not in PATH"
  exit 1
fi
mkdir -p "$LOG_DIR" "$LAUNCH_AGENTS_DIR"

install_agent() {
  local label="$1" script="$2" interval="$3"
  local plist="$LAUNCH_AGENTS_DIR/$label.plist"

  if [ ! -f "$STUDIO/scripts/$script" ]; then
    echo "ERROR: $STUDIO/scripts/$script not found"
    exit 1
  fi

  cat > "$plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$label</string>
    <key>ProgramArguments</key>
    <array>
        <string>$NODE_BIN</string>
        <string>$STUDIO/scripts/$script</string>
    </array>
    <key>RunAtLoad</key><true/>
    <key>StartInterval</key>
    <integer>$interval</integer>
    <key>ThrottleInterval</key>
    <integer>120</integer>
    <key>StandardOutPath</key>
    <string>$LOG_DIR/${label#com.day14.}.stdout.log</string>
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/${label#com.day14.}.stderr.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
    </dict>
</dict>
</plist>
EOF
  echo "✓ wrote $plist"

  if launchctl list | grep -q "$label"; then
    echo "· unloading existing instance"
    launchctl unload "$plist" 2>/dev/null || true
  fi
  launchctl load "$plist"
  echo "✓ loaded $label"
}

install_agent "com.day14.cadence-sentinel" "cadence-sentinel.mjs" 1800
install_agent "com.day14.provider-health" "provider-health-probe.mjs" 3600

echo
echo "Verify:"
echo "  node $STUDIO/scripts/cadence-sentinel.mjs --selftest"
echo "  node $STUDIO/scripts/provider-health-probe.mjs --selftest"
echo "  node $STUDIO/scripts/cadence-sentinel.mjs --dry-run"
echo
echo "Health signals (no heartbeats by design — 30/60-min one-shots would"
echo "fight the watchdog's 12-min rule):"
echo "  _shared/founder-ops/cadence-sentinel-state.json mtime"
echo "  _shared/ops/provider-health.json mtime"
