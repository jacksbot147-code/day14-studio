---
name: vercel-route-resend-inbound
description: The actual implementation of day14.us/api/webhooks/inbound. Receives Resend inbound parse events when a customer (or anyone) replies to hello@day14.us. Routes to inbound-classifier and customer-history-lookup. Phase 4 webhook layer.
triggers:
  - "resend inbound"
  - "/api/webhooks/inbound"
  - "inbound email parsing"
---

# vercel-route-resend-inbound

> Customer replies to a Day14 email. Resend parses MIME → calls this
> webhook. Day14 OS routes to the right action.

## File location
`~/Documents/studio/src/app/api/webhooks/inbound/route.ts`

## Code skeleton

```ts
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // 1. Verify signature
  const sig = req.headers.get('resend-signature');
  const ts = req.headers.get('resend-timestamp');
  if (!sig || !ts) return new Response('No signature', { status: 401 });

  const body = await req.text();
  if (!verifyResendSignature(body, sig, ts, process.env.RESEND_WEBHOOK_SECRET!)) {
    return new Response('Invalid signature', { status: 401 });
  }

  // 2. Parse payload (Resend format)
  const event = JSON.parse(body);
  if (event.type !== 'email.received') {
    return new Response(JSON.stringify({received: true, ignored: true}), { status: 200 });
  }

  const { from, to, subject, html, text, attachments } = event.data;
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 3. Identify the customer
  const senderEmail = from.email.toLowerCase();
  const { data: customer } = await sb.from('customers')
    .select('id, slug, status, intake_json')
    .eq('email', senderEmail)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // 4. Idempotency by message-id
  const messageId = event.data.message_id;
  const existing = await sb.from('events').select('id')
    .eq('kind', 'customer-reply-received')
    .eq('payload->>message_id', messageId).single();
  if (existing.data) return new Response(JSON.stringify({duplicate: true}), { status: 200 });

  // 5. Invoke inbound-classifier (returns tag + confidence)
  const classification = await invokeInboundClassifier({
    from: senderEmail,
    subject,
    body_text: text,
    customer_slug: customer?.slug,
  });

  // 6. Route based on classification
  if (classification.tag === 'spam') {
    await invokeAutoArchiveSpam({ messageId, payload: event.data });
  } else if (classification.tag === 'complaint') {
    await invokeComplaintEscalation({ customer_slug: customer?.slug, payload: event.data, classification });
  } else {
    // Standard: append to 04-feedback.md + draft reply
    await invokeCustomerHistoryLookup({ customer_slug: customer?.slug });
    await invokeReplyDrafter({ customer_slug: customer?.slug, payload: event.data, classification });
  }

  // 7. Append event
  await sb.from('events').insert({
    customer_id: customer?.id,
    kind: 'customer-reply-received',
    payload: { message_id: messageId, from: senderEmail, subject, classification: classification.tag },
  });

  // 8. Telegram push (urgency from classification)
  await invokeTelegramStatusPush('customer-reply-received', customer?.slug, classification.tag);

  return new Response(JSON.stringify({received: true}), { headers: {'content-type': 'application/json'} });
}
```

## Edge: sender isn't a known customer

If the sender's email doesn't match any `customers` row:
- Could be a lead (filled the contact form, now replying)
- Could be spam
- Could be a one-off prospect

Action: still run `inbound-classifier`; if tag is `spam` → auto-archive; otherwise create a "lead" row + draft reply for Jack.

## Hard rules

1. **Always verify Resend signature** before reading payload.
2. **Idempotency by message-id** — Resend may retry on 5xx.
3. **Never auto-reply.** All replies are drafts; Jack sends.
4. **Spam path is silent.** No Telegram push for spam.
5. **Complaints fire P0 immediately.** Even at 3 AM.

## Failure modes

- **Sender's email matches multiple customers** (shared inbox): tag both customers in the event; prompt Jack
- **HTML-only email, no text**: use html field; strip tags for classification
- **Attachment containing customer data** (e.g., photos for site rebuild): trigger `telegram-attachment-handler`
- **Out-of-office / vacation auto-replies**: classifier should tag as `general` low-confidence; auto-archive

## When invoked
- Resend webhook fires on every inbound email to `hello@day14.us`
- Manually when Jack forwards an email to test routing

## Logging

`[YYYY-MM-DD HH:MM ET] vercel-route-resend-inbound → from: {sender}, customer: {slug or 'unknown'}, classification: {tag}, latency_ms: {N}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('vercel-route-resend-inbound', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'vercel-route-resend-inbound', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
