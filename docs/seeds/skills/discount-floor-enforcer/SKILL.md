---
name: discount-floor-enforcer
description: Hard rule that no Day14 SKU goes below 80% of list price. When pricing-decision-helper considers a discount, this skill is the gate. Prevents the slow erosion of pricing power that kills service businesses. Supporting skill for pricing-decision-helper.
triggers:
  - "discount"
  - "lower the price"
  - "they can't afford"
  - "match competitor"
  - "first customer special"
---

# discount-floor-enforcer

> The hardest battle Jack will fight is keeping prices firm. The
> second-hardest is keeping them firm when a customer is right there
> wanting to sign. This skill is the floor.

## The floors (per SKU)

| SKU | List | Floor (80%) | Below floor = |
|---|---|---|---|
| Site | $2,500 | $2,000 | Walk away |
| Portal | $5,000 | $4,000 | Walk away |
| Platform | $10,000 | $8,000 | Walk away |

Monthly fees ($99 / $199 / $399) are NEVER discounted. Fixed-floor on those.

## When a discount request comes in

The skill runs through this decision tree:

### Is the asking price ≥ 80% of list?
- Yes → proceed. Note discount in `customers.notes` with reason.
- No → continue to next check

### Is the customer in a real hardship category?
The 3 exceptions Jack has pre-approved:
1. **Hurricane recovery customer** (within 30 days of named storm)
2. **Pivot pivot** (Jack himself recommended scope reduction, e.g., Portal → Site)
3. **Multi-customer referral source** (offering a discount to a customer who's brought us 2+ paid customers)

If any of these → manual approval card; Jack decides. Don't auto-approve.

If none → reject the discount request.

### Reject template

If the discount is rejected, draft a reply to the customer (use `eod-update-writer` in "pricing-firm" mode):

```
{First name}, the price is the price — $2,500 flat. Reason it&rsquo;s
not negotiable: that&rsquo;s already what a one-person shop charges; an
agency would quote you 4x for the same scope.

If $2,500 doesn&rsquo;t work this month, two options:
1. We start in {30 days} when budget allows
2. You go with the Site tier ($1,500 less) and add Portal features later

Which works?

— Jack
Day14
```

Then file approval card so Jack reviews + sends.

## Why this skill is hard rules, not soft

Soft rules erode under pressure. The 80% floor:

1. **Protects the brand** — once customer #1 gets a discount, customer #2 will ask. Word spreads.
2. **Protects the math** — Day14's margin on a $2,500 build with the actual time is ~$80/hr. A 20% discount drops it to ~$40/hr — below Splash Jacks's pool tech rate.
3. **Protects the SOW** — if pricing is firm, scope discussions are clean. If pricing flexes, customers negotiate scope and price simultaneously.

## Hard rules

1. **Never quote below 80% of list.** Period.
2. **Never bundle "free extras" instead of discounting.** Same thing, harder to defend later.
3. **Never offer "intro pricing" for customer #1, #2, #3.** First customer pays full freight. Confidence in price = confidence in product.
4. **Never give discounts to family / friends.** They get the same price as anyone, OR they get nothing and the work is a gift (no SOW, no invoice).
5. **Never honor a discount someone "remembers" Jack offering.** All discounts in writing or they don't exist.

## What's NOT a discount

These are scope adjustments, not discounts:
- Customer downgrades from Portal to Site → new price for new scope
- Customer adds a feature → new line item
- Customer cancels mid-build per deposit-back guarantee → full refund of deposit, not "split the difference"

These should be in the SOW from day 1, not negotiated mid-build.

## Logging

`[YYYY-MM-DD HH:MM ET] discount-floor-enforcer → customer: {slug}, asked: ${amount}, list: ${amount}, decision: {approved|rejected|escalated}`

When rejected, also flag for pricing review:
`[YYYY-MM-DD HH:MM ET] discount-rejection — customer: {slug}, ask was ${ask}, reason: {category}`

After 5 rejections in 30 days, flag for Council:
"Is our list price wrong if 5+ customers asked for the same percent off?"

## When invoked
- Inside `pricing-decision-helper` when any deal price < list comes up
- During the kickoff call if customer brings up price
- When drafting any custom invoice or Stripe Payment Link with non-standard amount
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('discount-floor-enforcer', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'discount-floor-enforcer', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
