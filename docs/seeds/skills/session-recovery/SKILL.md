---
name: session-recovery
description: When a Cowork session errors, context-compacts, gets killed, or an API call fails mid-task — how to pick back up without losing state or redoing work. Captures today's "API Error Internal server error" pattern that hit during skill harvest sub-agent.
triggers:
  - "API Error"
  - "Internal server error"
  - "context summarized"
  - "continuing from"
  - "pick up where"
  - "where were we"
  - "session crashed"
  - "ran out of context"
---

# session-recovery

> Long sessions break. Sub-agents error. Context compacts. The
> agent that handles these gracefully is more useful than the
> one that asks Jack "what were we doing?"

## The recovery sequence

When you sense session loss (context summary, API error, fresh
session), do these in order:

### 1. Read the state files (60 sec)
- `~/Documents/studio/docs/overnight/MASTER_LOG.md` — append-only timeline
- `~/Documents/studio/docs/SCHEDULED_TASK_CONTEXT.md` — orientation
- The most recent file in `~/Documents/studio/docs/overnight/` by mtime
- `~/Documents/studio/docs/day14-os-laptop-interim-plan.md` if it's the laptop-interim window

### 2. Read the TodoList state (30 sec)
Use `TaskList`. Filter for `status = in_progress`. That's where work
was when the session broke.

If multiple in_progress: pick the one with the latest update time.

### 3. Read the last 3 files modified (30 sec)
```bash
find ~/Documents/studio -mmin -60 -type f -not -path '*/node_modules/*'
```
The most recent edits are likely the work in flight.

### 4. Read the recent git log if applicable
```bash
cd ~/Documents/studio && git log --since="2 hours ago" --oneline
```
Commits show what shipped; uncommitted changes show what's pending.

### 5. Form a one-sentence summary
"Last thing I was doing: {action}. Last thing I wrote: {file}.
Last user message: {one-line}." Output this to Jack first.

### 6. Resume with one-step confirmation
Don't dive back into 5 actions. Output: "Picking up at {step}. Next
step: {one specific thing}. OK?"

Wait for Jack's nod. If he says "yes" or "go", proceed. If he says
"no, do X instead", pivot.

## Retry-vs-pivot decision

When an API error or tool error happens MID-task:

### Retry once
- Transient errors (5xx, network, rate-limit)
- Tool failures where the input was valid
- Network hiccups during file writes

### Pivot to in-session
- Sub-agent errors that block sub-task completion
- The same retry has already failed twice
- The work can be done with current tools instead of delegating

### Surface to Jack
- Auth failures (token expired, permission denied)
- Disk full / quota exceeded
- Sandbox restrictions (path not accessible)
- Anything where you'd be guessing what Jack wants

## Today's actual recovery example

The skill harvest sub-agent hit `API Error: Internal server error`.
Recovery path used:

1. Saw the error in chat
2. Checked `~/Documents/studio/docs/skill-harvest-findings.md` — 749 lines already written
3. Verified the sub-agent had completed its work; error was on response delivery only
4. Surfaced the finding to Jack with quote
5. Continued in-session without spawning another sub-agent

That's the pattern. Don't restart from scratch when state is preserved.

## State that should always persist across sessions

Make sure these get written DURING work, not after:

- File edits (write as you go, not at the end)
- MASTER_LOG entries (append on completion of each step)
- Task status updates (mark in_progress / completed as you transition)
- Commit messages (git commit at logical breakpoints, not "end of session")

If session dies, recoverable state should be on disk.

## What to NEVER do on recovery

1. **Never re-run a side-effecting action** without checking if it already ran. Example: don't create another scheduled task with the same task_id; check `list_scheduled_tasks` first.
2. **Never delete the previous attempt's output** unless you've verified it's wrong. The error might have been on the reply, not the work.
3. **Never ask Jack to repeat himself** if the answer is in scrollback or the state files. Read first.
4. **Never start fresh just because you can't remember.** Recovery is a SKILL — use it.

## When you don't have a clear recovery path

Surface honestly: "I can see we were working on {X}, but I'm not
sure if {step} completed. Should I {check_action} or pick up at
{alternative}?"

That's far better than guessing.

## Logging

When recovery succeeds:
`[YYYY-MM-DD HH:MM ET] session-recovery COMPLETE → resumed at: {step}, work preserved: {what}, time lost: ~{min}`

When recovery fails (true restart needed):
`[YYYY-MM-DD HH:MM ET] session-recovery FAILED → had to restart {scope}, lost: {what}, root cause: {one-line}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('session-recovery', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'session-recovery', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
