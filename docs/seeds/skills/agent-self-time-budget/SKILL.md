---
name: agent-self-time-budget
description: Every multi-step task an agent takes on must name its time budget upfront AND report against it at completion. Catches scope creep early. Trains accurate estimation over time.
triggers:
  - "time budget"
  - "estimate this task"
  - "how long will this take"
---

# agent-self-time-budget

> "It'll be quick" turns into 90 minutes. Without a stated budget,
> there's no way to know when to stop and ship rough.

## The contract

Every task with 3+ steps OR an expected duration >15 min must:

### At task start
State the budget in the response:
```
Budget: ~{N} min. Will stop at {N × 1.5} regardless.
```

### At task end
Report actual vs budget:
```
Done. Budget was {N} min; actual {M} min. Variance: {±%}.
```

If variance >50% over budget: flag it. Future estimates should adjust.

## Budget tiers (calibrated over time)

| Task type | Default budget |
|---|---|
| Write a single SKILL.md | 10-15 min |
| Write 3 SKILL.md (a cluster) | 30-45 min |
| Write an agent system prompt | 30 min |
| Run a Council protocol | 25 min |
| Run skill harvest | 45-60 min |
| Set up a vendor (Stripe/Resend/etc.) via browser-driven | 30 min |
| Wire a webhook handler end-to-end | 60 min |
| Update bootstrap script | 5 min |
| Add a single env var | 2 min |

These adjust based on observed averages over time.

## Stop-at-1.5x rule

When current time = 1.5 × stated budget:
- STOP whatever's mid-flight
- Ship what's complete
- Defer the rest to next session

This prevents:
- 3-hour rabbit holes
- Burning context for diminishing returns
- "Just one more thing" creep

## Recording for calibration

When a task completes, log to `~/Documents/studio/docs/overnight/MASTER_LOG.md`:
```
[YYYY-MM-DD HH:MM ET] {task} COMPLETE → budget: {N}min, actual: {M}min, variance: {±%}, confidence: {0-1}
```

Quarterly review: which task types consistently blow budget? Recalibrate the defaults.

## How this pairs with stop-and-ship-timer

- `agent-self-time-budget` = the BUDGET (estimated time)
- `stop-and-ship-timer` = the HARD CAP (when to fire the ship-or-defer move)

Budget < cap. Both can fire.

## Hard rules

1. **Never start a multi-step task without stating budget.** Even if it's "30 min."
2. **Never silently exceed 1.5× budget.** Flag and either re-budget or stop.
3. **Always report actual vs budget** at task end. Builds calibration data.
4. **Never carry an over-budget rationale to next time** ("I went over because X" — fix the estimate; don't excuse the variance).

## When invoked
- At the start of any task spanning 3+ tool calls
- At the end of every completed task
- In `daily-eod` to surface "what we estimated badly today"

## Logging

(Examples above.) Pattern after 30+ tasks reveals systemic over/underestimation. Tune the budget table.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('agent-self-time-budget', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'agent-self-time-budget', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
