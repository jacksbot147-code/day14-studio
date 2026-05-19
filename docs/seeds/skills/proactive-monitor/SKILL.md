---
name: proactive-monitor
description: Background daemon (LaunchAgent). Scans every 10 min for stale heartbeats, stuck outbox, pending drafts, waiting CS drafts. Surfaces real issues to Telegram WITHOUT Jack asking. State-change-only (no duplicate spam).
triggers:
  - "proactive-monitor"
  - "proactive monitor"
pack: automation
---

# proactive-monitor

Background daemon (LaunchAgent). Scans every 10 min for stale heartbeats, stuck outbox, pending drafts, waiting CS drafts. Surfaces real issues to Telegram WITHOUT Jack asking. State-change-only (no duplicate spam).

See implementation: `src/lib/skills/proactive-monitor.ts` (or scripts/ for daemons).

## Growth hook (auto-attached)

- Fires: `logSkillInvocation('proactive-monitor', context, customer_slug)`.
- Almost-fires: `logAdHoc('describe what you did instead', context)`.
- Fails: `logAction({ action_phrase, context, invoked_skill: 'proactive-monitor', notes: 'failure_mode' })`.

Triggered by → `growth-always-on`.
