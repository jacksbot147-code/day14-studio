#!/usr/bin/env bash
# attach-growth-hook.sh
#
# Append a standardized "Growth hook" section to every SKILL.md in
# ~/Documents/studio/docs/seeds/skills/. Idempotent — only adds the
# section if it isn't already present.
#
# Why: every skill should be aware of the growth-always-on system.
# When it fires, it logs. When it almost-fires-but-doesn't, it logs
# the gap. That data feeds growth-watcher's pattern detection.

set -euo pipefail

SEEDS_DIR="$HOME/Documents/studio/docs/seeds/skills"

GREEN="\033[0;32m"
DIM="\033[2m"
YELLOW="\033[0;33m"
RESET="\033[0m"

log()  { printf "${GREEN}✓${RESET} %s\n" "$1"; }
skip() { printf "${DIM}·${RESET} %s\n" "$1"; }
warn() { printf "${YELLOW}!${RESET} %s\n" "$1"; }

# The growth-hook snippet that gets appended
read -r -d '' GROWTH_HOOK <<'EOF' || true

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('{name}', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: '{name}', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).

EOF

if [ ! -d "$SEEDS_DIR" ]; then
  echo "ERROR: seeds dir not found at $SEEDS_DIR"
  exit 1
fi

count_total=0
count_attached=0
count_skipped=0

for skill_dir in "$SEEDS_DIR"/*/; do
  skill_name=$(basename "$skill_dir")
  skill_file="$skill_dir/SKILL.md"

  # Skip _drafts directory
  if [[ "$skill_name" == "_drafts" ]]; then
    continue
  fi

  if [ ! -f "$skill_file" ]; then
    warn "no SKILL.md in $skill_name, skipping"
    continue
  fi

  count_total=$((count_total + 1))

  # Idempotency check — only attach if hook isn't already present
  if grep -q "## Growth hook (auto-attached)" "$skill_file"; then
    count_skipped=$((count_skipped + 1))
    skip "exists, kept: $skill_name"
    continue
  fi

  # Personalize the snippet with the skill name
  hook_personalized=$(echo "$GROWTH_HOOK" | sed "s/{name}/$skill_name/g")

  # Append to file
  printf "%s\n" "$hook_personalized" >> "$skill_file"
  count_attached=$((count_attached + 1))
  log "attached growth hook: $skill_name"
done

echo
echo "================================================================"
echo "Total skills:    $count_total"
echo "Hook attached:   $count_attached"
echo "Already had it:  $count_skipped"
echo "================================================================"
