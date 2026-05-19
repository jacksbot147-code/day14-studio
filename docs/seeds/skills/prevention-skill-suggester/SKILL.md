---
name: prevention-skill-suggester
description: After a postmortem is filed, this skill suggests whether a new skill should be created (or an existing skill amended) to prevent the failure class. Closes the loop between "this broke" and "this can't break the same way again." Supporting skill for postmortem-writer.
triggers:
  - "what skill prevents this"
  - "should we add a skill"
  - "prevention layer"
---

# prevention-skill-suggester

> Every postmortem ends with "skill to update / add." This skill
> answers that line. Process-level fixes don't scale; skill-level
> fixes do.

## Input
- Path to the postmortem
- Its Tier 1 + Tier 2 root cause categorization

## The suggestion algorithm

### 1. Existing-skill match
Scan `~/Documents/businesses/_shared/skills/` for any skill whose
description/triggers match the failure pattern:

- Did the failure happen in a domain a skill claims to cover?
- If yes, the skill's contract has a hole. Surface the gap.

Output example:
```
Recommendation: AMEND skill `browser-driven-vendor-setup`
- Current hole: doesn't catch users pasting secrets into chat
- Patch: add explicit "verify keys land in .env.local NOT chat" rule
- Where: section "Hard rules", add rule #8
```

### 2. New-skill candidate
If no existing skill covers the failure:
- Propose a new skill name (kebab-case, action-oriented)
- Describe its purpose in 1 sentence
- List its triggers (1-3)
- Sketch its first 3 sections

Output example:
```
Recommendation: NEW skill `webhook-replay-detector`
- Purpose: catch when a webhook event fires twice within 30s and dedupes
- Triggers: "webhook fired twice", "duplicate event", "idempotency key"
- Sketch:
  - Input: webhook event_id + occurrence timestamp
  - Check: events table for prior row with same event_id
  - Action: ignore second occurrence, log dedup
```

### 3. Process-only fix (rare)
If the failure is one-off and unlikely to recur, no skill change needed. Output:
```
Recommendation: NONE
- Reasoning: single-occurrence failure, low recurrence risk
- Re-evaluate if pattern-recurrence-detector flags a second occurrence
```

## How to evaluate "is a new skill needed"

Use these signals:

| Signal | New skill? |
|---|---|
| Same failure could happen at multiple touch points | YES |
| Fix requires consistent application across the codebase | YES |
| Failure has a "name" (e.g., "the rsync .gitignore problem") | YES |
| Failure is genuinely one-off (environment quirk, transient error) | NO |
| Fix is a 1-line code change | usually NO |
| Failure is human judgment + we don't want to encode the judgment yet | NO |

## Hard rules

1. **Never auto-create a new skill.** Surface the recommendation; Jack approves; agent drafts the SKILL.md.
2. **Never recommend more than 1 new skill per postmortem.** Multiple fixes = scope creep.
3. **Never recommend amending more than 2 existing skills per postmortem.** Otherwise it's a re-architecture.
4. **Always link the postmortem to the skill change** that came out of it (in the skill's "Why this skill exists" section).

## When invoked
- Inside `postmortem-writer` after the body is drafted
- Inside `pattern-recurrence-detector` when a pattern reaches 3 occurrences (forces a skill-level fix proposal)
- Manually when Jack asks "should we make a skill for this?"

## Logging

`[YYYY-MM-DD HH:MM ET] prevention-skill-suggester → postmortem: {slug}, recommendation: {amend-{skill} | new-{skill} | none}, ETA: {est minutes to implement}`

When recommendation is implemented:
`[YYYY-MM-DD HH:MM ET] prevention-skill-suggester IMPLEMENTED → skill: {name}, change: {amend|new}`

Quarterly: how often does this skill's recommendation get implemented? If <50%, the skill is generating noise; tune the threshold for what warrants a recommendation.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('prevention-skill-suggester', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'prevention-skill-suggester', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
