---
name: skill-gap-detector
description: Watch for moments where the agent reaches for a skill that doesn't exist (yet). When no existing skill matches the situation well, log it as a gap candidate. Supporting skill for skill-tree-grower.
triggers:
  - "no matching skill"
  - "skill needed"
  - "couldn't find a skill for"
  - "gap"
---

# skill-gap-detector

> Gaps are invisible until you have a vocabulary for them. This skill
> watches the agent's own behavior — when it does work that should
> have a skill but didn't, that's a gap.

## Detection signals

Any of these patterns = candidate gap:

### 1. Agent says "ad-hoc"
Whenever an agent's chain-of-thought includes "I'll do this ad-hoc" or "I don't have a skill for this so I'll just..." — flag.

### 2. Skill invoked-then-stretched
An agent invokes a skill, then the SKILL.md says "this skill doesn't cover X" but the agent does X anyway. The "X" is a candidate gap.

### 3. Cross-skill leakage
Agent does work that spans 3+ skills without a clear orchestrator. Likely missing a higher-level anchor.

### 4. Same comment 3+ times across postmortems
"This would have been caught if..." in 3+ postmortems → that "if" is a skill.

### 5. Jack invents the skill name
Jack says "we should have a {skill-name} for this" in chat — explicit grow signal.

## The gap log

Every detected candidate goes to:
`~/Documents/studio/docs/skill-gaps.md`

Format per entry:
```
## {YYYY-MM-DD} — {brief situation}

**Pattern:** {what the agent was doing}
**Why it didn't fit existing skills:** {1-line analysis}
**Best-match existing skill (and why it's not enough):** {name + delta}
**First seen:** {date} | **Recurrences:** {count}
**Promote when:** {what trigger would make this a real skill}
```

## Promotion threshold

A gap promotes to actual skill candidate when:
- Recurrences ≥ 3
- Across ≥ 2 distinct contexts (different customers, sessions, days)
- Pattern is consistent (not "various ad-hoc handling")

Below threshold: keep watching. Above: fire `skill-tree-grower`.

## Anti-pattern: gap inflation

Don't log every "I'm not sure how to do this." Real gaps require:
- The agent successfully completed the work
- The work has identifiable pattern (not pure judgment)
- The work isn't one-off

Logging too many low-quality gaps creates noise. The threshold for logging at all is "I would do this similarly the next time."

## Cross-pattern with pattern-recurrence-detector

`skill-gap-detector` watches the FUTURE (what the agent is currently doing).
`pattern-recurrence-detector` watches the PAST (what postmortems show).

They feed each other:
- Pattern recurrence catches 3rd failure of a class → skill gap
- Gap detector catches 3rd success of a new pattern → skill promotion

## Hard rules

1. **Never auto-create a skill from a single observation.** 3+ rule.
2. **Always link the gap to the work that exposed it.** Specific file paths, specific situations.
3. **Always include "best-match existing skill"** — sometimes the gap turns out to be a tuning request for an existing skill.

## When invoked
- Continuously during agent operation (passive monitor)
- After every postmortem (cross-check for gaps)
- Inside `weekly-council-review` for pattern aggregation
- Manually when Jack flags "we keep doing this"

## Logging

`[YYYY-MM-DD HH:MM ET] skill-gap-detector → situation: {brief}, type: {ad-hoc|stretched|leakage|recurrence}, log_entry: {path}`

When threshold reached:
`[YYYY-MM-DD HH:MM ET] ⚡ skill-gap-detector → THRESHOLD MET — {pattern}, recurrences: 3, triggering skill-tree-grower`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('skill-gap-detector', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'skill-gap-detector', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
