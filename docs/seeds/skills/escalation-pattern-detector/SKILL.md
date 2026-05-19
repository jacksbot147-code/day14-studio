---
name: escalation-pattern-detector
description: When a class of approval cards keeps auto-approving cleanly, propose codifying it (lower threshold further). When a class keeps failing, propose escalating (raise threshold or block). Phase 5 supporting skill.
triggers:
  - "pattern in approvals"
  - "should this be auto"
  - "decision class trend"
---

# escalation-pattern-detector

> The auto-approve threshold isn't static. As Day14 ages and customer
> count grows, what's safe to auto-approve evolves. This skill spots
> the evolution.

## Input
- `auto-approvals.md` history (all auto-approved cards, last 90 days)
- `auto-approvals-audit.md` outcome data per card

## Detection rules

### Codify a new auto-approve pattern
A card category gets recommended for auto-approve when:
- 10+ manual approvals in 30 days
- 100% approved (never rejected)
- 0 reversal / complaint in following 7 days
- Risk score consistently <0.4

Recommendation:
"This card type (e.g., 'Image optimization commits') has been manual-approved 12 times in 30 days with 0 reversals. Recommend adding to auto-approve list."

Surface to Jack via approval card; doesn't auto-promote.

### Escalate a problem pattern
A card category gets recommended for stricter handling when:
- 3+ reversals in 30 days
- Or a customer complaint within 7 days
- Or a postmortem references this card type

Recommendation:
"Card type 'Customer email subject change' has 3 reversals in 30 days. Recommend: (a) require explicit 'OK' command instead of button tap, (b) add to never-auto-approve, (c) require Council review."

### Detect drift
A category's reversal rate trends upward over time (e.g., from 0% to 3% over 60 days):
- Surface as soft warning
- Suggest threshold tightening before reversal rate becomes a real problem

## Output

Monthly report at `~/Documents/studio/docs/patterns-monthly.md`:

```
# Escalation pattern detection — {month}

## Promote to auto-approve (N candidates)
- {category}: 12 manual / 30 days / 0 reversals → recommend auto-approve

## Escalate / tighten (N candidates)
- {category}: 3 reversals / 30 days → recommend require-explicit-OK

## Drift watch (N)
- {category}: reversal rate 0% → 2% over 60 days; monitor

## No-change categories
- {N} categories operating within healthy bounds
```

## Hard rules

1. **Never auto-promote a category** to auto-approve without Jack's explicit OK.
2. **Always require 30 days of data** before recommending a change. Smaller samples = noise.
3. **Track drift weekly even if no recommendation fires.** The graph matters even when flat.
4. **Tag every recommendation with confidence** (uses `confidence-and-gate-statement`).

## Failure modes

- **Category is too rare to ever hit 10/30**: ignore; don't try to promote
- **Card category boundaries are ambiguous** (two similar types being counted separately): consolidate; re-evaluate
- **A bad outcome could be unrelated to the auto-approval**: link via timestamp + customer match before claiming causation

## When invoked
- Monthly (1st of month) via scheduled task
- After any large-scope outcome change (5+ customer launches, vertical addition, vendor swap)
- Inside `weekly-council-review` for high-stakes pattern flags

## Logging

`[YYYY-MM-DD HH:MM ET] escalation-pattern-detector → categories_reviewed: N, recommendations: {promote: N, escalate: N, drift: N}, output: {path}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('escalation-pattern-detector', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'escalation-pattern-detector', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
