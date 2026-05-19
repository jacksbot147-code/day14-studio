---
name: dispatch-day-of-reshuffler
description: Tech calls in sick or appointment cancels → reshuffle today's route to minimize idle time. Saves the day from chaos.
triggers:
  - "reshuffle"
  - "tech sick"
  - "reschedule today"
pack: dispatch-routing
---

# dispatch-day-of-reshuffler

## Flow

When disruption happens:
1. Identify all affected appointments
2. For cancellations: try to fill slot with waitlist (or move next appointment earlier)
3. For tech-out: reassign to other techs if same-skill available, OR reschedule customer
4. Customer notification + Jack-tap before customer-facing change
5. Update routes via dispatch-route-optimizer

## Hard rules

1. **Always Jack-tap before customer-facing reschedule**.
2. **Always offer customer 3 alternative times**, not just one.
3. **Always credit/discount if it was provider error** (tech sick, not weather).

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('dispatch-day-of-reshuffler', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'dispatch-day-of-reshuffler', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
