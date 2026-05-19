---
name: upsell-detection
description: When a customer mentions a problem (or pattern in their build log surfaces a problem) that Day14 could fix with an upsell (Site → Portal, Portal → Platform, add-on feature, multi-vertical expansion), surface the opportunity. Drafts the upsell pitch in customer's voice for Jack to send. Supporting skill for pricing-decision-helper.
triggers:
  - "customer mentioned"
  - "they want more"
  - "Portal upgrade"
  - "add features"
  - "upsell opportunity"
---

# upsell-detection

> Existing customers convert ~10x better than new prospects. Most
> agencies miss the upsells because they're so focused on customer #1.
> This skill notices the signals.

## Signals (any 1+ surfaces an opportunity)

### Tier upgrade signals
- **Site customer asks about online booking** → Portal upgrade
- **Site customer wants a customer login area** → Portal
- **Portal customer wants admin dashboard / tech routes** → Platform
- **Portal customer asks about visit-tracking / chemistry** → Platform (mobile-service vertical-specific)

### Add-on signals
- **Customer says "could you also..."** → Either upsell scope OR firm up SOW (use `walk-away-detector` to distinguish)
- **Customer's competitor has X feature they wish they had** → Add-on
- **Customer's seasonal pattern suggests new functionality** (e.g., pool service customer in March = pre-season; "want a hurricane mode toggle?") → Vertical-specific upsell

### Cross-tenant signals
- **Customer's business is expanding to a new vertical** → New site for the new vertical (referral discount: 20% off second build for same owner)
- **Customer's spouse / partner has a related business** → Referral chain

## How to score the opportunity

For each detected signal:

```
Confidence: 0.0-1.0 (signal strength)
Estimated ARR uplift: $X (additional MRR × 12)
Effort: small/medium/large
Customer's stated openness: high/medium/low (have they mentioned scope expansion before?)
```

Only surface as an approval card if **confidence ≥ 0.7 AND ARR uplift ≥ $500 AND customer openness ≠ low**.

## The pitch draft

When the skill fires, draft an upsell email (use `day14-voice`):

```
{Customer first name},

You mentioned wanting {specific signal}. Two paths:

1. Quick add-on: ${cost} flat to add {specific feature}. ~{N} days. Same SOW terms.
2. Tier upgrade to {Portal/Platform}: ${list} flat + ${monthly}/mo. Includes
   {what's in the upgrade}. Full benefits: {1-2 things they get beyond #1}.

Worth a 10-min call to walk through? Cal link: {url}

— Jack
Day14
```

Save to `02-build-log.md` "Drafts for Jack" section. Filed as approval card.

## When the upsell is NOT appropriate

Don't surface upsells if any of:

- **Customer is mid-build** (active SOW) — don't expand scope mid-flight
- **Customer just complained** in the last 14 days — wait for resolution + 30 days of normalcy
- **Customer's monthly payment is overdue** — fix the cash flow before adding
- **Within the 30-day post-launch warranty window** — focus on stabilization, not selling
- **Customer's brand.json suggests budget constraints** ("price-sensitive" flag) — wait until they bring it up

## Hard rules

1. **Never automate the upsell send.** Drafts only. Jack reviews + sends.
2. **Never bundle upsells into a regular EOD email** — they need their own dedicated message.
3. **Never offer an upsell discount that violates `discount-floor-enforcer`.** Upsells are list-priced.
4. **Never recommend a tier upgrade if the customer used <30% of their current tier's features.** The signal "they want more" might mean "they don't know what they have."
5. **Never propose more than ONE upsell per quarter per customer.** Too many = pestering.

## Cross-skill triggers

- This skill calls `customer-history-lookup` first to verify openness signals
- It calls `pricing-decision-helper` to confirm pricing
- It calls `discount-floor-enforcer` to enforce no-discounts on upsells
- It files via `approval-card-builder`

## Logging

`[YYYY-MM-DD HH:MM ET] upsell-detection → customer: {slug}, signal: {what}, confidence: {0.0-1.0}, ARR_uplift: ${amount}, surfaced: {yes|no}`

When Jack sends + customer agrees:
`[YYYY-MM-DD HH:MM ET] upsell-detection ACCEPTED → customer: {slug}, new MRR: ${amount}, effort: {est}`

Quarterly: count accept rate per signal type. Tune confidence thresholds from real data.

## When invoked
- After every EOD update (scan day's customer interactions for signals)
- After every customer feedback inbound (via `inbound-classifier`)
- Manually when Jack feels "they're ready for more"
- Inside `weekly-council-review` to surface pattern observations
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('upsell-detection', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'upsell-detection', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
