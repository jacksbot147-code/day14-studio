---
name: supabase-event-listener
description: Subscribe to Supabase Realtime channels and route events to downstream agents. When the `events` table gets a new row, this skill kicks off whatever should happen next. Phase 4 webhook layer.
triggers:
  - "supabase realtime"
  - "event subscriber"
  - "listen to events table"
---

# supabase-event-listener

> The events table is the source of truth for "what just happened."
> This skill is the subscriber that turns events into downstream actions.

## Architecture

Two patterns supported:

### Pattern A — Edge function as subscriber (preferred for Mac mini era)
Supabase Edge Function watches `events` table via Postgres `LISTEN/NOTIFY`. On every insert, posts to `day14.us/api/internal/events`.

### Pattern B — Polling from a long-running script (laptop interim)
Same Node poller (`telegram-poller.mjs` already running) gets extended with an events-table polling thread. Polls every 10s for unprocessed events.

For now (May 16 → Jun 9): use Pattern B. After Mac mini: migrate to Pattern A.

## What gets routed where

```
Event kind                            → downstream skill
─────────────────────────────────────────────────────────
customer-deposit-paid                → dossier-folder-initializer
                                      → kickoff-call-scheduler
                                      → telegram-status-pusher

intake-received                      → intake-parser
                                      → customer-readiness-check
                                      → telegram-status-pusher

kickoff-completed                    → customer-readiness-check
                                      → customer-build-day-1-bootstrap (if ready)
                                      → telegram-status-pusher

customer-reply-received              → inbound-classifier (already fired in webhook)
                                      → (no double-action; just log)

approval-card-drafted                → telegram-approval-card
                                      → (if P0) jack-asleep-detector override

approval-decided                     → downstream-action-of-card (e.g., trigger deploy)
                                      → events-table append "action-fired"

preview-ready                        → telegram-status-pusher
                                      → (no auto-email; drafts go in dossier)

customer-launched                    → launch-day-customer-email
                                      → telegram-status-pusher (P0)

ssl-expiring                         → telegram-status-pusher
                                      → (if <3d) escalate to P0

complaint-detected                   → complaint-escalation
                                      → telegram-status-pusher (P0)

secret-leaked                        → leaked-secret-cleanup
                                      → telegram-status-pusher (P0)
```

## Schema

```sql
-- existing events table already has all we need:
-- id, customer_id, agent, kind, payload, created_at

-- add a processed column for at-most-once dispatch
alter table events add column if not exists processed_at timestamptz;
alter table events add column if not exists processed_by text;
```

## The dispatch loop (pseudocode)

```typescript
async function dispatchLoop() {
  const { data: unprocessed } = await sb.from('events')
    .select('*')
    .is('processed_at', null)
    .order('created_at', { ascending: true })
    .limit(20);

  for (const event of unprocessed) {
    try {
      await routeEvent(event);
      await sb.from('events').update({
        processed_at: new Date().toISOString(),
        processed_by: 'supabase-event-listener',
      }).eq('id', event.id);
    } catch (err) {
      console.error('Dispatch failed for', event.id, err);
      // Leave processed_at null → retry next loop
    }
  }
}
```

## Hard rules

1. **At-most-once dispatch.** A processed event doesn't re-fire.
2. **Idempotent downstream skills.** Even with at-most-once, retries during failures must be safe.
3. **Never block on slow downstream.** Dispatch is fire-and-forget where possible.
4. **Never delete the events row.** Mark processed; keep history forever.

## Failure modes

- **Downstream skill doesn't exist yet**: log warning, mark event `processed_at` anyway with `processed_by=stub`; the event was acknowledged
- **Dispatch is slower than insert rate** (backlog): scale by batching; rare at Day14's scale
- **Same event fires 2 routes that conflict** (race): use Postgres row-locking inside `routeEvent`

## When invoked
- Long-running poller process (interim)
- Edge function trigger on events insert (post-mini-cutover)
- Manually for backfilling missed events

## Logging

`[YYYY-MM-DD HH:MM ET] supabase-event-listener → events_processed: N, errors: N, queue_depth: N`

When queue grows >100: surface as P1 — dispatch is falling behind.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('supabase-event-listener', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'supabase-event-listener', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
