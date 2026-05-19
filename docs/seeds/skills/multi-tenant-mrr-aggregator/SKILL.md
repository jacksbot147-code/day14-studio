---
name: multi-tenant-mrr-aggregator
description: Aggregate MRR + ARR across all active tenants. Per-tenant breakdown. Identifies which businesses are net-new positive vs flat vs shrinking. Single number that captures empire health.
triggers:
  - "total mrr"
  - "empire revenue"
  - "aggregate revenue"
  - "all businesses"
pack: multi-business-operator
---

# multi-tenant-mrr-aggregator

> One number tells you if the empire is growing.

## What it computes

```
total_mrr = sum(active tenant MRR)
total_arr = total_mrr × 12

per-tenant:
  - current MRR
  - 30d delta (gained - lost)
  - direction: ↑ ↘ →

empire-level:
  - Net new this month
  - Best-performing tenant
  - Worst-performing tenant
```

## Output

```
🏢 Empire — May 17, 2026

Total MRR: $8,941
Total ARR: $107,292

Per tenant:
  day14:             $0 (productized shop, not subscription)
  splash-jacks-pools: $497 ↑
  buildbridge:        $997 ↘ (-$497 last week, churn risk)
  casamore:           $1997 →

Best: splash-jacks-pools (+$497 30d)
Worst: buildbridge (-$497 30d, red)
```

## Hard rules

1. **Always show direction** — number alone is useless without trend.
2. **Always tie shrinking tenants to specific causes** (churn, downgrade, refund).
3. **Always run after per-tenant-daily-rollup** so data is fresh.
4. **Never include archived tenants** in totals.
5. **Always update tenants.json monthly_amount** as source of truth.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('multi-tenant-mrr-aggregator', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'multi-tenant-mrr-aggregator', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
