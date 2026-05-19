---
name: local-event-detector
description: Detect SWFL events that affect Day14 customers — high-traffic weekends (spring break, season turn), road closures, power-outage zones, county-level emergencies. Supporting skill for swfl-context. Feeds priorities into the daily kickoff.
triggers:
  - "what's happening in SWFL"
  - "local event"
  - "spring break"
  - "season turn"
  - "road closure"
---

# local-event-detector

> Day14 customers feel the local calendar. A spring-break weekend
> means restaurants are slammed and pool guys are flat-out. The
> agent should know.

## Event categories

### Seasonal (calendar-driven, predictable)
- **Snowbird season**: Nov 1 - Apr 30 (peak: Jan-Mar)
- **Spring break**: late Feb through Easter (varies by year; Cape Coral colleges + family travel)
- **Off-season**: May - Sept (locals only; many restaurants close midweek)
- **Hurricane season**: Jun 1 - Nov 30 (delegate to `hurricane-watch-poller` for specifics)
- **Season turn weekends**:
  - Oct 31 / first weekend of November (snowbirds arrive)
  - Apr 15 / Easter (snowbirds depart)

### Sport / culture (specific dates)
- Hertz Arena events (Estero)
- Caloosa Sound Convention Center (Fort Myers)
- Naples Wine Festival (late January)
- Fort Myers Beach SandFest (varies)

### Infrastructure (real-time, transient)
- I-75 / US-41 closures (FDOT data)
- Power outages by county (FPL / LCEC outage maps)
- Beach access closures (red tide, sargassum)

## Polling sources

| Source | Update frequency | What we get |
|---|---|---|
| Lee County events RSS | Daily | Public events |
| Naples events calendar | Daily | High-end events affecting Naples customers |
| FDOT 511 API | Hourly | Road closures |
| FPL outage map (HTML scrape) | Every 30 min during outage; otherwise daily | Power outages |
| Local news RSS (Cape Coral Daily Breeze) | Daily | Breaking events |

For now (MVP), only the seasonal calendar is auto-tracked. Real-time integration is Phase 2 (build only after first customer needs it).

## Output

A single file at `~/Documents/studio/docs/swfl/local-events.md` (overwritten daily):

```
# SWFL Local Events — {date}

## Today (high-priority customer impact)
- {Event 1 — affected verticals — recommended action}
- {Event 2 — ...}

## This week
- ...

## This month
- ...

## Season context
- Currently: {snowbird-peak | off-season | season-turn | hurricane-season}
- Trend: {revenue typically up/down/flat for {vertical} this period}
```

## How it feeds daily-kickoff

`daily-kickoff` reads this file. If any high-priority event affects today:
- Surface in the kickoff under "Calendar awareness"
- For customer-specific impact, surface as approval card

Examples of high-priority impact:
- Spring break weekend → pool service customers will have packed houses; suggest a "weekend warriors" feature flag
- Road closure on US-41 → restaurant customers can't get their lunch crowd; suggest pause-mode banner
- Power outage in customer's service area → preview storm-week-comms protocols

## Hard rules

1. **Never auto-trigger customer comms** based on a local event. Surface to Jack; he decides whether to message.
2. **Never include unverified events** (Twitter rumors, etc.). Authoritative sources only.
3. **Never poll real-time sources off-peak.** Cache aggressively for cost.
4. **Always include the source URL** for each event surfaced — so Jack can verify.
5. **Never confuse seasonal vs. transient.** Snowbirds arriving is predictable; a road closure is not. Different alert weights.

## Failure modes

- **No internet during a real-time event**: fall back to seasonal calendar only; surface "real-time poll offline"
- **Source RSS broken**: skip that source; don't fail the whole poll
- **Event affects only one customer but skill couldn't determine which**: surface to all customers in that vertical for Jack's triage

## Logging

`[YYYY-MM-DD HH:MM ET] local-event-detector → events_polled: N, high_priority: N, fed_into_kickoff: {yes|no}`

## When invoked
- Daily 7:30am ET via scheduled task (before daily-kickoff at 9am)
- Manually when Jack feels "something's happening locally"
- During hurricane season, paired with `hurricane-watch-poller`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('local-event-detector', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'local-event-detector', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
