#!/usr/bin/env bash
# install-video-and-social.sh <tenant-slug>
# Wires the video creator + social orchestrator + publishers as LaunchAgents
# for a specific tenant.

set -euo pipefail
TENANT="${1:?Usage: install-video-and-social.sh <tenant-slug>}"
NODE_BIN="$(which node)"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
LOG_DIR="$HOME/Documents/businesses/_shared/poller"
STUDIO="$HOME/Documents/studio"
GENERIC="$STUDIO/scripts/_generic"
mkdir -p "$LAUNCH_AGENTS_DIR" "$LOG_DIR"

make_plist_daily() {
  local label="$1"; local script="$2"; local hour="$3"; local minute="$4"
  local plist="$LAUNCH_AGENTS_DIR/com.day14.${TENANT}.${label}.plist"
  cat > "$plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.day14.${TENANT}.${label}</string>
  <key>ProgramArguments</key>
  <array><string>$NODE_BIN</string><string>$script</string><string>$TENANT</string></array>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>$hour</integer><key>Minute</key><integer>$minute</integer></dict>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/day14/${TENANT}-${label}.stdout.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/day14/${TENANT}-${label}.stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string><key>TENANT</key><string>$TENANT</string></dict>
</dict>
</plist>
EOF
  if launchctl list 2>/dev/null | grep -q "com.day14.${TENANT}.${label}"; then
    launchctl unload "$plist" 2>/dev/null || true
  fi
  launchctl load "$plist"
  echo "✓ loaded com.day14.${TENANT}.${label}"
}

# video-creator runs after tiktok-script-engine (12pm M/W/F)
make_plist_daily "video-creator" "$GENERIC/video-creator.mjs" "12" "0"

# social-orchestrator runs daily 1pm (after all morning content engines)
make_plist_daily "social-orchestrator" "$GENERIC/social-orchestrator.mjs" "13" "0"

# pinterest-publisher checks for approved every 30 min
PLIST="$LAUNCH_AGENTS_DIR/com.day14.${TENANT}.pinterest-publisher.plist"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.day14.${TENANT}.pinterest-publisher</string>
  <key>ProgramArguments</key>
  <array><string>$NODE_BIN</string><string>$GENERIC/pinterest-publisher.mjs</string><string>$TENANT</string></array>
  <key>StartInterval</key><integer>1800</integer>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/day14/${TENANT}-pinterest-publisher.stdout.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/day14/${TENANT}-pinterest-publisher.stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string><key>TENANT</key><string>$TENANT</string></dict>
</dict>
</plist>
EOF
if launchctl list 2>/dev/null | grep -q "com.day14.${TENANT}.pinterest-publisher"; then
  launchctl unload "$PLIST" 2>/dev/null || true
fi
launchctl load "$PLIST"
echo "✓ loaded com.day14.${TENANT}.pinterest-publisher"

# youtube-shorts-publisher every 60 min
PLIST="$LAUNCH_AGENTS_DIR/com.day14.${TENANT}.youtube-publisher.plist"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.day14.${TENANT}.youtube-publisher</string>
  <key>ProgramArguments</key>
  <array><string>$NODE_BIN</string><string>$GENERIC/youtube-shorts-publisher.mjs</string><string>$TENANT</string></array>
  <key>StartInterval</key><integer>3600</integer>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/day14/${TENANT}-youtube-publisher.stdout.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/day14/${TENANT}-youtube-publisher.stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string><key>TENANT</key><string>$TENANT</string></dict>
</dict>
</plist>
EOF
if launchctl list 2>/dev/null | grep -q "com.day14.${TENANT}.youtube-publisher"; then
  launchctl unload "$PLIST" 2>/dev/null || true
fi
launchctl load "$PLIST"
echo "✓ loaded com.day14.${TENANT}.youtube-publisher"

# Full content pipeline orchestrator (M/W/F 11:30am — between script + post times)
PIPE_CAL="<array>
    <dict><key>Weekday</key><integer>1</integer><key>Hour</key><integer>11</integer><key>Minute</key><integer>30</integer></dict>
    <dict><key>Weekday</key><integer>3</integer><key>Hour</key><integer>11</integer><key>Minute</key><integer>30</integer></dict>
    <dict><key>Weekday</key><integer>5</integer><key>Hour</key><integer>11</integer><key>Minute</key><integer>30</integer></dict>
  </array>"
PLIST="$LAUNCH_AGENTS_DIR/com.day14.${TENANT}.full-content-pipeline.plist"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.day14.${TENANT}.full-content-pipeline</string>
  <key>ProgramArguments</key>
  <array><string>$NODE_BIN</string><string>$GENERIC/full-content-pipeline.mjs</string><string>$TENANT</string></array>
  <key>StartCalendarInterval</key>$PIPE_CAL
  <key>StandardOutPath</key><string>$HOME/Library/Logs/day14/${TENANT}-full-content-pipeline.stdout.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/day14/${TENANT}-full-content-pipeline.stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string><key>TENANT</key><string>$TENANT</string></dict>
</dict>
</plist>
EOF
if launchctl list 2>/dev/null | grep -q "com.day14.${TENANT}.full-content-pipeline"; then launchctl unload "$PLIST" 2>/dev/null || true; fi
launchctl load "$PLIST"
echo "✓ loaded com.day14.${TENANT}.full-content-pipeline"

# Per-platform publishers (every 30-60 min)
for SPEC in "instagram-publisher:1800" "linkedin-publisher:1800" "tiktok-publisher:3600" "threads-publisher:1800" "twitter-publisher:1800"; do
  LABEL=$(echo "$SPEC" | cut -d: -f1)
  INTERVAL=$(echo "$SPEC" | cut -d: -f2)
  PLIST="$LAUNCH_AGENTS_DIR/com.day14.${TENANT}.${LABEL}.plist"
  cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.day14.${TENANT}.${LABEL}</string>
  <key>ProgramArguments</key>
  <array><string>$NODE_BIN</string><string>$GENERIC/${LABEL}.mjs</string><string>$TENANT</string></array>
  <key>StartInterval</key><integer>$INTERVAL</integer>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/day14/${TENANT}-${LABEL}.stdout.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/day14/${TENANT}-${LABEL}.stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string><key>TENANT</key><string>$TENANT</string></dict>
</dict>
</plist>
EOF
  if launchctl list 2>/dev/null | grep -q "com.day14.${TENANT}.${LABEL}"; then launchctl unload "$PLIST" 2>/dev/null || true; fi
  launchctl load "$PLIST"
  echo "✓ loaded com.day14.${TENANT}.${LABEL}"
done

echo
echo "Video + social pipeline installed for $TENANT:"
echo "  M/W/F 11:30am → full-content-pipeline (script → video → variants → queue → cross-post)"
echo "  M/W/F 12pm    → video-creator"
echo "  daily 1pm     → social-orchestrator"
echo "  every 30min   → pinterest, instagram, linkedin, threads, twitter publishers"
echo "  every 60min   → youtube-shorts, tiktok publishers"
echo
echo "Per-platform auto/review mode:"
echo "  node scripts/_generic/auto-post-config.mjs $TENANT --show"
echo "  node scripts/_generic/auto-post-config.mjs $TENANT --set pinterest=auto"
echo
echo "Publishers default to Jack-tap-required. Reply 'approve all' or 'approve post <id>' in Telegram."
