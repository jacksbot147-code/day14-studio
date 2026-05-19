---
name: project-deposit-balance-billing
description: Project billing pattern: 30% deposit, 30% mid, 40% on completion. Stripe Invoice items, auto-scheduled around milestones. Standard for contractor work.
triggers:
  - "deposit invoice"
  - "project billing"
  - "progress payment"
pack: project-pipeline
---

# project-deposit-balance-billing

## The pattern

| Trigger | % | When billed |
|---|---|---|
| Contract signed | 30% | Day 0 |
| Mid-milestone complete | 30% | Day ~14 (varies) |
| Project complete + signoff | 40% | Day ~45 |

## What it does

1. On contract signed: generates 3 Stripe invoices, schedules first immediately
2. Subsequent invoices held in 'draft' until milestone triggers them
3. Customer payment hooks to project-milestone-tracker
4. Late-payment dunning automatic
5. Sends customer a payment portal link, not raw card

## Hard rules

1. **Never start work on next phase** until prior phase paid.
2. **Always send invoice 5 days before due** — gives customer time.
3. **Always offer ACH option** (avoids 2.9% Stripe fee on big jobs).
4. **Never accept cash** — no audit trail.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('project-deposit-balance-billing', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'project-deposit-balance-billing', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
