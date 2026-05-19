---
name: project-change-order-handler
description: Customer requests scope change mid-project → quote the change, get Jack-tap, update contract + price, customer signs digitally. Captures lost revenue on every project.
triggers:
  - "change order"
  - "scope change"
  - "add to project"
pack: project-pipeline
---

# project-change-order-handler

> Contractors who don't charge for change orders lose 15-30% of margin.
> This skill makes change orders frictionless = always captured.

## Flow

1. Customer asks for change ('can you also do the spa?')
2. Skill drafts the change order: scope, price, timeline impact
3. Jack-tap to approve
4. Customer gets emailed change order with digital signature link
5. Signature = price added to invoice, milestone added to project

## Hard rules

1. **Never start change-order work without signed approval**.
2. **Always include timeline impact** (3 days? 2 weeks?).
3. **Always price at premium** (change orders should be more expensive per-hour than original quote).
4. **Always document why** (customer request, weather, unforeseen condition).

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('project-change-order-handler', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'project-change-order-handler', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
