---
name: shortcuts-bridge
description: iOS Shortcuts integration. Lets Jack trigger Day14 OS actions via Siri ("Hey Siri, Day14 status") or Home Screen widget tap. Phase 6 supporting skill.
triggers:
  - "iOS shortcuts"
  - "Siri shortcut"
  - "hey siri"
  - "shortcut action"
---

# shortcuts-bridge

> When Telegram isn't fast enough — Jack wants to ask Siri while
> driving with one hand on the wheel. Shortcuts hits a Day14 endpoint;
> Day14 responds via text or voice.

## How it works

iOS Shortcuts can send HTTP POST requests. Jack creates shortcuts that POST to:
`https://day14.us/api/shortcuts/{action}`

With body `{ token: SHORTCUTS_SECRET, query?: "...optional payload..." }`

Day14 returns text or speakable string. Shortcuts can then speak the response or show a notification.

## Pre-built shortcuts

Day14 ships templates for these shortcuts (Jack installs once):

### Hey Siri, Day14 status
- POST to `/api/shortcuts/status`
- Returns: spoken sentence with MRR, active customers, pending approvals
- Use case: while driving, voice the state of the business

### Hey Siri, Day14 next
- POST to `/api/shortcuts/next-action`
- Returns: top priority from today's kickoff, spoken
- Use case: "what should I do right now?"

### Hey Siri, approve last
- POST to `/api/shortcuts/approve-last-card`
- Returns: confirmation
- Use case: Jack reviewed an approval card mentally; wants to fire it

### Hey Siri, Day14 ping
- POST to `/api/shortcuts/echo` with some payload
- Use case: smoke test the integration

## Vercel route shape

`~/Documents/studio/src/app/api/shortcuts/[action]/route.ts`:

```ts
export async function POST(req: NextRequest, { params }: { params: { action: string } }) {
  const body = await req.json();

  // Auth: shared secret
  if (body.token !== process.env.SHORTCUTS_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  switch (params.action) {
    case 'status':
      const mrr = await computeMRR();
      const active = await countActiveCustomers();
      const pending = await countPendingApprovals();
      const speak = `Day14 status. MRR ${dollars(mrr)}. ${active} active customer${active === 1 ? '' : 's'}. ${pending} pending approval${pending === 1 ? '' : 's'}.`;
      return Response.json({ speak });

    case 'next-action':
      const action = await readTodaysKickoffFirstAction();
      return Response.json({ speak: action });

    case 'approve-last-card':
      const last = await getLastPendingCard();
      if (!last) return Response.json({ speak: 'No pending cards.' });
      await approveCard(last.id);
      return Response.json({ speak: `Approved card ${last.id}. ${last.title}.` });

    case 'echo':
      return Response.json({ speak: 'Day14 here.' });

    default:
      return Response.json({ speak: 'Unknown action.' }, { status: 400 });
  }
}
```

## Shortcuts setup steps (for Jack)

1. Open Shortcuts app on iPhone
2. Tap "+" to create new
3. Add action: "Get contents of URL"
   - URL: `https://day14.us/api/shortcuts/status`
   - Method: POST
   - Body type: JSON
   - Body: `{"token": "<SHORTCUTS_SECRET>"}`
4. Add action: "Get dictionary value" from previous result, key `speak`
5. Add action: "Speak text" with that value
6. Name the shortcut "Day14 status"
7. Toggle "Add to Siri" → say "Day14 status" to set the phrase

Repeat for each shortcut.

## Hard rules

1. **Always require SHORTCUTS_SECRET in body.** Shortcuts can be installed by anyone who sees Jack's URL.
2. **Never expose secrets in the `speak` response.** Only public-safe data.
3. **Always keep responses under 280 chars** — Siri speech longer is awkward.
4. **Always rate-limit shortcuts endpoints** — easy DoS vector if exposed.
5. **Never auto-fire destructive actions** via shortcut (no "delete customer" shortcut).

## Failure modes

- **Day14 OS slow to respond**: Siri times out after ~30s; design endpoints to respond in <3s
- **Token rotated, shortcut still has old token**: Jack updates each shortcut manually; one-time fix
- **Out of range (no signal)**: shortcut fails silently; iOS shows a notification

## When invoked
- Whenever Jack triggers a shortcut from Siri / Home Screen / Apple Watch
- Manually for testing
- Inside `apple-watch-complication` to render watch face data

## Logging

`[YYYY-MM-DD HH:MM ET] shortcuts-bridge → action: {what}, latency_ms: {N}, response_chars: {N}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('shortcuts-bridge', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'shortcuts-bridge', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
