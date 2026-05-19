---
name: idempotent-bash-script
description: Every bash script Day14 ships (bootstrap, brand-swap, sanity-check, customer-dossier-init) must be safe to re-run. Encodes the patterns that make that true. Lesson learned the hard way when bootstrap's dossier section copied only README and missed 6 files on a re-run.
triggers:
  - "bash script"
  - "shell script"
  - ".sh file"
  - "bootstrap"
  - "automation script"
---

# idempotent-bash-script

> Re-running a script should never break state. The agent that writes
> a script that fails idempotency wastes Jack's time AND erodes trust
> in the tooling. This skill is the contract that prevents that.

## Required headers

Every Day14 bash script starts with:

```bash
#!/usr/bin/env bash
# {script-name}.sh
# {one-line purpose}
# Idempotent. Safe to re-run.

set -euo pipefail
```

- `set -e` — exit on first error (fail loud, not silent)
- `set -u` — undefined variable references are errors
- `set -o pipefail` — pipe failures don't get swallowed

## Pretty output (consistent across scripts)

```bash
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
DIM="\033[2m"
RESET="\033[0m"

log()  { printf "${GREEN}✓${RESET} %s\n" "$1"; }   # action taken
skip() { printf "${DIM}·${RESET} %s\n" "$1"; }     # already done
warn() { printf "${YELLOW}!${RESET} %s\n" "$1"; }  # non-fatal
fail() { printf "${RED}✗${RESET} %s\n" "$1"; }     # fatal
```

Convention: a re-run on a healthy state shows mostly `· exists, kept`
lines. A fresh run shows mostly `✓ seeded` lines.

## The seed_file helper

For any script that copies template files:

```bash
seed_file() {
  local src="$1"
  local dst="$2"
  local label="$3"
  if [ ! -f "$dst" ]; then
    cp "$src" "$dst"
    log "seeded $label"
  else
    skip "exists, kept: $label"
  fi
}
```

Never use bare `cp src dst` — it overwrites. Always check first.

## The directory-loop pattern

When seeding multiple files into a directory, loop over an EXPLICIT
list, not a glob or `cp -r`:

```bash
# ❌ BAD — depends on hidden state, breaks on partial fills
cp -r "$SRC_DIR/." "$DST_DIR/"

# ❌ BAD — guards only the README; misses 6 other files (today's bootstrap bug)
[ -f "$DST_DIR/README.md" ] && cp "$SRC_DIR/README.md" "$DST_DIR/"

# ✅ GOOD — explicit list, idempotent per-file
for f in README.md 00-intake.md 01-brand.json 02-build-log.md 03-approvals.md; do
  seed_file "$SRC_DIR/$f" "$DST_DIR/$f" "label: $f"
done
```

## Lock files for write-once operations

For operations that MUST only run once (git init, initial database
seed, first-time config), use a lock file:

```bash
LOCK="$STATE_DIR/.bootstrapped"
if [ -f "$LOCK" ]; then
  skip "already bootstrapped on $(cat $LOCK)"
  exit 0
fi

# ... do bootstrap work ...

date > "$LOCK"
log "bootstrap complete"
```

## Exit codes

- `0` — success or no-op (re-run on healthy state)
- `1` — fatal error, user must act
- `2` — partial success with warnings
- `127` — required tool not installed

Never `exit 0` from a fatal path. The caller depends on the exit code.

## Argument parsing

Scripts that accept flags use this pattern:

```bash
DRY_RUN=false
VERBOSE=false

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --verbose|-v) VERBOSE=true; shift ;;
    --help|-h) print_help; exit 0 ;;
    *) fail "unknown flag: $1"; print_help; exit 1 ;;
  esac
done
```

Always implement `--dry-run` for any script that creates / modifies
state. Always implement `--help`.

## Path handling

- Always use absolute paths: `$HOME/Documents/studio` not `~/Documents/studio`
- Quote every path variable: `"$DIR"` not `$DIR`
- Never use spaces in path names (kebab-case everywhere)

## What to refuse

A bash script should NEVER:

1. Auto-`rm -rf` anything outside a freshly-created temp directory
2. Send network requests without explicit user knowledge
3. Modify `~/.zshrc` or shell config without prompting
4. Install packages without `--yes` being explicit
5. `sudo` anything not pre-approved by the user

If a script needs to do any of these, error out with a clear "run
manually" message rather than auto-executing.

## Testing the idempotency

Before claiming a script is idempotent, run it twice in a row in
a fresh state:

1. `bash script.sh` — expect green ✓ lines for each action
2. `bash script.sh` — expect dim · lines saying "exists, kept"

If run #2 shows ✓ lines for things already done, the script is NOT
idempotent. Fix it before shipping.

## When to invoke this skill

Before writing or editing any `.sh` file under `~/Documents/studio/scripts/`,
`~/Documents/businesses/_shared/scripts/`, or any customer build's
`scripts/` directory.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('idempotent-bash-script', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'idempotent-bash-script', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
