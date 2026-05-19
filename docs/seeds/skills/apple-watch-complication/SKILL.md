---
name: apple-watch-complication
description: Pending approval count and current MRR shown as an Apple Watch face complication. One-glance state of the business. Phase 6 supporting skill (uses shortcuts-bridge).
triggers:
  - "watch complication"
  - "apple watch"
  - "watch face"
---

# apple-watch-complication

> Two pieces of data Jack should be able to see without unlocking
> his phone: how many approvals are pending, and what's MRR. Apple
> Watch complications handle both.

## How this works

Apple doesn't allow custom complications without a paid native iOS app. Workaround: use the **Carrot Weather** complication pattern OR a free "JSON Widget" / "Data Jar" app that polls a URL.

### Recommended free path: Data Jar + JSON Widget

1. Install JSON Widget Pro (iOS, ~$3 one-time) — supports Apple Watch complication
2. Configure to poll `https://day14.us/api/shortcuts/watch` every 5 min
3. Widget displays the data returned

### Endpoint

`~/Documents/studio/src/app/api/shortcuts/watch/route.ts`:

```ts
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (token !== process.env.SHORTCUTS_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const mrr = await computeMRR();
  const approvals = await countPendingApprovals();

  return Response.json({
    line1: `${dollars(mrr)} MRR`,
    line2: `${approvals} approval${approvals === 1 ? '' : 's'}`,
    color: approvals > 5 ? 'red' : approvals > 0 ? 'yellow' : 'green',
    timestamp: new Date().toISOString(),
  });
}
```

GET endpoint so it works with simple widgets (vs POST for Shortcuts secret-auth).

## What gets shown

Modular complication (corner):
- Top line: `$1,247 MRR`
- Bottom line: `2 approvals`

Color signal: green (0 pending) / yellow (1-5 pending) / red (6+ pending or P0 active).

## Update cadence

- Apple Watch complications refresh every 5-15 min depending on power state
- That's fine for MRR + approval count
- Real-time alerts come from Telegram, not the watch face

## Hard rules

1. **Never put customer data in the complication.** Just numbers.
2. **Always use the GET endpoint with token in query** — Apple Watch widgets don't easily POST.
3. **Always include a timestamp** so Jack knows if the watch face is stale.
4. **Never include sensitive info even in error messages** — "Day14 unavailable" not "Supabase down at {url}".

## Failure modes

- **Day14 OS API slow**: watch widget shows stale data; that's OK; user knows
- **iOS watch face fonts truncate**: keep lines short (≤12 chars)
- **Token in URL is visible to anyone who sees the watch face**: rotate quarterly + use less-sensitive read-only endpoint

## When invoked
- Apple Watch widget polls every 5-15 min
- Manually via curl for testing

## Logging

`[YYYY-MM-DD HH:MM ET] apple-watch-complication → mrr: ${N}, approvals: {N}, color: {green|yellow|red}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('apple-watch-complication', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'apple-watch-complication', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
