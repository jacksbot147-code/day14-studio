---
name: shipping-label-generator
description: Buy USPS/UPS/Fedex labels via Shippo or EasyPost API. Pulls customer address from Stripe + package weight from catalog. Prints to AirPrint-capable label printer or saves PDF.
triggers:
  - "shipping label"
  - "buy postage"
  - "generate label"
  - "print label"
pack: ecom-ops
---

# shipping-label-generator

> Labels are commodity. The work is verifying address + dimensions.

## What this skill does

1. Receives order via order-fulfillment-orchestrator
2. Computes total package weight from catalog + variant data
3. Calculates dimensions (default box sizes per SKU profile)
4. Calls Shippo API: get rates → pick cheapest meeting delivery SLA
5. Buys label, downloads PDF, queues for printing
6. Saves tracking number to order record + emails customer

## Hard rules

1. **Always verify address with USPS address validation API first** (catches typos).
2. **Always pick cheapest meeting SLA** — never ship Priority when First Class works for the deadline.
3. **Always queue Jack-tap before buying** if amount > $50.
4. **Never auto-buy in test mode** — real money.
5. **Always log the label PDF path** so reprints are easy.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('shipping-label-generator', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'shipping-label-generator', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
