---
name: incremental-scope-commit
description: Commit completed P0 work before any scope expansion. Prevents the "now also..." drift that loses earlier completed work to mid-session errors. Lesson from DAY 14 Agents session that hit a 500-error mid-scope-expansion and lost partial work.
triggers:
  - "now also"
  - "while we're at it"
  - "and add"
  - "scope creep"
  - "before we expand"
---

# incremental-scope-commit

> The DAY 14 Agents session hit a 500 mid-scope-expansion. The
> already-done P0 work hadn't been committed yet. Recovery cost an
> hour. This skill prevents that pattern.

## The protocol

When working on a multi-step task:

### Step 1 — Define the P0 scope upfront
Explicitly write down: "P0 = {smallest shippable version}. P1 = nice-to-have. P2 = future."

### Step 2 — Ship P0 to disk + register
When P0 is done:
- Write all P0 files
- Run `pre-flight-verification-pass`
- Update relevant registry (bootstrap.sh, etc.)
- Append to MASTER_LOG with `kind: p0-shipped`
- Optionally git commit if applicable

### Step 3 — Only then expand
After P0 is safely on disk + registered:
- Begin P1 work
- Same protocol when P1 completes

### Step 4 — On scope creep ("now also...")
When Jack adds a new ask mid-session:
- Acknowledge the new ask
- DO NOT start it immediately
- First: complete current step + commit
- Then: surface the new ask as a separate work item

## Why this matters

If a 500-error hits during P1 work:
- WITHOUT this skill: P0 might also be lost (in-memory only, not on disk)
- WITH this skill: P0 is preserved; P1 retry costs only the P1 work

## The anti-pattern this catches

```
User: "Build X"
Agent: starts X
User: "Also Y"
Agent: pivots to X+Y combined
Agent: hits error halfway through
Agent: has to restart X entirely
```

The fix:
```
User: "Build X"
Agent: starts X
Agent: ships X (commits to disk)
User: "Also Y"
Agent: acknowledges; starts Y
Agent: hits error halfway through Y
Agent: X is still safe; only Y to retry
```

## Hard rules

1. **Never expand scope without first committing the previous step.** Even when the expansion is small.
2. **Always update the registry inline** (bootstrap.sh, etc.) when seeding new files. Don't batch "I'll update bootstrap at the end."
3. **Always run pre-flight-verification-pass** before declaring P0 done.
4. **The "commit" doesn't have to be git** — disk write + MASTER_LOG append is the minimum.

## When invoked

- At the start of any multi-step task that has natural milestones
- When Jack adds a new ask mid-task
- Inside `agent-self-debug` when recovering from an error

## Logging

`[YYYY-MM-DD HH:MM ET] incremental-scope-commit → P0 shipped, expanding to: {what}`

After scope expansion completes:
`[YYYY-MM-DD HH:MM ET] incremental-scope-commit → P1 also shipped, total work: {summary}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('incremental-scope-commit', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'incremental-scope-commit', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
