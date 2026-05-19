---
name: project-milestone-tracker
description: For project-based businesses (pool builders, contractors): track milestones (deposit, foundation, framing, etc) with target dates, blockers, photos. Customer sees same view.
triggers:
  - "project milestone"
  - "project status"
  - "build progress"
  - "contractor timeline"
pack: project-pipeline
---

# project-milestone-tracker

> Specialty contractor jobs run 4-16 weeks.
> Customer anxiety = the silent project-killer.
> This skill keeps both Jack AND customer aligned.

## Schema (per project)

```json
{
  "project_id": "naples-pool-2026-05-17",
  "customer_slug": "smith-residence-naples",
  "milestones": [
    {"name": "Deposit cleared", "target": "2026-05-20", "complete": "2026-05-18", "photos": []},
    {"name": "Excavation", "target": "2026-05-25", "complete": null, "blockers": ["permit pending"]},
    {"name": "Shell installed", "target": "2026-06-10"}
  ],
  "current_phase": "excavation",
  "overall_pct": 22
}
```

## What it does

1. Stores milestone state per project
2. Updates % complete based on milestone completion
3. Publishes customer-facing view (read-only) at site
4. Alerts Jack when milestone target slips
5. Photos auto-attach to milestones via dossier

## Hard rules

1. **Customer view is read-only**.
2. **Always publish blockers transparently** — hiding kills trust.
3. **Always include photos** at each completed milestone.
4. **Never change a target without writing a note** (why).
5. **Always alert customer of slips within 24h** — they'd rather hear it from you.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('project-milestone-tracker', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'project-milestone-tracker', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
