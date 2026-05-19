---
name: order-fulfillment-orchestrator
description: Receive Stripe order → reserve inventory → generate packing slip → queue shipping label → notify customer → mark shipped. Replaces 7 manual steps with one skill.
triggers:
  - "fulfill order"
  - "pack order"
  - "ship order"
  - "order pipeline"
pack: ecom-ops
---

# order-fulfillment-orchestrator

> 7 manual steps × 10 orders/day = 70 friction points.
> This skill collapses them into one approve-then-ship card.

## The pipeline

```
Stripe checkout.completed
  ↓
inventory-tracker reserves SKUs
  ↓
packing-slip generated → ~/Documents/businesses/{tenant}/orders/{date}/{order_id}/
  ↓
shipping-label-generator queues label (USPS/UPS/Fedex via Shippo or EasyPost)
  ↓
Telegram P2 card: "Order #1234 ready to ship. Approve label?"
  ↓
Jack taps approve
  ↓
Label prints, tracking number emailed to customer
  ↓
Order marked shipped in Stripe metadata
  ↓
review-request-sender scheduled for +14 days post-delivery
```

## Hard rules

1. **Never auto-ship without Jack-tap on the label.** Wrong addresses cost real money.
2. **Always include packing slip with order**.
3. **Always email customer** when label generated (tracking link).
4. **Always reserve inventory at order time**, not at ship time.
5. **Never combine orders without customer permission**.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('order-fulfillment-orchestrator', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'order-fulfillment-orchestrator', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
