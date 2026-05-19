#!/usr/bin/env bash
# sanity-check-day14-os.sh
# Run after bootstrap-day14-os.sh to verify the empire is healthy.
# Exit code 0 = all checks pass. Non-zero = at least one failure.
# Re-runnable. No side effects.

set -uo pipefail

BUSINESSES_DIR="$HOME/Documents/businesses"
SHARED_DIR="$BUSINESSES_DIR/_shared"

GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
RESET="\033[0m"

pass() { printf "${GREEN}✓${RESET} %s\n" "$1"; }
fail() { printf "${RED}✗${RESET} %s\n" "$1"; ((FAILURES++)); }
warn() { printf "${YELLOW}!${RESET} %s\n" "$1"; }

FAILURES=0

echo
echo "Day14 OS — sanity check"
echo "================================================================"
echo

# ---- directory tree ----
echo "Directory tree..."
for d in _shared/{agents,skills,templates,sql,council-log} day14 splash-jacks-pools casamore buildbridge research-agent; do
  if [ -d "$BUSINESSES_DIR/$d" ]; then
    pass "$BUSINESSES_DIR/$d exists"
  else
    fail "$BUSINESSES_DIR/$d missing"
  fi
done

# ---- skills installed ----
echo
echo "Skills..."
for skill in council-decision day14-voice swfl-context; do
  if [ -f "$SHARED_DIR/skills/$skill/SKILL.md" ]; then
    lines=$(wc -l < "$SHARED_DIR/skills/$skill/SKILL.md")
    if [ "$lines" -gt 10 ]; then
      pass "skill: $skill ($lines lines)"
    else
      fail "skill: $skill exists but is suspiciously short ($lines lines)"
    fi
  else
    fail "skill: $skill missing"
  fi
done

# ---- agents installed ----
echo
echo "Agents..."
for agent in build-agent; do
  if [ -f "$SHARED_DIR/agents/$agent.md" ]; then
    pass "agent: $agent"
  else
    fail "agent: $agent missing"
  fi
done

# ---- sql ----
echo
echo "SQL..."
if [ -f "$SHARED_DIR/sql/day14-os-schema.sql" ]; then
  if grep -q "create table if not exists customers" "$SHARED_DIR/sql/day14-os-schema.sql"; then
    pass "SQL schema present and contains customers table"
  else
    fail "SQL schema present but missing customers table"
  fi
else
  fail "SQL schema missing"
fi

# ---- customer dossier template ----
echo
echo "Customer dossier template..."
TEMPLATE_DIR="$SHARED_DIR/templates/customer-dossier"
for f in README.md 00-intake.md 01-brand.json 02-build-log.md 03-approvals.md 04-feedback.md 05-launch.md; do
  if [ -f "$TEMPLATE_DIR/$f" ]; then
    pass "template: $f"
  else
    fail "template: $f missing"
  fi
done

# ---- council-log ----
echo
echo "Council log..."
if ls "$SHARED_DIR/council-log/"*.md > /dev/null 2>&1; then
  count=$(ls "$SHARED_DIR/council-log/"*.md 2>/dev/null | wc -l)
  pass "council-log has $count entries"
else
  fail "council-log is empty (should have at least entry 0001)"
fi

# ---- git initialized in _shared ----
echo
echo "Git..."
if [ -d "$SHARED_DIR/.git" ]; then
  cd "$SHARED_DIR"
  commits=$(git rev-list --count HEAD 2>/dev/null || echo 0)
  pass "_shared has git history ($commits commits)"
else
  fail "_shared has no git history"
fi

# ---- claude desktop running (best-effort) ----
echo
echo "Claude desktop (best-effort check)..."
if pgrep -i -f "Claude.app" > /dev/null 2>&1; then
  pass "Claude desktop appears to be running"
else
  warn "Claude desktop doesn't appear to be running — open it to enable scheduled tasks"
fi

# ---- macOS sleep prevention (best-effort) ----
echo
echo "Sleep prevention (best-effort check)..."
if command -v pmset > /dev/null 2>&1; then
  sleep_val=$(pmset -g | awk '/ sleep / {print $2; exit}')
  if [ "$sleep_val" = "0" ]; then
    pass "system sleep disabled (pmset sleep = 0)"
  else
    warn "system sleep is enabled (pmset sleep = $sleep_val) — see runbook 'Always-on settings'"
  fi
fi

# ---- summary ----
echo
echo "================================================================"
if [ "$FAILURES" -eq 0 ]; then
  printf "${GREEN}All checks passed.${RESET} Day14 OS is healthy.\n"
  exit 0
else
  printf "${RED}%d check(s) failed.${RESET} Re-run bootstrap or investigate above.\n" "$FAILURES"
  exit 1
fi
