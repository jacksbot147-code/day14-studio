---
name: inventory-tracker
description: Track stock per SKU. Decrements on order, increments on restock/return. Alerts when below reorder threshold. Prevents overselling.
triggers:
  - "inventory"
  - "stock check"
  - "out of stock"
  - "restock"
pack: ecom-ops
---

# inventory-tracker

> Overselling = refund + apology email + reputation hit.
> Undersellling = capital sitting idle.
> This skill keeps both in check.

## What this skill does

1. Reads catalog/products.json for current counts
2. On every Stripe `checkout.session.completed` for an ecom tenant: decrements relevant SKUs
3. On every `charge.refunded` for in-stock items: increments back
4. Daily: identifies SKUs below `reorder_threshold` and queues Telegram alert
5. Records every change to `inventory-log.jsonl` for audit

## Hard rules

1. **Never let inventory go negative.** If a payment would cause negative inventory, queue a P0 alert and DON'T process the order until Jack resolves.
2. **Always alert when crossing reorder threshold** (don't just alert when at zero — too late).
3. **Always log every change** with order_id, reason, before/after counts.
4. **Recount weekly** against physical inventory (Jack-prompted Telegram message).
5. **Never modify counts from outside this skill** — single chokepoint.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('inventory-tracker', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'inventory-tracker', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
