# Day14 — Full Handoff Brief
# Compacted from the prior Opus session for Fable 5 (or any fresh agent).
# Paste this entire file into the first message of the new project.
# Last updated: 2026-06-09

---

## Who you're working with

**Jack** (jacksbot147-code on GitHub, jacksbot147@gmail.com). Based in Naples, Florida. Solo operator running Day14 — a productized build studio that ships custom sites and apps on his own proprietary multi-tenant OS (Day14 OS).

He's direct, impatient with planning, prefers action over questions. Make judgment calls, ship, report once. Don't ask "should I" — just decide and tell him after. When he gives a goal, decompose and execute autonomously.

---

## The business

**Day14 = build studio + Day14 OS (the moat)**

Four pricing tiers (productized):
- **Spark — $1,500 · 5 days** — single-page sites for local businesses, tutors, solo pros
- **Studio — $9,000 · 14 days** — multi-page marketing sites for founders
- **Platform — $24,000 · 4 weeks** — site + portal + admin + billing (full software business)
- **Custom — Talk to us · 6-12 weeks** — multi-tenant, marketplaces, bespoke

Plus ongoing OS hosting after launch: $49 / $149 / $299/mo respectively.

**Six tenants currently on Day14 OS:**
- `day14` — the studio itself (LIVE, ember `#ef6c33` brand color)
- `alignmd` — B2B SaaS for healthcare staffing (LIVE, cool blue `#3b82f6`)
- `life-loophole` — editorial finance brand (LIVE, gold `#ca8a04`)
- `day14-realty` — coastal listings (PAUSED for licensing, forest `#14805a`)
- `hot-flash-co` — D2C wellness (PARKED, peach `#f472b6`)
- `kennum-lawn-care` — local services (PARKED, lime `#65a30d`)
- `angela-music` — NEW Spark-tier client (Currier Music, Naples FL music teacher) — site staged, needs Angela's bio photo + phone + email + pricing to go live

---

## Standing constraints — never violate

1. **Never push to `main` directly.** Always push to the active feature branch (currently `redesign/apple-base44-2026-06-03`). Jack reviews preview, then merges to main himself.
2. **Never delete files.** Overwrite or update in place is fine; `git rm` is not.
3. **Never reinstall `node_modules`** or run `npm ci`. Use what's installed.
4. **No new dependencies** in `package.json` without explicit approval. Use what's there: Next.js 14, React, framer-motion, Tailwind, Inter font, etc.
5. **hot-flash-co + kennum-lawn-care are PARKED** — don't do new product work on them. They appear on the case-studies bento as parked tiles; that's fine, don't reactivate.
6. **Realty killswitch is honored** — drafters exit early on the flag.
7. **GitHub username is `jacksbot147-code`** — NOT `jacksbot147`. That typo broke push auth previously.
8. **Cal.com booking URL is `https://cal.com/day14/intro`** (in `src/lib/site.ts` as `SITE.bookingUrl`) — Jack needs to verify it actually exists; sandbox can't reach external HTTPS to check.

---

## Repo layout

**Path:** `/Users/jcboppington/Documents/studio` (Mac) — `/sessions/<session>/mnt/Documents/studio` in sandbox bash.

