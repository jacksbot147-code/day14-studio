#!/usr/bin/env bash
# install-platform-agents.sh
# Installs the platform-level LaunchAgents:
#   - recursive-expansion-engine  → runs hourly, generates new skills from queue + growth patterns

set -euo pipefail
NODE_BIN="$(which node)"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
LOG_DIR="$HOME/Documents/businesses/_shared/poller"
STUDIO="$HOME/Documents/studio"
mkdir -p "$LAUNCH_AGENTS_DIR" "$LOG_DIR"

# ----- Recursive expansion engine -----
PLIST="$LAUNCH_AGENTS_DIR/com.day14.recursive-expansion.plist"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.day14.recursive-expansion</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$STUDIO/scripts/recursive-expansion-engine.mjs</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key><false/>
    <key>Crashed</key><true/>
  </dict>
  <key>ThrottleInterval</key><integer>60</integer>
  <key>StandardOutPath</key>
  <string>$HOME/Library/Logs/day14/recursive-expansion.stdout.log</string>
  <key>StandardErrorPath</key>
  <string>$HOME/Library/Logs/day14/recursive-expansion.stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
  </dict>
</dict>
</plist>
EOF

if launchctl list 2>/dev/null | grep -q "com.day14.recursive-expansion"; then
  launchctl unload "$PLIST" 2>/dev/null || true
fi
launchctl load "$PLIST"
echo "✓ loaded com.day14.recursive-expansion"

# ----- Video pipeline watcher -----
PLIST="$LAUNCH_AGENTS_DIR/com.day14.video-pipeline.plist"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.day14.video-pipeline</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$STUDIO/scripts/video-pipeline-watcher.mjs</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key>
  <dict><key>SuccessfulExit</key><false/><key>Crashed</key><true/></dict>
  <key>ThrottleInterval</key><integer>60</integer>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/day14/video-pipeline.stdout.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/day14/video-pipeline.stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string></dict>
</dict>
</plist>
EOF
if launchctl list 2>/dev/null | grep -q "com.day14.video-pipeline"; then
  launchctl unload "$PLIST" 2>/dev/null || true
fi
launchctl load "$PLIST"
echo "✓ loaded com.day14.video-pipeline"

# ----- Skill multiplier (daily) -----
PLIST="$LAUNCH_AGENTS_DIR/com.day14.skill-multiplier.plist"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.day14.skill-multiplier</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$STUDIO/scripts/skill-multiplier.mjs</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key>
  <dict><key>SuccessfulExit</key><false/><key>Crashed</key><true/></dict>
  <key>ThrottleInterval</key><integer>3600</integer>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/day14/skill-multiplier.stdout.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/day14/skill-multiplier.stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string></dict>
</dict>
</plist>
EOF
if launchctl list 2>/dev/null | grep -q "com.day14.skill-multiplier"; then
  launchctl unload "$PLIST" 2>/dev/null || true
fi
launchctl load "$PLIST"
echo "✓ loaded com.day14.skill-multiplier"

# ----- Priority allocator (3x daily — 9am, 2pm, 8pm) -----
PLIST="$LAUNCH_AGENTS_DIR/com.day14.priority-allocator.plist"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.day14.priority-allocator</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$STUDIO/scripts/priority-allocator.mjs</string>
    <string>--push</string>
  </array>
  <key>StartCalendarInterval</key>
  <array>
    <dict><key>Hour</key><integer>9</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Hour</key><integer>14</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Hour</key><integer>20</integer><key>Minute</key><integer>0</integer></dict>
  </array>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/day14/priority-allocator.stdout.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/day14/priority-allocator.stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string></dict>
</dict>
</plist>
EOF
if launchctl list 2>/dev/null | grep -q "com.day14.priority-allocator"; then
  launchctl unload "$PLIST" 2>/dev/null || true
fi
launchctl load "$PLIST"
echo "✓ loaded com.day14.priority-allocator"

# ----- Auto-restart watchdog (every 5 min) -----
PLIST="$LAUNCH_AGENTS_DIR/com.day14.auto-restart-watchdog.plist"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.day14.auto-restart-watchdog</string>
  <key>ProgramArguments</key>
  <array><string>$NODE_BIN</string><string>$STUDIO/scripts/auto-restart-watchdog.mjs</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><dict><key>SuccessfulExit</key><false/><key>Crashed</key><true/></dict>
  <key>ThrottleInterval</key><integer>120</integer>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/day14/auto-restart-watchdog.stdout.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/day14/auto-restart-watchdog.stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string></dict>
</dict>
</plist>
EOF
if launchctl list 2>/dev/null | grep -q "com.day14.auto-restart-watchdog"; then launchctl unload "$PLIST" 2>/dev/null || true; fi
launchctl load "$PLIST"
echo "✓ loaded com.day14.auto-restart-watchdog"

# ----- Outbox dead-letter (every 30 min) -----
PLIST="$LAUNCH_AGENTS_DIR/com.day14.outbox-deadletter.plist"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.day14.outbox-deadletter</string>
  <key>ProgramArguments</key>
  <array><string>$NODE_BIN</string><string>$STUDIO/scripts/outbox-deadletter.mjs</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><dict><key>SuccessfulExit</key><false/><key>Crashed</key><true/></dict>
  <key>ThrottleInterval</key><integer>300</integer>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/day14/outbox-deadletter.stdout.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/day14/outbox-deadletter.stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string></dict>
