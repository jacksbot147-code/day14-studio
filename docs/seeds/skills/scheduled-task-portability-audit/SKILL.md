---
name: scheduled-task-portability-audit
description: Pre-flight check on every scheduled-task prompt before it's saved. Catches session-path hardcodes, relative paths, and other "works-here-fails-there" patterns. Would have caught the Casamoré daily-backup failure. Supporting skill for scheduled-task-prompt-author.
triggers:
  - "audit task prompt"
  - "scheduled task portability"
  - "will this run elsewhere"
---

# scheduled-task-portability-audit

> The Casamoré daily-backup task targeted `/sessions/sharp-serene-einstein/mnt/site 2/` but ran in a different session every time. Production failure. This skill catches the class.

## What gets audited

When `mcp__scheduled-tasks__create_scheduled_task` is about to fire, run the prompt through this check.

### Forbidden patterns (block immediately)

```regex
/sessions/[a-z]+-[a-z]+-[a-z]+/mnt/
/private/var/folders/[A-Za-z0-9_/]+/T/
/var/folders/[a-z0-9]+/[A-Z]/T/claude-
\.claude-hostloop-plugins/[a-f0-9]+/
\$\{[A-Z_]+\}    (env vars without verified fallback)
\.\./(\.\./)+   (relative paths going up >2 levels)
```

Any match → REJECT. Surface to author with the rewrite suggestion.

### Required patterns (must have one)

The prompt must contain at least one OF:
- `~/Documents/`
- `$HOME/Documents/`
- `/Users/jcboppington/Documents/`

If none → the task doesn't reference Jack's actual filesystem; likely the wrong scope. Reject.

### Soft warnings (notify but don't block)

- Hardcoded port numbers other than 3000 / 3001 (might be session-specific)
- References to "today" / "yesterday" without computing the date (will be wrong on second run)
- Specific Cowork session IDs in the prompt body

## Output

```
PORTABILITY AUDIT

✓ pass | ✗ fail (block)
Warnings: N

Findings:
1. {pattern matched} at "{quoted text}"
   Rewrite: {suggestion}

Verdict: {OK to schedule | REWRITE BEFORE SCHEDULING}
```

## Hard rules

1. **Never let a forbidden-pattern prompt through.** Better to block than to fail at 3 AM.
2. **Never auto-rewrite the prompt** — surface the suggestion; author confirms.
3. **Always log a hit even if the audit passes** — the metric is "how often did this catch a bug."

## How to invoke

Wrap every `create_scheduled_task` call:
```
1. Run audit against `prompt` parameter
2. If PASS: proceed with scheduling
3. If FAIL: do not call create_scheduled_task; surface rejection
```

## When invoked
- Before every scheduled-task creation
- Manually when retroactively auditing existing tasks
- Inside `pattern-recurrence-detector` if session-path failures recur

## Logging

`[YYYY-MM-DD HH:MM ET] scheduled-task-portability-audit → task_id: {id}, result: {pass|fail}, findings: {N}`

When blocked:
`[YYYY-MM-DD HH:MM ET] ⚠️ scheduled-task-portability-audit BLOCKED — task_id: {id}, pattern: {what}, rewrite: {suggestion}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('scheduled-task-portability-audit', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'scheduled-task-portability-audit', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
