---
name: daily-eod
description: The end-of-day report protocol — log what shipped, what's pending, what's blocking tomorrow. Invoked daily at 5 PM by the day14-os-daily-eod scheduled task. Output lands at docs/overnight/eod-YYYY-MM-DD.md. Honest accounting, no sugarcoating.
triggers:
  - "end of day"
  - "EOD report"
  - "what shipped today"
  - "daily summary"
  - "wrap up the day"
---

# daily-eod

> The honest accounting of today. The job: tell Jack what actually
> happened, not what was supposed to happen.

## Inputs (read in this order)

1. Today's kickoff at `~/Documents/studio/docs/overnight/kickoff-YYYY-MM-DD.md` — what was planned
2. `~/Documents/studio/docs/overnight/MASTER_LOG.md` — completions logged
3. File modification times under `~/Documents/studio/` and
   `~/Documents/businesses/` in the last ~8 hours — what actually changed
4. Recent git history if available: `cd ~/Documents/studio && git log --since="9am today" --oneline`
5. Any new dossier activity in `~/Documents/businesses/day14/customers/`

## Output structure

Write to `~/Documents/studio/docs/overnight/eod-YYYY-MM-DD.md`:

```
# End-of-day — YYYY-MM-DD

## What shipped today
- (bullet list — file paths or commit messages, concrete)

## What was planned but didn't ship
- [item]: [one-line reason]

## Blockers for tomorrow
- (max 3, each with a proposed unblock)

## Tomorrow's first action
[The one thing to do before everything else]

## Confidence in this week's plan
[0.0–1.0] + one sentence on why
```

## Honesty rules

These are non-negotiable:

1. **If nothing shipped, say it.** Don't list "thinking about X" as
   a win. Thinking isn't shipping.
2. **Name the priority that slipped.** If today's kickoff #1 didn't
   land, the EOD should say "Today's #1 priority [X] didn't ship
   because [Y]."
3. **Don't manufacture momentum.** If three days in a row are 0-ship
   days, the confidence score should reflect that. Trust comes from
   accuracy, not optimism.
4. **Distinguish ship vs. attempted.** "Wrote 200 lines of code" is
   not shipped unless it's committed/deployed/used.

## Confidence scoring

The "confidence in this week's plan" score reflects:

- **0.9–1.0:** On track or ahead. No structural issues.
- **0.75–0.89:** Minor slip (<1 day behind). Recoverable this week.
- **0.5–0.74:** 1-2 days behind. May need to drop a Friday item.
- **<0.5:** Plan is structurally wrong. Trigger a Council on what
  to cut or change. Surface this as a "Decisions waiting" item in
  tomorrow's kickoff.

## What this skill is NOT

- Not a long retrospective. One screen, ~50 lines max.
- Not a place to plan tomorrow's work (kickoff does that).
- Not a brag sheet. Wins are facts, not adjectives.

## Voice

Use the **day14-voice** skill. Specifically:
- "Shipped X" not "successfully completed X"
- "Didn't ship X because Y" not "X is still in progress"
- Numbers over adjectives: "Wrote 4 SKILL.md files" not "Made great progress on skills"

## Example output

```
# End-of-day — 2026-05-18 (Monday)

## What shipped today
- Supabase project created for Day14 OS
- Schema pasted, all 5 tables verified
- Smoke test: inserted + read a fake customer row successfully
- 2 of 5 DM replies — both interested, scheduled follow-up calls

## What was planned but didn't ship
- Anon key + URL added to studio/.env.local: didn't get to it
- Skill-harvest update: deferred to Tuesday

## Blockers for tomorrow
- Need to decide on Supabase region (us-east-1 vs us-west-1). Recommend us-east-1
  (closer to SWFL, closer to Vercel default).

## Tomorrow's first action
Wire the Supabase env vars into studio/.env.local, then test the connection
from the marketing site's chatbot.

## Confidence in this week's plan
0.85 — on track. The 2 DM replies are ahead of expectation.
```

## Logging

After writing the EOD, append to MASTER_LOG:
`[YYYY-MM-DD 17:00 ET] daily-eod COMPLETE → eod-YYYY-MM-DD.md, confidence: <0.0-1.0>`

The "confidence" here is meta — confidence in the report's accuracy,
not the plan. The in-doc score covers the plan.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('daily-eod', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'daily-eod', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
