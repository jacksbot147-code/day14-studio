---
name: review-request-sender
description: +14 days post-delivery → email customer requesting review on Google + product page. Tuned subject line + simple ask. Doubles 5-star review count when consistent.
triggers:
  - "review request"
  - "ask for review"
  - "get reviews"
pack: ecom-ops
---

# review-request-sender

> Customers want to leave reviews. They just need to be asked at the right moment.

## The cadence

| Day post-delivery | Action |
|---|---|
| +14 days | Email: 1-tap review link (Google + on-site) |
| +30 days | If no review: gentle follow-up with photo prompt |
| +60 days | If no review: stop — diminishing returns |

## What this skill does

1. Listens for ship-confirmation events from order-fulfillment-orchestrator
2. Schedules +14 day, +30 day emails
3. Generates personalized email referencing the SKU they bought
4. Includes pre-built review links (`g.page/review/{place_id}` for Google)
5. On review received (via Google API or webhook): logs + thanks customer

## Hard rules

1. **Never bribe for reviews** ("5 stars for a discount") — terms-of-service violation everywhere.
2. **Always link to BOTH Google + on-site** so customers have flexibility.
3. **Never spam** — max 2 emails per customer per order.
4. **Stop sequence on review received** or unsubscribe.
5. **Always acknowledge negative reviews** within 24h via complaint-escalation.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('review-request-sender', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'review-request-sender', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
