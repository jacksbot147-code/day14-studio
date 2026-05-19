---
name: pod-product-mix-recommender
description: Given a niche audience, recommends the right Printify product mix (mugs/tees/hoodies/posters) with ratios + target prices + margin estimates + first-30-days plan.
triggers:
  - "pod-product-mix-recommender"
  - "pod product mix recommender"
pack: pod-execution
---

# pod-product-mix-recommender

Given a niche audience, recommends the right Printify product mix (mugs/tees/hoodies/posters) with ratios + target prices + margin estimates + first-30-days plan.

See implementation: `src/lib/skills/pod-product-mix-recommender.ts`.

## Growth hook (auto-attached)

- Fires: `logSkillInvocation('pod-product-mix-recommender', context, customer_slug)`.
- Almost-fires: `logAdHoc('describe what you did instead', context)`.
- Fails: `logAction({ action_phrase, context, invoked_skill: 'pod-product-mix-recommender', notes: 'failure_mode' })`.

Triggered by → `growth-always-on`.
