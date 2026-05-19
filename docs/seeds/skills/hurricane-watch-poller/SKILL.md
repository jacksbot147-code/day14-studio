---
name: hurricane-watch-poller
description: Poll the National Hurricane Center for active named storms in the SWFL cone. Activates storm-week-comms when a storm enters the cone. Active June 1 - November 30. Supporting skill for swfl-context.
triggers:
  - "hurricane watch"
  - "NHC poll"
  - "tropical storm forecast"
  - "named storm"
---

# hurricane-watch-poller

> The check that runs every 6 hours during hurricane season. If the
> NHC cone touches SWFL, storm-week-comms wakes up.

## Active window
- **On:** June 1 - November 30
- **Off:** December 1 - May 31 (skill is dormant; no API calls; logs "off-season")

## Poll cadence
- **Default (June-Nov, no active storm):** every 12h
- **When active storm exists in Atlantic:** every 6h
- **When NHC cone touches Florida:** every 3h
- **When SWFL is in 72-hour warning area:** every 1h + activates `storm-week-comms`

## Data sources

Primary: NHC API at https://www.nhc.noaa.gov/CurrentStorms.json
- Returns active storms with forecast tracks
- No API key required

Backup: NHC RSS feed at https://www.nhc.noaa.gov/index-at.xml

## What counts as "SWFL in cone"

SWFL bounding box for the check:
- North: Punta Gorda (lat 26.93)
- South: Marco Island (lat 25.94)
- East: Lake Okeechobee (lon -80.85)
- West: Gulf of Mexico (lon -82.5)

If ANY forecast point in the 5-day cone falls inside this box → SWFL is in cone.

## The output

After each poll, write to `~/Documents/studio/docs/swfl/hurricane-status.md`:

```
# Hurricane status — last polled {timestamp}

## Season: {active|off}
## Storms tracked: {N}

### Storm details (if any in cone)
- Name: {name}
- Category: {tropical-storm | hurricane-cat-1 | ... | hurricane-cat-5}
- Forecast: {3-day track summary}
- SWFL relevance: {none | watch | warning | landfall-probable}
- Time until SWFL impact: {ETA in hours}

## Action triggered
{none | storm-week-comms activated | P0 SMS sent}

## Next poll: {timestamp}
```

## Auto-activation chain

When SWFL relevance ≥ "watch":
1. Activate `storm-week-comms` (sets a flag at `_shared/state/storm-mode.json`)
2. Surface to Jack via SMS (if Twilio) or approval card:
   "Hurricane {name} entered SWFL cone. ETA: {hours}. storm-week-comms ON. Customer comm drafts queued."
3. Set `customers.feature_flags.storm_mode` for each customer with appropriate severity

When storm passes / dissipates / track diverges:
1. Deactivate `storm-week-comms`
2. Log all-clear

## Hard rules

1. **Never alarm on tropical depressions** (pre-named systems). Wait for named storm + within 72h impact window.
2. **Never auto-cancel customer launches** based on storm watch. Surface to Jack as approval card; he decides.
3. **Never use a third-party hurricane API** for primary signal. NHC is the only authoritative source.
4. **Never poll off-season.** Skill is fully dormant Dec-May.
5. **Always include the timestamp of last NHC update** in the report (not just our poll time). Stale NHC data is rare but real.

## Failure modes

- **NHC API down**: backup to RSS; if both fail, surface to Jack ("can't verify storm status — assume worst, hold launches")
- **False positives** (cone clipping SWFL but center far away): score by probability of landfall, not just cone presence
- **Storm changes track between polls**: re-evaluate every poll; deactivate if no longer in cone

## Logging

`[YYYY-MM-DD HH:MM ET] hurricane-watch-poller → season: {on|off}, storms: N, in_cone: {yes|no}, action: {none|activated|deactivated}`

## When invoked
- Scheduled task during season (variable frequency per cadence above)
- Manually when Jack sees a news headline and wants the official read
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('hurricane-watch-poller', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'hurricane-watch-poller', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
