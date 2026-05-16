# Day14 — Overnight Wake-up Status

**Date:** 2026-05-15 (morning, consolidated from three overnight runs)
**Read this before:** coffee
**Read time:** ~5 min on a phone

## Headline

All three overnight agents completed; 30 files shipped across the site template, build-log infra, and content drafts; nothing broke. The one open verification gap is that `next build` was never confirmed locally — TypeScript and ESLint passed cleanly inside the sandbox, but the sandbox couldn't write to `.next/cache/webpack/*`. The first thing to do this morning is run `npm run build` from `~/Documents/studio/` to close that loop before any deploy.

## What shipped

**Overnight #1 — `studio-template-site` fill (✓ complete).** Eleven files landed: five HTML pages (index, services, about, contact, faq), `assets/style.css` (587 lines, brand-token CSS vars plus `color-mix` derivations), `assets/main.js` (219 lines, nav + accordion + form + chat widget), `scripts/swap.mjs` (261 lines, the brand-swap engine with `{{#each}}` support and nested-block scanning), `_redirects`, `.gitignore`, and the empty `assets/photos/` directory. The swap script was smoke-tested end-to-end against `brand.json` — `dist/` exists on disk with clean output, and the only `{{...}}` matches in the rendered output are inside `dist/README.md` documenting the marker syntax, which is expected. Two notable decisions the agent made unilaterally: it picked the minimal Handlebars-like contract for each-blocks (silent on missing arrays so a half-filled `brand.json` doesn't break the build), and the contact form posts a `message` field to `/api/subscribe` that the existing Worker currently drops on the floor.

**Overnight #2 — build-log infra (✓ complete with one caveat).** Phase 2.4 scaffold landed: typed `src/lib/builds.ts` (239 lines, real, not a stub — full 14-day Splash Jacks retrospective with daily summaries, plausible short SHAs, and the right helpers), `/builds/page.tsx` (in-progress / shipped / paused sections with empty-state CTA), `/builds/[slug]/page.tsx` (day-by-day timeline, preview iframe, tech-stack pills, manifesto block, proper `generateStaticParams` and `generateMetadata`). `src/app/page.tsx` got a `NowBuilding` component between TrustStrip and CaseStudies; `src/components/site-header.tsx` got a "Build log" nav entry between Work and About. **Caveat:** `npx next build` couldn't complete in the sandbox (webpack cache directory was read-only). `tsc --noEmit` and `next lint` both passed exit-0. Confidence is high that the route compiles, but it's unverified — see the first recommended action below.

**Overnight #3 — content drafts (✓ complete).** Seven publishable docs: five blog posts at 978 / 1,006 / 1,095 / 1,068 / 1,148 words (all inside the 800–1,200 target), four DM templates (cold #1 SWFL mobile-service, cold #2 membership, cold #3 food/hospitality, follow-up #4), and two newsletter drafts (Issue #1 intro at 534 words, Issue #2 build-log manifesto at 503 words). I spot-checked `05-the-storm-mode-moat.md` and `02-owned-not-rented.md` — both are real, finished, in-voice, with the right level of specificity. The agent flagged its own quality concerns honestly (see Open Issues below).

## Open issues / decisions to revisit

**The build-log scaffold is unverified at the `next build` level.** It is the single most consequential thing to confirm before doing anything else — the whole Phase 2.4 push assumes those routes emit cleanly.

**Competitor pricing in `02-owned-not-rented.md` is unverified.** The post cites Jobber Connect at $169/mo, Housecall Pro Pro at $129/mo, GoHighLevel agency starter at $97/mo, Squarespace Commerce at $36/mo + extensions. These are plausible May-2026 numbers but the agent didn't network-verify any of them. This is the post most likely to be ratioed on X for a stale number — fact-check before publishing.

**Splash Jacks operator-claims in `04-built-by-an-operator.md` are slightly more specific than the source material strictly supports.** The post asserts "two numbers on the home screen: revenue this month, jobs scheduled this week," "AI chatbot saves 6 calls a week," "daily admin digest at 7am" — these are reasonable but not all in `site.ts` or the case-study page. Either confirm or soften to "a couple of headline numbers" / "saves a few calls a week" / "morning digest."

