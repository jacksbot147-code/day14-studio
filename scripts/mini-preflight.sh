#!/usr/bin/env bash
# mini-preflight.sh — run on the LAPTOP before handing the runtime to the Mac mini.
#
# Default: read-only inventory + prints the exact transfer commands.
# --handover: stops all loaded com.day14.* LaunchAgents and writes a
#             HANDOVER marker. Run this only when the mini is ready to rsync.
#
# Usage:
#   bash ~/Documents/studio/scripts/mini-preflight.sh
#   bash ~/Documents/studio/scripts/mini-preflight.sh --handover
#   MINI_IP=192.168.1.50 bash scripts/mini-preflight.sh   (fills IP into commands)

set -euo pipefail

STUDIO="$HOME/Documents/studio"
BUSINESSES="$HOME/Documents/businesses"
ALIGNMD="$HOME/Documents/alignmd"
LA_DIR="$HOME/Library/LaunchAgents"
MINI_IP="${MINI_IP:-<MINI-IP>}"
MINI_USER="${MINI_USER:-$(whoami)}"
HANDOVER=0
[ "${1:-}" = "--handover" ] && HANDOVER=1

GREEN="\033[0;32m"; YELLOW="\033[0;33m"; RED="\033[0;31m"; RESET="\033[0m"
ok()   { printf "${GREEN}✓${RESET} %s\n" "$1"; }
warn() { printf "${YELLOW}!${RESET} %s\n" "$1"; }
bad()  { printf "${RED}✗${RESET} %s\n" "$1"; }

echo
echo "Day14 — Mac mini preflight (laptop side)"
echo "================================================================"

# ---- 1. loaded LaunchAgents ----
echo
echo "Loaded com.day14.* LaunchAgents:"
LOADED=$(launchctl list 2>/dev/null | grep -o 'com\.day14\.[a-z-]*' | sort -u || true)
if [ -n "$LOADED" ]; then
  echo "$LOADED" | sed 's/^/    /'
  COUNT=$(echo "$LOADED" | wc -l | tr -d ' ')
  ok "$COUNT agents currently loaded (these stop at --handover)"
else
  warn "none loaded (laptop already passive?)"
fi

# ---- 2. env keys (names only, never values) ----
echo
echo "Env keys in studio/.env.local:"
NEEDED="STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET RESEND_API_KEY ANTHROPIC_API_KEY TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID SUPABASE_SERVICE_ROLE_KEY ADMIN_PASSWORD"
for k in $NEEDED; do
  if grep -q "^${k}=" "$STUDIO/.env.local" 2>/dev/null; then ok "$k"; else bad "$k missing"; fi
done

# ---- 3. unpushed commits ----
echo
cd "$STUDIO"
BRANCH=$(git branch --show-current)
AHEAD=$(git rev-list --count "origin/${BRANCH}..HEAD" 2>/dev/null || echo "?")
if [ "$AHEAD" != "0" ]; then
  warn "branch $BRANCH is $AHEAD commits ahead of origin — rsync (below) carries them; a fresh clone would NOT"
else
  ok "branch $BRANCH fully pushed"
fi
DIRTY=$(git status --porcelain | wc -l | tr -d ' ')
[ "$DIRTY" != "0" ] && warn "$DIRTY uncommitted changes (rsync carries them too)"

# ---- 4. transfer size ----
echo
echo "Transfer sizes:"
du -sh "$STUDIO" "$BUSINESSES" "$ALIGNMD" 2>/dev/null | sed 's/^/    /' || true
echo "    (studio rsync excludes node_modules/.next — actual transfer is much smaller)"

# ---- 5. the transfer commands ----
echo
echo "Run these AFTER --handover (replace <MINI-IP> if not set via MINI_IP=):"
cat <<EOF

  rsync -azP --exclude node_modules --exclude .next \\
    "$STUDIO/" ${MINI_USER}@${MINI_IP}:Documents/studio/

  rsync -azP "$BUSINESSES/" ${MINI_USER}@${MINI_IP}:Documents/businesses/

  rsync -azP --exclude node_modules --exclude .next \\
    "$ALIGNMD/" ${MINI_USER}@${MINI_IP}:Documents/alignmd/

Then ON THE MINI:
  bash ~/Documents/studio/scripts/boot-day14.sh
  bash ~/Documents/studio/scripts/mini-verify.sh
EOF

# ---- 6. handover ----
if [ "$HANDOVER" = "1" ]; then
  echo
  echo "HANDOVER: stopping laptop runtime..."
  STOPPED=0
  for plist in "$LA_DIR"/com.day14.*.plist; do
    [ -e "$plist" ] || continue
    launchctl bootout "gui/$(id -u)" "$plist" 2>/dev/null && STOPPED=$((STOPPED+1)) || true
  done
  ok "stopped $STOPPED agents"
  MARKER="$BUSINESSES/_shared/HANDOVER.md"
  mkdir -p "$BUSINESSES/_shared"
  {
    echo "## $(date -u +%Y-%m-%dT%H:%M:%SZ) — runtime handover"
    echo "- from: $(hostname) (laptop, agents stopped: $STOPPED)"
    echo "- to:   mac-mini ($MINI_IP)"
    echo "- studio HEAD: $(git -C "$STUDIO" rev-parse --short HEAD) ($BRANCH)"
  } >> "$MARKER"
  ok "HANDOVER marker appended to _shared/HANDOVER.md"
  echo
  echo "Laptop is now passive. Run the rsync commands above, then boot the mini."
else
  echo
  echo "(read-only run — nothing stopped. Re-run with --handover when the mini is ready)"
fi
echo
