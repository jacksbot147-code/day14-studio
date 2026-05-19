---
name: deploy-smoke-tester
description: After every Vercel deploy, run a 90-second smoke test against the deployed URL. Hit homepage, hit a deep page, check forms render, check 404 page. Auto-rollback if smoke fails.
triggers:
  - "smoke test"
  - "deploy verify"
  - "post-deploy check"
  - "/smoke"
---

# deploy-smoke-tester

> The window between deploy and customer-seeing-broken-site should be
> < 90 seconds. This skill compresses that window.

## What this skill does

1. Vercel deploy webhook fires (`deployment.succeeded`)
2. Within 30 sec, smoke-test runs against the new URL:
   - GET / → expect 200 + < 3s TTFB
   - GET /pricing (or equiv) → expect 200
   - GET /api/health → expect 200 + JSON `{ok: true}`
   - GET /asdfdoesnotexist → expect 404 with custom 404 page
   - Check `<title>` matches expected
   - Check meta description present
   - Check no console errors on homepage
3. If any check fails:
   - Log to `~/Documents/businesses/{tenant}/deploys/{deploy_id}.log`
   - P0 Telegram alert
   - Auto-suggest rollback (Jack taps to execute)

## Hard rules

1. **Never auto-rollback.** Always Jack-tap. Rollbacks during a transient issue cause worse outages.
2. **Always wait 30s** before smoke-testing — CDN propagation.
3. **Always test from a real region** — not Vercel's internal network.
4. **Always include the failure response body** in the alert — not just the status code.
5. **Always check the prod URL** (custom domain), not the .vercel.app URL.
6. **Always re-run after auto-detected transient** before alerting.

## Smoke test checks

```python
checks = [
    ("GET", "/", 200, lambda r: "<title>" in r.text and r.elapsed < 3),
    ("GET", "/pricing", 200, lambda r: r.elapsed < 3),
    ("GET", "/api/health", 200, lambda r: r.json().get("ok") == True),
    ("GET", "/_does_not_exist_xyz", 404, lambda r: "Day14" in r.text),  # custom 404
    ("HEAD", "/", 200, lambda r: r.headers.get("strict-transport-security")),
    ("GET", "/", 200, lambda r: "robots" in r.text.lower() or "noindex" not in r.text),
]
```

## Output (success)

```
✅ Deploy smoke test PASS: splashjackspools.com
  Deploy: vrcl_abc123 (production)
  Checks: 6/6 passed
  Total time: 4.2s
  TTFB on homepage: 0.42s
  
  Action: deploy promoted to production. No rollback needed.
```

## Output (failure)

```
🚨 Deploy smoke test FAIL: splashjackspools.com
  Deploy: vrcl_abc123 (production)
  Failed: 2/6 checks
  
  1. /api/health → 500 ({error: "Database connection failed"})
  2. / → TTFB 8.4s (threshold 3s)
  
  Action: P0 alert. Recommendation: ROLLBACK to vrcl_xyz789 (last known-good).
  
  Tap to rollback: [yes] [investigate first] [keep current]
```

## Inputs

- `deploy_id` (Vercel deploy ID, from webhook)
- `customer_slug` (resolved from deploy domain)

## When invoked

- Vercel `deployment.succeeded` webhook → auto
- `/smoke {customer_slug}` Telegram command (post-hoc)
- Inside `launch-day-cutover` final-verify step
- Before promoting any preview to production

## Failure modes

- **First deploy ever (no previous to compare/rollback)**: smoke test only; no auto-rollback option
- **Deploy succeeds but smoke fails 5 retries**: P0 + page Jack
- **Vercel webhook silent**: rely on `deploy_id` from polling

## Logging

`[YYYY-MM-DD HH:MM ET] deploy-smoke-tester → deploy: {id}, customer: {slug}, checks_pass: {N}/{M}, action: {promote|alert|rollback}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('deploy-smoke-tester', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'deploy-smoke-tester', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
