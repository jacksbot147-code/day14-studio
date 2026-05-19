#!/usr/bin/env bash
# boot-day14.sh
# One command to bring the entire Day14 OS online.
#
# What it does (in order):
#   1. npm install (deps)
#   2. Regenerate skill registry + graph
#   3. Install + load 3 LaunchAgents (growth-watcher, telegram-poller, events-poller)
#   4. Start the Next.js dev server in the background (logged to ~/Library/Logs/day14-dev.log)
#   5. Run the E2E pipeline test
#   6. Print health summary
#
# Idempotent. Safe to re-run. Won't double-load LaunchAgents.
#
# Usage: bash ~/Documents/studio/scripts/boot-day14.sh
#        bash ~/Documents/studio/scripts/boot-day14.sh --skip-install   (skip npm install)
#        bash ~/Documents/studio/scripts/boot-day14.sh --skip-dev       (don't start dev server)

set -euo pipefail

STUDIO="$HOME/Documents/studio"
LOG_DIR="$HOME/Library/Logs"
DEV_LOG="$LOG_DIR/day14-dev.log"
DEV_PID_FILE="$LOG_DIR/day14-dev.pid"
SHARED="$HOME/Documents/businesses/_shared"

GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
DIM="\033[2m"
RESET="\033[0m"

ok()    { printf "${GREEN}✓${RESET} %s\n" "$1"; }
warn()  { printf "${YELLOW}!${RESET} %s\n" "$1"; }
fail()  { printf "${RED}✗${RESET} %s\n" "$1"; }
skip()  { printf "${DIM}·${RESET} %s\n" "$1"; }

# ---- flags ----
SKIP_INSTALL=0
SKIP_DEV=0
SKIP_E2E=0
for arg in "$@"; do
  case "$arg" in
    --skip-install) SKIP_INSTALL=1 ;;
    --skip-dev) SKIP_DEV=1 ;;
    --skip-e2e) SKIP_E2E=1 ;;
    --help|-h)
      grep '^# ' "$0" | head -20
      exit 0
      ;;
  esac
done

mkdir -p "$LOG_DIR"

echo
echo "Day14 OS — full boot"
echo "================================================================"
echo

# ---- preflight ----
if [ ! -d "$STUDIO" ]; then
  fail "Studio not found at $STUDIO"
  exit 1
fi
cd "$STUDIO"

if ! command -v node &>/dev/null; then
  fail "node not in PATH. Install Node 20+ first."
  exit 1
fi
ok "node $(node --version)"

# ---- 1. npm install ----
if [ "$SKIP_INSTALL" -eq 0 ]; then
  echo
  echo "Step 1/6 — npm install..."
  if [ -d node_modules ] && [ "$(ls node_modules 2>/dev/null | wc -l)" -gt 300 ]; then
    skip "node_modules already populated ($(ls node_modules | wc -l) packages) — running install anyway to catch new deps"
  fi
  npm install --silent || { fail "npm install failed"; exit 1; }
  ok "npm install complete"
else
  skip "skipping npm install"
fi

# ---- 2. regenerate registry + graph ----
echo
echo "Step 2/6 — regenerating registry + graph..."
node scripts/generate-skill-registry.mjs
node scripts/generate-skill-graph.mjs

# ---- 3. install + load LaunchAgents ----
echo
echo "Step 3/6 — installing LaunchAgents..."
for agent in install-growth-watcher.sh install-telegram-poller.sh install-events-poller.sh; do
  if [ -f "scripts/$agent" ]; then
    bash "scripts/$agent" 2>&1 | sed 's/^/    /' || warn "$agent had issues (continuing)"
  else
    warn "scripts/$agent not found, skipping"
  fi
done

