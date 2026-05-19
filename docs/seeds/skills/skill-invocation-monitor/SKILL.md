---
name: skill-invocation-monitor
description: Track which skills fire how often + which never fire. Surface skills that aren't earning their keep + skills that fire constantly (candidates for sub-skill extraction). Layer 8 monitoring.
triggers:
  - "skill usage"
  - "which skills fire"
  - "skill metrics"
  - "skill audit"
---

# skill-invocation-monitor

> 148 skills is a lot. Some fire daily, some never. This skill keeps
> the library lean — surfaces dead weight + over-stressed skills.

## What gets tracked

The `skills_invoked` table (already in the SQL schema):

```sql
create table if not exists skills_invoked (
  id            uuid primary key default gen_random_uuid(),
  skill_name    text not null,
  agent         text,
  customer_id   uuid references customers(id) on delete set null,
  context       text,
  outcome       text,
  created_at    timestamptz not null default now()
);
```

Every time a skill is invoked, a row is inserted. The monitor reads this table.

## Weekly rollup

Every Sunday, append to `~/Documents/studio/docs/skill-metrics-{date}.md`:

```
# Skill invocation metrics — week of {date}

## Top 10 most-invoked skills
| Skill | Invocations | Trend (vs last week) |
|---|---|---|
| day14-voice | 47 | ↑ |
| approval-card-builder | 23 | ↑ |
...

## Bottom 10 (never or rarely invoked, last 30 days)
| Skill | Invocations | Recommendation |
|---|---|---|
| storm-week-comms | 0 | Expected (off-season); keep |
| chemistry-reading-parser | 0 | No pool customers yet; keep |
| upsell-detection | 0 | Customer #1 not launched; keep |
| {orphan-skill} | 0 | UNEXPECTED — investigate; consider archive |

## Skills firing more than expected
- {skill}: 23 invocations vs typical 5 — investigate; possible sub-skill extraction candidate

## Patterns
- Telegram-related skills firing? (validates Phase 1 success)
- New skills (added <30 days ago) getting used?
```

## Decisions surfaced

| Pattern | Action |
|---|---|
| Skill fires daily + always succeeds | Confidence: keep; consider auto-loading by default |
| Skill fires occasionally + succeeds | Healthy; keep |
| Skill fires occasionally + outcome="ambiguous" or "failed" | Needs tuning; surface for refinement |
| Skill never fires + has dependent skills | Dependent skills also dead; consider archiving cluster |
| Skill never fires + no dependents | Archive candidate (but check expected-dormant categories first) |
| Skill fires 3x more than expected | Either Day14 OS grew faster than predicted (good) or skill triggers are too broad (tune) |

## Expected-dormant skills (don't archive even at 0 invocations)

- `storm-week-comms` and its cluster: dormant off-season
- `chemistry-reading-parser`: dormant until pool customer onboards
- `evacuation-zone-mapper`: dormant absent active storm
- `customer-launched` related: dormant until customer #1 ships
- `complaint-escalation`: GOOD if this never fires (no complaints = healthy)

## Hard rules

1. **Never auto-archive a skill** — recommendation only; Jack confirms.
2. **Always log the recommendation reasoning** so the audit trail is clear.
3. **Never count a skill's own self-reference** as an invocation (skill A calls skill B + B calls A back ≠ 2 real invocations).
4. **Always compare against baseline** — first 30 days of any new skill should expect zero; don't archive prematurely.

## Failure modes

- **Skills don't reliably log their invocations**: standardize logging in every SKILL.md (most do); audit for stragglers
- **Same logical invocation logged twice** (skill A calls skill B; both log): dedupe by parent invocation_id
- **Sampling missed an invocation**: rare; metric error <5% acceptable

## When invoked
- Weekly via scheduled task
- Monthly aggregate review
- Manually when Jack asks "is anyone using {skill}?"

## Logging

`[YYYY-MM-DD HH:MM ET] skill-invocation-monitor → skills_tracked: N, top_3: {names}, archive_candidates: N, sub-skill_candidates: N`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('skill-invocation-monitor', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'skill-invocation-monitor', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
