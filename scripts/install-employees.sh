#!/usr/bin/env bash
# install-employees.sh
# Wires the 5 employee-style C-suite agents as LaunchAgents.

set -euo pipefail
NODE_BIN="$(which node)"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
LOG_DIR="$HOME/Documents/businesses/_shared/poller"
STUDIO="$HOME/Documents/studio"
mkdir -p "$LAUNCH_AGENTS_DIR" "$LOG_DIR"

make_calendar_plist() {
  local label="$1"; local script="$2"; local hour="$3"; local minute="$4"; local extra="${5:-}"
  local plist="$LAUNCH_AGENTS_DIR/com.day14.${label}.plist"
  cat > "$plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.day14.${label}</string>
  <key>ProgramArguments</key>
  <array><string>$NODE_BIN</string><string>$script</string></array>
  <key>StartCalendarInterval</key>
EOF
  if [ -n "$extra" ]; then
    echo "  <array>" >> "$plist"
    echo "$extra" >> "$plist"
    echo "  </array>" >> "$plist"
  else
    cat >> "$plist" <<EOF
  <dict><key>Hour</key><integer>$hour</integer><key>Minute</key><integer>$minute</integer></dict>
EOF
  fi
  cat >> "$plist" <<EOF
  <key>StandardOutPath</key><string>$LOG_DIR/${label}.stdout.log</string>
  <key>StandardErrorPath</key><string>$LOG_DIR/${label}.stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string></dict>
</dict>
</plist>
EOF
  if launchctl list 2>/dev/null | grep -q "com.day14.${label}"; then launchctl unload "$plist" 2>/dev/null || true; fi
  launchctl load "$plist"
  echo "✓ loaded com.day14.${label}"
}

EMPLOYEES="$STUDIO/scripts/employees"

# CFO — daily 8am + Sunday 6pm
CFO_CAL="    <dict><key>Hour</key><integer>8</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>0</integer><key>Hour</key><integer>18</integer><key>Minute</key><integer>0</integer></dict>"
make_calendar_plist "cfo-agent" "$EMPLOYEES/cfo-agent.mjs" "8" "0" "$CFO_CAL"

# Head of Product — daily 4pm
make_calendar_plist "product-strategist" "$EMPLOYEES/product-strategist.mjs" "16" "0"

# Customer Success — continuous
PLIST="$LAUNCH_AGENTS_DIR/com.day14.customer-success-agent.plist"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.day14.customer-success-agent</string>
  <key>ProgramArguments</key>
  <array><string>$NODE_BIN</string><string>$EMPLOYEES/customer-success-agent.mjs</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><dict><key>SuccessfulExit</key><false/><key>Crashed</key><true/></dict>
  <key>ThrottleInterval</key><integer>120</integer>
  <key>StandardOutPath</key><string>$LOG_DIR/customer-success-agent.stdout.log</string>
  <key>StandardErrorPath</key><string>$LOG_DIR/customer-success-agent.stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string></dict>
</dict>
</plist>
EOF
if launchctl list 2>/dev/null | grep -q "com.day14.customer-success-agent"; then launchctl unload "$PLIST" 2>/dev/null || true; fi
launchctl load "$PLIST"
echo "✓ loaded com.day14.customer-success-agent"

# Compliance — daily 11pm
make_calendar_plist "compliance-officer" "$EMPLOYEES/compliance-officer.mjs" "23" "0"

# Performance Analyst — Mon 7am
ANALYST_CAL="    <dict><key>Weekday</key><integer>1</integer><key>Hour</key><integer>7</integer><key>Minute</key><integer>0</integer></dict>"
make_calendar_plist "performance-analyst" "$EMPLOYEES/performance-analyst.mjs" "7" "0" "$ANALYST_CAL"

# Sales Director — daily 10am
make_calendar_plist "sales-director" "$EMPLOYEES/sales-director.mjs" "10" "0"

# PR Director — Tue + Thu 9am
PR_CAL="    <dict><key>Weekday</key><integer>2</integer><key>Hour</key><integer>9</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>4</integer><key>Hour</key><integer>9</integer><key>Minute</key><integer>0</integer></dict>"
make_calendar_plist "pr-director" "$EMPLOYEES/pr-director.mjs" "9" "0" "$PR_CAL"

# Brand Steward — daily 10pm
make_calendar_plist "brand-steward" "$EMPLOYEES/brand-steward.mjs" "22" "0"

# DevOps/SRE — every 4hr (use StartInterval)
PLIST="$LAUNCH_AGENTS_DIR/com.day14.devops-sre.plist"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.day14.devops-sre</string>
  <key>ProgramArguments</key>
  <array><string>$NODE_BIN</string><string>$EMPLOYEES/devops-sre.mjs</string></array>
  <key>RunAtLoad</key><true/>
  <key>StartInterval</key><integer>14400</integer>
  <key>StandardOutPath</key><string>$LOG_DIR/devops-sre.stdout.log</string>
  <key>StandardErrorPath</key><string>$LOG_DIR/devops-sre.stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string></dict>
</dict>
</plist>
EOF
if launchctl list 2>/dev/null | grep -q "com.day14.devops-sre"; then launchctl unload "$PLIST" 2>/dev/null || true; fi
launchctl load "$PLIST"
echo "✓ loaded com.day14.devops-sre"

# Investor Relations — first Monday of each month at 7am (we approximate with: every Mon, but script self-gates)
IR_CAL="    <dict><key>Day</key><integer>1</integer><key>Hour</key><integer>7</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Day</key><integer>2</integer><key>Hour</key><integer>7</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Day</key><integer>3</integer><key>Hour</key><integer>7</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Day</key><integer>4</integer><key>Hour</key><integer>7</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Day</key><integer>5</integer><key>Hour</key><integer>7</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Day</key><integer>6</integer><key>Hour</key><integer>7</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Day</key><integer>7</integer><key>Hour</key><integer>7</integer><key>Minute</key><integer>0</integer></dict>"
make_calendar_plist "investor-relations" "$EMPLOYEES/investor-relations.mjs" "7" "0" "$IR_CAL"

echo
echo "Day14 C-suite hired (10 employees):"
echo "  💼 CFO              — daily 8am + Sun 6pm"
echo "  📦 Head of Product  — daily 4pm"
echo "  🤝 Customer Success — continuous (60min polls)"
echo "  ⚖️  Compliance       — daily 11pm"
echo "  📊 Analytics        — Mon 7am"
echo "  🎯 VP Sales         — daily 10am"
echo "  📰 PR Director      — Tue + Thu 9am"
echo "  🎨 Brand Steward    — daily 10pm"
echo "  🔧 DevOps/SRE       — every 4hr"
echo "  📈 Investor Rel.    — first week of month, 7am"
echo
echo "Reports land in: ~/Documents/businesses/_shared/{finance,product-strategy,compliance,analytics,sales,pr,ops,investor-updates}/"
