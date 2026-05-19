---
name: seo-keyword-cluster-builder
description: Given a seed keyword, build a cluster of 15-25 related terms organized by search intent (informational, commercial, transactional). Powers content calendar + on-page optimization.
triggers:
  - "keyword cluster"
  - "seo cluster"
  - "related keywords"
  - "topic cluster"
---

# seo-keyword-cluster-builder

> Single keywords don't rank anymore. Topic clusters do.

## What this skill does

1. Takes seed keyword (e.g., "pool service swfl")
2. Pulls related queries from `seo-keyword-fetcher` (Google Autocomplete, People Also Ask, Related Searches)
3. Buckets into intent:
   - Informational: "how to maintain a pool", "best pool chemicals"
   - Commercial: "pool service comparison", "pool service near me"
   - Transactional: "pool service swfl quote", "book pool cleaning"
4. Scores by volume + competition (where data available)
5. Outputs structured cluster map

## Output format

```
# Cluster: pool service swfl

## Pillar (anchor page)
- "pool service swfl" — 2,400/mo, competition: 0.6

## Informational (write blog posts)
- "how often should i clean my pool florida" — 320/mo, low
- "pool chemical levels florida humidity" — 210/mo, low
- "diy pool maintenance schedule" — 480/mo, med

## Commercial (write comparison pages)
- "pool service comparison swfl" — 90/mo, low
- "pool service near me reviews" — 1,100/mo, high
- "monthly pool service cost florida" — 540/mo, med

## Transactional (CTAs + landing pages)
- "pool service swfl quote" — 70/mo, low
- "book pool cleaning naples fl" — 50/mo, low
- "pool service estero fl" — 80/mo, low
```

## Hard rules

1. **Always include search volume + competition** when available.
2. **Always bucket by intent** — content per bucket differs.
3. **Never include keywords with 0 search volume** — even if related.
4. **Always identify the pillar keyword** — the cluster's anchor.
5. **Always check existing site coverage** — don't propose keywords already ranked.

## Inputs

- `seed_keyword` (required)
- `vertical` (optional)
- `geo_focus` (optional: state/city)

## When invoked

- Inside `blog-post-generator` for related-keyword discovery
- `/cluster {seed}` Telegram command
- Inside `content-calendar-orchestrator` weekly run
- Inside `seo-city-page-builder`

## Failure modes

- **Seed keyword has no data**: surface as "too niche"; suggest broader seed
- **All keywords already ranked**: surface as "saturated"; recommend different angle

## Logging

`[YYYY-MM-DD HH:MM ET] seo-keyword-cluster-builder → seed: "{kw}", cluster_size: {N}, top_volume: {N}, intent_distribution: {info_n|com_n|trans_n}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('seo-keyword-cluster-builder', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'seo-keyword-cluster-builder', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
