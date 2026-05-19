---
name: daily-kickoff
description: The morning kickoff protocol — produce a one-screen "today's 3 priorities" briefing. Invoked daily at 9 AM by the day14-os-daily-kickoff scheduled task. Output lands at docs/overnight/kickoff-YYYY-MM-DD.md and is the first thing Jack reads with coffee.
triggers:
  - "morning kickoff"
  - "today's priorities"
  - "what should I do today"
  - "start the day"
  - "daily briefing"
---

# daily-kickoff

> The first thing Jack reads each weekday morning. The job: tell him
> three things to do today, in priority order, with no fluff.

## Inputs (read in this order)

1. `~/Documents/studio/docs/overnight/MASTER_LOG.md` — yesterday's completions
2. The most recent `eod-YYYY-MM-DD.md` if it exists — yesterday's EOD report
3. `~/Documents/studio/docs/day14-os-laptop-interim-plan.md` — current week's targets
4. `~/Documents/businesses/_shared/council-log/*.md` — any decisions whose 30-day review is due today
5. Any new files in `~/Documents/businesses/day14/customers/` — pending customer work

## Output structure

Write to `~/Documents/studio/docs/overnight/kickoff-YYYY-MM-DD.md`:

```
# Daily kickoff — YYYY-MM-DD (day-of-week)

## Yesterday's wins
- (1-3 items pulled from MASTER_LOG and yesterday's EOD)

## Today's 3 priorities (ranked)
1. [The single highest-leverage move]
2. [Second-highest]
3. [Third — usually the maintenance/polish item]

## Decisions waiting on Jack
- (max 3 — anything blocking work, with proposed answer)

## Calendar awareness
- (anything time-sensitive today — call, deadline, deploy window)

## Coffee-and-go
The single first action: [concrete next step, < 15 min]
```

## Prioritization rules

A priority makes the top-3 only if it meets ONE of:

1. **Unblocks something else** — completing this enables a downstream win
2. **Has a deadline** — today is the last day this can ship on time
3. **High leverage** — single action that moves a key metric (acquisition, build velocity, infrastructure readiness)

If a priority is just "keep doing what we were doing," don't list it.
Continuation work is implicit.

## What this skill is NOT

- Not a project plan rewrite. The 25-day plan is fixed. This is a
  *today* view.
- Not a long report. One screen. ~40 lines max.
- Not a place for Council-level decisions. Those go in the council-log.

## Voice

Use the **day14-voice** skill. Specifically:
- Sentences, not bullet sub-bullets
- "Ship X" beats "Consider whether to ship X"
- Today's priorities are commands, not suggestions
- Yesterday's wins are facts, not victory-laps

## Failure modes

- **Nothing shipped yesterday:** name it. "Yesterday: zero forward
  motion. Today's #1 priority is to break the stall by [specific
  action]." Don't fabricate wins.
- **Plan is slipping:** if today's targets vs. the 25-day plan show
  >2 days of slip, surface it explicitly under "Decisions waiting."
- **Council decision aging:** if a Council entry's outcome review is
  due (30 days from decision date), today's #2 or #3 priority is the
  review.
- **No customer activity:** in the pre-customer phase, priorities are
  acquisition-focused. Once customer #1 is mid-build, priorities are
  build-focused.

## Example output (template)

```
# Daily kickoff — 2026-05-18 (Monday)

## Yesterday's wins
- Empire bootstrapped on laptop (9 skills, 3 agents, dossier template)
- Splash Jacks case study video posted to 3 channels per Council 0001
- 5 personal IG DMs sent to SWFL service businesses

## Today's 3 priorities
1. Spin up Supabase project for Day14 OS. Paste schema, verify tables.
   Source: laptop-interim plan, Week 1, Tue-Wed work.
2. Check DM replies from yesterday. Reply to anyone who bit, ignore
   the rest. Don't follow up — too early.
3. Update skill-harvest-findings with anything that came up over
   the weekend.

## Decisions waiting on Jack
- Pricing: do we want a $999 "Site Lite" intro tier? Council recommended
  testing it. Decision needed by Wednesday for Week 2 rollout.

## Calendar awareness
- Nothing scheduled today.

## Coffee-and-go
Open https://supabase.com/dashboard and create the day14-os project.
```

## Logging

After writing the kickoff, append to MASTER_LOG:
`[YYYY-MM-DD 09:00 ET] daily-kickoff COMPLETE → kickoff-YYYY-MM-DD.md, confidence: <0.0-1.0>`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('daily-kickoff', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'daily-kickoff', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
