# Admin Console — spec

> /admin/console: a single pane of glass into the runtime (Mac mini) —
> live vitals plus a prompt box that commands the runtime brain from
> any browser, anywhere. Kills the two-keyboard problem.
> Spec written 2026-06-10, built same night.

## Problem

The runtime lives on a headless Mac mini. Driving it today means
Screen Sharing or SSH — a second keyboard. The empire already has a
remote-command mouth (Telegram → bot-brain) but it's (a) down pending
re-auth and (b) not visible alongside the dashboards.

## Design

One new admin page, one API route, one events-poller handler. Reuses
three existing conventions wholesale — no new infrastructure:

```
/admin/console (browser, anywhere)
   │  POST /api/admin/console  { text }
   │  └─ auth: admin-session cookie (same sha256 scheme as approvals)
   ▼
Supabase `events` table  ── INSERT { kind: "console-prompt",
   │                          payload: { text, from: "admin-console" } }
   ▼  (≤10s later, on the mini)
events-poller HANDLERS["console-prompt"]
   │  └─ calls processIncomingMessage(text) — the SAME brain that
   │     handles Telegram freeform (intents, todos, realty, chat)
   ▼
PATCH events row: payload.reply, payload.replied_at, processed_*
   │  + mirror reply file → _shared/console/replies/{id}.json (audit habit)
   │  + queue Telegram copy if TELEGRAM_CHAT_ID set
   ▼
GET /api/admin/console — page polls every 10s, renders the thread
```

### Why Supabase as transport (not the telegram inbox folder)
- Works from production Vercel AND localhost — the mini's filesystem
  is reachable from neither; Supabase is reachable from both.
- The consumer already runs 24/7 (events-poller) and already has
  error-marking + replay conventions (`processed_by: ...:ERROR`).
- Round-trip replies ride the same row (payload.reply) — the web page
  never needs the mini's filesystem.

### GET /api/admin/console returns
- `vitals`: poller heartbeat ages (local fs when businesses/ exists —
  i.e. on the mini — else the synced empire-state.json heartbeats),
  plus work-register tail (local only).
- `thread`: last 15 console-prompt events from Supabase (prompt, reply,
  replied_at, status: pending/replied/error).

### Page (/admin/console)
- Vitals strip: per-poller chips (name + age, green <5m / red).
- Prompt box + send. Quick-action buttons that prefill proven
  bot-brain intents: "todos", "realty targets", "status".
- Thread view (newest first): prompt → reply, pending spinner state.
- Server component shell + small client island; matches ADMIN_CSS.

## Security
- Page: already inside middleware's /admin gate.
- API: explicit admin-session cookie check (copied from approvals
  route — middleware does NOT cover /api/*).
- Server-side Supabase calls use SUPABASE_SERVICE_ROLE_KEY from env;
  key never reaches the client.
- Prompt length cap 2,000 chars; events-poller already rate-limits by
  batch (20/cycle).
- bot-brain's own governance applies: consequential intents queue
  jack-taps; nothing customer-facing executes from a chat message.

## Improvements over the naive version (the "any improvements" pass)
1. **Replies ride Supabase, not files** — the thread works from prod,
   not just on the mini's localhost.
2. **Same brain as Telegram** — zero new NLU code; one place to improve
   intent handling for both mouths.
3. **Pending/error states surfaced** — a prompt that errors shows
   `processed_by: events-poller:ERROR` instead of vanishing.
4. **Audit mirror** — every console exchange also lands as a file in
   _shared/console/replies/ so the dossier convention holds.
5. **Quick actions** — the three highest-frequency commands are one
   tap, which is most of real usage.

## Non-goals (v1)
- Embedded VNC/pixels — use `vnc://<mini-ip>` for the rare real need.
- Streaming token-by-token replies — 10s poll is fine for ops traffic.
- Multi-user/roles — single-operator system by design.

## Dependencies
- events-poller alive on the mini (requires SUPABASE_URL +
  SUPABASE_SERVICE_ROLE_KEY in .env.local — URL was the missing one
  at first boot).
- `events` table: existing columns only (id, kind, payload jsonb,
  created_at, processed_at, processed_by). No migration needed.

## Files
- src/app/admin/console/page.tsx (+ console-client.tsx)
- src/app/api/admin/console/route.ts
- scripts/events-poller.mjs — add HANDLERS["console-prompt"]
- src/app/admin/layout-bits.tsx — nav entry