Key directories:
- `src/app/page.tsx` — homepage (Next.js 14 App Router)
- `src/app/work-with-us/page.tsx` — Hire-us page (recently rewritten for build-studio pivot)
- `src/app/case-studies/<slug>/page.tsx` — per-tenant case study pages (alignmd, casamore, buildbridge, splash-jacks-pools, hot-flash-co)
- `src/app/brands/<slug>/` — per-tenant marketing surfaces (angela-music, hot-flash-co, kennum-lawn-care, life-loophole)
- `src/app/admin/` — operator admin
- `src/app/api/brands/[slug]/contact/route.ts` — generic form-submission endpoint used by tenant intake forms
- `src/components/landing/` — 18+ animation/UI components: VideoHero, FullTerminalHero (rejected), ProfessionalHero, CinematicImage, CmdKPalette, StatusLine, PathCrumb, DecryptText, TypeIn, BuildReveal, etc.
- `src/components/site-header.tsx`, `src/components/site-footer.tsx`
- `src/lib/site.ts` — SITE config (brand, email, location, bookingUrl)
- `public/data/empire-state.json` — live empire state, synced every 15 min by cron
- `scripts/_internal/banana-refire-2026-05-28.mjs` — proven Gemini-image-gen orchestrator pattern (run from Mac terminal because sandbox can't reach Gemini API)
- `scripts/lib/skills/cc-nano-banana.mjs` — bridge to Gemini image gen
- `docs/agents/brand-animator/` — creative-direction methodology skill (SKILL.md + NEW-TENANT-PLAYBOOK.md + MISTAKES-AVOIDED.md)
- `docs/agents/goal-skill/SKILL.md` — `/goal` slash command skill (paste into Cowork Settings > Capabilities to install)
- `drafts/` — all the in-flight content drafts (X-thread, Loom script, manifesto, briefings, audits, etc.)

---

## Current branch state

**Active branch:** `redesign/apple-base44-2026-06-03`
**Main:** untouched; production day14.us reflects pre-redesign state
**Vercel preview URL:** `https://day14-studio-git-redesign-app-b13829-jacksbot147-codes-projects.vercel.app`
**Push command:** `cd ~/Documents/studio && git push origin redesign/apple-base44-2026-06-03`
**Merge to main (one-liner):** `cd ~/Documents/studio && git checkout main && git pull && git merge redesign/apple-base44-2026-06-03 && git push origin main`
**Discard branch (one-liner):** `cd ~/Documents/studio && git checkout main && git push origin --delete redesign/apple-base44-2026-06-03 && git branch -D redesign/apple-base44-2026-06-03`

Recent commit history includes:
- Full hero redesign cycles (8 rebuilds in ~24 hours — see MISTAKES-AVOIDED.md)
- Build-studio pivot (positioning shift from SaaS to studio)
- 4-tier pricing (Spark/Studio/Platform/Custom)
- AlignMD deep case-study page
- Angela's site rebuilt (stripped from 16 sections to 6 — Spark tier scope)
- Brand-animator skill + playbook + mistakes-avoided rules
- Empire-state cron syncs every 15 min (clutters commit log)

---

## What's actually live vs. drafted

**LIVE on production (day14.us):**
- Old design from before the redesign branch — visitors are seeing pre-pivot copy
- All sections in current state until Jack merges the redesign branch

**ON THE REDESIGN BRANCH (Vercel preview):**
- ProfessionalHero — plain English headline, ember accent, single CTA
- VideoHero, FullTerminalHero — built but rejected, files kept for reference
- DecryptText (Mr. Robot scramble) on hero anchor text
- CmdKPalette with buyer-first commands
- 4-tier pricing
- New case-studies bento with live/paused/parked tiles
- /case-studies/alignmd deep page
- AlignMD-specific deep case study

**STAGED LOCALLY (committed, may need push):**
- Whatever's accumulated since the last successful push

**SCHEDULED TO RUN OVERNIGHT (autonomous tasks T1-T13):**
- T1 /status page (live empire receipts from empire-state.json)
- T2 /process page (14-day SOP public timeline)
- T3-T5 + T9 AlignMD agent buildouts (credential-parse v2, license-status, evidence-verifier, admin UI polish)
- T6 per-tenant creative-direction docs (6 files in docs/tenants/<slug>/)
- T7 custom 404 + sitemap.xml + meta audit
- T8 empire-state cron → state/auto branch (stop polluting main log)
- T10 morning briefing artifact (drafts/OVERNIGHT-BRIEFING-2026-06-08.md)
- T11 Angela inputs checklist (drafts/ANGELA-NEEDS-2026-06-09.md)
- T12 /brands + case-study credibility audit
- T13 OG-card orchestrator staged (Jack runs from Mac to generate fresh OG cards)
- Plus weekly: brand-animator-weekly-audit every Monday 10 AM EDT

**Status uncertain:** Some of these tasks may have failed silently (precedent from earlier night-03 + night-05 failures). Verify by reading `drafts/OVERNIGHT-BRIEFING-*.md` and `git log --oneline -30`.

---

## Drafts available in `drafts/`

Ready for Jack to execute:
- `TODAY-EXECUTION-2026-06-09.md` — master checklist top-to-bottom
- `X-THREAD-SEND-READY-2026-06-09.md` — 8 tweets in paste-ready code blocks + 3 alternate hooks
- `ANGELA-SMS-DRAFT-2026-06-09.md` — text to send Angela for her bio photo/phone/email/pricing
- `MANIFESTO-SUBSTACK-READY-2026-06-09.md` — title + subtitle + body for Substack publish
- `PUSH-FALLBACK-2026-06-09.md` — PAT recipe when git auth breaks
- `LOOM-SCRIPT-2026-06-03.md` — 4-min demo script
- `AUDIENCE-REFRAME-COPY-2026-06-03.md` — headline variants
- `ALIGNMD-AGENT-ROADMAP-2026-06-08.md` (from T3 overnight) — AlignMD agent audit
- `NIGHT-BRIEF-2026-06-03.md` — earlier overnight strategy doc

---

## What Jack needs to do (his execution list)

In priority order:

1. **Push the redesign branch** (auth via PAT — see `drafts/PUSH-FALLBACK-2026-06-09.md`)
2. **Verify Cal.com link works** at `https://cal.com/day14/intro`
3. **Text Angela** (paste from `drafts/ANGELA-SMS-DRAFT-2026-06-09.md`)
4. **Send X-thread** (paste from `drafts/X-THREAD-SEND-READY-2026-06-09.md`)
5. **Record Loom** (script in `drafts/LOOM-SCRIPT-2026-06-03.md`), paste URL into `LOOM_EMBED_URL` in `src/app/page.tsx`
6. **Publish manifesto** (paste from `drafts/MANIFESTO-SUBSTACK-READY-2026-06-09.md`), reply to X-thread Tweet 8 with the URL
7. **Inbox triage** — 40+ awaiting-jack items in `public/data/inboxes/*.json`. Fast wins first: alignmd + day14-realty hero/headline pairs.
8. **Run OG-card orchestrator** from Mac: `cd ~/Documents/studio && node scripts/_internal/og-refresh-2026-06-09.mjs` (assuming T13 staged it)
9. **Merge to main** when satisfied
10. **Sunday 14:00 EDT signal read** — original test: "50+ waitlist signups" — re-framed for build studio: "3-5 real scope-call requests"

---

## Skills + agents installed

- **brand-animator** — creative-direction skill at `docs/agents/brand-animator/SKILL.md`. Methodology + 7-step playbook + 12 mistakes-avoided rules. Loadable by any future Claude session.
- **/goal** — autonomous multi-step execution skill at `docs/agents/goal-skill/SKILL.md`. NOT yet installed in Cowork (paste into Settings > Capabilities to install).
- **brand-animator-weekly-audit** — recurring scheduled task firing Mondays 10 AM EDT. Audits all tenants for brand-animation opportunities.

---

## Things rejected — don't repeat

From the 8 hero rebuilds in 24 hours, lessons paid for in pain:

1. **Don't put admin chrome on marketing pages** (LivingOsHero — confused buyers thought they had to log in)
2. **Don't add particles/confetti** (VideoHero v1 — read as "2015 SaaS noise")
3. **Don't use jargon in the headline** ("productized build studio", "multi-tenant OS" — kills non-tech buyer conversion)
4. **Don't blur on content reveal** (BuildReveal first version — felt hazy)
5. **Don't gate the pitch behind a typing animation** (FullTerminalHero — 8s wait before buyer sees value)
6. **Don't use internal-ops language for buyer copy** (HowItWorks "Add a tenant" — buyer doesn't add tenants)
7. **Don't make a developer-facing string visible to non-tech buyers** (Loom empty state previously said "paste URL into page.tsx")
8. **Don't have two CTAs competing in the fold** (header "Book intro call" + hero "Join the waitlist" was confusing)
9. **Don't sell two products on one page** (Day14 OS SaaS + 14-day build studio — pick one per page)
10. **Don't redesign the hero before 100+ visitors of data** (rule: pick a direction, ship, leave it alone for a week)
11. **Don't generate fake testimonials** ("200+ students", "12+ years" when actual is 13/16) — credibility kill
12. **Don't fabricate neighborhoods, recital cadence, sibling discount %** — easy lie to detect

