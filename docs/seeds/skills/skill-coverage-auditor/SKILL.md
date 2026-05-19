---
name: skill-coverage-auditor
description: Quarterly + on-demand audit of the empire — is the skill library matching what work the agent actually does? Surfaces dead skills (never fired), overloaded skills (fire too often), and uncovered work (gap candidates). Supporting skill for the self-expanding system.
triggers:
  - "audit skill coverage"
  - "are skills earning keep"
  - "skill library health"
---

# skill-coverage-auditor

> 150+ skills. Some fire daily. Some never fire. The audit answers:
> what's the actual ratio of "named capability" to "doing the work"?

## Inputs

- The full skill library (read from `~/Documents/businesses/_shared/skills/`)
- The skill-invocation log (every time a skill fires — schema in `skills_invoked` table)
- The agent's chain-of-thought logs (parsed for skill references)
- The work-register log (from `emergent-skill-graduator`)

## What gets reported

A single doc at `~/Documents/studio/docs/skill-coverage-{YYYY-MM-DD}.md`:

```
# Skill coverage audit — {date}

## Headline
- Empire size: {N} skills
- Active in last 30 days: {N} ({percent}%)
- Dormant in last 90 days: {N}
- New since last audit: {N}

## Coverage gaps
{Patterns the agent did without a backing skill — feeds skill-gap-detector}

## Dead skills
{Skills with zero invocations in 90+ days; review for archive}

## Overloaded skills
{Skills firing >50× per week; candidates for sub-skill extraction}

## Misnamed / underused skills
{Skills with names that don't match what they actually do}

## Cluster health
For each anchor:
- {anchor-name}: anchor fires N times, supporters fire M times (ratio)
- Supporters underused → maybe folded back into anchor
- Supporters overused → may need their own sub-supporters

## Pack distribution
| Pack | Skill count | % of empire |
| build | N | X% |
| ops | N | X% |
...

## Recommendations
1. Archive: {list}
2. Promote (graduate from work-register): {list}
3. Split (overloaded): {list}
4. Consolidate (overlapping): {list}
```

## How coverage is measured

The `skills_invoked` table records every fire:
```sql
SELECT skill_name, COUNT(*) AS count
FROM skills_invoked
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY skill_name
ORDER BY count DESC;
```

Cross-reference with empire size to find:
- Skills never logged → likely dormant OR not invoking properly
- Skills logged >50/week → possible scope inflation

## Health thresholds

| Pattern | Status |
|---|---|
| Active skill / total = 60-80% | healthy |
| Active < 40% | empire is bloated; archive pass needed |
| Active > 90% | possible under-coverage (everything's firing; maybe missing helper skills) |
| Median fires/skill = 5-50/week | healthy |
| One skill fires >200/week | overloaded; needs split |

## Cluster health metric

For each anchor-and-supporters cluster:
- Anchor fires / supporters fire ratio
- Healthy: anchor 1:3 supporters (anchor delegates well)
- Anchor 1:10 = supporters underused
- Anchor 1:0.5 = supporters doing the heavy lifting (anchor is hollow)

Surface unhealthy clusters as Council candidates.

## Hard rules

1. **Don't auto-archive a skill** even if dormant. Surface; Jack decides.
2. **Audit at least quarterly.** Weekly reviews via `weekly-council-review` are too short for this.
3. **Always preserve the empire baseline** (note when audit was run + what was archived) — so trends are visible.
4. **Never count tenant-specific skill invocations** when computing empire-level health (those live in tenant code).

## When invoked
- Quarterly via scheduled task (1st of every 3rd month)
- After every 25 new skill additions (an absolute milestone)
- Manually when Jack asks "what's the state of the skill library?"

## Logging
`[YYYY-MM-DD HH:MM ET] skill-coverage-auditor → audit_date: {date}, active: {N/M}, gaps: {N}, archive_candidates: {N}, output: {path}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('skill-coverage-auditor', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'skill-coverage-auditor', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
