---
name: no-edge-in-memory-state
description: Anti-pattern guardrail. Don't keep state in JavaScript module-level variables on Vercel Edge or serverless functions. State is lost on every cold-start AND not shared across function instances. Found in Splash Jacks chat/route.ts rate-limit code; codified here.
triggers:
  - "in-memory rate limit"
  - "module-level state"
  - "edge function state"
  - "shared state"
---

# no-edge-in-memory-state

> Splash Jacks' chatbot rate limiter stored counts in a JS module
> variable. Worked locally. Failed silently in production because
> Vercel Edge runs many concurrent instances; each has its own
> module-level state. Rate limit was effectively meaningless.

## The anti-pattern

```ts
// ❌ Anti-pattern (found in chat/route.ts)
const requestCounts = new Map<string, number>();

export async function POST(req: NextRequest) {
  const ip = req.ip;
  const count = (requestCounts.get(ip) || 0) + 1;
  requestCounts.set(ip, count);

  if (count > 10) return new Response('Rate limited', { status: 429 });
  // ...
}
```

Why this fails on Vercel:
1. Edge functions are stateless — each invocation may be a fresh runtime
2. Cold starts wipe the Map
3. Multiple instances run in parallel; counts don't sync
4. The rate limit effectively allows 10 × N requests where N = concurrent instances

## The right way

Use external state:

```ts
// ✓ Use Upstash Redis (or any external store)
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),
});

export async function POST(req: NextRequest) {
  const ip = req.ip ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);
  if (!success) return new Response('Rate limited', { status: 429 });
  // ...
}
```

Or for Day14 OS scale (where Upstash adds complexity for low traffic): use a Vercel KV / Supabase row. Either works.

## Hard rule

**Never keep state in module-level variables in Edge / serverless functions.** All state lives in external services:

- **Counters / rate limits** → Redis / KV
- **Sessions** → JWT (stateless) or Supabase row
- **Caches** → Redis with TTL
- **Connection pools** → managed by the runtime (PostgreSQL via Supabase client; don't roll your own)
- **Background tasks** → Vercel cron + queue table; don't try to `setInterval` in a function

## Detection patterns

Flag these in any Vercel route file:

```regex
^const \w+ = new Map<
^let \w+ = (\{|\[|new Set)
^var \w+ = 
(?<!Symbol\.)setInterval
setTimeout.*export
```

Globals at module-level are the smoking gun.

## When the pattern is OK

- **Module-level CONFIG** (read-only constants from env vars) — fine
- **Module-level IMPORTS** (re-exporting helpers) — fine
- **Lazy-initialized clients** (Supabase, Stripe, Resend SDK instances) — fine because they're stateless wrappers

## When invoked
- Code review of any new Vercel route file
- Audit of existing routes when adding rate limits, sessions, or caches
- Quarterly Day14 OS code audit

## Logging

`[YYYY-MM-DD HH:MM ET] no-edge-in-memory-state → file: {path}, finding: {brief}, severity: high`

The Splash Jacks rate-limit case is severity:medium — a low-traffic chat widget that wouldn't have been DOS'd anyway. But the LESSON is critical to never repeat at scale.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('no-edge-in-memory-state', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'no-edge-in-memory-state', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
