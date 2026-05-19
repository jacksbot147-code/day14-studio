---
name: customer-ltv-calculator
description: Compute LTV (lifetime value) per customer — total paid + projected based on tenure + churn rate. Powers acquisition spend decisions and customer prioritization.
triggers:
  - "LTV"
  - "lifetime value"
  - "customer value"
  - "is this customer worth it"
---

# customer-ltv-calculator

> LTV is the answer to "how much can I spend to acquire this customer?"
> Without it, every marketing decision is a guess.

## What's computed

For each active customer:

```
LTV_realized   = SUM(all_paid_invoices)
LTV_projected  = realized + (mrr × expected_months_remaining)
expected_months_remaining = 1 / churn_rate_for_segment

LTV_total = LTV_realized + LTV_projected
```

Where `churn_rate_for_segment` is the actual monthly churn for customers in:
- Same plan tier ($497, $997, $1997)
- Same vertical (pools, real-estate, etc.)
- Same tenure bucket (0-3mo, 3-12mo, 12mo+)

## Output schema

`~/Documents/businesses/_shared/metrics/ltv-{YYYY-MM}.md`:

```
# Customer LTV — May 2026

## Top 10 by LTV
1. splash-jacks-pools     $4,470 realized + $5,964 projected = $10,434
2. casamore               $2,985 realized + $14,910 projected = $17,895
...

## Acquisition spend ceilings (LTV ÷ 3)
- $497 tier: max CAC = ~$1,200
- $997 tier: max CAC = ~$2,500
- $1997 tier: max CAC = ~$5,000

## Segment churn rates
- Pools (0-3mo): 8%/mo (high — first 90 days critical)
- Pools (3-12mo): 2.5%/mo (much stickier after onboarding)
- Real-estate (any tenure): 1.2%/mo (very sticky)

## Outliers
- buildbridge: realized $2,985 but no activity in 60d — churn-risk
- casamore: 4 months in, zero support tickets — happy or invisible? Check.
```

## How it computes

1. Pulls all invoices from Stripe (paginated)
2. Groups by customer
3. Joins to dossier metadata (tier, vertical, signup date)
4. Computes churn rate per segment from cancellation history
5. Projects forward

## Hard rules

1. **Always weight by realized over projected.** A bird in hand. Projected is directional only.
2. **Always show the assumption** (which churn rate was used). Otherwise impossible to audit.
3. **Never round.** LTV gaps are signal — if customer A is $11k and customer B is $11.2k, they're similar; if A is $11k and C is $30k, that's the real difference.
4. **Update monthly, not daily.** LTV is a slow metric — daily volatility is noise.
5. **Never share another customer's LTV with a customer.** It's strategic data.

## Inputs

- `month` (YYYY-MM, defaults to current)
- `customer_slug` (optional — single-customer mode)

## When invoked

- Monthly via scheduled task (1st of month, 6 AM ET)
- Inside `cohort-retention-tracker` for context
- Inside `churn-risk-scorer` (prioritize saves by LTV)
- `/ltv {slug}` Telegram command

## Failure modes

- **Stripe API timeout**: cache last computation; retry in 1h
- **New customer (<30 days)**: project conservatively — show "TBD" rather than guess
- **Refunded customers**: subtract from realized; surface separately

## Logging

`[YYYY-MM-DD HH:MM ET] customer-ltv-calculator → month: {YYYY-MM}, customers: {N}, top_ltv: ${amount}, avg_ltv: ${amount}, total_book: ${amount}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('customer-ltv-calculator', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'customer-ltv-calculator', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
