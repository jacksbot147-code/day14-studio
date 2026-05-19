---
name: broken-link-finder
description: Crawl a Day14 customer site, find every internal link, and verify each returns 200. Supporting skill for nightly-polish. Catches 404s before customers do. Lightweight crawler — depth 2, ~30 URLs per site, no external links followed (those are out of scope).
triggers:
  - "broken link"
  - "404 check"
  - "link health"
  - "dead link"
  - "crawl site"
---

# broken-link-finder

> The bug that always makes customers furious. A 404 on the contact
> page costs more goodwill than a slow Lighthouse score.

## Input
- `base_url` — root URL of the site
- `max_depth` — default 2 (homepage + one level deep)
- `max_urls` — default 30 (cap to prevent thundering herd)

## The crawl

1. Fetch `{base_url}/` (homepage)
2. Parse for all `<a href="...">` whose href is internal (same origin or relative)
3. Deduplicate, filter out anchor-only (`#section`) and `mailto:`/`tel:` links
4. For each unique internal URL: HEAD request, capture status
5. For URLs in (2) that return 200, recurse depth-2 (no further)

Skip these paths (always — they're noise):
- `/api/*`
- `/_next/*`
- `/favicon.ico`
- `/sitemap.xml`
- `/robots.txt`

## Per-URL classification

| Status | Action |
|---|---|
| 200 | ✓ healthy |
| 301/302 | Note the redirect; follow once; warn if redirect chain >2 |
| 404 | ✗ broken; surface as approval card |
| 5xx | ✗ server error; surface as P0 if homepage, P1 otherwise |
| Timeout (>10s) | ✗ — same as 5xx |

## Output schema

```json
{
  "base_url": "https://acmepoolco.com",
  "crawled_at": "ISO",
  "urls_checked": 24,
  "healthy": 22,
  "broken": [
    {"url": "/services/old-page", "status": 404, "from": "/services"},
    {"url": "/about", "status": 500, "from": "/"}
  ],
  "redirects": [
    {"from": "/contact-us", "to": "/contact", "via": "301"}
  ]
}
```

## Hard rules

1. **Never follow external links.** External link breakage is out of scope (they own that).
2. **Never crawl more than 30 URLs.** Customer sites are small; deeper crawl = wasted compute + risk of looking like a bot.
3. **Never run during business hours on customer sites** unless explicitly invoked. Off-hours only via nightly-polish.
4. **Always include the referring page** in the broken-link report. `/about → /broken-page` is more useful than just `/broken-page`.

## Failure modes

- **Site is rate-limiting the crawler:** add 500ms delay between requests; rare for static Vercel sites
- **JS-rendered content has links we miss:** Lighthouse doesn't see them either; out of scope for now
- **Redirect loop**: detect with a 3-hop budget; abort + surface as bug

## Logging

`[YYYY-MM-DD HH:MM ET] broken-link-finder → tenant: {slug}, checked: N, broken: N, redirects: N`

If broken > 0, also surface:
`[YYYY-MM-DD HH:MM ET] ⚠️ broken-link-finder {slug} — N broken — see polish-YYYY-MM-DD.md`

## When invoked
- Called by `nightly-polish` daily
- Called by `launch-day-cutover` as a gate
- Called manually after a customer reports "the contact page is gone"
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('broken-link-finder', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'broken-link-finder', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
