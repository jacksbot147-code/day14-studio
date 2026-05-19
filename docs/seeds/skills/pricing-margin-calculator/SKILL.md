---
name: pricing-margin-calculator
description: Given COGS + target margin + competitor data + tier strategy, compute optimal price per SKU. Suggests price changes. Pairs with discount-floor-enforcer.
triggers:
  - "pricing"
  - "margin check"
  - "price optimization"
  - "COGS"
pack: ecom-ops
---

# pricing-margin-calculator

> The right price is the highest one that doesn't kill conversion.
> This skill finds that price.

## The math

```
price = COGS / (1 - target_margin)

Where target_margin defaults to:
  - Marine specialty: 65%
  - Premium niche brand: 70%
  - Commodity goods: 35%
  - Subscription product: 75%
```

## What it surfaces

For each SKU, weekly:
- Current price
- COGS (from catalog metadata)
- Current margin %
- Competitor median (if competitor-pricing data exists)
- Suggested new price (if margin is below target)
- Conversion rate (last 30d) — to know if a price increase has runway

## Hard rules

1. **Never raise prices without 14-day notice to existing customers**.
2. **Never lower prices below `min_margin_floor`** (set per tenant; default 25%).
3. **Always show competitor context** when suggesting changes.
4. **Always Jack-tap before publishing price changes**.
5. **Track conversion impact** for 30 days post-change.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('pricing-margin-calculator', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'pricing-margin-calculator', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
