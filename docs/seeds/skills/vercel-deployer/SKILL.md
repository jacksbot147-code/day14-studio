---
name: vercel-deployer
description: Provision a Vercel project from a customer's GitHub fork, paste env vars, watch the first deploy. Supporting skill for customer-build-day-1-bootstrap step 1.5. Read-mostly skill — does not handle production-domain cutover (that's launch-day-cutover's job).
triggers:
  - "create vercel project"
  - "vercel deploy"
  - "provision hosting"
  - "first preview deploy"
---

# vercel-deployer

> Customer build day 1, step 1.5: turn their GitHub fork into a
> live preview URL. Five minutes of work if the API plays nice.

## Inputs

- `customers.github_repo` — set by `template-forker`
- `customers.slug` — for naming
- `01-brand.json` — for env-var derivation
- VERCEL_TOKEN, VERCEL_TEAM_ID — from `~/Documents/studio/.env.local`

## The mechanics (~10 min)

### 1. Create project via Vercel API
```bash
curl -X POST https://api.vercel.com/v9/projects \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "customer-{slug}",
    "framework": "nextjs",
    "gitRepository": {
      "repo": "jacksbot147-code/customer-{slug}",
      "type": "github"
    }
  }'
```

Capture the response's `id` → write to `customers.vercel_project`.

### 2. Add env vars
Bulk-add via API. The required set:
- `NEXT_PUBLIC_SUPABASE_URL` — customer's Supabase URL (NOT Day14 OS's; one project per customer eventually)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — same
- `SUPABASE_SERVICE_ROLE_KEY` — same (server-side)
- `STRIPE_SECRET_KEY` — customer's Stripe Connect account (if SKU=portal/platform)
- `RESEND_API_KEY` — Day14's Resend key (shared across customers)
- `NEXT_PUBLIC_SITE_URL` — temporary preview URL; updates on launch-day-cutover

For SKU=site, only the first two are needed.

API endpoint: `POST /v9/projects/{id}/env`

Use `target: ["production", "preview"]` so env vars apply to all deploys.

### 3. Wait for first deploy
Vercel auto-builds on project creation (uses the latest commit on default branch).

Poll the deploy status:
```bash
curl https://api.vercel.com/v6/deployments?projectId={id}&limit=1 \
  -H "Authorization: Bearer $VERCEL_TOKEN"
```

Check `readyState`:
- `BUILDING` → wait 15s, poll again
- `READY` → success; capture `url`
- `ERROR` → fail; surface to Jack via approval card with build log link
- `CANCELED` → re-trigger

Max wait: 10 minutes. After that, surface as P1 approval card.

### 4. Capture the preview URL
Write `customers.preview_url` (the .vercel.app URL) and append event:
`kind=preview-ready, payload={preview_url, build_time_seconds}`.

## Hard rules

1. **Never touch production domains** in this skill. That's `launch-day-cutover`'s scope.
2. **Never expose service-role keys** in `NEXT_PUBLIC_*` vars. Strict separation.
3. **Never auto-redeploy** on env var changes — Vercel does this automatically, but verify (and don't trigger duplicate deploys).
4. **Never run `vercel deploy` from local CLI** — use the API exclusively. Local CLI deploys bypass GitHub history.
5. **Never set the production domain in this skill** — preview URL only.

## Failure modes

- **Vercel API rate-limited**: back off (exponential 5s/10s/20s/40s), max 3 retries
- **GitHub repo not yet visible to Vercel**: wait 10s after `template-forker` finishes before calling Vercel; GitHub propagation delay
- **Build fails on first deploy**: usually a missing env var. Check `customers.brand_json` for completeness; surface specific missing var as approval card
- **Vercel project name collision**: append `-2`, `-3` etc. (rare but possible if customer slug clashes)

## Logging

`[YYYY-MM-DD HH:MM ET] vercel-deployer → customer: {slug}, project_id: {id}, preview_url: {url}, build_seconds: N, confidence: <0.0-1.0>`

If build failed:
`[YYYY-MM-DD HH:MM ET] vercel-deployer ⚠️ build failed → customer: {slug}, deployment_id: {id}, log_url: {url}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('vercel-deployer', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'vercel-deployer', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
