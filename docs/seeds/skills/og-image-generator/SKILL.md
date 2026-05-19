---
name: og-image-generator
description: Generate Open Graph images for every page on a Day14 customer site (and the Day14 marketing site). Uses Next.js dynamic OG via @vercel/og. Each page gets a per-route OG that pulls live data, not a static fallback. Critical for social-share preview quality.
triggers:
  - "OG image"
  - "open graph"
  - "social preview"
  - "share card"
  - "Twitter card"
  - "og:image"
---

# og-image-generator

> When someone shares a Day14 customer's URL on iMessage, Slack, or
> Twitter, the preview card is the first impression. Stock template
> previews look generic. Per-route dynamic ones look custom.

## The pattern

Use Next.js's built-in `opengraph-image.tsx` per route:

```
src/app/
├── page.tsx
├── opengraph-image.tsx          ← homepage OG
├── about/
│   ├── page.tsx
│   └── opengraph-image.tsx      ← per-page OG
├── case-studies/[slug]/
│   ├── page.tsx
│   └── opengraph-image.tsx      ← dynamic per-case-study
```

Each `opengraph-image.tsx`:
- Exports `default async function Image()` returning an `ImageResponse`
- Uses `@vercel/og` for rendering
- Reads data from `src/lib/site.ts` or the route's dynamic segment
- Returns 1200x630 PNG

## Required template structure

Every Day14 OG image follows this layout:

```
┌─────────────────────────────────────────────┐
│                                             │
│  {EYEBROW LABEL}      ← top-left, mono     │
│                                             │
│  {Page title — large} ← center-left, sans  │
│                                             │
│  {Sub-headline}       ← center-left, smaller│
│                                             │
│                                             │
│  ─────────────────────                      │
│  {brand name}     {brand mark or initial}   │
│                                             │
└─────────────────────────────────────────────┘
```

Brand colors:
- Background: `paper` (#F8F6F1) by default; customer can override
- Text: `ink` (#0B0B0A)
- Accent / eyebrow: `ember` (customer's primary brand color)

## Per-route data sources

| Route | Data source |
|---|---|
| `/` (homepage) | `SITE.tagline`, `SITE.pitch` |
| `/about` | "Built by an operator, not an agency" |
| `/case-studies/[slug]` | The case study object's title + one-line outcome |
| `/verticals/[slug]` | Vertical name + one-line value prop |
| `/compare` | "Day14 vs Jobber/HCP/GHL/Squarespace" |
| Customer-build homepage | Customer's tagline from `01-brand.json` |
| Customer-build per-page | Per-page title + their business name |

## Code template

```tsx
// src/app/opengraph-image.tsx
import { ImageResponse } from 'next/og';
import { SITE } from '@/lib/site';

export const runtime = 'edge';
export const alt = SITE.tagline;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#F8F6F1',
          color: '#0B0B0A',
          display: 'flex',
          flexDirection: 'column',
          padding: '64px',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div style={{ fontSize: 24, opacity: 0.6, letterSpacing: 2 }}>
          DAY14
        </div>
        <div style={{ fontSize: 84, fontWeight: 600, marginTop: 'auto', lineHeight: 1.05 }}>
          {SITE.tagline}
        </div>
        <div style={{ fontSize: 32, opacity: 0.7, marginTop: 24 }}>
          {SITE.pitch}
        </div>
      </div>
    ),
    size
  );
}
```

## Hard rules

1. **Never use stock images** as fallbacks. Generate at build/request time.
2. **Never embed customer photos** without rights confirmation in `brand.json`.
3. **Always use `runtime = 'edge'`** for OG routes (faster + cheaper).
4. **Always set `size = { width: 1200, height: 630 }`** — Facebook/Twitter/iMessage all use this aspect.
5. **Never include personal phone numbers / addresses** in OG (they go to social media indexes).
6. **Always check that the OG renders** before shipping a new route. `curl /opengraph-image` returns the image; verify with `file` that it's a PNG.

## Testing

After deploying a new OG image, test via:

1. Facebook Sharing Debugger — https://developers.facebook.com/tools/debug/
2. Twitter Card Validator — https://cards-dev.twitter.com/validator
3. LinkedIn Post Inspector — https://www.linkedin.com/post-inspector/

If any one fails, the image isn't actually live for that platform.

## When to invoke this skill

- Building a new route on the Day14 marketing site
- Onboarding a new customer (add per-page OG to their site)
- Customer asks "why does my site preview look bad on iMessage?"
- After a brand-swap (brand color changes mean OG colors change)

## Logging

Append to MASTER_LOG:
`[YYYY-MM-DD HH:MM ET] og-image-generator → tenant: {slug}, routes_updated: {N}, files: {paths}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('og-image-generator', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'og-image-generator', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
