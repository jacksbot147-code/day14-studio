---
name: priority-ranker
description: Rank today's candidate priorities by leverage. Used by daily-kickoff to pick the top 3. Considers deadlines, blocker-unblocking, downstream impact. Supporting skill for daily-kickoff.
triggers:
  - "rank priorities"
  - "what's most important"
  - "highest leverage today"
---

# priority-ranker

> daily-kickoff says "today's top 3." This skill picks them from
> 10-20 candidates.

## Input
- List of candidate items (from MASTER_LOG, pending approvals, customer dossier next-steps, calendar events)

## Scoring per item

Each candidate gets scored on:

| Factor | Weight | Range |
|---|---|---|
| **Blocker-clearing** | 3 | 0-10 (10 = unblocks the most downstream work) |
| **Deadline pressure** | 3 | 0-10 (10 = today is last day to do without slipping a commitment) |
| **Revenue impact** | 2 | 0-10 (10 = directly affects customer #1 deposit / launch) |
| **Trust impact** | 2 | 0-10 (10 = customer is watching this directly) |
| **Effort cost** | -1 | 0-10 (effort REDUCES priority; cap at 8 effort, after which surface as "too big for today") |

Score = (blocker × 3) + (deadline × 3) + (revenue × 2) + (trust × 2) - (effort × 1)

Sort by score descending. Top 3 = today's priorities.

## What "blocker-clearing" means

A priority "clears a blocker" if completing it lets at least 2 other queued items proceed. Examples:

- Wiring the Supabase env vars → unblocks every code change that touches the DB
- Recording the Splash Jacks case study video → unblocks the Sunday post + 5 DMs from Council 0001
- Fixing the bootstrap script bug → unblocks the empire deploy

NOT blocker-clearing:
- Replying to a customer email (single thread)
- Writing one blog post

## Edge cases

### Multiple items tie at top score
Pick the one with lowest effort. Ties broken by recency (newer items higher).

### Top score is a blocker on Jack himself
If priority #1 requires Jack's input (approval, decision, signature) but Jack hasn't responded for >24h, escalate: surface as "this is blocking the day; need a decision now" rather than just listing.

### All candidates score < 5
Day is a "maintenance day" — priorities are low-leverage. Surface that pattern to Jack: "Nothing high-leverage today. Use today for {recommendation: rest / catch up / proactive work}."

## Output format

Return for `daily-kickoff` to use:

```
{
  "ranked": [
    {"item": "Send 5 personal DMs from Council 0001", "score": 14, "rationale": "deadline 8/M-W; blocker-clears acquisition path", "effort": 3},
    {"item": "Wire Supabase env vars in studio repo", "score": 12, "rationale": "blocker for any DB-touching code; low effort", "effort": 2},
    {"item": "Record Splash Jacks case study video", "score": 11, "rationale": "high revenue impact; deadline Sun for Mon post", "effort": 4},
    ...
  ],
  "deferred": ["..."],
  "maintenance_mode": false
}
```

## Hard rules

1. **Never rank more than 3 priorities as "today's top."** More = unfocused.
2. **Never let "effort" alone push a critical item off the top 3.** A high-effort blocker still wins.
3. **Always include the rationale.** Jack should see WHY each made the cut.
4. **Never re-rank within a day.** Morning ranking is the day's plan. Re-rank only if a critical new item arrives.

## When invoked
- Inside `daily-kickoff` every weekday morning
- Manually when Jack asks "what's most important right now?"
- Inside `weekly-council-review` to surface "what kept making it to top 3 but never shipped" (a recurring-stuck signal)

## Logging

`[YYYY-MM-DD HH:MM ET] priority-ranker → candidates: N, top_3: {list}, deferred: N, maintenance_mode: {yes|no}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('priority-ranker', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'priority-ranker', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
