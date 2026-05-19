---
name: abandoned-cart-recovery
description: Stripe Checkout abandonment → 3-email recovery sequence (1hr, 24hr, 72hr). Discount only on final email. Recovers 12-18% of abandoned carts when tuned right.
triggers:
  - "abandoned cart"
  - "cart recovery"
  - "checkout abandoned"
pack: ecom-ops
---

# abandoned-cart-recovery

> Default behavior of Stripe Checkout: nothing.
> 70% of carts get abandoned. This skill captures the recoverable slice.

## The 3-email sequence

| Sent | Tone | Subject | Body |
|---|---|---|---|
| +1 hour | Helpful nudge | "Forget something?" | Cart image + 1-tap recovery link |
| +24 hours | Gentle | "Still want this?" | Same cart + a customer review of one of the items |
| +72 hours | Soft offer | "Take 10% off if it helps" | Discount code only — 10% max, 72hr expiry |

## Hard rules

1. **Never discount earlier than 72 hours** — trains customers to abandon.
2. **Max discount: 10%**. Anything more eats margin + sets a bad precedent.
3. **Stop sequence on purchase** — never email after they bought.
4. **One sequence per customer per 30 days** — avoid harassment.
5. **Always include customer service email** in case the issue is a question, not price.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('abandoned-cart-recovery', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'abandoned-cart-recovery', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
