# Day14 — studio marketing site

The studio's own marketing site. Day14 ships custom business platforms
(marketing + portal + admin + billing + chatbot) for small businesses in
14 days for $2,500–$10,000 flat.

Forked from `~/Documents/splash-jacks-pools` — same Next 14 / TS strict
/ Tailwind base, intentionally stripped of pool-specific code and
rebranded with a builder-y aesthetic (warm paper background, ink text,
ember accent).

## Stack

- Next.js 14 App Router
- TypeScript strict, `noUncheckedIndexedAccess: true`
- Tailwind CSS
- No DB / auth / billing on the studio site itself — marketing-only.
  Customer SKU builds bring in Prisma + Supabase + Stripe + Resend + Twilio.

## Develop

```bash
npm install
npm run dev          # http://localhost:3000
npm run typecheck    # tsc --noEmit
npm run build        # next build
```

## Structure

```
src/
  app/
    layout.tsx                       — root layout, fonts, metadata
    page.tsx                         — homepage (hero, demo, SKUs, timeline, FAQ, CTA)
    globals.css                      — base + components + utilities
    icon.tsx                         — favicon
    opengraph-image.tsx              — root OG image
    case-studies/
      splash-jacks-pools/page.tsx    — first case study
  components/
    site-header.tsx
    site-footer.tsx
  lib/
    site.ts                          — copy + SKU data, single source of truth
    cn.ts                            — tailwind class merge helper
```

## Editing copy

The pricing, SKU features, FAQ, and timeline copy live in `src/lib/site.ts`.
Edit there, not inside the page components — the homepage, OG image, and
case study all pull from this file so they stay in sync.

## Launch checklist

- [ ] Point day14.us at the Vercel deployment
- [ ] Flip `metadata.robots` to `{ index: true, follow: true }` in `src/app/layout.tsx`
- [ ] Set `NEXT_PUBLIC_SITE_URL=https://day14.us` in Vercel env
- [ ] Replace placeholder `cal.com/day14/intro` booking URL in `src/lib/site.ts`
- [ ] Replace placeholder `hello@day14.us` if a different inbox is preferred
- [ ] Verify Splash Jacks Pools allows iframe embedding (otherwise the hero
      demo iframe will show a blocked frame — fall through is the
      "Open splashjackspools.com" link next to it)
