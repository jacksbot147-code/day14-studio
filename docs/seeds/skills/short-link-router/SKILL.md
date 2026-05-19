---
name: short-link-router
description: Resolve day14.us/a/{6-char-code} short links to their target approval card. Logs every tap (for phone-tap approval flow). Powers the phone-first operator UX where Jack approves things with one tap. Supporting skill for approval-card-builder.
triggers:
  - "short link"
  - "/a/"
  - "approval URL"
  - "phone tap"
---

# short-link-router

> The URL at the bottom of every operator SMS. Tap it → land on the
> approval card. The 6-char code is the magic.

## The schema

`approvals.short_code` is a 6-char base32 (no 0/O/I/1/L):
```
ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
```
30^6 = 729 million combinations — collision-safe for years.

## URL resolution

GET `https://day14.us/a/{6CHAR}`:

1. Look up `approvals` row where `short_code = {6CHAR}`
2. If found AND `status = pending` AND not expired:
   - Log the access (tap event)
   - Render the approval card view with Approve / Reject buttons
3. If found AND `status != pending`:
   - Render "this approval was already {status} on {date}"
4. If not found:
   - Render 404 with "invalid or expired approval link"
5. If expired (past `expires_at`):
   - Auto-update status to `expired`
   - Render "this approval expired on {date}"

## The approval card view (mobile-first)

The page Jack lands on:

```
┌──────────────────────────────┐
│  Day14 — Approval            │
├──────────────────────────────┤
│                              │
│  {Card title in 4-6 words}   │
│                              │
│  {Type chip — deploy/msg/    │
│   code-change/expense}       │
│                              │
│  {Customer: {name}}          │
│                              │
│  What this is:               │
│  {1-2 sentences}             │
│                              │
│  Preview:                    │
│  {preview URL link or diff}  │
│                              │
│  Expires: {N hours from now} │
│                              │
├──────────────────────────────┤
│  [  APPROVE  ]   [  REJECT ] │
└──────────────────────────────┘
```

Tap APPROVE → POST `/api/approvals/{id}` with `status=approved, decided_via=phone-tap, decided_at=now`. Webhook fires to downstream agents.

## Hard rules

1. **Never auto-approve** based on URL access alone. Tap = explicit signal.
2. **Never expose customer secrets** in the approval card view (no API keys, no card numbers, no full email bodies that contain links from third parties).
3. **Never resolve short links from untrusted devices** without a session token. Even Jack should auth via passkey on first device.
4. **Never reissue a used short code** — even after the original approval is decided. New cards get new codes.

## Logging

`[YYYY-MM-DD HH:MM ET] short-link-router → code: {6CHAR}, approval_id: {id}, action: {view|approve|reject}, ip: {hashed}`

## When invoked
- Vercel route handler at `day14.us/api/approvals/[code]/route.ts`
- Called automatically when Jack taps a SMS or email approval link
- Manually for testing
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('short-link-router', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'short-link-router', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