**Buildbridge Storm Mode specifics in `05-the-storm-mode-moat.md`** enumerate five SWFL counties (Lee/Collier/Charlotte/Sarasota/Manatee) and a four-channel notify fan-out. If Buildbridge actually only covers three counties or uses different channels, soften before publishing.

**The contact form `message` field is plumbed in the template but dropped by the Worker.** A 5-line change to `workers/subscribe.js` to forward `message` into a MailerLite custom field would fix it. Recommend doing this rather than dropping the textarea — the message is the most useful part of the lead.

**`brand.chatbot_system_prompt` is not auto-propagated.** Operator currently has to `wrangler secret put SYSTEM_PROMPT` by hand. Could be a `[vars]` block emitted from `swap.mjs` — flagged but not done.

**The build-status pill is duplicated** between `/builds/page.tsx` and `/builds/[slug]/page.tsx`. Intentional — both agents flagged it. Lift to `@/components/build-status-pill` if a third surface ever uses it.

## Recommended first three actions for the day

**1. Run `npm run build` in `~/Documents/studio/` and confirm the new routes emit clean.** (Phase 2.4 close-out.) This is the unverified piece from overnight #2 — TS and lint passed, but a real webpack build never ran. Until that's green, the build-log scaffold isn't actually shippable, and Phase 1 deploy is gated on it. Should take 2 minutes and either reveal nothing or surface the one issue worth knowing about. Do this before opening a browser.

**2. Execute Phase 1 — Vercel deploy + day14.us domain + Cal.com booking link.** (Phase 1, the deploy gate.) Three overnight agents shipped a meaningful amount of work into a site that is not yet live anywhere. Until day14.us resolves, none of the marketing surface area — the new `/builds` infra, the case studies, the blog — generates a single inbound. The agenda's Phase 1.1–1.4 is a ~90-minute push: `gh repo create`, Vercel import, flip `metadata.robots` to `index: true`, point the domain, create the three Stripe Payment Links, replace the cal.com placeholder in `src/lib/site.ts`. Highest leverage move available — the templating, build-log, and content work all compound off it.

**3. Spend 15 minutes fact-checking `02-owned-not-rented.md` competitor pricing and publish `05-the-storm-mode-moat.md` first.** (Phase 5.) The agent flagged this as the highest-priority review item from overnight #3, and it's the right read — quoting a stale Jobber price is the kind of mistake that costs credibility. Once the four prices are confirmed (or corrected), publish the storm-mode post first per the agent's recommendation: it's the strongest in the set, attacks the 2026 AI-agency thesis directly, and is the most likely to be shared by other productized-agency operators on X. Save `02-owned-not-rented.md` for the second slot — it's the best landing-page-ad post and worth holding for cold-traffic.

## Status of the agenda by phase

**Phase 1 — Ship to live:** not started. The deploy gate. This is the morning's highest-leverage move.

**Phase 2.1 — Portal template:** not started overnight.

**Phase 2.2 — Site template:** partially shipped. Scaffold fill complete, swap.mjs smoke-tested. Remaining: contact-form `message` plumbing, chatbot prompt auto-propagation, OG image, multi-FAQ visual rhythm test.

**Phase 2.3 — Platform template:** not started overnight.

**Phase 2.4 — Build-log infra:** scaffolded; `next build` validation pending. Auto-screenshot worker, approve-to-publish toggle, and optional Notion/Airtable backing store remain as follow-ups.

**Phase 3 — Sell:** partially scaffolded. Four DM templates and two newsletter drafts are ready to use. Cold-outreach playbook still needs the SWFL Maps lead-list pulled.

**Phase 4 — Operationalize:** not started.

**Phase 5 — Brand + content:** partially shipped. Five blog drafts + two newsletter issues ready to publish pending the fact-check pass above. Phase 5's content cadence has its first month of inventory queued.

**Phase 6 — Vertical expansion:** not started.
