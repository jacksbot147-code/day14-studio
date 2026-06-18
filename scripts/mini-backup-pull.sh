#!/usr/bin/env bash
# mini-backup-pull.sh — run on the LAPTOP. Pulls the mini's live runtime
# state (the ONLY copy of customer dossiers + work-register) into a local
# backup with dated, space-efficient snapshots.
#
# Passwordless via the SSH key installed 2026-06-11. Safe to run anytime;
# designed to run nightly via a scheduled task.
#
# Layout:
#   ~/Documents/day14-backups/
#     latest/                    <- always the current mirror (rsync --delete)
#     snapshots/2026-06-11/      <- dated hardlink snapshot (cheap: unchanged
#                                   files are hardlinks to latest, not copies)
#
# Keeps the last 14 daily snapshots; older ones are pruned.

set -uo pipefail

MINI_USER="${MINI_USER:-jack}"
MINI_IP="${MINI_IP:-192.168.1.35}"
BACKUP_ROOT="$HOME/Documents/day14-backups"
LATEST="$BACKUP_ROOT/latest"
SNAP_DIR="$BACKUP_ROOT/snapshots"
TODAY="$(date +%Y-%m-%d)"
KEEP_DAYS=14

GREEN="\033[0;32m"; YELLOW="\033[0;33m"; RED="\033[0;31m"; RESET="\033[0m"
ok()   { printf "${GREEN}✓${RESET} %s\n" "$1"; }
warn() { printf "${YELLOW}!${RESET} %s\n" "$1"; }
bad()  { printf "${RED}✗${RESET} %s\n" "$1"; }

echo
echo "Day14 — nightly backup pull from mini ($MINI_USER@$MINI_IP)"
echo "================================================================"

mkdir -p "$LATEST/businesses" "$LATEST/studio" "$SNAP_DIR"

# Reachability check (fail fast, don't hang a scheduled run).
if ! ssh -o BatchMode=yes -o ConnectTimeout=8 "$MINI_USER@$MINI_IP" true 2>/dev/null; then
  bad "mini unreachable at $MINI_IP — backup skipped (it's on Wi-Fi; may be asleep or off-network)"
  exit 1
fi
ok "mini reachable"

# 1. businesses — the irreplaceable live state.
if rsync -az --delete --timeout=120 \
     "$MINI_USER@$MINI_IP:Documents/businesses/" "$LATEST/businesses/"; then
  COUNT=$(find "$LATEST/businesses/_shared/customers" -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
  ok "businesses mirrored (${COUNT} customer dirs)"
else
  bad "businesses rsync failed"
fi

# 2. studio — code + .env.local (excludes the heavy regenerables).
if rsync -az --delete --timeout=120 \
     --exclude node_modules --exclude .next --exclude .git \
     "$MINI_USER@$MINI_IP:Documents/studio/" "$LATEST/studio/"; then
  ok "studio mirrored (code + .env.local)"
else
  warn "studio rsync had issues (non-fatal — git is the real backup for code)"
fi

# 3. Dated hardlink snapshot — unchanged files cost ~zero disk.
SNAP_TODAY="$SNAP_DIR/$TODAY"
if [ ! -d "$SNAP_TODAY" ]; then
  if rsync -a --delete --link-dest="$LATEST" "$LATEST/" "$SNAP_TODAY/"; then
    ok "snapshot created: snapshots/$TODAY"
  else
    warn "snapshot hardlink failed (mirror is still current)"
  fi
else
  ok "snapshot for $TODAY already exists — refreshed mirror only"
fi

# 4. Prune snapshots older than KEEP_DAYS.
PRUNED=0
while IFS= read -r d; do
  rm -rf "$d" && PRUNED=$((PRUNED+1))
done < <(find "$SNAP_DIR" -maxdepth 1 -type d -name "20*" -mtime +"$KEEP_DAYS" 2>/dev/null)
[ "$PRUNED" -gt 0 ] && ok "pruned $PRUNED snapshot(s) older than ${KEEP_DAYS}d"

TOTAL=$(du -sh "$BACKUP_ROOT" 2>/dev/null | cut -f1)
echo "================================================================"
ok "backup complete — $BACKUP_ROOT ($TOTAL on disk)"
echo