</dict>
</plist>
EOF
if launchctl list 2>/dev/null | grep -q "com.day14.outbox-deadletter"; then launchctl unload "$PLIST" 2>/dev/null || true; fi
launchctl load "$PLIST"
echo "✓ loaded com.day14.outbox-deadletter"

# ----- Opportunity scanner (continuous) -----
PLIST="$LAUNCH_AGENTS_DIR/com.day14.opportunity-scanner.plist"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.day14.opportunity-scanner</string>
  <key>ProgramArguments</key>
  <array><string>$NODE_BIN</string><string>$STUDIO/scripts/opportunity-scanner.mjs</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><dict><key>SuccessfulExit</key><false/><key>Crashed</key><true/></dict>
  <key>ThrottleInterval</key><integer>120</integer>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/day14/opportunity-scanner.stdout.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/day14/opportunity-scanner.stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string></dict>
</dict>
</plist>
EOF
if launchctl list 2>/dev/null | grep -q "com.day14.opportunity-scanner"; then launchctl unload "$PLIST" 2>/dev/null || true; fi
launchctl load "$PLIST"
echo "✓ loaded com.day14.opportunity-scanner"

# ----- Proactive pitcher (daily 7am) -----
PLIST="$LAUNCH_AGENTS_DIR/com.day14.proactive-pitcher.plist"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.day14.proactive-pitcher</string>
  <key>ProgramArguments</key>
  <array><string>$NODE_BIN</string><string>$STUDIO/scripts/proactive-pitcher.mjs</string></array>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>7</integer><key>Minute</key><integer>0</integer></dict>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/day14/proactive-pitcher.stdout.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/day14/proactive-pitcher.stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string></dict>
</dict>
</plist>
EOF
if launchctl list 2>/dev/null | grep -q "com.day14.proactive-pitcher"; then launchctl unload "$PLIST" 2>/dev/null || true; fi
launchctl load "$PLIST"
echo "✓ loaded com.day14.proactive-pitcher"

# ----- System pulse (every 30 min) -----
PLIST="$LAUNCH_AGENTS_DIR/com.day14.system-pulse.plist"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.day14.system-pulse</string>
  <key>ProgramArguments</key>
  <array><string>$NODE_BIN</string><string>$STUDIO/scripts/system-pulse.mjs</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><dict><key>SuccessfulExit</key><false/><key>Crashed</key><true/></dict>
  <key>ThrottleInterval</key><integer>120</integer>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/day14/system-pulse.stdout.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/day14/system-pulse.stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string></dict>
</dict>
</plist>
EOF
if launchctl list 2>/dev/null | grep -q "com.day14.system-pulse"; then launchctl unload "$PLIST" 2>/dev/null || true; fi
launchctl load "$PLIST"
echo "✓ loaded com.day14.system-pulse"

# ----- Expansion prompter (every 2hr) -----
PLIST="$LAUNCH_AGENTS_DIR/com.day14.expansion-prompter.plist"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.day14.expansion-prompter</string>
  <key>ProgramArguments</key>
  <array><string>$NODE_BIN</string><string>$STUDIO/scripts/expansion-prompter.mjs</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><dict><key>SuccessfulExit</key><false/><key>Crashed</key><true/></dict>
  <key>ThrottleInterval</key><integer>120</integer>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/day14/expansion-prompter.stdout.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/day14/expansion-prompter.stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string></dict>
</dict>
</plist>
EOF
if launchctl list 2>/dev/null | grep -q "com.day14.expansion-prompter"; then launchctl unload "$PLIST" 2>/dev/null || true; fi
launchctl load "$PLIST"
echo "✓ loaded com.day14.expansion-prompter"

# ----- Growth narrator (continuous, polls 90s) -----
PLIST="$LAUNCH_AGENTS_DIR/com.day14.growth-narrator.plist"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.day14.growth-narrator</string>
  <key>ProgramArguments</key>
  <array><string>$NODE_BIN</string><string>$STUDIO/scripts/growth-narrator.mjs</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><dict><key>SuccessfulExit</key><false/><key>Crashed</key><true/></dict>
  <key>ThrottleInterval</key><integer>60</integer>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/day14/growth-narrator.stdout.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/day14/growth-narrator.stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string></dict>
</dict>
</plist>
EOF
if launchctl list 2>/dev/null | grep -q "com.day14.growth-narrator"; then launchctl unload "$PLIST" 2>/dev/null || true; fi
launchctl load "$PLIST"
echo "✓ loaded com.day14.growth-narrator"

# ----- Gamified dashboard (refresh every 15 min) -----
PLIST="$LAUNCH_AGENTS_DIR/com.day14.gamified-dashboard.plist"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.day14.gamified-dashboard</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$STUDIO/scripts/gamified-dashboard.mjs</string>
  </array>
  <key>StartInterval</key><integer>900</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/day14/gamified-dashboard.stdout.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/day14/gamified-dashboard.stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string></dict>
</dict>
</plist>
EOF
if launchctl list 2>/dev/null | grep -q "com.day14.gamified-dashboard"; then
  launchctl unload "$PLIST" 2>/dev/null || true
fi
launchctl load "$PLIST"
echo "✓ loaded com.day14.gamified-dashboard"

echo
echo "All platform agents installed:"
echo "  com.day14.recursive-expansion   (hourly self-build)"
echo "  com.day14.video-pipeline        (watches raw-footage/)"
echo "  com.day14.skill-multiplier      (daily cross-tenant skill propagation)"
echo "  com.day14.priority-allocator    (9am/2pm/8pm priority push)"
echo
echo "Logs: $LOG_DIR/"
echo "Drafts: $STUDIO/docs/seeds/skills/_drafts/"
