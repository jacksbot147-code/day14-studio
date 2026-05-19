---
name: project-completion-walkthrough
description: End-of-project: walkthrough checklist, customer sign-off, final photos, warranty paperwork, deposit-balance close-out. The last 5% that determines reviews.
triggers:
  - "project completion"
  - "final walkthrough"
  - "customer signoff"
pack: project-pipeline
---

# project-completion-walkthrough

## The walkthrough checklist

Per project type, a pre-built list:
- All items in scope completed?
- All photos taken?
- Customer signed acceptance?
- Final invoice paid?
- Warranty document delivered?
- Review request scheduled (+14 days)?

## Hard rules

1. **Never close project without customer signature**.
2. **Always document any open punch-list items** — customer agrees in writing.
3. **Always schedule review request** in same flow.
4. **Always archive project folder** — read-only after close.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('project-completion-walkthrough', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'project-completion-walkthrough', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
