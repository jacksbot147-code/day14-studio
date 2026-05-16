# Day14 — Full Agenda

> The 6-month roadmap from local-dev-build to full-time income.
> Living document. Check things off as they ship. Update timestamps when
> a phase actually closes vs the target date.

---

## North-star goals

| Horizon | Target | What "winning" looks like |
|---|---|---|
| 30 days | First paying customer signed and shipped | $2,500–$5,000 in revenue, 1 live case study added |
| 90 days | $10k/mo run rate, 3–4 active customers | Going full-time on Day14, cancelled day-job income unnecessary |
| 6 months | $20k/mo run rate, 8–12 customers, stacking MRR | Decision point: hire a junior operator or stay solo |
| 12 months | $200k+/yr revenue, 15+ active customers | Three vertical templates productized, optional second operator |

The arithmetic: 2 builds/month at $5,000 average + 24 stacking MRR customers at $200/mo by month 12 = ~$150k year 1, ~$220k year 2. This is full-time income inside 12 months at a pace one operator can sustain.

---

## Phase 1 — Ship to live (this week, days 1–3)

**Goal: day14.us resolves to the marketing site, and a prospect can book + pay a deposit without you touching anything.**

### 1.1 — Vercel deploy

```bash
cd ~/Documents/studio
gh repo create day14/studio --private --source=. --remote=origin --push
# Then on vercel.com:
#   1. Import the GitHub repo
#   2. Set env: NEXT_PUBLIC_SITE_URL=https://day14.us
#   3. Deploy
```

After it deploys: flip `metadata.robots` in `src/app/layout.tsx` from `{ index: false, follow: false }` to `{ index: true, follow: true }`. Push. Vercel redeploys.

### 1.2 — Point day14.us at Vercel

- In your domain registrar: change nameservers to Cloudflare (recommended) or set CNAME directly to Vercel.
- In Vercel: Project → Settings → Domains → add `day14.us` and `www.day14.us`. Vercel handles SSL.
- DNS propagates in 5 min to 24 hours. Use [dnschecker.org](https://dnschecker.org/) to watch.

### 1.3 — Cal.com booking

- Free tier is fine to start. Create the booking page at `cal.com/day14/intro`.
- 30-minute slots, Mon–Fri, with a 24-hour buffer.
- Three questions on the booking form: business name, vertical, what you currently use to run the business (e.g. Jobber, Squarespace, nothing).
- Replace the placeholder `https://cal.com/day14/intro` in `src/lib/site.ts` with the real URL.

### 1.4 — Stripe Payment Links for deposits

- Stripe Dashboard → Payment Links → New.
- Three links: SITE deposit ($1,250), PORTAL deposit ($2,500), PLATFORM deposit ($5,000).
- Each link has a custom thank-you page that points to the intake form.
- Save the three URLs in `src/lib/site.ts` (add a `DEPOSIT_LINKS` constant) and wire them into each SKU card.

### 1.5 — Buildbridge SSO lift (the case-study unblocker)

- Vercel → Buildbridge project → Settings → Deployment Protection.
- Either disable SSO entirely OR carve out a public `/` route + `/storm-mode` marketing landing.
- Recommendation: build a public `buildbridge.day14.us/preview` landing page that explains the product without exposing the operator/contractor flows. The full app stays SSO-gated, but prospects get a real link from the Day14 case-studies page.

### 1.6 — Smoke test

Open day14.us in an incognito window. Walk through:
- Hero loads, the Splash Jacks iframe renders (or the fallback link works)
- All three SKU cards click through to the Cal.com booking
- All three case study pages load
- FAQ accordions open
- "Book intro call" buttons go to Cal.com

**Done when:** day14.us is public, Cal.com captures bookings, deposits can be paid, and Buildbridge's preview is reachable.

---

## Phase 2 — Templatize (days 4–10)

**Goal: every future customer build starts from a clean fork, not a copy-paste-and-search-replace from Splash Jacks Pools. Fork → first preview URL in <4 hours.**

### 2.1 — `day14/studio-template-portal` (highest priority)

Strip splash-jacks-pools of pool-specific code:

- Rename `Pool` → `Item` throughout the schema and UI
- Replace `chemistry` fields with a generic `metadata` JSON column
- Abstract `serviceType` config: `{ singular: "visit", plural: "visits", verb: "completed", noun: "service" }`
- Remove pool-specific city LP templates; replace with a generic city-LP builder
- Rip out the route-scheduler if it's pool-specific (it isn't — keep it)
- Remove the chemistry-input UI; keep the photo-proof pipeline
- Keep: customer portal, magic-link auth, Stripe billing, admin app, AI chatbot, daily digest

