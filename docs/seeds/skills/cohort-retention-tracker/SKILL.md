---
name: cohort-retention-tracker
description: Cohort-by-month retention curves. Shows what % of each acquisition cohort is still paying at month 1, 3, 6, 12. The single best signal of product-market fit at the unit level.
triggers:
  - "retention"
  - "cohort"
  - "are customers staying"
  - "churn curve"
---

# cohort-retention-tracker

> Average churn lies. Cohort retention tells the truth.

## What's tracked

For each monthly cohort (customers acquired that month), retention at:

| Cohort | M0 | M1 | M3 | M6 | M12 |
|---|---|---|---|---|---|
| Feb 2026 | 4 | 4 (100%) | 3 (75%) | 3 (75%) | TBD |
| Mar 2026 | 7 | 6 (86%) | 5 (71%) | TBD | TBD |
| Apr 2026 | 9 | 8 (89%) | TBD | TBD | TBD |
| May 2026 | 12 | TBD | TBD | TBD | TBD |

## Why cohorts (not single-number churn)

A single "5% monthly churn" number averages out the truth:
- New customers churn at 12% in month 1
- Month-12 customers churn at 0.5%/month
- Average = 5%, but the average hides everything actionable

Cohort view shows:
- Where the cliff is (M0 → M1? M3 → M6?)
- Whether retention is improving cohort over cohort (the right direction)
- Which specific cohort hit a problem (e.g., March hit a storm event)

## Output schema

`~/Documents/businesses/_shared/metrics/cohorts-{YYYY-MM}.md`:

```
# Cohort retention — through May 2026

[Cohort table above]

## Trend
- M1 retention: 86% → 89% (3 cohorts, improving ↑)
- M3 retention: 75% → 71% (2 cohorts, slipping ↓)

## What changed in Mar 2026 cohort?
- Acquired during storm-week (Hurricane prep season)
- Higher proportion of pool customers (volatile vertical)
- Possible: rushed builds + insufficient onboarding
- Action: review Mar 2026 builds against the post-storm-damage-assessor

## Best cohort
Feb 2026: 75% at M3 (despite small N)
What made it different? → smaller batch, more hands-on Jack involvement

## Worst cohort
Mar 2026: 71% at M3 (declining)
Investigate: which 2 customers churned, why?
```

## How it computes

1. Group all customers by first-paid-invoice month
2. For each month M0+N, count how many are still on subscription
3. Compute %
4. Surface the diff vs prior cohort + the absolute number

## Hard rules

1. **Always show absolute N alongside %.** 1 of 2 churning = 50% but it's noise. 5 of 10 = 50% is signal.
2. **Never average across cohorts to compute "the" churn rate.** That hides the curve shape.
3. **Always flag cohorts with N < 5** — they're too small to draw conclusions.
4. **Always tie to LTV** — combine with `customer-ltv-calculator` for full PMF view.
5. **Always investigate worst cohort.** Not "what went wrong" but "which specific customers and why."

## Inputs

- `through_month` (default: current month)
- `breakdown_by` (optional: vertical, plan_tier, source)

## When invoked

- Monthly via scheduled task (1st of month, 7 AM ET — after LTV)
- Inside `weekly-council-review` (M0-M3 cohorts shown)
- `/cohorts` Telegram command
- Anytime a cohort hits M3, M6, M12 → milestone notification

## Failure modes

- **<3 months of customer history**: too early — flag and skip
- **Stripe data incomplete**: cross-reference with intake forms + dossiers
- **Cancelled-but-disputed customers**: show as conditional (paid but disputed)

## Logging

`[YYYY-MM-DD HH:MM ET] cohort-retention-tracker → cohorts: {N}, best_m3: {%}, worst_m3: {%}, trend: {improving|stable|slipping}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('cohort-retention-tracker', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'cohort-retention-tracker', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
