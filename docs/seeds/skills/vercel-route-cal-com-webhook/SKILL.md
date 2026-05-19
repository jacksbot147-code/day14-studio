---
name: vercel-route-cal-com-webhook
description: The actual implementation of day14.us/api/webhooks/cal. Receives Cal.com booking events (kickoff calls scheduled, rescheduled, canceled, no-shows). Updates customer state. Phase 4 webhook layer.
triggers:
  - "Cal.com webhook"
  - "/api/webhooks/cal"
  - "booking event"
---

# vercel-route-cal-com-webhook

> Customer books a kickoff call. Cal.com fires this webhook. Day14 OS
> records it, advances pipeline, pings Jack.

## File location
`~/Documents/studio/src/app/api/webhooks/cal/route.ts`

## Code skeleton

```ts
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // 1. Verify shared-secret header (Cal.com uses simple HMAC)
  const sig = req.headers.get('x-cal-signature');
  const body = await req.text();
  if (!verifyCalSignature(body, sig, process.env.CAL_WEBHOOK_SECRET!)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = JSON.parse(body);
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 2. Identify customer (email join)
  const attendeeEmail = event.payload.attendees?.[0]?.email?.toLowerCase();
  const { data: customer } = await sb.from('customers')
    .select('id, slug, status')
    .eq('email', attendeeEmail)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // 3. Handle event type
  switch (event.triggerEvent) {
    case 'BOOKING_CREATED':
      await handleBookingCreated(event.payload, customer, sb);
      break;
    case 'BOOKING_RESCHEDULED':
      await handleRescheduled(event.payload, customer, sb);
      break;
    case 'BOOKING_CANCELLED':
      await handleCancelled(event.payload, customer, sb);
      break;
    case 'MEETING_ENDED':
      await handleMeetingEnded(event.payload, customer, sb);
      break;
    default:
      console.log('Unhandled Cal event:', event.triggerEvent);
  }

  return new Response(JSON.stringify({received: true}), { headers: {'content-type': 'application/json'} });
}
```

## Per-event handlers

### BOOKING_CREATED
- Update `customers.kickoff_call_at` with booking time
- Append event `kind=kickoff-booked`
- Telegram push (P2): "📅 {company} booked kickoff for {date}"
- Cancel any active intake-nudge schedule (`intake-nudge-writer`)

### BOOKING_RESCHEDULED
- Update `kickoff_call_at` with new time
- Append event `kind=kickoff-rescheduled, payload={old_time, new_time}`
- Telegram push (P2) if change is >24h shift

### BOOKING_CANCELLED
- Clear `kickoff_call_at`
- Append event `kind=kickoff-cancelled`
- Trigger `intake-nudge-writer` (12h delay) — likely customer is back to "deposit but no kickoff" state
- Telegram push (P1): "❌ {company} cancelled kickoff. No-show likely; nudge resumes."

### MEETING_ENDED
- Append event `kind=kickoff-completed`
- This is the trigger to START the 14-day build clock
- Update `customers.day14_build_start_at = now()`
- Trigger `customer-readiness-check`
- If readiness check passes → trigger `customer-build-day-1-bootstrap`
- Telegram push (P0 if clock starts; P1 if readiness check fails)

## Hard rules

1. **Always verify Cal.com signature.** Don't trust unsigned events.
2. **Never auto-start the build clock** without `customer-readiness-check` passing. The clock has SLA implications.
3. **MEETING_ENDED is the clock-start trigger.** Not BOOKING_CREATED.
4. **No-shows are still events.** Cal.com fires BOOKING_CANCELLED if customer doesn't join; route accordingly.

## Failure modes

- **Customer books with wrong email** (different from Stripe email): create a customer row mismatch event; surface to Jack
- **Cal.com webhook fires twice for same booking**: idempotency via `event.payload.uid`
- **No `customer-readiness-check` skill exists yet**: stub it; surface as gate

## When invoked
- Cal.com webhook fires
- Manual test from Cal.com's Webhook Tester
- During pipeline-end-to-end-test

## Logging

`[YYYY-MM-DD HH:MM ET] vercel-route-cal-com-webhook → event: {trigger}, customer: {slug}, attendee: {email}, latency_ms: {N}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('vercel-route-cal-com-webhook', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'vercel-route-cal-com-webhook', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