---

## Open uncertainties

- **Push auth situation** — Jack hit "Password authentication is not supported" twice. PAT recipe in drafts/PUSH-FALLBACK-2026-06-09.md is the durable fix. He may have resolved this or not by the time you start.
- **Cal.com link existence** — sandbox can't verify. If 404s, every "Book scope call" CTA on the site is broken — fallback is mailto chain.
- **Whether the 13 overnight tasks fired** — depends on whether the Cowork app stayed open on his Mac. Check `drafts/OVERNIGHT-BRIEFING-*.md` for ground truth.
- **Angela's inputs** — bio photo, phone, email, pricing all placeholders pending her response.
- **Whether Jack pushed any of the recent commits** — check `git log origin/redesign/apple-base44-2026-06-03..HEAD` for any local-only commits.

---

## How to communicate with Jack

- Lead with outcome, not process
- One CTA per response when asking him to do something
- No multi-question lists — pick one question or none
- Use tables for comparisons, code blocks for commands
- Skip preamble — assume he's already in context
- When he says "go" or "ship it" — treat as full authority, decompose and execute, report once at end
- When he asks for "ideas" he wants 5-7 concrete options ranked by impact, not 30 brainstormed
- He tolerates honest critique well; he doesn't tolerate flattery

---

## Useful shell commands

```bash
# Navigate to studio
cd ~/Documents/studio

# Verify branch + unpushed commits
git branch --show-current
git log origin/redesign/apple-base44-2026-06-03..HEAD --oneline

# Typecheck + lint
npm run typecheck && npx next lint

# Push (assumes auth working)
git push origin redesign/apple-base44-2026-06-03

# Merge to main
git checkout main && git pull && git merge redesign/apple-base44-2026-06-03 && git push origin main
```

---

## End of brief

Everything you need to start work is above. When Jack types his first request in the new project, you have full context. Default to action.
