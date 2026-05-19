---
name: error-recovery-resume
description: When a Cowork session hits a 500 / API error mid-task, this skill is the resume protocol. Picks up where the error happened, verifies what got persisted, continues. Counters the "DAY 14 Agents" pattern that hit 500s twice consecutively and burned 30 min of context per recovery.
triggers:
  - "API Error"
  - "500 error"
  - "session crashed"
  - "internal server error"
  - "resume after error"
---

# error-recovery-resume

> 500s happen. Once a session hits one, the recovery move is
> well-defined. Without a skill: 30 min of re-discovery. With this
> skill: 3 min back to productive work.

## When this skill fires

Trigger: any agent message that includes:
- "API Error: Internal server error"
- "500"
- Tool returned an error status
- "request failed"

## The 6-step resume protocol

### 1. Don't panic-retry
Resist the urge to immediately call the same tool again. A 500 might be:
- Transient (will resolve)
- Caused by your input (will fail again)
- Server-side outage (extended)

### 2. Read state files (60 seconds)
```bash
# Last 5 MASTER_LOG entries
tail -5 ~/Documents/studio/docs/overnight/MASTER_LOG.md

# Files modified in last 30 min
find ~/Documents/studio ~/Documents/businesses -mmin -30 -type f -not -path '*/node_modules/*' | head -20

# Current TodoList
# (call TaskList; identify in_progress items)
```

### 3. Identify what got persisted vs lost
For the work in progress when the error hit:
- Did files get written before the error? → those persisted
- Was the error during the response delivery? → work likely persisted, only chat reply failed
- Was the error during the tool call? → work may be partial

### 4. Verify with pre-flight checks
For each file that should exist:
- `ls -la {path}` and check size
- Spot-check content

### 5. Re-establish context in chat
Output to Jack:
```
Recovered from 500 mid-task. State:
- {What was done before error — bullet list}
- {What's still pending}
- Next step: {one specific action}
```

### 6. Resume, retry once
If state is mostly intact, continue from where you left off. If a single tool call failed, retry ONCE with a 5-second gap.

If the retry also fails: pivot to in-session work instead of sub-agent or external call (as we did with the skill harvest sub-agent failure).

## Failure recovery decision tree

```
500 error
  ├── Mid-Write (file may be partial)
  │     └── ls + head → if complete, log success; if partial, delete and re-Write
  ├── Mid-tool-call (no work persisted)
  │     └── retry once after 5s
  ├── On reply (work persisted)
  │     └── re-establish context; mark done
  └── Mid-sub-agent
        └── pivot to in-session work; spawn smaller scope if retry needed
```

## Anti-patterns

❌ Apologize at length to Jack — wastes context
❌ Re-read all files from scratch — slow + redundant
❌ Retry the same exact call 5 times — server-side errors don't fix themselves
❌ Spawn another sub-agent for the same job — pivot scope, not just retry
❌ Ask Jack "what were we doing?" — read state files yourself

## Patterns

✓ Acknowledge briefly: "Hit a 500, recovering..."
✓ Read state files in parallel (one tool batch)
✓ Pivot scope to avoid the failing path
✓ Update TaskList to reflect actual state

## When invoked
- The moment a tool call returns 500 / "Internal server error"
- When a sub-agent reports failure
- When chat reply hits "Something went wrong" UI

## Logging
`[YYYY-MM-DD HH:MM ET] error-recovery-resume → trigger: {what failed}, state_check: {pass|partial}, recovery: {resumed|pivoted|retried}`

Quarterly: count recovery actions. If recovery rate > 10/week, something structurally is wrong (probably scope-too-big sessions).
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('error-recovery-resume', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'error-recovery-resume', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