# ---- 4. dev server ----
if [ "$SKIP_DEV" -eq 0 ]; then
  echo
  echo "Step 4/6 — starting dev server..."

  # Is something already on :3000?
  if lsof -ti tcp:3000 >/dev/null 2>&1; then
    skip "port 3000 already in use — assuming dev server is up"
  else
    # Kill any old dev process tracked by us
    if [ -f "$DEV_PID_FILE" ]; then
      OLD_PID="$(cat "$DEV_PID_FILE" 2>/dev/null || echo)"
      if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
        kill "$OLD_PID" 2>/dev/null || true
        sleep 1
      fi
    fi

    # Start dev server detached, logging to file
    nohup npm run dev >"$DEV_LOG" 2>&1 &
    NEW_PID=$!
    echo "$NEW_PID" >"$DEV_PID_FILE"
    ok "dev server PID $NEW_PID (logs: $DEV_LOG)"

    # Wait up to 30s for it to come up
    for i in $(seq 1 30); do
      if curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 2>/dev/null | grep -qE '^(200|301|302|404)$'; then
        ok "dev server responding on http://localhost:3000"
        break
      fi
      sleep 1
      if [ "$i" -eq 30 ]; then
        warn "dev server didn't respond within 30s — check $DEV_LOG"
      fi
    done
  fi
else
  skip "skipping dev server"
fi

# ---- 5. E2E pipeline test ----
if [ "$SKIP_E2E" -eq 0 ] && [ "$SKIP_DEV" -eq 0 ]; then
  echo
  echo "Step 5/6 — running E2E pipeline test..."
  if node scripts/e2e-pipeline-test.mjs 2>&1 | tail -10 | sed 's/^/    /'; then
    ok "E2E test completed (see docs/e2e-pipeline-results-*.md)"
  else
    warn "E2E test reported failures (expected if first boot)"
  fi
else
  skip "skipping E2E test"
fi

# ---- 6. health summary ----
echo
echo "Step 6/6 — health summary"
echo "----------------------------------------------------------------"

# LaunchAgents loaded?
for label in com.day14.growth-watcher com.day14.telegram-poller com.day14.events-poller; do
  if launchctl list 2>/dev/null | grep -q "$label"; then
    ok "LaunchAgent: $label"
  else
    warn "LaunchAgent: $label NOT loaded"
  fi
done

# Heartbeats fresh?
for poller in growth-watcher telegram-poller events-poller; do
  HB="$SHARED/poller/${poller}-heartbeat.log"
  if [ -f "$HB" ]; then
    LAST="$(tail -1 "$HB" | awk '{print $1}')"
    if [ -n "$LAST" ]; then
      AGE_SEC=$(( $(date +%s) - $(date -j -f "%Y-%m-%dT%H:%M:%S" "${LAST%%.*}" +%s 2>/dev/null || echo 0) ))
      if [ "$AGE_SEC" -lt 600 ]; then
        ok "heartbeat: $poller (${AGE_SEC}s ago)"
      else
        warn "heartbeat: $poller stale (${AGE_SEC}s ago)"
      fi
    fi
  else
    warn "heartbeat: $poller — no log file yet"
  fi
done

# Dev server
if lsof -ti tcp:3000 >/dev/null 2>&1; then
  ok "dev server: http://localhost:3000"
  ok "dashboard:  http://localhost:3000/dashboard"
  ok "graph:      http://localhost:3000/dashboard/graph"
else
  warn "dev server not listening on :3000"
fi

# Env signals
if [ -f "$STUDIO/.env.local" ]; then
  ok ".env.local present"
  for key in TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID ANTHROPIC_API_KEY STRIPE_SECRET_KEY; do
    if grep -qE "^${key}=." "$STUDIO/.env.local"; then
      ok "env: $key set"
    else
      warn "env: $key missing — some functionality won't work"
    fi
  done
else
  warn ".env.local missing — copy .env.local.example and fill in"
fi

echo
echo "================================================================"
echo
echo "  To stop dev server:    kill \$(cat $DEV_PID_FILE)"
echo "  To stop pollers:       launchctl unload ~/Library/LaunchAgents/com.day14.*.plist"
echo "  Live dashboard:        http://localhost:3000/dashboard"
echo
ok "boot complete"
