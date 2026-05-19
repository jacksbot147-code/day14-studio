---
name: mrr-calculator
description: Compute current MRR + 30-day delta + trend from Stripe subscriptions data. Powers /mrr command, Apple Watch complication, and daily kickoff dashboard. Layer 8 monitoring.
triggers:
  - "MRR"
  - "monthly recurring"
  - "what's the money"
  - "current revenue"
---

# mrr-calculator

> The number Jack cares about most. Has to be accurate, always
> available, fast to compute.

## The math

MRR = sum of all active Stripe subscriptions' monthly amounts.

```sql
-- Day14 OS-side view (Supabase):
SELECT SUM(monthly_amount_cents) / 100 AS mrr_dollars
FROM customers
WHERE status = 'launched'
  AND monthly_subscription_active = true;
```

But for ground truth, query Stripe directly:

```ts
const subs = await stripe.subscriptions.list({
  status: 'active',
  limit: 100,
});
const mrr = subs.data.reduce((sum, sub) => {
  return sum + (sub.items.data[0].price.unit_amount * sub.items.data[0].quantity);
}, 0) / 100;
```

Cross-check Supabase view vs Stripe; if they differ by >$1, surface as anomaly (data drift).

## Derived metrics

Beyond raw MRR, compute:

- **30-day MRR change**: today's MRR vs 30 days ago
- **New MRR this month**: subscriptions starting after 1st of month
- **Churned MRR this month**: subscriptions canceling after 1st
- **Net new**: new - churned
- **Customer count by tier**: how many Site / Portal / Platform customers

## Output

`/mrr` command returns:

```
*Day14 MRR* — $1,247

This month so far:
- Started: 3 subs (+$497)
- Churned: 1 sub (−$99)
- Net new: +$398

By tier:
- Site: 5 ($495)
- Portal: 3 ($597)
- Platform: 1 ($399)

Updated: {timestamp}
```

For Apple Watch complication, just the MRR number + trend arrow:
```
$1,247 ↑
```

## Caching

MRR doesn't change often. Cache for 5 min:
- First call within 5 min: query Stripe + write to cache file
- Subsequent calls: read from cache

Cache busts on Stripe webhook events: `customer.subscription.created`, `customer.subscription.deleted`, `invoice.payment_succeeded`.

## Hard rules

1. **Never round to obscure the real number.** $1,247 not "about $1,250."
2. **Never use test-mode subscriptions** in MRR. Live mode only.
3. **Always cross-check Supabase vs Stripe.** Source of truth = Stripe; flag any drift.
4. **Never expose customer-level data** in MRR output (no "John from Acme paid $99 today").

## Failure modes

- **Stripe API rate-limited**: serve from cache (even stale); note staleness
- **Stripe outage**: serve last-known MRR with timestamp
- **Subscription with weird billing cycle** (annual, custom): coerce to monthly equivalent

## When invoked
- Telegram `/mrr` command
- Inside `daily-kickoff` for the morning dashboard
- Apple Watch complication poll
- Inside `weekly-council-review` for trend analysis

## Logging

`[YYYY-MM-DD HH:MM ET] mrr-calculator → mrr: ${N}, change_30d: ${±N}, new_this_month: ${N}, churned: ${N}, customers: N`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('mrr-calculator', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'mrr-calculator', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
