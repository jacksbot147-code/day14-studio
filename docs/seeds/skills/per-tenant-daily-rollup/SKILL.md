---
name: per-tenant-daily-rollup
description: Each tenant gets its own daily rollup: that biz's MRR delta, churn risks, active builds, content schedule, key events. One concise message per business per day.
triggers:
  - "tenant rollup"
  - "daily for business"
  - "per business brief"
pack: multi-business-operator
---

# per-tenant-daily-rollup

> Running 5 businesses means 5 different mornings.
> This skill gives Jack one digest per tenant, not one giant blob.

## What it does

For each active tenant (from tenants.json), each morning at 7 AM ET:

1. Reads tenant dossier, work-register entries with that slug, recent events
2. Builds tenant-specific rollup:
   - MRR delta since yesterday
   - Open churn risks (red bucket only)
   - Active builds / projects
   - Content scheduled today (if content-brand or productized-build-shop)
   - 1 thing to focus on for that tenant today
3. Outputs: `~/Documents/businesses/{tenant}/rollups/{date}.md`
4. Aggregates all rollups into one Telegram thread (P3) — one card per tenant

## Hard rules

1. **One card per tenant** — don't merge into a giant blob.
2. **Skip tenants with no activity** in last 7d — surface as "quiet, no action needed".
3. **Always tie to MRR impact** — tenants with falling MRR get higher visibility.
4. **Always include 'today's one thing'** per tenant — not optional.
5. **Always end the message with the tenant slug** in code-format so /switch is fast.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('per-tenant-daily-rollup', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'per-tenant-daily-rollup', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
