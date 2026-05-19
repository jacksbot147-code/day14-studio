---
name: focus-block-protector
description: When Jack starts a focus block, suppress all non-P0 Telegram, batch incoming notifications, and post a single end-of-block summary. Restores the ability to do 90-min deep work.
triggers:
  - "focus block"
  - "deep work"
  - "do not disturb"
  - "/focus"
---

# focus-block-protector

> Day14 is built by Jack's deep work. Deep work requires hours without
> taps. This skill carves those hours.

## What this skill does

1. Jack runs `/focus 90` (or 30, 60, 120 — minutes)
2. Telegram bridge enters "focus mode":
   - All P3 messages → batched
   - All P2 messages → batched
   - All P1 messages → batched
   - P0 only → through (real emergency)
3. Other notifications (Slack/Mail/etc.) routed to "after focus block" digest
4. Webhook events still log, still trigger automated flows, but no Jack-facing pings
5. At block end:
   - Single Telegram summary with everything batched
   - Restored normal flow

## During focus block

```
[Jack typing in IDE for 80 min]

[8 customer emails arrive — queued]
[3 Stripe webhooks fire — handled silently by webhook handlers]
[1 growth-watcher meta-draft created — queued]
[1 chargeback alert — P0, breaks through]
[1 churn-risk red customer — P1, queued (would normally interrupt)]
```

End-of-block ping:
```
🎯 Focus block complete: 90 min

While you were focused:
- 8 customer emails (all routed by inbound-classifier; 2 need your reply — link)
- 3 Stripe events: 2 successful payments, 1 failed (dunning started)
- 1 meta-draft created: "merge near-duplicate growth skills"
- 1 P0: chargeback filed for buildbridge ($2,985) — see card above
- 1 P1: casamore churn-risk score jumped to 81

Total decisions waiting: 6
```

## Hard rules

1. **P0 is real emergency only.** Chargeback, total site outage, security incident. Define narrowly.
2. **Never silence webhook handlers** — the autonomy continues, just the human interruptions stop.
3. **Always send the end-of-block summary**, even if "nothing happened" — closure matters.
4. **Cap focus blocks at 120 min.** Beyond that, real attention degrades; force a break.
5. **Default focus duration: 90 min.** Long enough for real work, short enough to sustain.
6. **Never auto-extend.** If Jack wants more, he taps `/focus` again — that's the conscious choice.

## P0 criteria (what breaks through)

- Site totally down for any customer (uptime monitor)
- Chargeback filed (`charge.dispute.created`)
- Security incident detected (`leaked-secret-cleanup` triggered)
- Customer crisis (legal threat, severe complaint)
- Jack-specified custom P0 (in `~/Documents/businesses/_shared/founder-ops/p0-types.json`)

## Inputs

- `duration_minutes` (default 90, max 120)
- `block_name` (optional — "OAuth refactor", "writing", etc.)

## State

`~/Documents/businesses/_shared/founder-ops/focus-state.json`:
```
{
  "active": true,
  "started_at": "2026-05-17T14:00:00Z",
  "duration_minutes": 90,
  "block_name": "growth-watcher refactor",
  "ends_at": "2026-05-17T15:30:00Z",
  "queued_messages": []
}
```

## When invoked

- `/focus {min} [name]` Telegram command
- Auto-suggest from `daily-kickoff` based on calendar
- Inside `weekly-priorities-flush` to plan next week's blocks

## Failure modes

- **Block ends but summary doesn't ping**: check telegram-bridge — likely poller offline
- **P0 false-positive interrupts**: tune P0 criteria, log the false-positive
- **Block extended past end time** (Jack didn't manually exit): auto-flush queue after 5 min grace

## Logging

`[YYYY-MM-DD HH:MM ET] focus-block-protector → state: {start|extend|end}, duration: {N}m, queued: {N}, p0_interrupts: {N}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('focus-block-protector', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'focus-block-protector', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
