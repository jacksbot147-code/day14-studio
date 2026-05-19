---
name: energy-state-tracker
description: Two-tap daily check-in (energy 1-10, mood 1-5). Tracks the leading indicator of burnout 2-3 weeks before it hits. Surfaces patterns + correlations with workload, sleep, decisions.
triggers:
  - "energy check"
  - "how am I doing"
  - "burnout"
  - "/energy"
---

# energy-state-tracker

> Burnout doesn't arrive — it accumulates. The signal shows up 2-3 weeks
> before the crash. This skill catches it at the trend, not the cliff.

## The check-in

Sent daily, 9 PM ET, single Telegram message:

```
Quick check, Jack:
Energy (1-10)? 
Mood (1-5)?

(Tap below or type a number)
[1] [2] [3] [4] [5] [6] [7] [8] [9] [10]
```

Should take 5 seconds. If it takes more, the skill is wrong.

## Optional context

Jack can add a free-text note (10 words max recommended):
- "slept 4h, big customer win"
- "headache, 3 hard conversations"
- "didn't ship anything today"

Just a sentence — no journaling, no analysis.

## What's tracked

`~/Documents/businesses/_shared/founder-ops/energy-log.jsonl`:

```jsonl
{"date":"2026-05-17","energy":7,"mood":4,"note":"shipped recursive growth"}
{"date":"2026-05-16","energy":5,"mood":3,"note":"long session, missed dinner"}
{"date":"2026-05-15","energy":8,"mood":4,"note":"slept 8h, walk in morning"}
```

## Pattern surfaces (weekly)

```
Energy trend (last 14d):
  Week 1 avg: 6.8  ← previously baseline
  Week 2 avg: 5.4  ← dropping ↓
  Direction: -1.4 / 2 weeks

  Correlated with:
  - Decisions/day: +18% (busier weeks)
  - Bedtime: 1.2h later
  - Skipped meals: 3 this week
  - Customer count: same

  Suggestion: protect tomorrow morning. Single 90-min focus block, then off.
```

## Hard rules

1. **Never demand a check-in.** Optional, no pressure.
2. **Never use this data to push more work.** It's a brake, not a gauge for capacity expansion.
3. **Never expose to anyone outside Jack.** Personal data, even from Day14's agents.
4. **Surface trend, not single-day fluctuations.** One bad day = noise. Three bad days = signal.
5. **Auto-suggest interventions only at trend score < 5 for 3+ days.** Stuff like: "skip the Council this week," "block tomorrow morning."
6. **Never tie energy to performance metrics.** Correlation, not judgment.

## When invoked

- Daily 9 PM ET via scheduled task → check-in prompt
- Weekly Sunday review → pattern summary
- Anytime `decision-fatigue-detector` triggers "compromised" → flag for context
- `/energy` Telegram command → log on-demand

## Output (daily, after check-in)

```
✓ Logged: 7/10 energy, 4/5 mood
Today: 7 (yesterday: 5, 3-day avg: 6.3)
Trend: stable

No action needed. Sleep well.
```

## Output (weekly summary)

```
📊 Energy review — week of May 11

Daily: 6, 7, 5, 7, 8, 6, 7 (avg 6.6)
vs last week: 5.6 → 6.6 ↑ (+1.0)

Highs: Mon (8 — slept 8h), Fri (8 — short day)
Lows: Wed (5 — 3 hard conversations)

Pattern: high energy on days starting with a walk.
Recommendation: hold morning walks; they're working.
```

## Failure modes

- **Jack doesn't check in for 3+ days**: surface gentle "we lost the trend — back?"
- **All scores 10/10**: probably auto-tapping; surface "are you really at 10?" once
- **Scores collapse to 2/10**: serious — auto-trigger Council session + suggest pause

## Logging

`[YYYY-MM-DD HH:MM ET] energy-state-tracker → date: {YYYY-MM-DD}, energy: {N}, mood: {N}, trend: {direction}, note_present: {bool}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('energy-state-tracker', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'energy-state-tracker', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
