#!/usr/bin/env bash
# mini-verify.sh — run on the MAC MINI after boot-day14.sh.
# Single green/red readout: is this machine now the Day14 runtime?
# Read-only. Safe to run repeatedly.

set -uo pipefail

STUDIO="$HOME/Documents/studio"
SHARED="$HOME/Documents/businesses/_shared"
PASS=0; FAILN=0
GREEN="\033[0;32m"; RED="\033[0;31m"; YELLOW="\033[0;33m"; RESET="\033[0m"
ok()   { printf "${GREEN}✓${RESET} %s\n" "$1"; PASS=$((PASS+1)); }
bad()  { printf "${RED}✗${RESET} %s\n" "$1"; FAILN=$((FAILN+1)); }
warn() { printf "${YELLOW}!${RESET} %s\n" "$1"; }

echo
echo "Day14 — Mac mini verify"
echo "================================================================"

# 1. toolchain
for cmd in node npm git; do
  command -v "$cmd" >/dev/null && ok "$cmd $($cmd --version 2>/dev/null | head -1)" || bad "$cmd missing"
done

# 2. folders
[ -d "$STUDIO" ] && ok "studio repo present ($(git -C "$STUDIO" rev-parse --short HEAD 2>/dev/null) on $(git -C "$STUDIO" branch --show-current 2>/dev/null))" || bad "~/Documents/studio missing"
[ -d "$SHARED/customers" ] && ok "businesses/_shared/customers present ($(ls "$SHARED/customers" | wc -l | tr -d ' ') dossiers)" || bad "businesses data missing — rsync didn't run?"
[ -f "$SHARED/growth/work-register.jsonl" ] && ok "work-register present ($(wc -l < "$SHARED/growth/work-register.jsonl" | tr -d ' ') entries)" || bad "work-register missing"
[ -f "$SHARED/HANDOVER.md" ] && ok "HANDOVER marker present" || warn "no HANDOVER marker (laptop agents may still be running — check!)"

# 3. env keys (names only)
NEEDED="STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET RESEND_API_KEY ANTHROPIC_API_KEY TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID SUPABASE_SERVICE_ROLE_KEY ADMIN_PASSWORD"
for k in $NEEDED; do
  grep -q "^${k}=" "$STUDIO/.env.local" 2>/dev/null && ok "env: $k" || bad "env: $k missing"
done

# 4. LaunchAgents loaded
LOADED=$(launchctl list 2>/dev/null | grep -c 'com\.day14\.' || echo 0)
[ "$LOADED" -ge 3 ] && ok "$LOADED com.day14.* agents loaded" || bad "only $LOADED agents loaded — run boot-day14.sh"

# 5. heartbeats fresh (<5 min)
for hb in growth-watcher telegram-poller events-poller; do
  f="$SHARED/poller/${hb}-heartbeat.log"
  if [ -f "$f" ]; then
    AGE=$(( $(date +%s) - $(stat -f %m "$f") ))
    [ "$AGE" -lt 300 ] && ok "heartbeat: $hb (${AGE}s ago)" || bad "heartbeat: $hb stale (${AGE}s)"
  else
    bad "heartbeat: $hb — no file"
  fi
done

# 6. dev server
if curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:3000 | grep -q "200"; then
  ok "dev server responding on :3000"
else
  bad "dev server not responding on :3000"
fi

# 7. always-on power settings
SLEEP=$(pmset -g | awk '/^ sleep/ {print $2}')
[ "$SLEEP" = "0" ] && ok "pmset sleep=0 (always on)" || warn "pmset sleep=$SLEEP — run the always-on block from the runbook"

echo
echo "================================================================"
if [ "$FAILN" = "0" ]; then
  printf "${GREEN}ALL GREEN (%d checks)${RESET} — this machine is the Day14 runtime.\n" "$PASS"
else
  printf "${RED}%d FAILED${RESET} / %d passed — fix the ✗ lines top to bottom.\n" "$FAILN" "$PASS"
fi
echo
exit "$FAILN"
