---
name: pod-niche-researcher
description: Web-grounded research for POD (print-on-demand) niches. Identity-driven, life-event, regional, and humor-based audiences. Returns 5-8 niche candidates with audience size, competition, product fit, design concepts.
triggers:
  - "pod-niche-researcher"
  - "pod niche researcher"
pack: pod-execution
---

# pod-niche-researcher

Web-grounded research for POD (print-on-demand) niches. Identity-driven, life-event, regional, and humor-based audiences. Returns 5-8 niche candidates with audience size, competition, product fit, design concepts.

See implementation: `src/lib/skills/pod-niche-researcher.ts`.

## Growth hook (auto-attached)

- Fires: `logSkillInvocation('pod-niche-researcher', context, customer_slug)`.
- Almost-fires: `logAdHoc('describe what you did instead', context)`.
- Fails: `logAction({ action_phrase, context, invoked_skill: 'pod-niche-researcher', notes: 'failure_mode' })`.

Triggered by → `growth-always-on`.
