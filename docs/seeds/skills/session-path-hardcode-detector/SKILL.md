---
name: session-path-hardcode-detector
description: Catches scheduled-task prompts and skill files that hardcode session-specific paths like /sessions/vigilant-gallant-meitner/mnt/.... Those paths only exist in the current Cowork sandbox and break on every new session. The Casamoré daily-backup failure was this exact bug.
triggers:
  - "scheduled task prompt"
  - "/sessions/"
  - "session path"
  - "sandbox path"
  - "task fails on next run"
---

# session-path-hardcode-detector

> A scheduled task's prompt runs in a FRESH Cowork session every time
> it fires. The sandbox path changes per session. Any prompt that
> hardcodes `/sessions/{name}/mnt/...` will fail on its second run.
> This skill catches that before the task is scheduled.

## The bug pattern

```text
❌ /sessions/vigilant-gallant-meitner/mnt/Documents/studio/...
❌ /sessions/quiet-radiant-curie/mnt/Documents/...
❌ /private/var/folders/.../T/claude-hostloop-plugins/...
```

These paths are SANDBOX-INTERNAL. They:
- Exist only for the duration of the current session
- Get a new random session-name on every Cowork window open
- Are NOT accessible from a fresh scheduled-task agent

## The fix

Always use HOST paths in scheduled-task prompts and skill files:

```text
✅ ~/Documents/studio/...
✅ ~/Documents/businesses/_shared/...
✅ /Users/jcboppington/Documents/...
```

The host paths are stable across sessions because they resolve on
Jack's actual macOS filesystem, not the sandbox.

## When this skill fires

Invoke this check before any of these operations:

1. Writing a scheduled-task prompt (use `scheduled-task-prompt-author` skill which already calls this)
2. Writing a SKILL.md that references file paths
3. Writing an agent system prompt with file references
4. Editing the `mcp__scheduled-tasks__create_scheduled_task` or `update_scheduled_task` call's `prompt` field

## The detection pattern

Search the candidate text for these regex patterns:

```regex
/sessions/[a-z]+-[a-z]+-[a-z]+/mnt/
/private/var/folders/[A-Za-z0-9_/]+/T/
/var/folders/[a-z0-9]+/[A-Z]/T/claude-
\.claude-hostloop-plugins/[a-f0-9]+/
```

Any match = hardcoded session path. Refuse to ship the prompt.

## The fix-up rewrite table

| Sandbox path | Host equivalent |
|---|---|
| `/sessions/{name}/mnt/Documents/` | `~/Documents/` |
| `/sessions/{name}/mnt/.claude/skills/` | (read-only — use host path of skill) |
| `/sessions/{name}/mnt/outputs/` | (these are temporary — copy to ~/Documents if needed) |
| `/sessions/{name}/mnt/uploads/` | `~/Library/Application Support/Claude/local-agent-mode-sessions/.../uploads/` (avoid; ask user to move files to ~/Documents) |
| `/private/var/folders/.../T/claude-hostloop-plugins/{hash}/skills/{name}/` | `~/Documents/businesses/_shared/skills/{name}/` |

## Failure mode

The Casamoré `casamore-daily-backup` task failed exactly this way:

> Task aborted because it hardcoded a session-specific path.
> Source: harvest findings, "session-path-hardcode-detector" candidate.

The fix at the time was to manually rewrite the prompt to use
`~/Documents/casamore/` instead of the sandbox path. This skill
prevents the bug class from recurring.

## How to invoke

When the agent is about to call `create_scheduled_task` or
`update_scheduled_task`, run this skill's check against the `prompt`
parameter. If any forbidden path appears, halt and prompt the user
with the rewrite suggestion.

Pseudocode:

```text
forbidden_patterns = [
  r"/sessions/[a-z]+-[a-z]+-[a-z]+/mnt/",
  r"/private/var/folders/[A-Za-z0-9_/]+/T/",
  r"/var/folders/[a-z0-9]+/[A-Z]/T/claude-",
  r"\.claude-hostloop-plugins/[a-f0-9]+/",
]

for pattern in forbidden_patterns:
    if matches(pattern, prompt):
        return BLOCK, with rewrite suggestion
```

## Logging

When a hardcode is caught:
`[YYYY-MM-DD HH:MM ET] session-path-hardcode-detector BLOCKED → matched: {pattern}, rewrite: {host_path}`

When a hardcode slips past and a task fails:
`[YYYY-MM-DD HH:MM ET] session-path-hardcode FAILURE → task: {id}, miss reason: {one-line postmortem}`

Quarterly review of failures should result in tightening this skill's
regex set.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('session-path-hardcode-detector', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'session-path-hardcode-detector', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