This is Day14's actual product. Treat it like a product — write a CHANGELOG, version it, tag releases.

**Status (2026-05-15 evening): v0.1.0-partial shipped.** Schema rewrite (Pool→Item + metadata Json), `brand.json` + `src/lib/brand.ts` + `src/lib/service-type.ts` + `scripts/brand-swap.mjs` (with `--rename` mode) all landed. ~150 view-level TypeScript errors remain — all mechanical rewrites of pool-specific copy/views against the new schema. Documented as Portal v0.2.0 work in `studio-templates/studio-template-portal/CHANGELOG.md`. **Don't block on this:** for pool-service customer #1, fork `~/Documents/splash-jacks-pools` directly. The Portal template clean-up matters when customer #2 (lawn/cleaning/HVAC) needs a vertical-agnostic fork.

### 2.2 — `day14/studio-template-site`

Use the Casamoré pattern: static HTML + Cloudflare Workers + MailerLite.

- Pages: home, services, pricing, about, contact, FAQ + 5 SEO landing page slots
- Lead capture form → Cloudflare Worker bridge → MailerLite or Resend
- AI chatbot via a serverless function
- PWA install
- Dynamic OG images per route
- Brand color tokens swapped in one place

Goal: fork → swap brand + copy → live in <2 hours.

### 2.3 — `day14/studio-template-platform` — **v0.1.0 scaffolded, Storm Mode + permit + Capacitor stubs in place**

Portal + Buildbridge's admin extensions:

- Everything in Portal
- Role-based admin gates
- Photo proof pipeline (sharp + EXIF + GPS + watermark)
- Auto-scheduling
- Broadcast SMS
- Analytics dashboards
- Optional Storm Mode bundle (for contractor verticals)
- Optional Capacitor mobile wrapper (Platform-only add-on)

**Status (2026-05-15):** Platform template forked as a true superset of Portal (242 Portal files preserved verbatim + 7 Platform-only additions). Storm Mode lives at `src/features/storm-mode/` as scaffold-only files behind `process.env.STORM_MODE === "on"`. Capacitor wrapper documented at `mobile/README.md` (not initialized — operator-init per customer). Marketplace mode and multi-county permits documented as future scaffolds. `src/lib/service-type.ts` carries Platform-only tokens (`adminAppName`, `photoWatermarkLabel`, `routeOrShiftNoun`). CHANGELOG.md tags v0.1.0. Follow-up sync needed after Portal Phase B strip pass lands. See `docs/overnight/06-platform-scaffold.md`.

### 2.4 — Public build-log infrastructure — **scaffold complete, awaiting first live build**

Single highest-leverage marketing move per the competitive scan. Build a dynamic page at `day14.us/builds/[customer-slug]` that pulls from a Notion or Airtable backing store and renders:

- Day-by-day timeline with commit shas
- Screenshots auto-generated from preview URLs
- Daily one-paragraph operator update (the same one sent to the customer)
- Live "% complete" estimate

No competitor in any tier does this. The transparency is the trust mechanism and doubles as content marketing.

**Status (2026-05-15):** Static scaffold landed in overnight task #2. `/builds` index page, `/builds/[slug]` per-customer page, homepage "Now building" widget, and nav entry all live. Data layer at `src/lib/builds.ts` is seeded with the Splash Jacks Pools 14-day retrospective so all surfaces render against real data. Next steps before this can come off "scaffold": auto-screenshot worker, customer-facing approve-to-publish gate, optional Notion/Airtable backing store. See `docs/overnight/02-buildlog-infra.md` for the full report.

