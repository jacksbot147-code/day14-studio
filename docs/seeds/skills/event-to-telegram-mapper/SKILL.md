---
name: event-to-telegram-mapper
description: Decision table that maps Supabase events.kind values to (push-or-silent, urgency level, message template). The "central nervous system config" for what Jack sees on his phone. Phase 3 supporting skill.
triggers:
  - "should this event push"
  - "event mapping"
  - "what does Jack see"
---

# event-to-telegram-mapper

> The dial that says "this event matters; this one doesn't."
> Tuneable so Jack isn't overwhelmed by P3s or surprised by missed P1s.

## The mapping table

Lives at `~/Documents/businesses/_shared/telegram/event-map.json`:

```json
{
  "default_push": false,
  "default_urgency": "P3",
  "events": {
    "customer-deposit-paid": {"push": true, "urgency": "P1", "template": "customer-deposit-paid"},
    "build-started": {"push": false},
    "commit-pushed": {"push": false},
    "preview-ready": {"push": true, "urgency": "P2", "template": "preview-ready"},
    "approval-card-drafted": {"push": true, "urgency": "from-card", "template": "approval-via-builder"},
    "approval-decided": {"push": false},
    "customer-reply-received": {"push": true, "urgency": "by-classification", "template": "customer-reply"},
    "customer-launched": {"push": true, "urgency": "P0", "template": "customer-launched"},
    "customer-refunded": {"push": true, "urgency": "P0", "template": "customer-refunded"},
    "production-down": {"push": true, "urgency": "P0", "template": "production-down"},
    "ssl-expiring": {"push": true, "urgency": "by-days-remaining", "template": "ssl-expiring"},
    "lighthouse-drop": {"push": true, "urgency": "P2", "template": "lighthouse-drop"},
    "lighthouse-recovery": {"push": false},
    "nightly-polish-green": {"push": false},
    "nightly-polish-issues": {"push": true, "urgency": "P1", "template": "polish-issues"},
    "council-decision-logged": {"push": true, "urgency": "P2", "template": "council-logged"},
    "weekly-council-review": {"push": true, "urgency": "P2", "template": "council-review"},
    "weekly-skill-harvest": {"push": true, "urgency": "P3", "template": "skill-harvest"},
    "postmortem-filed": {"push": true, "urgency": "P2", "template": "postmortem-filed"},
    "complaint-detected": {"push": true, "urgency": "P0", "template": "complaint-detected"},
    "secret-leaked": {"push": true, "urgency": "P0", "template": "secret-leaked"}
  }
}
```

## Special urgency values

- `"P0"`, `"P1"`, `"P2"`, `"P3"` — literal
- `"from-card"` — read the card's own urgency field
- `"by-classification"` — use `inbound-classifier`'s tag (complaint=P0, change=P1, etc.)
- `"by-days-remaining"` — for time-sensitive events; map days to urgency:
  - <3 days = P0
  - 3-7 days = P1
  - 7-14 days = P2
  - >14 days = P3

## Templates

The `template` field references a named template registered with `telegram-status-pusher`. Each template defines:
- The exact MarkdownV2 message body (with placeholders)
- The inline buttons
- Any attachments

Templates live at:
`~/Documents/businesses/_shared/telegram/templates/{template-name}.json`

## Tuneability

Jack can edit `event-map.json` to:
- Silence a noisy event type (set `push: false`)
- Escalate (change urgency from P2 to P1)
- Add a new event kind he wants notified about

After editing, no restart needed — `telegram-status-pusher` reads the map on each event.

## Hard rules

1. **Never push for an unmapped event kind.** Use defaults (`push: false`).
2. **Never override the mapping for a single event** — change the map instead. Per-event overrides break audit trail.
3. **Never push P0 silently.** Even if Jack manually overrides, P0 fires regardless of `push` field. P0 is non-negotiable.
4. **Always include the event_id** in the push payload so Jack can deep-link to the source event.

## When invoked
- Inside `telegram-status-pusher` for every event candidate
- Manually when Jack wants to retune the map

## Logging

`[YYYY-MM-DD HH:MM ET] event-to-telegram-mapper → event: {kind}, decision: {push|silent}, urgency: {P}`

When unmapped event encountered:
`[YYYY-MM-DD HH:MM ET] ⚠️ event-to-telegram-mapper UNMAPPED: {kind} — using defaults. Add to map if intentional.`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('event-to-telegram-mapper', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'event-to-telegram-mapper', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
