---
name: vercel-route-intake-webhook
description: The actual implementation of day14.us/api/webhooks/intake. Receives Typeform/Notion/custom intake form submissions, parses via intake-parser, updates customer dossier, advances pipeline. Phase 4 webhook layer.
triggers:
  - "intake webhook"
  - "/api/webhooks/intake"
  - "intake submitted"
---

# vercel-route-intake-webhook

> Customer fills the 27-question intake form. Submission lands here.
> Within 3 seconds, dossier is updated and Build Agent has new state.

## File location
`~/Documents/studio/src/app/api/webhooks/intake/route.ts`

## Code skeleton

```ts
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Verify webhook (different schemes per provider)
  const provider = req.headers.get('x-day14-intake-source'); // typeform | notion | custom
  const body = await req.text();
  const valid = await verifyIntakeSignature(req, body, provider);
  if (!valid) return new Response('Invalid signature', { status: 401 });

  const payload = JSON.parse(body);
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Idempotency
  const submission_id = payload.submission_id || crypto.createHash('sha256').update(body).digest('hex');
  const existing = await sb.from('events').select('id')
    .eq('kind', 'intake-received').eq('payload->>submission_id', submission_id).single();
  if (existing.data) return new Response(JSON.stringify({received: true, duplicate: true}), {status: 200});

  // Identify the customer (email → slug)
  const email = payload.email || payload.answers?.find((a: any) => a.field_id === 'email')?.value;
  if (!email) return new Response('No email in submission', { status: 400 });

  const { data: customer } = await sb.from('customers')
    .select('id, slug, status')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Hand off to intake-parser (writes 00-intake.md + initial 01-brand.json)
  await invokeIntakeParser({ submission_id, payload, customer_slug: customer?.slug });

  // Update customer row
  if (customer) {
    await sb.from('customers').update({
      intake_done_at: new Date().toISOString(),
      intake_json: payload,
      status: customer.status === 'awaiting-intake' ? 'building' : customer.status,
    }).eq('id', customer.id);
  }

  // Append event
  await sb.from('events').insert({
    customer_id: customer?.id,
    kind: 'intake-received',
    payload: { submission_id, provider, email },
  });

  // Trigger downstream
  await invokeKickoffCallScheduler(customer?.slug);
  await invokeTelegramStatusPush('intake-received', customer?.slug);

  return new Response(JSON.stringify({received: true}), { headers: {'content-type': 'application/json'} });
}
```

## Per-provider signature verification

### Typeform
HMAC signature in header `Typeform-Signature` using `TYPEFORM_WEBHOOK_SECRET`.

### Notion (databases as webhooks)
No signature; verify shared-secret header `x-day14-secret` matches env value.

### Custom (Day14's own intake form)
HMAC in `x-day14-signature` using `INTAKE_WEBHOOK_SECRET`.

## Hard rules

1. **Always verify signature first.** Different providers, same protocol: reject unsigned.
2. **Idempotency by submission_id.** Customer might double-submit; second one is no-op.
3. **Never start the 14-day build clock here.** Clock starts after kickoff call (via `kickoff-call-scheduler`).
4. **Always trigger telegram-status-pusher** so Jack sees "intake submitted" on phone.
5. **Email is the join key.** If multiple customers share email, take the most recent.

## Failure modes

- **Submission for unknown email** (no deposit yet): create a "lead" row, not a customer row; tag as `pre-deposit-intake`
- **Submission with malformed field IDs**: `intake-parser` partial-fills what it can; surfaces gaps via approval card
- **Notion's no-signature pattern**: shared-secret header is the fallback; rotate quarterly

## When invoked
- Typeform / Notion / custom form fires webhook
- Stripe `dossier-folder-initializer` waits for this before starting build

## Logging

`[YYYY-MM-DD HH:MM ET] vercel-route-intake-webhook → submission: {id}, customer: {slug}, provider: {name}, latency_ms: {N}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('vercel-route-intake-webhook', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'vercel-route-intake-webhook', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
