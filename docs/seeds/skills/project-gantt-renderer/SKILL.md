---
name: project-gantt-renderer
description: Render the project schedule as a Gantt chart for customer view + internal planning. Visual, simple, mobile-friendly. Updates auto from milestone state.
triggers:
  - "gantt"
  - "project schedule"
  - "project visual"
pack: project-pipeline
---

# project-gantt-renderer

## What it does

Reads project-milestone-tracker state and renders:
- Mobile-first horizontal bar chart
- Color-coded: green (complete), blue (in-progress), gray (upcoming)
- Critical path bolded
- Slip indicators on past-due milestones

Output: PNG + interactive HTML for customer portal.

## Hard rules

1. **Always mobile-optimized** — customers check on phones.
2. **Never show internal-only milestones** to customer.
3. **Always include 'days until completion' counter**.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('project-gantt-renderer', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'project-gantt-renderer', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