### 2.5 — Fix the Casamoré SKILL.md path bug

Per the portfolio report: the SKILL.md hardcodes a session-specific path (`/sessions/sharp-serene-einstein/mnt/site 2/`) which silently breaks scheduled cron runs. Generalize the path before adopting the scheduled-task pattern in customer builds.

**Done when:** Three template repos exist, each has a working README + fork-instructions, and a test-fork can produce a live preview URL in under 4 hours.

---

## Phase 3 — Sell (week 2–3)

**Goal: first paying customer signed and starting.**

### 3.1 — Cold outreach playbook

- **Channel 1: SWFL Cold-Maps.** Google Maps search for "pool service Naples FL", "lawn care Bonita Springs", "mobile detailing Fort Myers", "dog grooming Cape Coral." Collect 50 names + URLs + emails into a sheet.
- **Channel 2: In-person drop-ins.** Visit 5–10 SWFL service businesses in person each week. Hand them a business card with the day14.us URL. "Built one of these for a pool service in Naples — happy to show you on a call."
- **Channel 3: Instagram DMs.** 20 DMs/week to SWFL service operators with: "Saw your business. Built a full platform for a pool service in Naples in 14 days. Here's the live demo: splashjackspools.com. Worth a 30-min call?"
- **Channel 4: Founder communities.** One post/week on IndieHackers, r/Entrepreneur, X. Topic: "I built this entire SaaS in 14 days for $7,500 — here's how." Link to day14.us + the build-log.

Daily quota: 10 cold contacts. Track conversion: contact → intro call booked → deposit paid.

### 3.2 — Intro call playbook

- 30 minutes. Free.
- Open: 5 min on the customer's business. What do they sell, who do they sell to, what's broken today?
- Middle: 15 min walking through splashjackspools.com live. Show the marketing site, then the customer portal, then the admin app, then the photo-proof flow.
- Close: 5 min on which SKU fits, what the price is, what the 14-day timeline looks like.
- Last 5 min: send the order form + Stripe deposit link before the call ends. If they sign, deposit is paid before they hang up.

### 3.3 — First 3 customers — pricing notes

- First customer: discount to $2,500 for SITE or $3,500 for PORTAL. Trade discount for a public case study + introduction to 3 of their service-business peers.
- Customers 2–3: half off the published price in exchange for the same.
- Customer 4+: full price.

The first three are case-study currency. Don't optimize for revenue on them — optimize for proof.

**Done when:** 1 paying customer, 50% deposit cleared, build is live in production.

---

## Phase 4 — Operationalize (month 1–2)

**Goal: every build from #2 onward is repeatable without re-inventing the playbook each time.**

### 4.1 — Customer dossier folder structure

```
~/Documents/customers/
  {customer-slug}/
    sow.pdf                  signed agreement
    intake.pdf               returned intake form
    brand/                   logo, photos, color hex codes
    credentials.md           Stripe / Supabase / Vercel access (gitignored)
    daily-log.md             one-paragraph per day during the build
    postmortem.md            written within 30 days of launch
    case-study-draft.md      auto-generated, edited, ready to publish
```

### 4.2 — Cowork session naming convention

Every customer build session is named `day14-build-{customer-slug}`. Makes the portfolio discovery prompt trivially clean later.

### 4.3 — Scheduled-task ops (the "Claude as on-call SRE" pattern)

For every Portal+ customer, run nightly + weekly scheduled tasks via Cowork:

- **Nightly**: link-health check, broken-image scan, performance audit, error-log review
- **Weekly**: dependency-update review, security-advisory check, customer-engagement summary
- **Monthly**: full backup verification, churn-risk report, ops summary email to customer

This is part of the monthly fee. Customers don't see "Claude" — they see "your platform is healthy" emails.

### 4.4 — Postmortem template

After each build, write a single-page postmortem:
- What was in scope vs what was actually shipped
- Hours invested (rough)
- What worked
- What didn't
- What I'd template-ize next time
- What I'd refuse next time

Drives template improvements.

