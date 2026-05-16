# Day14 — End-of-Day Status (Friday 2026-05-15)

**Date:** 2026-05-15 (Friday evening, consolidated from four daytime runs)
**Read this before:** dinner
**Read time:** ~5 min on a phone

## Headline

Of the four scheduled daytime tasks, **three completed and one did not fire**: the 12:30 Portal Phase B deep-fork (task #05) never produced a report and never executed. Portal therefore still has `model Pool`, no `brand.json`, and no `scripts/brand-swap.mjs` — it is a 240-file pool-branded copy with a PLAN.md, not yet a real template. Platform got scaffolded on top of that pool-branded underlay anyway. Plus a bonus 03b kickoff task shipped a real `/compare` page (642 lines) and the workers/subscribe.js + swap.mjs polish ahead of schedule. The first thing to do tonight is **delete the three real `.env*` secrets sitting at the root of both `studio-template-portal/` and `studio-template-platform/`** before anything gets pushed anywhere.

## What shipped today

**Task 04 — Portal Phase A (skeleton + PLAN) — ✓ shipped.** rsync'd splash-jacks-pools into `studio-template-portal/`. 240 files, plus a 595-line `PLAN.md` specifying the Phase B work order (45 files to delete, ~120 to rename, ~75 to keep, 3 new abstractions). Read-only contract on splash-jacks-pools held. Flagged `.env / .env.local / .env.production.local` as the very first thing Phase B has to delete — Phase B never ran, so they're still there.

**Task 05 — Portal Phase B (deep fork) — ✗ did not fire.** No `05-portal-fork.md` exists; the Phase B strip + Pool→Item rename + brand.json + scripts/brand-swap.mjs pass never executed. Verified at the filesystem: `prisma/schema.prisma` still reads `model Pool`, no `brand.json`, no `scripts/brand-swap.mjs`. This is the single largest gap in today's slate — Portal is the actual Day14 product and the autonomous 2-hour fork window is gone.

**Task 06 — Platform scaffold — ✓ shipped, with one big asterisk.** `studio-template-platform/` is a true superset of Portal: 242 inherited files + 7 new (CHANGELOG, mobile/README, `src/features/storm-mode/{README,noaa-poller,contractor-panel,notify-fan-out}`, `src/lib/service-type.ts`). Storm Mode is feature-flagged off (`STORM_MODE_ENABLED`, 12 explicit refs across 4 files). The asterisk: Platform inherited Portal's pool-branded underlay AND its leaked .env files. Per the agent's own CHANGELOG entry, Platform will need a re-sync once Portal Phase B finally runs. Storm Mode files are honest placeholder stubs — they no-op when disabled and throw "not implemented" when enabled.

**Task 07 — Content polish + small fixes — ✓ shipped, highest-quality run of the day.** Real edits, not box-checking. Competitor pricing fact-checked against live 2026 vendor pages: Jobber Connect $169 confirmed; Housecall Pro plan name "Pro" is retired, replaced with Essentials $149; GoHighLevel $97 confirmed plus a callout for usage fees; Squarespace Commerce retired, replaced with Core $23. Operator claims softened in `04-built-by-an-operator.md` where source didn't support them (the "two numbers" and "6 calls a week" lines). Storm Mode's five-county claim corrected to three counties with named permit systems (Lee Accela / Collier CityView / Charlotte ePermitting). Verified the workers/subscribe.js `message` plumbing and swap.mjs `wrangler.generated.toml` emit were already correctly done by the 03b kickoff task. Added `wrangler.generated.toml` to the Site template `.gitignore` so a brand-specific system prompt can't be committed by accident. All five blog drafts still inside the 800–1,200-word budget.

**Bonus: 03b kickoff task** ran before the noon window and shipped `/compare` page (642 lines, six-row comparison table, five-year math, FAQ subset, ink-on-paper CTA), the nav entry, the workers/subscribe.js `message` field, and the swap.mjs wrangler.generated.toml emit. That last one was originally scoped for task 07, so 07 had less to do than the morning plan implied.

## Open issues / decisions Jack needs to make

**Three real `.env*` files are sitting at the root of both `studio-template-portal/` and `studio-template-platform/`.** These contain real Splash Jacks secrets (DATABASE_URL, OPENAI_API_KEY, etc.). `.gitignore` covers them, but rsync ignores `.gitignore` — they only landed because of that. Delete before any commit. This is the single highest-priority cleanup.

**Portal is not actually a template yet.** It's a renamed copy of splash-jacks-pools. The Pool→Item schema rename, generic copy reskin, `brand.json`, `scripts/brand-swap.mjs`, and `src/lib/{brand,service-type}.ts` abstractions are all still pending. PLAN.md (595 lines) is a faithful work order for whoever picks this up next.

**Platform will need a re-sync after Portal Phase B finally runs.** CHANGELOG.md flags it; recommended sequence is Portal-strip first, then Platform-rsync, then re-add the Platform-only additions (admin/, mobile/, features/storm-mode/, service-type.ts).

**Storm Mode stubs are placeholder-quality** — useful as a wiring sketch, not as runnable code. The README runbook is genuinely useful; the three TS files throw on enable. Per-customer build territory, as the original spec intended.

**Pricing fact-checks have a half-life.** All four vendors moved names or numbers in the last 12–18 months. Re-run the search before any republish more than 90 days out.

**The `/compare` page was not in the morning plan** and shipped without a code review pass against the existing aesthetic system. Worth a 10-min skim before going live — uses real utilities (`card-pop`, `marker`, `btn-ember`) so likely fine, but unbudgeted.

## Recommended evening / weekend actions (prioritized)

**1. Delete the leaked `.env` files from both templates** (5 min, no creds gate). One `rm` pass: `rm ~/Documents/studio-templates/studio-template-{portal,platform}/.env{,.local,.production.local}`. Pre-condition for anything else — including pushing the template repos. Touches Phase 2.1 / 2.3.

**2. Kick off Portal Phase B as the next scheduled overnight task** (~5 min to schedule, runs 90 min unattended). PLAN.md is the work order; the most-leverage half is the schema rename + `brand.json` + `scripts/brand-swap.mjs` write. Without this, Portal cannot be forked for a real customer. Touches Phase 2.1. Does not gate on Jack's creds.

**3. Run `npm run build` in `~/Documents/studio/` and execute the Phase 1 deploy** (~90 min, gates on Vercel + Cal.com + Stripe + DNS creds). Unchanged from this morning's wake-up rec — three days of work is sitting in a site that isn't live. Once live, publish `05-the-storm-mode-moat.md` first (strongest post in the set) and link to `/compare` from the homepage hero. Touches Phase 1 + Phase 5.

If there's time for a fourth: 15 minutes of `/compare` skim + fix-on-sight, since that page is now a centerpiece of the marketing surface and didn't go through the wake-up plan's review.

## Status of the agenda by phase (updated)

**Phase 1 — Ship to live:** unchanged from morning. Still not started; still the highest-leverage move once Jack is at a keyboard.

**Phase 2.1 — Portal template:** scaffold copy only. PLAN.md written. Phase B (the actual work) skipped. Regressed vs. expectation — morning plan was that Portal would be a real template by tonight.

**Phase 2.2 — Site template:** complete. `.gitignore` got `wrangler.generated.toml` added; the morning wake-up's three small-fix items (subscribe message, chatbot prompt propagation, contact form) are all verified done.

**Phase 2.3 — Platform template:** v0.1.0 scaffolded as a superset of Portal. Inherits Portal's gaps. Re-sync required once Portal Phase B lands.

**Phase 2.4 — Build-log infra:** unchanged. `next build` validation still pending Jack's local machine.

**Phase 3 — Sell:** unchanged. DM templates + newsletters ready; SWFL lead-list pull still pending.

**Phase 4 — Operationalize:** unchanged. Not started.

**Phase 5 — Brand + content:** advanced. Five blog drafts now pricing-verified and operator-claims-softened. `/compare` page shipped (new). Storm Mode post is the recommended first publish.

**Phase 6 — Vertical expansion:** unchanged. Not started; correctly deferred.
