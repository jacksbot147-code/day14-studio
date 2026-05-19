---
name: approval-revisit-detector
description: When an old approval-card situation re-emerges (same customer, same issue type), surface that history to the new card. Prevents Jack from re-deciding the same thing twice without realizing it. Supporting skill for approval-card-builder.
triggers:
  - "this looks familiar"
  - "didn't we approve this"
  - "revisit decision"
  - "same issue"
---

# approval-revisit-detector

> Approval card #47 is about to be filed. Cards #12 and #29 covered
> the same situation for the same customer. Jack should see that
> history before he decides #47.

## Trigger

When `approval-card-builder` is about to file a new card, this skill
runs first to check for similar prior cards.

## The matching algorithm

For a new card with:
- `customer_id` (or null for Day14-wide)
- `type` (deploy / message / code-change / expense)
- `title` (kebab-tokenized)

Search past `approvals` rows where:

1. `customer_id` matches AND `type` matches AND `decided_at` within last 30 days
   → likely-related; show the prior decision
2. `customer_id` matches AND title tokens overlap ≥ 2 with new title
   → high-similarity; show the prior card
3. `customer_id` matches AND prior card was `rejected` for same `type`
   → caution; Jack rejected this once; double-check before re-asking

## Output

Add a section to the new card body:

```
### Prior approvals on this topic
- Card {NNN} ({date}): {title} — status: {decided} — decided_via: {tap|sms|voice|auto|web}
- Card {NNN} ({date}): {title} — status: {decided}

**Pattern note:** {auto-detected pattern — e.g., "Customer has asked for hero photo changes 3 times in 14 days" or "Jack rejected this kind of change in card #12"}

**Recommendation:** {if pattern is clear — e.g., "consider whether this customer's expectations need a separate conversation rather than another iteration"}
```

If no related cards found, omit this section entirely. Don't force history where none exists.

## Threshold for "worth surfacing"

Show prior cards only if:
- 2+ related cards exist (a single prior card is just normal context)
- The new card's situation isn't materially different (e.g., a 4th hero-photo change is worth flagging; a fundamentally different change for the same customer is not)

## Hard rules

1. **Never auto-reject the new card based on past patterns.** Jack still decides each one.
2. **Never re-surface fully-resolved approval threads** older than 90 days. After that, it's stale history.
3. **Never combine cards across customers.** Per-customer history only — patterns across customers are for `weekly-council-review`.
4. **Always quote the prior card's title/date directly** — Jack should be able to pull up the original card without guessing.

## Failure modes

- **Customer has 50+ prior cards** (long-running relationship): trim to most recent 5 + any pattern matches. Don't flood.
- **Title fuzzy-matching produces false positives**: tune the token overlap threshold; require ≥3 tokens for fuzzy (vs 2 for exact-type).
- **Card was decided by Jack outside the system** (e.g., he just told the customer "yes" verbally): there's no row to find; skill can't surface what doesn't exist.

## Logging

`[YYYY-MM-DD HH:MM ET] approval-revisit-detector → card_id: {new}, prior_matches: {N}, pattern_detected: {yes|no}`

When a pattern triggers a Council recommendation:
`[YYYY-MM-DD HH:MM ET] approval-revisit-detector pattern → customer: {slug}, count: {N}, suggest_council: {what}`

## When invoked
- Inside `approval-card-builder` before filing any new card
- Manually via "did I approve something like this before?"
- Inside `weekly-council-review` to find approval-pattern issues worth a Council
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('approval-revisit-detector', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'approval-revisit-detector', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