**Done when:** Three customers shipped using the runbook with zero ad-hoc decisions; one template improvement landed per customer based on the postmortems.

---

## Phase 5 — Brand + content (month 2–6)

**Goal: inbound replaces cold outreach. Prospects book intro calls because they found Day14, not because Day14 found them.**

### 5.1 — Case-study pages, deepened

Every shipped customer gets a real case-study page with:

- Live URL + screenshot gallery
- Day-by-day timeline (pulled from the public build-log)
- 1–2 paragraph quote from the customer
- Metrics: time to first paying customer, monthly active users, transactions processed
- Stack details for the technically curious

Cap at 6 case studies on the homepage. The rest live in an archive.

### 5.2 — Public build-log live during every build

Per Phase 2.4 — every active build has a public URL anyone can watch. Embed the build-log on the Day14 homepage as a "Now building" widget.

### 5.3 — YouTube channel — "I built this in 14 days for $7,500"

One video per build. ~10–15 minutes, timelapse + voiceover. Show the actual code, the actual customer journey, the actual revenue impact. Niche: SWFL service businesses, AI-coded development, productized agency economics.

Cadence: 1 video / 2 weeks. Realistic for a solo operator.

### 5.4 — Newsletter — "The Builder Log"

Weekly Substack or Beehiiv newsletter. ~500 words. Topic each week: a real lesson from a current build. Soft pitch at the bottom. Subscribers = warm leads.

### 5.5 — Community presence

- One IndieHackers post / 2 weeks
- One r/Entrepreneur post / month
- Three X threads / week on the actual work
- One in-depth blog post / month on day14.us

Goal by month 6: 50% of bookings come from inbound, not cold outreach.

**Done when:** Inbound bookings exceed cold-outreach bookings for 2 consecutive months.

---

## Phase 6 — Vertical expansion (month 3–6)

**Goal: turn one-vertical templates into a multi-vertical product line.**

Per the portfolio report's recommendation, the next three verticals to template are:

### 6.1 — Mobile services that aren't pool (month 3–4)

Lawn care, mobile detailing, HVAC tune-ups, mobile pet grooming, dog walking. Splash Jacks template forks in days. Pricing identical ($5k–$10k Portal/Platform). Cold-Maps SWFL motion proven.

Deliverable: `day14/studio-template-mobile-service` — a sibling template to the field-service Platform shell, abstracted to handle any recurring-visit mobile vertical.

### 6.2 — Beauty + wellness with recurring memberships (month 4–5)

Salons, med spas, gyms, yoga studios, massage practices. Trades photo-proof for class booking + membership tiers. Higher AOV customers, easier sales motion in SWFL.

Deliverable: `day14/studio-template-membership` — booking + class scheduling + recurring billing + customer portal pattern.

### 6.3 — Local food + small hospitality (month 5–6)

Small restaurants and cafés wanting online ordering + loyalty + email list but can't afford Toast. SITE + custom Square / Stripe integration.

Deliverable: `day14/studio-template-food` — menu + order + pickup + loyalty pattern.

### 6.4 — The Empire add-on (month 4+)

Per the portfolio report — the "master context JSON + monthly playbook docx" pattern is sellable as a Day14 add-on for Platform customers. $500–$1,000 one-time + $50/mo to set up an automated daily content / intel briefing for the customer's business.

**Done when:** Three vertical templates exist, each with at least one paying customer in that vertical.

---

## Daily / weekly operating cadence

### Daily (Mon–Fri)

- **9am — Outreach (45 min):** 10 cold contacts (DM / email / map drop-in), update the lead tracker.
- **10am — Customer build (4–5 hours):** Heads-down on the active customer build. One Cowork session, one feature area per day.
- **3pm — Build-log + customer update (30 min):** Update the public build-log. Send the customer the daily one-paragraph EOD update.
- **4pm — Intro calls or admin (variable):** Take scheduled intro calls. Handle billing, support, scheduled-task review.
- **5pm — Hard stop on customer work.** Evening is for content / brand / family.

### Weekly

- **Monday morning:** Review last week's metrics. Pick one improvement for the week (template, copy, content piece).
- **Friday afternoon:** Weekly retro. What shipped, what slipped, what's next week's #1 priority.

