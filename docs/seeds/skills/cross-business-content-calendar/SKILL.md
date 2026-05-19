---
name: cross-business-content-calendar
description: Plan content across all tenants on one calendar. Day14's blog, splash-jacks-pools social, the niche-ecom newsletter — all in one view. Prevents Jack from accidentally double-posting or starving a tenant.
triggers:
  - "content calendar"
  - "all content"
  - "weekly content plan"
  - "cross business content"
pack: multi-business-operator
---

# cross-business-content-calendar

> 5 businesses, each needs content. Without a unified calendar,
> Jack publishes 3 blogs for one biz and nothing for the others.

## What it does

1. Reads each active tenant's content schedule (if exists)
2. Builds a unified Mon-Sun calendar:
   ```
   Mon AM: [day14] blog publish + linkedin
   Mon PM: [splash-jacks-pools] social cross-post
   Tue AM: [day14] newsletter + twitter thread
   Tue AM: [niche-ecom] product email
   Tue PM: -- gap, suggest something --
   Wed AM: [content-brand] YouTube short
   ...
   ```
3. Identifies gaps (days/tenants with nothing)
4. Suggests fillers from each tenant's draft queue
5. Surfaces conflicts (3 posts same day for same tenant)

## Hard rules

1. **Never auto-publish** — calendar is plan, not execution.
2. **Always show per-tenant balance** — if one tenant got 5 posts and others 0, flag it.
3. **Always run Sunday for the coming week**.
4. **Always tie to per-tenant content goals** (set in tenant config).
5. **Always surface gaps as opportunities**, not failures.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('cross-business-content-calendar', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'cross-business-content-calendar', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
