---
name: nightly-polish
description: The nightly health-check protocol — Lighthouse, link health, deploy health on every live Day14 property. Invoked daily at 11 PM by the day14-os-nightly-polish scheduled task. Surfaces issues as approval cards so Jack wakes up to a queue, not surprises.
triggers:
  - "nightly polish"
  - "health check"
  - "Lighthouse"
  - "link health"
  - "deploy health"
  - "site audit"
---

# nightly-polish

> Every Day14 property gets a nightly health check. The job: catch
> issues at midnight while Jack sleeps, not at 9 AM when a customer
> emails about a broken page.

## What gets checked

**Always-on (every night):**
- `https://day14-studio.vercel.app/` (marketing site)
- Every published customer site listed in `~/Documents/businesses/day14/customers/*/05-launch.md`
  with status `launched`

**Once customers exist, also check:**
- Splash Jacks Pools live production app
- Casamoré live site
- Buildbridge live site

## The check pass (per site)

For each site, perform these checks in order. If any fail, stop and
log the failure — don't continue to the next check on the same site.

### 1. Reachability (10s budget)
- `curl -I {url}` → expect 200 OK
- Response time < 3000ms
- Valid SSL certificate

### 2. Key page coverage (30s budget)
- For each path in the site's navigation, fetch and confirm 200
- Day14 site paths: `/`, `/about`, `/compare`, `/case-studies/splash-jacks-pools`, `/case-studies/casamore`, `/case-studies/buildbridge`
- Customer sites: paths from `01-brand.json` → `nav`

### 3. Content sanity (10s budget)
- Homepage must contain the expected company name
- No "lorem ipsum" anywhere
- No placeholder phone numbers ((555) 123-4567, etc.)
- No git-merge conflict markers in HTML (`<<<<<<<`, `>>>>>>>`)

### 4. Lighthouse pass (60s budget)
- If WebFetch can render JS: run Lighthouse via PageSpeed Insights API
- Minimum scores: mobile performance ≥ 80, accessibility ≥ 90
- If WebFetch can't render JS: skip and note "Lighthouse skipped — no JS runtime"

### 5. Deploy health (Vercel) — optional
- Latest deployment status (READY / ERROR / BUILDING)
- If ERROR, surface the deploy URL for Jack to investigate

## Output structure

Write to `~/Documents/studio/docs/overnight/polish-YYYY-MM-DD.md`:

```
# Nightly polish — YYYY-MM-DD

## Sites checked: [N]

### day14-studio.vercel.app
- Status: [✓ healthy | ! degraded | ✗ down]
- Homepage load: [Xms]
- Pages checked: [N total]
- Lighthouse: [mobile X / accessibility Y]
- Issues: [N — list below if any]

### (repeat per customer site)

## Issues to surface
(bullet list; if empty, write "None. All healthy.")

## Approval cards drafted
- (if any issues warrant a fix, draft an approval card and reference it here)

## Recommended actions for Jack tomorrow
(max 3)
```

## Approval card threshold

Not every issue gets an approval card. Use this threshold:

- **Surface as approval card:**
  - Lighthouse mobile < 70
  - Any page returns non-200
  - Production deploy failed
  - SSL cert expires in <14 days
  - Content sanity check failed (placeholders found in production)

- **Just log, don't surface:**
  - Lighthouse score dropped <10 points week-over-week (note in report)
  - Page load 3-5s on a non-critical path
  - Image >500KB on a non-hero page

## Failure modes

- **Site is down completely:** P0. Approval card titled "URGENT: {site}
  returning {status}." Tag Jack via SMS if Twilio is wired (not yet —
  log to MASTER_LOG with elevated priority instead).
- **Lighthouse API failing:** WebFetch may be blocked. Log "Lighthouse
  skipped — see manual check tomorrow" and continue with other sites.
- **Customer site has no `05-launch.md`:** That customer isn't launched
  yet. Skip silently.

## Voice

Use the **day14-voice** skill for any approval-card drafts. Specifically:
- Issue titles are factual, not alarmist: "Homepage returning 500" not
  "URGENT CRITICAL: Site is broken!!!"
- Recommended fixes are specific: "Check Vercel deploy log at {url}"
  not "Investigate the issue"

## Logging

After writing the polish report, append to MASTER_LOG:
`[YYYY-MM-DD 23:00 ET] nightly-polish COMPLETE → polish-YYYY-MM-DD.md, confidence: <0.0-1.0>`

If any site was down or any approval card was filed, also append a
separate line:
`[YYYY-MM-DD 23:00 ET] nightly-polish ⚠️ {issue summary}, see polish-YYYY-MM-DD.md`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('nightly-polish', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'nightly-polish', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
