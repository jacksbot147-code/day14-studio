#!/usr/bin/env bash
# install-content-suite.sh
# Wires the generic content + marketing engines as per-tenant LaunchAgents.
#
# Each tenant gets:
#   - pinterest-pin-generator (daily, 10am)
#   - blog-post-engine (2x/week, Tue + Thu, 9am)
#   - email-newsletter-engine (weekly, Wed 8am)
#   - tiktok-script-engine (3x/week, Mon Wed Fri, 11am)
#   - content-calendar-orchestrator (weekly, Sun 5am)
#   - trend-watcher (daily, 6am)
#
# Usage:  bash install-content-suite.sh <tenant-slug>
#         bash install-content-suite.sh hot-flash-co

set -euo pipefail
TENANT="${1:-}"
if [ -z "$TENANT" ]; then
  echo "Usage: install-content-suite.sh <tenant-slug>"
  exit 1
fi

NODE_BIN="$(which node)"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
LOG_DIR="$HOME/Documents/businesses/_shared/poller"
STUDIO="$HOME/Documents/studio"
GENERIC="$STUDIO/scripts/_generic"
mkdir -p "$LAUNCH_AGENTS_DIR" "$LOG_DIR"

make_plist() {
  local label="$1"
  local script="$2"
  local hour="$3"
  local minute="$4"
  local extra_calendar="${5:-}"
  local plist="$LAUNCH_AGENTS_DIR/com.day14.${TENANT}.${label}.plist"
  cat > "$plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.day14.${TENANT}.${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$script</string>
    <string>$TENANT</string>
  </array>
  <key>StartCalendarInterval</key>
EOF
  if [ -n "$extra_calendar" ]; then
    echo "  <array>" >> "$plist"
    echo "$extra_calendar" >> "$plist"
    echo "  </array>" >> "$plist"
  else
    cat >> "$plist" <<EOF
  <dict>
    <key>Hour</key><integer>$hour</integer>
    <key>Minute</key><integer>$minute</integer>
  </dict>
EOF
  fi
  cat >> "$plist" <<EOF
  <key>StandardOutPath</key>
  <string>$HOME/Library/Logs/day14/${TENANT}-${label}.stdout.log</string>
  <key>StandardErrorPath</key>
  <string>$HOME/Library/Logs/day14/${TENANT}-${label}.stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
    <key>TENANT</key><string>$TENANT</string>
  </dict>
</dict>
</plist>
EOF
  if launchctl list 2>/dev/null | grep -q "com.day14.${TENANT}.${label}"; then
    launchctl unload "$plist" 2>/dev/null || true
  fi
  launchctl load "$plist"
  echo "✓ loaded com.day14.${TENANT}.${label}"
}

# Trend watcher (daily 6am)
make_plist "trend-watcher" "$GENERIC/trend-watcher.mjs" "6" "0"

# Pinterest pin generator (daily 10am)
make_plist "pinterest-pin-generator" "$GENERIC/pinterest-pin-generator.mjs" "10" "0"

# Blog post engine (Tue + Thu 9am)
BLOG_CAL="    <dict><key>Weekday</key><integer>2</integer><key>Hour</key><integer>9</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>4</integer><key>Hour</key><integer>9</integer><key>Minute</key><integer>0</integer></dict>"
make_plist "blog-post-engine" "$GENERIC/blog-post-engine.mjs" "9" "0" "$BLOG_CAL"

# Newsletter (Wed 8am)
NEWS_CAL="    <dict><key>Weekday</key><integer>3</integer><key>Hour</key><integer>8</integer><key>Minute</key><integer>0</integer></dict>"
make_plist "email-newsletter-engine" "$GENERIC/email-newsletter-engine.mjs" "8" "0" "$NEWS_CAL"

# TikTok scripts (Mon Wed Fri 11am)
TT_CAL="    <dict><key>Weekday</key><integer>1</integer><key>Hour</key><integer>11</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>3</integer><key>Hour</key><integer>11</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>5</integer><key>Hour</key><integer>11</integer><key>Minute</key><integer>0</integer></dict>"
make_plist "tiktok-script-engine" "$GENERIC/tiktok-script-engine.mjs" "11" "0" "$TT_CAL"

# Content calendar (Sun 5am)
CAL_CAL="    <dict><key>Weekday</key><integer>0</integer><key>Hour</key><integer>5</integer><key>Minute</key><integer>0</integer></dict>"
make_plist "content-calendar-orchestrator" "$GENERIC/content-calendar-orchestrator.mjs" "5" "0" "$CAL_CAL"

# Hashtag researcher (daily 5:30am)
make_plist "hashtag-researcher" "$GENERIC/hashtag-researcher.mjs" "5" "30"

# Cross-poster (daily 2pm — uses freshest blog/tiktok script)
make_plist "cross-poster" "$GENERIC/cross-poster.mjs" "14" "0"

# Reddit engagement engine (M/W/F 10am — high effort, manual followup)
REDDIT_CAL="    <dict><key>Weekday</key><integer>1</integer><key>Hour</key><integer>10</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>3</integer><key>Hour</key><integer>10</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>5</integer><key>Hour</key><integer>10</integer><key>Minute</key><integer>0</integer></dict>"
make_plist "reddit-engagement-engine" "$GENERIC/reddit-engagement-engine.mjs" "10" "0" "$REDDIT_CAL"

# Brand site builder (Sun 6am — weekly site refresh from latest content)
SITE_CAL="    <dict><key>Weekday</key><integer>0</integer><key>Hour</key><integer>6</integer><key>Minute</key><integer>0</integer></dict>"
make_plist "brand-site-builder" "$GENERIC/brand-site-builder.mjs" "6" "0" "$SITE_CAL"

echo
echo "Content + marketing suite installed for $TENANT:"
echo "  daily 6am   → trend-watcher"
echo "  daily 10am  → pinterest-pin-generator"
echo "  Tue/Thu 9am → blog-post-engine"
echo "  Wed 8am     → email-newsletter-engine"
echo "  M/W/F 11am  → tiktok-script-engine"
echo "  Sun 5am     → content-calendar-orchestrator"
echo
echo "Logs: $LOG_DIR/${TENANT}-*.log"
