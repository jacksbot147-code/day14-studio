---
name: parallel-task-fanout-author
description: When a large scope is requested, split into N independent hourly scheduled tasks rather than one monolithic mega-task. Monoliths hit mid-task 500s; small parallel tasks resume from their own state. Pattern observed in Empire daily build (success) vs DAY 14 Agents (failure).
triggers:
  - "this is going to be a lot"
  - "break into tasks"
  - "split overnight work"
  - "fan out"
---

# parallel-task-fanout-author

> One 6-hour scheduled task fails halfway and loses 3 hours of work.
> Six 1-hour scheduled tasks fail independently — only 1 needs retry.
> Always prefer the latter.

## When to fan out

Trigger this skill when:
- A scheduled task's expected duration > 90 min
- A scope has 5+ independent sub-tasks
- The work spans multiple tenants (e.g., "audit Splash Jacks + Casamoré + Buildbridge")
- A single failure in the middle would cost > 30 min of re-work

## The fanout protocol

### Step 1 — identify independence
Decompose the scope. For each sub-task, ask:
- Does it depend on the output of another sub-task?
- If yes → sequence required, not parallel
- If no → eligible for parallel scheduling

### Step 2 — set hourly anchors
For N independent sub-tasks, schedule N tasks at hourly intervals:
- Task 1 at H+0 (e.g., 1:00 AM)
- Task 2 at H+1 (2:00 AM)
- Task N at H+(N-1)

Or use a wider spread if computationally heavy. Always at least 30 min between starts.

### Step 3 — define exit per task
Each sub-task gets its own:
- Time budget (use `agent-self-time-budget`)
- Output path (so each writes to its own file)
- MASTER_LOG line
- Recovery branch (if this task fails, the others still run)

### Step 4 — schedule the digest
The LAST scheduled task at H+N is a "morning briefing" digest that reads the outputs of the N prior tasks and produces a single consolidated report.

This is the pattern used for the May 16 overnight (4 tasks: runbook audit, seed expansion, comms pack, morning briefing).

## Example: 6-hour overnight scope

❌ MEGA-TASK (don't):
```
Task: "Audit Splash Jacks + Casamoré + Buildbridge + Day14 marketing site + 
write postmortems + propose skill updates + run weekly council review + 
publish blog drafts" — fire at 1:00 AM, 6 hour budget
```

✓ FANOUT (do):
```
Task 1 (1:00 AM, 45 min): Splash Jacks polish audit
Task 2 (2:00 AM, 45 min): Casamoré polish audit
Task 3 (3:00 AM, 45 min): Buildbridge polish audit  
Task 4 (4:00 AM, 45 min): Day14 marketing audit
Task 5 (5:00 AM, 45 min): Weekly council review
Task 6 (6:00 AM, 30 min): Blog draft selection
Task 7 (7:30 AM, 30 min): Morning briefing consolidation
```

If Task 3 hits a 500, Tasks 4-7 still run. Task 3 retries in the morning.

## Hard rules

1. **Never schedule a single task >90 min budget.** Split into multiple.
2. **Always include the morning-briefing consolidation task** when fanning out — Jack reads one doc, not N.
3. **Every task gets its own output path.** No two tasks write to the same file (race conditions).
4. **Each task can run independently.** No mid-night dependencies.

## When invoked
- Anytime a scope > 90 min is about to be scheduled
- Inside `scheduled-task-prompt-author` as a pre-check
- Manually when Jack asks "schedule everything for tonight"

## Logging

`[YYYY-MM-DD HH:MM ET] parallel-task-fanout-author → scope: {brief}, fanout_count: {N}, total_budget_min: {sum}, last_task_at: {time}`

Quarterly: what's the success rate of fanned-out tasks vs monoliths? Expectation: 90%+ vs 60%.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('parallel-task-fanout-author', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'parallel-task-fanout-author', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
