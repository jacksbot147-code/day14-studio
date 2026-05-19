---
name: risk-scoring
description: Compute a 0.0-1.0 risk score for every approval card. Feeds auto-approve-low-risk and the urgency-classifier. Combines reversibility, magnitude, customer-impact, novelty. Phase 5 supporting skill.
triggers:
  - "risk score"
  - "how risky"
  - "evaluate this decision"
---

# risk-scoring

> The numeric input that lets auto-approve be objective.
> Subjective: "this seems fine."
> Objective: "risk score 0.12 — below threshold."

## The score formula

```
risk = (reversibility_factor × 0.35)
     + (magnitude_factor × 0.30)
     + (customer_impact × 0.20)
     + (novelty_factor × 0.15)
```

Each factor in 0.0 (low risk) to 1.0 (high risk). Composite = same scale.

### reversibility_factor (0.35 weight)

How easy is it to undo?

| Score | Means |
|---|---|
| 0.0 | One-tap undo, no data loss, no customer notification needed |
| 0.3 | Undo possible in <10 min, no public visibility |
| 0.5 | Undo possible but customer may have seen the change |
| 0.7 | Hard to undo — customer is already in next stage |
| 1.0 | Irreversible — money moved, data deleted, public statement made |

### magnitude_factor (0.30 weight)

Dollar/time/customer-count impact:

| Score | Means |
|---|---|
| 0.0 | $0, 0 customers, <5 min effort |
| 0.3 | <$50, 1 customer, <30 min |
| 0.5 | $50-$200, 1 customer, <2 hours |
| 0.7 | $200-$1000, 2+ customers, half-day |
| 1.0 | >$1000, 5+ customers, full-day or more |

### customer_impact (0.20 weight)

How visible to customers?

| Score | Means |
|---|---|
| 0.0 | Internal only — customers can't see |
| 0.3 | Internal but might affect a build agent's output |
| 0.5 | One customer's preview, not yet sent |
| 0.7 | One customer's production site |
| 1.0 | Multiple customers' production sites OR a public Day14 statement |

### novelty_factor (0.15 weight)

Have we done this kind of thing before?

| Score | Means |
|---|---|
| 0.0 | 10+ prior instances, all successful |
| 0.3 | 3-9 prior instances, ≤1 failure |
| 0.5 | 1-2 prior instances |
| 0.7 | First instance of this category |
| 1.0 | Novel + breaks a previously-established pattern |

## Computed risk

| Risk total | Recommendation |
|---|---|
| 0.00-0.30 | Auto-approve eligible (if other gates pass) |
| 0.31-0.55 | Recommend; Jack confirms |
| 0.56-0.80 | Push as P1 approval card with stake explanation |
| 0.81-1.00 | Mandatory Council protocol before action |

## How the score gets computed

For each card, the scoring agent answers each of the 4 factors with a number. The composite is computed. Surface to operator:

```
Risk score: 0.18

Breakdown:
- Reversibility: 0.0 (one-tap undo)
- Magnitude: 0.3 ($0, 1 customer, <30 min effort)
- Customer impact: 0.3 (build agent intermediate output, not customer-visible yet)
- Novelty: 0.3 (5 prior similar cards, all clean)

Total: 0.0 × 0.35 + 0.3 × 0.30 + 0.3 × 0.20 + 0.3 × 0.15 = 0.18
```

## Hard rules

1. **Never default factors to 0.** A factor unscored = 0.5 default until human-reviewed.
2. **Always show the breakdown** so it's auditable. Black-box scores erode trust.
3. **Customer-impact must be conservative** — if there's a chance customer sees it, score ≥0.5.
4. **Calibrate quarterly** — outcomes from 30-day-old cards inform whether the formula is right.

## Failure modes

- **Factor scoring is itself ambiguous** (e.g., "is this irreversible?"): default to higher risk; surface the ambiguity to operator
- **Card type is unprecedented**: novelty = 1.0 by definition; total risk likely > 0.7; surface to Jack
- **Outcome data shows formula is off**: tune weights; surface to Jack via approval card

## When invoked
- Inside `approval-card-builder` for every new card
- Inside `auto-approve-low-risk` as the threshold input
- Inside `urgency-classifier` to inform P-level

## Logging

`[YYYY-MM-DD HH:MM ET] risk-scoring → card: {id}, risk: {N}, breakdown: {factor scores}, recommendation: {auto|manual|council}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('risk-scoring', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'risk-scoring', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