### Monthly

- First Monday: full P&L review. Adjust pricing if needed (after the first 3 case-study customers).
- Last Friday: stack-update day. Patch all customer projects, run security audits, archive any dead-weight portfolio entries.

---

## Risks + watchlist

| Risk | Mitigation |
|---|---|
| "Why not just Jobber for $69/mo?" | FAQ + intro-call answer rehearsed. Lead with "you own the code, the customer relationship, the brand." Demo Jobber's limitations live during the call. |
| MVP Expert / HouseofMVPs price-match at $5k | Differentiate on (a) the full stack vs an MVP, (b) vertical-specific templates, (c) live reference customer (Splash Jacks). The deposit-back guarantee is sharper than their "free until done." |
| AI agency price compression in 2026 | Stay focused on outcomes (customer's business runs on it) not on tooling ("we use Claude"). The customer doesn't care which agent stack — they care about the live URL on day 14. |
| Burnout — one operator can only do 3 builds/month max | Cap incoming bookings at 4/month. Decline obviously bad-fit customers on the intro call. Don't take on a 5th simultaneous active build. |
| Sales motion stalls — fewer than 2 bookings/month | Aggressive: drop SITE price to $1,500 + $99/mo for the next 5 customers in exchange for video testimonials. Trade revenue for case-study velocity until the funnel works. |
| One operator illness / vacation | All builds use scheduled-task ops so they keep running. Plan in advance — no new bookings during a planned away period. |

---

## How to update this agenda

- Edit this file directly. Commit. The README in `~/Documents/studio` references it as the canonical roadmap.
- Add a `LAST_UPDATED:` line at the top each time you mark a phase complete.
- Once Phase 1 closes, write a short retrospective at the bottom of this file under `## Retro — Phase 1`.

---

*One operator. AI agents. Real customers. Real revenue. 14 days at a time.*

`LAST_UPDATED: 2026-05-15 (evening) — four daytime tasks ran; three completed, one (Portal Phase B deep-fork) did not fire. Portal is still a renamed splash-jacks-pools copy with .env secrets still attached; Platform scaffolded on top of that underlay anyway. Content polish was the highest-quality run (real pricing fact-checks, real softeners). See docs/overnight/00-end-of-day-status.md.`

---

## Retro — Overnight session (2026-05-15)

Three autonomous overnight agents ran between roughly 12:45 AM and 10:36 AM ET. All three completed. Highlights:

**Landed.** `studio-template-site` was filled out end-to-end — five HTML pages, brand-token CSS (587 lines), main.js, and `scripts/swap.mjs` (261 lines, with `{{#each}}` block support, nested-block scanning, and a silent-on-missing-array contract). The script was smoke-tested against `brand.json` and produced a clean `dist/`. Separately, the Phase 2.4 build-log scaffold landed in the main marketing site: `src/lib/builds.ts` (239 lines, seeded with the full 14-day Splash Jacks retrospective), `/builds` index, `/builds/[slug]` per-customer page, homepage `NowBuilding` widget, and a "Build log" header nav entry. The data layer is typed against the existing `VerticalSlug` and reuses the existing aesthetic system (`card-pop`, `eyebrow`, `rule`, `btn-ember`, etc.) without introducing new utility classes. Finally, content inventory: five blog drafts in `docs/blog-drafts/` (978–1,148 words each), four DM templates and two newsletter drafts in `docs/outreach/`, ~6,800 publishable words total.

**Didn't land.** No deploys, no git pushes, no `npm install` runs. The `studio-template-portal` and `studio-template-platform` Phase 2 templates were not touched overnight — only the Site template got the fill pass. No auto-screenshot worker for the build-log was built (out of scope for the static scaffold). The Casamoré SKILL.md path bug (Phase 2.5) was not addressed.

**One verification gap.** `npx next build` could not complete in the overnight sandbox due to a read-only `.next/cache/webpack/` directory; `tsc --noEmit` and `next lint` both passed exit-0. The build-log routes are very likely fine but need a local build pass to confirm before the Phase 1 Vercel deploy.

**Decisions worth surfacing.** (1) `swap.mjs` each-blocks render empty on missing arrays rather than throwing — a half-filled `brand.json` won't break the build. (2) Contact form posts a `message` field that the existing `workers/subscribe.js` drops; the agent recommended (and did not implement) extending the Worker rather than removing the textarea. (3) Build-status pill is duplicated between the two `/builds*` routes intentionally; lift to a shared component if a third surface uses it. (4) Five blog posts cite competitor pricing (Jobber $169/mo, Housecall Pro $129/mo, GoHighLevel $97/mo, Squarespace $36/mo) that was not network-verified — needs a 10-minute fact-check before publishing.

**Recommended first three actions** are in the wake-up status doc at `docs/overnight/00-wakeup-status.md`. Short version: confirm `npm run build` is clean, execute the Phase 1 deploy, fact-check competitor pricing and publish `05-the-storm-mode-moat.md` first.

---

## Retro — Daytime session (2026-05-15)

Four scheduled daytime tasks fired between 11:30 and 17:15 ET while Jack was at work; a fifth (this retro + EOD report) closes the day. **3 of 4 completed, 1 did not fire.**

**Landed.** Portal Phase A (task 04): full splash-jacks-pools tree rsync'd into `studio-templates/studio-template-portal/` with a 595-line `PLAN.md` work order. Platform scaffold (task 06): `studio-template-platform/` is a true superset of Portal — 7 new files including a feature-flagged Storm Mode bundle (`STORM_MODE_ENABLED`, 12 explicit references across 4 files), Capacitor mobile runbook, and `src/lib/service-type.ts`. Content polish (task 07): pricing fact-checked against live 2026 vendor pages — three of four prices changed (Housecall Pro "Pro" tier is retired → Essentials $149; Squarespace Commerce retired → Core $23; GoHighLevel got a usage-fees callout; Jobber $169 confirmed). Operator-claims softened in `04-built-by-an-operator.md` where the source code didn't support them; the Storm Mode five-county claim corrected to three counties with named permit systems (Lee Accela / Collier CityView / Charlotte ePermitting). All five blog drafts still inside the 800–1,200-word budget. Bonus: a pre-noon kickoff task (03b) shipped `/compare` page (642 lines), wired the nav, and pre-implemented the workers/subscribe.js `message` field plus `scripts/swap.mjs` `wrangler.generated.toml` emit that task 07 was meant to do — so task 07 only had to verify and add the `.gitignore` line.

**Didn't land.** The 12:30 ET Portal Phase B deep-fork task (task 05) never produced a report and never executed. Portal therefore still has `model Pool` in `prisma/schema.prisma`, no `brand.json`, and no `scripts/brand-swap.mjs`. This is the single largest gap in today's work — Portal is the actual Day14 product and was meant to be a real, brand-swappable template by tonight; it's still a renamed splash-jacks-pools copy. The autonomous 2-hour window for Phase B is gone.

**Security gap to clean up first.** Three real `.env*` files (`.env`, `.env.local`, `.env.production.local`) are sitting at the root of both `studio-template-portal/` AND `studio-template-platform/`. They came in via rsync (which ignores `.gitignore`) and Phase A explicitly flagged them as "Phase B deletes these FIRST." Phase B didn't run, so they're still attached to both templates. Delete before any commit.

**Decisions worth surfacing.** (1) Storm Mode files are honest placeholder stubs — they no-op when disabled and throw "not implemented" when enabled. Useful as a wiring sketch, not as code. (2) Platform inherits Portal's pool-branded underlay; CHANGELOG flags that Platform will need a re-sync once Portal Phase B finally ships. (3) Content polish was the highest-quality run of the day — real edits with cited sources, not box-checking. (4) `/compare` page is now a centerpiece of the marketing surface but didn't go through the morning plan's review pass.

**Recommended evening / weekend actions** are in `docs/overnight/00-end-of-day-status.md`. Short version: `rm` the leaked `.env*` files, kick off Portal Phase B as the next overnight scheduled task, then run `npm run build` and execute the Phase 1 deploy.
