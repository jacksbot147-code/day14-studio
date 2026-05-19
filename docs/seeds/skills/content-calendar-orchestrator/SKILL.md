---
name: content-calendar-orchestrator
description: Coordinate weekly content rhythm across blog, newsletter, social, video. Plans Mon-Sun cadence, dispatches to per-channel skills, tracks publish state, surfaces gaps. The content engine's conductor.
triggers:
  - "content calendar"
  - "content plan"
  - "weekly content"
  - "/calendar"
---

# content-calendar-orchestrator

> 4 channels x 2 posts each = 8 pieces/week. Without coordination,
> nothing happens. With this skill, everything happens automatically
> or surfaces an explicit miss.

## The weekly rhythm

| Day | Channel | Skill triggered | Status |
|---|---|---|---|
| Mon AM | Blog publish (last week's draft) | (publish) | scheduled |
| Mon AM | LinkedIn post | linkedin-thought-leadership-post | scheduled |
| Tue AM | Newsletter send | email-newsletter-composer | scheduled |
| Tue AM | Twitter thread (from blog) | social-cross-post | scheduled |
| Wed PM | LinkedIn post | linkedin-thought-leadership-post | scheduled |
| Wed PM | Blog draft for next week | blog-post-generator | scheduled |
| Thu AM | Threads post (community Q) | social-cross-post | scheduled |
| Thu AM | YouTube release (if scripted last week) | (publish) | scheduled |
| Fri AM | LinkedIn post | linkedin-thought-leadership-post | scheduled |
| Sat | YouTube script (for next Thu) | youtube-script-from-blog | scheduled |
| Sun | Newsletter draft + cross-post planning | email-newsletter-composer | scheduled |

## What this skill does

1. Sunday 8 AM ET: reads upcoming week, plans
2. Dispatches per-day triggers via scheduled-task creation
3. Tracks publish state in `~/Documents/businesses/{tenant}/content/calendar.jsonl`
4. Monday 9 AM ET: reports last week's actual vs planned
5. Surfaces gaps as "missed: {channel} on {day}" — for `weekly-priorities-flush`

## Hard rules

1. **Never publish without Jack tap.** All publishes queue as approval cards.
2. **Always show the week ahead by Sunday 8 AM ET.** No surprises.
3. **Always batch cross-posts** — generate Mon, schedule Mon-Sun, don't generate daily.
4. **Always check `seasonal-content-mapper` first** — pool content in Jan ≠ pool content in Jul.
5. **Never schedule sends/posts during stormy weather** — when `hurricane-watch-poller` is amber/red, defer non-urgent.
6. **Always maintain 2 weeks of drafts ahead** — buffer against off-weeks.

## Output (Sunday morning)

```
📅 Content calendar: week of May 18

Mon: Blog publish "Pool maintenance mistakes" + LinkedIn variant A
Tue: Newsletter Issue #14 + Twitter thread (7 tweets)
Wed: LinkedIn variant B (Wed mid-week)
Thu: Threads post + YouTube video "Pool Mistakes" (recorded last week)
Fri: LinkedIn variant C
Sat: YouTube script for next week ("Hurricane prep for pool owners")
Sun: Newsletter Issue #15 draft

State:
  ✓ All 7 items ready / drafted / queued
  ⚠ 1 dependency: customer-photo for case study (waiting on splash-jacks-pools)
  
Tap to approve calendar [yes] [edit] [skip-week]
```

## Inputs

- `week_of` (default: next Monday)
- `tenant` (default: day14)
- `vertical_focus` (optional override)

## When invoked

- Sunday 8 AM ET via scheduled task
- `/calendar` Telegram command (manual)
- Inside `weekly-priorities-flush`

## Failure modes

- **Drafts not ready**: surface gap; suggest reuse of evergreen content
- **All 7 days uncovered**: P1 alert — system broken
- **Customer approval pending** (case study): defer publish 1 week

## Logging

`[YYYY-MM-DD HH:MM ET] content-calendar-orchestrator → week_of: {date}, planned: {N}, ready: {N}, gaps: {N}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('content-calendar-orchestrator', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'content-calendar-orchestrator', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
