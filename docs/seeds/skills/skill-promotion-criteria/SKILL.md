---
name: skill-promotion-criteria
description: The canonical "should this be a skill?" decision rules. Used by skill-tree-grower BEFORE drafting, and by emergent-skill-graduator + skill-gap-detector as the threshold engine. The gatekeeper that prevents skill bloat.
triggers:
  - "should this be a skill"
  - "promotion criteria"
  - "is this skill-worthy"
---

# skill-promotion-criteria

> Too few skills = ad-hoc work everywhere. Too many = decision paralysis,
> bloat, hard to find the right one. This skill is the median.

## The 5 criteria (all must pass for promotion)

### 1. The 3-occurrence rule (mandatory)
Pattern observed 3+ times across distinct contexts:
- 3 different customers OR
- 3 different sessions OR
- 3 different days

Below 3 = anecdote. Not promoted.

### 2. Pattern stability (mandatory)
Across the 3+ occurrences, the WORK was substantially the same:
- Same inputs accepted (within tolerance for variation)
- Same outputs produced
- Same decision tree applied

If the 3 occurrences had 3 different approaches → not stable; not a skill yet.

### 3. Encodable in 60-200 lines (mandatory)
If the work requires more than ~200 lines to describe:
- It's probably an agent prompt, not a skill
- OR it's multiple skills

Cap = 200 lines for any single skill. Bigger = split.

### 4. Has clear triggers (mandatory)
The skill must be findable. Define 3-5 trigger phrases (what makes the agent reach for this skill).

If triggers can't be articulated cleanly = the skill is too vague to fire reliably.

### 5. Above the "trivial decision" threshold (mandatory)
Don't create skills for:
- One-line decisions ("if X then Y")
- Trivial defaults
- Pure judgment with no encodable rules

If the entire skill could be condensed to "use your judgment per these 3 factors" — it's not a skill. It's a tuning of an existing skill OR a Council prompt template.

## Bonus criteria (raise priority, not required)

- ✓ Skill prevents a recurring bug class
- ✓ Skill reduces operator cognitive load (Jack uses it >1×/week)
- ✓ Skill compounds with existing cluster (anchor + supporter shape)
- ✓ Skill saves >15 min per invocation on average

## Negative signals (block promotion)

- ✗ Pattern observed but with high variance — not stable
- ✗ "We might need this someday" — no current usage
- ✗ Skill duplicates existing one — amend the existing
- ✗ Skill is one customer's specific workflow — keep in tenant code
- ✗ Skill is a fix for a code bug — that's a code fix, not a skill

## The decision protocol

For each promotion candidate:

```
1. Check criterion 1 (3-occurrence rule)        → fail = REJECT
2. Check criterion 2 (pattern stability)        → fail = LOG, recheck later
3. Estimate skill size                          → >200 lines = SPLIT
4. Articulate triggers                          → can't = NOT YET
5. Check trivial-decision threshold             → trivial = REJECT

If all 5 pass:
  → check for existing skill that could amend
  → if amend possible: prefer amend (cheaper)
  → if not: PROMOTE → invoke skill-tree-grower

Surface the decision + reasoning to operator.
```

## Sample evaluations (from real Day14 history)

### CASE: "watermark visit photos" 
- Occurrences: ✓ (3 customers, 90 days)
- Stability: ✓ (always: load → strip EXIF → resize → composite logo → save)
- Size: ✓ (~140 lines fits)
- Triggers: ✓ ("watermark", "visit photo", "brand mark on image")
- Non-trivial: ✓ (decision tree per logo type)
→ **Promoted** as `photo-watermarker`

### CASE: "ad-hoc emergency-fix when Vercel deploy fails"
- Occurrences: ✓ (twice, plus once for Stripe)
- Stability: ✗ (each had different cause + fix)
- → **Not promoted** — this is a Council use case, not a skill

### CASE: "be more polite in customer email"
- Occurrences: ✓
- Triggers: ✗ (can't articulate when)
- Non-trivial: ✗ (pure judgment)
- → **Not promoted** — this is `day14-voice` calibration

## Hard rules

1. **Never lower the 3-occurrence rule** without explicit Jack approval + reasoning.
2. **Always document the decision** (in `~/Documents/studio/docs/skill-promotion-log.md`) — even rejections.
3. **Always consider amend-over-create.** Existing skills should grow first.
4. **Never promote based on volume alone.** A pattern firing 100 times that's actually 100 different patterns isn't promotable.

## When invoked
- Inside `skill-tree-grower` as the pre-flight check
- Inside `emergent-skill-graduator` for each candidate
- Manually when Jack asks "is this a skill?"

## Logging
`[YYYY-MM-DD HH:MM ET] skill-promotion-criteria → candidate: {name|brief}, decision: {promote|amend|reject|defer}, reason: {one-line}`

Decision log:
`~/Documents/studio/docs/skill-promotion-log.md` (append-only audit trail)
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('skill-promotion-criteria', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'skill-promotion-criteria', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
