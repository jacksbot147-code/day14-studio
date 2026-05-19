---
name: growth-metrics-dashboard
description: The empire's growth velocity at a glance. New skills/week, dormant skills, drafts pending, merge candidates, version bumps. Feeds Jack's morning view of "how is the empire evolving?"
triggers:
  - "growth metrics"
  - "empire stats"
  - "skill velocity"
  - "/empire"
---

# growth-metrics-dashboard

> 169+ skills today. Every week the number shifts. This skill is
> the single answer to "how is the empire growing this week?"

## What gets reported

A weekly rollup at `~/Documents/studio/docs/growth-metrics-{YYYY-MM-DD}.md`:

```
# Growth metrics — week of {date}

## Empire size
- Total skills: 169 (+8 this week)
- Active in last 30 days: 124 (73%)
- In _drafts/ pending review: 5
- Archived this week: 1

## Velocity
- New skills last 7 days: 8
- Avg new skills / week (4-week trailing): 6.5
- Promotions from _drafts/: 3
- Drafts that DIDN'T promote (archived): 2

## Patterns
- Most-invoked skill last 7 days: day14-voice (47 fires)
- Newly-active skill (first invocation in 30d): postmortem-writer
- Newly-dormant skill (last fire >90d ago): chemistry-reading-parser (expected — no pool customer)

## Health signals
- Growth-watcher heartbeats in last 24h: 287 ✓
- Telegram-poller heartbeats: 17,280 ✓
- Events-poller heartbeats: 8,640 ✓
- Average draft-time (event → draft): 4.2 min
- Average promotion latency (draft → _shared): 2.3 days

## Open items (Jack-actionable)
- 5 drafts pending review
- 1 merge proposal pending
- 2 deprecation candidates (90+ days dormant, non-allowlist)

## Trend (vs last week)
- New skills: +8 vs +5 last week ↑
- Active %: 73 vs 71 last week ↑
- Drafts pending: 5 vs 3 last week ↑ (Jack is behind on review)
```

## How it's computed

Reads:
- `~/Documents/businesses/_shared/growth/work-register.jsonl` (invocations)
- `~/Documents/businesses/_shared/growth/growth-log.md` (draft history)
- `~/Documents/studio/docs/skill-changelog.md` (version bumps)
- `~/Documents/businesses/_shared/skills/` (current installed count)
- `~/Documents/studio/docs/seeds/skills/_drafts/` (pending)
- `~/Documents/businesses/_shared/skills/_archived/` (archived count)

Plus heartbeat files for poller health:
- `~/Documents/businesses/_shared/poller/{name}-heartbeat.log`

## Surface targets

The dashboard renders for 3 audiences:

### Telegram (compact)
Inline in the Sunday morning kickoff:
```
📊 Empire growth this week
+8 skills (5 drafts pending your tap)
124/169 active (73%)
1 merge candidate
```

### Markdown doc (full)
The complete report above. Linked via `view-link-handoff` pattern.

### MRR-style watch complication
Just two numbers:
- New skills this week: 8
- Drafts pending: 5

## Hard rules

1. **Always pull live numbers** — never cache more than 10 min.
2. **Always include the trend column** — current snapshot alone is less useful than direction.
3. **Always surface "open items" prominently** — those are Jack's action queue.
4. **Never include customer-specific data.** Skill metrics are Day14-OS-level only.

## When invoked

- Weekly via scheduled task (Sunday 7 AM ET, before kickoff)
- Manually via `/empire` Telegram command
- Inside `weekly-council-review` for trend awareness
- After every 10 new skill additions (milestone marker)

## Failure modes

- **One of the source files missing**: report what we have; flag the gap
- **Heartbeat files are stale (all 3 pollers offline)**: surface as P0 — empire is silent
- **Empire count drops** (multiple archives): expected during pruning; still report; flag if unexpected

## Logging

`[YYYY-MM-DD HH:MM ET] growth-metrics-dashboard → empire_size: {N}, active_pct: {N}, drafts_pending: {N}, trend: {direction}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('growth-metrics-dashboard', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'growth-metrics-dashboard', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
