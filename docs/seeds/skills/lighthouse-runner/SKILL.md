---
name: lighthouse-runner
description: Run a Lighthouse audit against a URL and return scores. Supporting skill for nightly-polish. Wraps the PageSpeed Insights API (which runs Lighthouse server-side, no local Chrome needed). Returns mobile + desktop scores in a stable schema.
triggers:
  - "lighthouse"
  - "performance score"
  - "page speed"
  - "mobile score"
---

# lighthouse-runner

> Numerical health check for a URL. Stable schema, no flaky local Chrome.

## Input
- `url` — full URL including protocol
- `strategy` — `mobile` or `desktop` (default: both — return two results)
- `categories` — array of `performance | accessibility | best-practices | seo` (default: all 4)

## API call

```bash
curl "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?\
url={ENCODED_URL}&\
strategy={STRATEGY}&\
category=PERFORMANCE&category=ACCESSIBILITY&\
category=BEST_PRACTICES&category=SEO" \
-H "Accept: application/json"
```

No API key needed for low volume (≤25k/day). For Day14's scale (handful of sites × daily check), free tier suffices.

## Output schema

```json
{
  "url": "https://...",
  "strategy": "mobile",
  "timestamp": "ISO",
  "scores": {
    "performance": 92,
    "accessibility": 96,
    "best_practices": 100,
    "seo": 100
  },
  "lcp_seconds": 1.8,
  "fid_ms": 50,
  "cls": 0.02,
  "tbt_ms": 120,
  "raw_lighthouse_url": "https://googleusercontent.com/..."
}
```

## Thresholds (per `nightly-polish` skill)

| Score | Status |
|---|---|
| ≥ 90 | green |
| 70-89 | yellow (track, don't alert) |
| 50-69 | orange (file approval card) |
| < 50 | red (P1 — surface to Jack immediately) |

## Hard rules

1. **Never block on a single failed audit.** Lighthouse occasionally flakes; require 2 consecutive bad scores before alerting.
2. **Never run on non-200 URLs.** Pre-check reachability first.
3. **Never cache results > 1h** — site state changes fast.
4. **Always run BOTH mobile + desktop.** Mobile scores more brutal; desktop scores often hide problems.

## Logging

`[YYYY-MM-DD HH:MM ET] lighthouse-runner → url: {url}, strategy: {s}, perf: N, a11y: N, bp: N, seo: N, status: {green|yellow|orange|red}`

## When invoked
- Called by `nightly-polish` against every launched customer site
- Called by `launch-day-cutover` as a gate before declaring launched
- Called manually when investigating a customer complaint
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('lighthouse-runner', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'lighthouse-runner', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
