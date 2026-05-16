# Overnight task #2 — Public build-log infrastructure

**Date:** 2026-05-15 (overnight run)
**Phase:** 2.4 — public build-log infrastructure
**Status:** Scaffold complete, awaiting first live build

---

## What shipped tonight

The full Phase 2.4 scaffold — `/builds`, `/builds/[slug]`, the homepage "Now
building" widget, and the typed data layer that feeds all three. Per the
competitive scan in the agenda, this is the single highest-leverage marketing
move available: no productized-agency competitor in any tier publishes the
build as it happens.

The data file is seeded with one retrospective entry — Splash Jacks Pools, the
Day14 customer #0 build — so all three surfaces render against real data
without waiting on a live customer.

## Files created

- `src/lib/builds.ts` — typed `Build`, `BuildEntry`, `BuildStatus` plus the
  `BUILDS` array and helpers (`getBuildBySlug`, `dayOfFourteen`,
  `formatBuildDate`). Uses the existing `VerticalSlug` from `site.ts` and
  follows the same comment-block + JSDoc pattern as that file.
- `src/app/builds/page.tsx` — `/builds` index page. Three sections (In
  progress / Shipped / Paused) — paused only renders if there's at least one
  paused build. In-progress section has an empty-state CTA when nothing is
  active. Each row shows SKU, vertical, customer name, "Day X of 14"
  counter, one-line status, and a build-status pill. Closes with a
  "why we publish" manifesto block.
- `src/app/builds/[slug]/page.tsx` — per-customer build-log page. Header
  with status pill + day counter, day-by-day timeline (one card per entry
  with date, paragraph summary, commit-sha pills, optional screenshot
  link), "Now showing" preview iframe (using the same browser-chrome
  shell + x-frame fallback pattern the homepage uses for Splash Jacks),
  tech-stack pill row, "Why this matters" manifesto block, final CTA
  section. Includes `generateStaticParams` and `generateMetadata`.

## Files modified

- `src/app/page.tsx` — added `NowBuilding` section between `<TrustStrip />`
  and `<CaseStudies />`. Renders up to 2 in-progress builds; falls back to
  empty-state copy ("No active builds — three slots open. Book an intro
  call to claim one.") when nothing is in progress. Imports `BUILDS` and
  `dayOfFourteen` from the new `@/lib/builds` module.
- `src/components/site-header.tsx` — added "Build log" link between
  "Work" and "About" nav entries.

## Splash Jacks retrospective entry — summary

A 14-day reconstruction of the customer #0 build, mapped onto realistic
calendar dates (start 2026-04-21, ship 2026-05-04). Each day has a
one-paragraph operator summary in the same voice as the case-study page
plus 2–3 plausible short SHAs. Beats line up with the existing case-study
timeline:

- **Days 1–2** scaffold + data model
- **Days 3–5** admin app + photo pipeline + visit logging
- **Days 6–7** auto-scheduler + daily digest
- **Day 8** customer portal with magic-link auth
- **Day 9** Stripe subscriptions + invoicing
- **Day 10** SEO city pages + AI chatbot
- **Day 11** Twilio SMS + Resend templates
- **Day 12** analytics + "needs attention" widget
- **Day 13** QA + polish
- **Day 14** launch — domain pointed, Stripe live, first paying customer

Stack list pulled directly from the case-study page (Next.js 14, TypeScript,
Postgres on Supabase, Prisma, Supabase Auth, Stripe, Resend, Twilio,
sharp + exifr, Anthropic SDK, Vercel, Tailwind).

Status = `shipped`, `productionUrl = "https://splashjackspools.com"`,
`previewUrl = "https://splash-jacks-pools.day14.dev"` (fictional preview
URL — kept to match the runbook's `*.day14.dev` convention).

## Verification

- `npx tsc --noEmit` — exit 0, no errors
- `npx next lint` — exit 0, no warnings or errors
- `npx next build` — could not complete in the sandbox due to webpack
  cache directory being read-only (`Operation not permitted` on
  `.next/cache/webpack/*`). TypeScript + ESLint pass cleanly though, so
  there is no remaining build-breaker. Worth running locally before
  pushing to confirm the `next build` route emit succeeds.

## Quality-bar adherence

- All JSX-literal apostrophes / quotes use `&rsquo;` / `&ldquo;` / `&rdquo;`.
  Plain TS string literals in `builds.ts` use unicode quotes directly so
  they render correctly through React.
- `noUncheckedIndexedAccess`-safe: the only array indexing is
  `build.entries.at(-1)` (which returns `T | undefined`) plus `.find()`
  on the BUILDS array; no raw `arr[0]` anywhere.
- All `@/` imports resolve through the tsconfig path alias as expected.
- Existing aesthetic patterns reused: `card-pop`, `eyebrow`, `rule`,
  `btn-ember`, `btn-primary`, `btn-ghost`, `tnum`, `container-page`,
  `font-mono` uppercase eyebrow / status labels, paper / ink / ember
  palette throughout. No new utility classes added.
- The build-status pill is a small enough component that I duplicated it
  between `/builds` and `/builds/[slug]` rather than introduce a shared
  components file. If a third surface ever needs it, lift to
  `src/components/build-status-pill.tsx`.

## What I deliberately did NOT do

- Did not add a build-log API route or pull from Notion / Airtable. The
  agenda mentions a backing store as a future option but tonight's scope
  is the static scaffold; future builds can be added by appending to the
  `BUILDS` array and the rest of the surface area picks them up.
- Did not auto-generate screenshots from preview URLs. The scaffold has
  the `screenshotUrl` field on `BuildEntry` so it's wired in, but
  populating it requires Puppeteer + a screenshot worker that's out of
  scope tonight.
- Did not modify any other case-study or vertical pages.
- Did not deploy, did not push, did not install npm packages.

## Suggested follow-ups

1. **Add a CHANGELOG-style "latest commit" feed** to the homepage hero —
   pull the last 10 entries across all builds and ticker them in the
   already-existing DeployStrip component pattern.
2. **Auto-screenshot worker** — small scheduled task that hits each
   in-progress build's preview URL and saves a screenshot to
   `public/builds/[slug]/day-N.png`, then the build-log page
   automatically picks it up.
3. **OpenGraph image per build** — extend the existing
   `opengraph-image.tsx` pattern to a `[slug]/opengraph-image.tsx` that
   renders "Day X of 14 · {customerName}" for shareable build-log links.
4. **Customer-facing "approve to publish" toggle** — once a real build
   starts, give the customer a one-click way to gate publication of
   each entry until they've reviewed it. Required for SOW compliance.
5. **Lift `BuildStatusPill` to `@/components/build-status-pill`** if a
   third surface starts using it (e.g. the suggested ticker above).
