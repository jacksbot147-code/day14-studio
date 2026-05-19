---
name: morning-briefing-generator
description: Assemble Jack's morning 30-min tap-through queue. Reads from drafts, growth log, churn-risk, heartbeats, audit log, and outbox. Produces a single decision-ranked doc + Telegram P1 ping.
triggers:
  - "morning briefing"
  - "tap queue"
  - "daily kickoff"
  - "/brief"
---

# morning-briefing-generator

> 30 minutes a day is what Jack gives to the empire's review work.
> This skill makes those 30 minutes max-leverage.

## What it aggregates

Every morning at 8:30 AM ET (or on `/brief`):

| Source | What's pulled |
|---|---|
| `_drafts/` (domain drafts) | Pending review — auto-drafted skill candidates |
| `_drafts/_meta/` (meta drafts) | Pending review — recursive-layer drafts |
| `growth-log.md` | Last 24h growth-watcher activity |
| `meta-gaps.md` | Last 24h meta-pattern detections |
| `skill-merge-candidates-*.md` | If audit ran, top merge proposals |
| `e2e-pipeline-results-*.md` | If E2E test ran, failures only |
| `churn-risk-*.md` | Red + orange customers |
| `_shared/poller/*-heartbeat.log` | Stale heartbeats (>10 min) |
| `_shared/telegram/outbox/*.json` | P0/P1 cards with sent_at null |
| `_shared/audit/audit-*.jsonl` | High-impact entries last 24h |
| `_shared/founder-ops/energy-log.jsonl` | Yesterday's energy/mood |

## Decision-ranked output

The briefing is ordered by leverage, not chronology:

```
# Morning briefing — {DAY} {DATE}, 8:30 AM ET

## TLDR (5 sec)
- Empire size: {N} skills (+{N} overnight)
- Tap queue: {N} items, est {N} min
- Systems: {🟢|🟡|🔴}
- Yesterday's energy: {N}/10

## 🚨 P0 — act first
[Any unacknowledged P0 cards or stale heartbeats]

## ⭐ High-leverage taps (do these first)
[Items where one decision unblocks multiple things]

## ✏️ Drafts to promote (10-15 sec each)
[Pending drafts; recommend yes/edit/archive]

## 🧬 Meta drafts (read carefully)
[Higher-risk; recommend default = defer to Council]

## ⚠️ Merge proposals (skill audit)
[Top 5 candidates]

## 📊 Trends (read, no action)
[Last 7 days summary]

## 💤 What I parked
[Items I auto-deferred; confirm OK]
```

## Hard rules

1. **Always rank by leverage, not chronology.** Most impactful tap first.
2. **Always cap at 25 items.** Beyond 25 = batch low-risk items.
3. **Always include estimated time per tap** so Jack can budget.
4. **Never recommend "yes" for high-recurrence-risk meta drafts.** Default: defer to Council.
5. **Always show what was AUTO-handled** — Jack should know what didn't need him.
6. **Always link to source files** via computer:// URLs for one-click open.
7. **Always end with "what I parked"** — items I decided weren't worth Jack's time but flag for opt-out.

## What it produces

1. The briefing markdown at `~/Documents/businesses/_shared/founder-ops/briefing-{YYYY-MM-DD}.md`
2. A Telegram P1 outbox entry pointing Jack to it
3. An audit-log entry of the briefing run

## When invoked

- Scheduled task at 8:30 AM ET (per-day, one-shot)
- `/brief` Telegram command (instant generation)
- Inside `daily-kickoff` (replaces older briefing style)

## Failure modes

- **No data sources reachable** (poller offline, no register): generate skeleton briefing flagging system as red
- **Briefing > 1 page**: split into "essential" + "if-you-have-time" sections
- **All sources show no activity** (genuinely quiet day): produce 1-line "all quiet, system green, no taps needed"

## Logging

`[YYYY-MM-DD HH:MM ET] morning-briefing-generator → date: {YYYY-MM-DD}, items: {N}, est_min: {N}, p0: {N}, systems: {green|yellow|red}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('morning-briefing-generator', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'morning-briefing-generator', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
