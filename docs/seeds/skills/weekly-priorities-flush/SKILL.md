---
name: weekly-priorities-flush
description: Every Friday, surface the week's drift (what got deferred 3+ times, what skills produced nothing, what didn't ship) and force a Drop/Recommit/Schedule pass. Resets next week clean.
triggers:
  - "weekly priorities"
  - "priority reset"
  - "what didn't ship"
  - "/flush"
---

# weekly-priorities-flush

> The backlog grows by ~5 items/week if you don't flush it. After a month
> the unflushed backlog feels like dread. This skill turns the backlog
> into 3 buckets: drop, schedule-this-week, push-to-next-week.

## When it runs

Friday 4 PM ET, automatic. Manual override anytime: `/flush`.

## What it surfaces

```
# Weekly flush — week of May 11, 2026

## Promised this week, didn't ship (5)
1. "Update splash-jacks-pools winter SEO" — deferred 3× — DROP or DO?
2. "Buildbridge case study draft" — deferred 2× — DROP or DO?
3. "Council vote on pricing change" — deferred 1× — KEEP
...

## Skills that fired 0 times this week (7)
- pricing-decision-helper
- emergency-handover-doc
- chemistry-reading-parser (expected — no pool customers yet)
...

## Skills that fired but never produced output (3)
- topic-idea-generator: 4 runs, 0 published topics
- seo-keyword-fetcher: 2 runs, 0 used
- copy-writer: 6 runs, all rejected by Jack
  → investigate: is voice off? Are inputs bad?

## What did ship (12)
- Stripe webhook live ✓
- 8 new skills shipped
- 2 customers acquired
- Recursive growth wired

## Next week priorities (Jack to confirm)
Drop:
  [ ] {item 1}
  [ ] {item 2}
Schedule this week:
  [ ] {item 3} → Mon 10am
  [ ] {item 4} → Wed 2pm
Defer to following:
  [ ] {item 5}

Tap-to-confirm each row.
```

## The 3-bucket force

Every item on the deferred list goes into exactly one of:

- **DROP** — won't happen, send decline if external promise
- **SCHEDULE** — concrete day/time this week
- **DEFER** — explicitly punt to next week with a reason

Nothing stays in limbo. Items punted twice without reason → auto-DROP.

## Hard rules

1. **Never let an item carry forward indefinitely.** 3 punts → forced DROP.
2. **Always show what didn't ship alongside what did.** Asymmetry: wins feel obvious, losses are invisible.
3. **Always check skill firing patterns.** Zero-fire skills are atrophy signals (or unused).
4. **Always Jack-tap the 3-bucket pass.** Don't auto-classify the punt list.
5. **Always carry forward unfinished week into Saturday morning brief** — visible until resolved.

## What this skill does

1. Reads `~/Documents/businesses/_shared/founder-ops/weekly-promises.jsonl` (commitments)
2. Crosses against shipped log + work-register
3. Identifies the gap
4. Generates the flush card
5. Telegram queue → Jack 3-tap session
6. On completion → reset for next week

## When invoked

- Friday 4 PM ET via scheduled task
- `/flush` Telegram command
- Inside `weekly-council-review` (Council sees the same data)
- After 3+ deferrals on a single item (auto-trigger)

## Output

```
✓ Weekly flush queued for Jack
  Items to triage: 8 deferred, 3 zero-fire skills, 6 ship-vs-promise gaps
  Estimated time: 12 min
  Card sent: 2026-05-17 16:00 ET
```

## Failure modes

- **Empty week (nothing logged)**: surface as "did the work-register break? Or quiet week?"
- **Jack ignores 3 weekly flushes in a row**: tune frequency down to biweekly
- **Same items keep coming back deferred**: surface to Council — symptom of strategic miss

## Logging

`[YYYY-MM-DD HH:MM ET] weekly-priorities-flush → items_deferred: {N}, items_dropped: {N}, items_scheduled: {N}, zero_fire_skills: {N}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('weekly-priorities-flush', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'weekly-priorities-flush', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
