---
name: batching-quiet-hours
description: Aggregate non-P0 notifications during Jack's quiet hours into a single morning digest. Prevents 27 ping-storm in the middle of the night. Phase 2 supporting skill.
triggers:
  - "batch notifications"
  - "morning digest"
  - "quiet hours batch"
---

# batching-quiet-hours

> Day14 OS fires lots of events. Without batching, Jack's phone
> would buzz 20 times overnight from completed scheduled tasks.
> This skill collapses them into one wake-up message.

## How batching works

When `urgency-classifier` says P1/P2/P3 AND `jack-asleep-detector` says
likely-asleep/snoozed/in-meeting:

1. Don't send immediately
2. Append to the active batch: `~/Documents/businesses/_shared/telegram/batch/{YYYY-MM-DD-digest}.json`
3. Each entry: `{timestamp, urgency, summary, link_to_full}`

## Delivery triggers

The batch flushes (gets sent as a single Telegram message) when ANY of:
- Jack's `active_window` start (default 8 AM ET)
- Jack manually sends `/wake` or `/digest`
- Jack sends ANY message (after he engages, deliver the batch right after his reply)
- 24h passes since the batch's first entry (forced flush — prevent indefinite hold)

## The digest message format

```
☀️ *Morning digest* — {date}

{N} items batched while you were off\:

*P1 \({N1}\)* — needs eyes today
• {summary 1} → /approve\_42
• {summary 2} → /info\_43

*P2 \({N2}\)* — routine
• Daily kickoff ready: {summary}
• EOD report ready: {summary}

*P3 \({N3}\)* — informational
• {summary list}

Full briefing: {link or "/help" for commands}
```

Inline buttons at the bottom:
- `[📋 See all]` — expand to full list
- `[✅ Mark all P3 read]` — bulk dismiss informational
- `[🔔 Resume normal alerts]` — confirm Jack is back

## Hard rules

1. **Never batch P0.** P0 always interrupts.
2. **Never batch a P1 that ages past its expiry** during the batch window. Escalate to P0 if expiry < 4h.
3. **Never hold a batch >24h.** Forced flush after 24h.
4. **Never combine 2 chat_ids into one batch.** Day14 OS is single-operator; batches are per Jack's chat_id only.
5. **Always preserve the original timestamps** in the batch — for audit + ageing logic.

## Edge cases

- **First-ever batch (no historic baseline)**: use 3-item minimum threshold; if fewer than 3 batched, send them as separate messages (digest feels wasteful)
- **Jack wakes up mid-window**: detect via inbound message; flush batch immediately
- **Snooze expires during a batch**: deliver batch at snooze-expire moment
- **Multiple urgency upgrades** (P3 → P2 → P1 over time, e.g., aging): re-classify on every batch addition; batch reflects latest

## Hard rules around customer-impact items

If a customer-facing event is queued in the batch (e.g., "customer Acme asked a question at 11pm"):
- The customer doesn't see Day14's quiet hours
- Auto-classify customer-inbound at minimum P1 (within 4h reply expectation)
- For customer-replied complaints: bump to P0 regardless of time

## When invoked
- After every event that `urgency-classifier` rates AND `jack-asleep-detector` says "not active"
- Daily at active-window start to flush
- On Jack's inbound message to flush

## Logging

`[YYYY-MM-DD HH:MM ET] batching-quiet-hours → batch_size: {N}, urgencies: {P1: N, P2: N, P3: N}, status: {batched|flushed}`

When flushed:
`[YYYY-MM-DD HH:MM ET] batching-quiet-hours FLUSHED → items: {N}, hold_duration: {min}, trigger: {time|inbound|max-hold}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('batching-quiet-hours', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'batching-quiet-hours', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
