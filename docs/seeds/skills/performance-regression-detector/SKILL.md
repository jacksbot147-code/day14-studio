---
name: performance-regression-detector
description: Track core-web-vitals + Lighthouse scores per customer site weekly. Surface regressions (LCP, FID, CLS, TTFB) before customers notice slowness. SEO ranks lift with speed.
triggers:
  - "performance regression"
  - "lighthouse drop"
  - "site slow"
  - "/perf"
---

# performance-regression-detector

> A 1-second TTFB jump cuts conversion ~7%. Without monitoring,
> regressions accumulate silently across deploys.

## What's tracked

Per customer, per week, per page (home + top 3 traffic pages):

| Metric | What | Good (green) | Warn (yellow) | Bad (red) |
|---|---|---|---|---|
| LCP | Largest Contentful Paint | < 2.5s | 2.5-4s | > 4s |
| FID/INP | Interaction Delay | < 100ms | 100-300ms | > 300ms |
| CLS | Cumulative Layout Shift | < 0.1 | 0.1-0.25 | > 0.25 |
| TTFB | Time to First Byte | < 0.8s | 0.8-1.8s | > 1.8s |
| Lighthouse Performance | Composite | > 90 | 70-90 | < 70 |
| Lighthouse SEO | Composite | > 95 | 85-95 | < 85 |

Regression = metric drops by >15% week-over-week.

## What this skill does

1. Weekly: run Lighthouse against each customer site (4 pages each)
2. Store results in `~/Documents/businesses/_shared/perf/{slug}-{YYYY-WW}.json`
3. Compare to prior week
4. Identify regressions
5. Identify the deploy that introduced the regression (via Vercel deploy timestamps)
6. Surface as P2 if 1-2 regressions, P1 if 3+ on same site

## Hard rules

1. **Always test from same vantage point** — fluctuation is noise.
2. **Always test mobile + desktop** — different stories.
3. **Always run 3 trials per page** — take median, not single.
4. **Always tie regression to a deploy** when possible.
5. **Never auto-rollback** — Jack approves rollback after review.
6. **Always include the actual numbers** in alerts — relative % alone is uninspectable.

## Output

```
⚡ Performance scan: week of May 18

splashjackspools.com:
  Mobile LCP:   2.1s → 3.4s (REGRESSION: +62%, threshold breached)
  Desktop LCP:  1.4s → 1.5s ✓ stable
  Mobile CLS:   0.04 → 0.04 ✓
  Lighthouse Perf:  87 → 71 (REGRESSION: -18%)
  
  Likely cause: deploy `vrcl_abc123` on May 15 (added 4 video embeds)
  Recommendation: lazy-load videos OR move below the fold

buildbridge.com:
  All metrics: stable ✓

casamore.net:
  Mobile INP:   84ms → 134ms (REGRESSION: +60%)
  Cause: new analytics script (Mixpanel) blocking main thread
  Recommendation: defer Mixpanel load

3 regressions detected. P2 alert queued.
```

## Inputs

- `customer_slug` (optional)
- `compare_to_week` (default: last week)

## When invoked

- Weekly Monday 05:00 ET via scheduled task
- After any customer deploy → next-day regression check
- `/perf {slug}` Telegram command
- Inside `weekly-council-review`

## Failure modes

- **Lighthouse times out** (site too slow): treat as Red across all metrics
- **Site behind auth/captcha**: skip + flag as "untestable"
- **First week of data** (no comparison baseline): log only, no alerts

## Logging

`[YYYY-MM-DD HH:MM ET] performance-regression-detector → customers: {N}, regressions: {N}, p0: {N}, p1: {N}, suspected_deploy: {id}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('performance-regression-detector', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'performance-regression-detector', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
