# Day14 — Shared Context for Overnight Scheduled Tasks

> Every overnight scheduled task starts as a fresh Cowork session with no
> memory of prior conversations. Each task's prompt is self-contained, but
> they all share the same context. Read this file first.

## ⚡ Recent additions (May 16, 2026)

Day14 has evolved past "marketing site" into **Day14 OS** — the
operating system that runs the productized agency. Key new artifacts:

- `~/Documents/studio/docs/day14-os-vision.md` — architecture, 5 components, Supabase schema
- `~/Documents/studio/docs/day14-os-skills-and-empire.md` — empire pattern, 8 skill packs
- `~/Documents/studio/docs/day14-mac-mini-runbook.md` — 3-hour Mac mini setup runbook
- `~/Documents/studio/docs/day14-mac-mini-day1-playbook.md` — what to do right after the mini boots
- `~/Documents/studio/docs/seeds/` — SKILL.md and agent prompt seeds (bootstrap deploys these)
- `~/Documents/studio/scripts/bootstrap-day14-os.sh` — one-shot empire scaffold
- `~/Documents/studio/scripts/sanity-check-day14-os.sh` — post-bootstrap verification
- `~/Documents/studio/docs/council-log/` — every LLM Council decision logged
  (entry `0001-first-customer-acquisition.md` already exists)

The **empire pattern** future-state: `~/Documents/businesses/` will hold
one folder per business (day14, splash-jacks-pools, casamore, buildbridge,
research-agent) plus `_shared/` (agents, skills, templates, sql, council-log).
The Mac mini becomes the always-on runtime; right now everything still
runs on Jack's laptop.

**Tonight's overnight tasks (May 16) are PREP for tomorrow's Mac mini
setup, not generic research.** See
`~/Documents/studio/docs/overnight/AGENDA-2026-05-16.md` for the four
tasks.

## What Day14 is

A productized AI-leveraged build studio. One operator (Jack) + Claude-based
agents in Cowork ship complete custom business platforms (marketing site +
customer portal + admin app + Stripe billing + AI chatbot + SMS + email)
for small businesses in 14 days for $2,500–$10,000 flat.

Three SKUs:
- **Site** — $2,500 + $99/mo, 7-day ship (marketing-only)
- **Portal** — $5,000 + $199/mo, 14-day ship (Site + customer login + billing)
- **Platform** — $10,000 + $399/mo, 21-day ship (Portal + operator admin app)

Three live builds prove the thesis:
- **Splash Jacks Pools** (Platform, splashjackspools.com) — pool service in Naples
- **Casamoré** (Site, houseoflove.co) — silent disco events brand
- **Buildbridge** (Platform, preview) — contractor marketplace with Storm Mode

Three target verticals:
- **mobile-service** (pool/lawn/HVAC/cleaning/grooming/detailing)
- **membership** (salons/gyms/yoga/med spas/coaching)
- **food** (restaurants/cafés/food trucks/bakeries)

## Where things live

```
~/Documents/
  studio/                      ← Day14 marketing site (this is what we're building)
    src/
      app/                     ← Next.js App Router pages
        page.tsx               ← homepage
        layout.tsx             ← root layout
        globals.css            ← brand styles + utility classes
        about/                 ← /about page
        case-studies/          ← 3 case studies (splash-jacks-pools, casamore, buildbridge)
        verticals/[slug]/      ← dynamic vertical landing pages
        builds/                ← public build-log (scaffold pending)
      components/              ← SiteHeader, SiteFooter, motion/
      lib/
        site.ts                ← ALL marketing copy + SKU data + FAQ + verticals + case studies
        cn.ts                  ← tailwind class merge helper
        builds.ts              ← public build-log data (scaffold pending)
    docs/
      day14-agenda.md          ← the 6-month roadmap (source of truth for priorities)
      day14-sow-template.md    ← order form
      day14-intake-form.md     ← customer intake
      day14-build-runbook.md   ← internal SOP for customer builds
      blog-drafts/             ← long-form content drafts (pending)
      outreach/                ← DM + newsletter drafts (pending)
      overnight/               ← per-overnight-task status reports
        00-wakeup-status.md    ← (final task writes this)
        01-site-template-fill.md
        02-buildlog-infra.md
        03-content-drafts.md
      SCHEDULED_TASK_CONTEXT.md ← this file

  studio-templates/            ← fork-points for customer builds
    README.md
    studio-template-site/      ← Site tier scaffold (Casamoré pattern)
    studio-template-portal/    ← Portal tier scaffold (Splash Jacks fork pending)
    studio-template-platform/  ← Platform tier scaffold (deeper port pending)

  splash-jacks-pools/          ← READ-ONLY reference (Jack's customer #0)
                               ← Do NOT modify anything here
```

## Brand + voice

**Brand palette** (in `studio/tailwind.config.ts`):
- `paper` — warm off-white (#F8F6F1) — body background
- `ink` — near-black (#0B0B0A) — text + structural
- `ember` — vivid orange-red (#FF5C28) — single hot accent
- `shipped` — clean green (#10B981) — only for "live / done" indicators

Typography: Inter sans (body + display), JetBrains Mono (labels, timestamps).

**Voice:** Plain, confident, slightly cocky, builder-y. NEVER consultant-y.
- ✅ "Real platforms. Two weeks. Done."
- ✅ "Sign Tuesday. Live by the second Friday — or your deposit refunds."
- ❌ "We help small businesses unlock their potential..."
- ❌ "leverage", "synergy", "best-in-class", "world-class"

When writing JSX, escape all apostrophes/quotes in text content as
`&rsquo;` / `&ldquo;` / `&rdquo;` — Next.js's ESLint blocks raw `'` and `"`
in JSX text.

## What you can do

- ✅ Read/Write/Edit files under `~/Documents/studio/` and `~/Documents/studio-templates/`
- ✅ Run `ls`, `find`, `grep`, `cat` via bash
- ✅ Write status reports to `~/Documents/studio/docs/overnight/`
- ✅ Update `~/Documents/studio/docs/day14-agenda.md` to reflect progress

## What you CANNOT do

- ❌ Run `npm install` (sandbox blocks the npm registry — Jack runs builds on his Mac)
- ❌ Run `npm run build` / `npm run dev` (same reason)
- ❌ Deploy to Vercel
- ❌ Push to GitHub or create repos
- ❌ Modify `~/Documents/splash-jacks-pools/` (read-only reference)
- ❌ Wait for user input — Jack is asleep

## Quality bars

- **Build-safety:** all JSX text escapes apostrophes/quotes. No raw array index
  access (`arr[0]`). All `@/` imports match the tsconfig paths alias.
- **noUncheckedIndexedAccess** is on — guard array access with `.find()`,
  `.at(0)`, or destructuring.
- **Aesthetic continuity:** use existing patterns from `src/app/page.tsx`
  (`Stat`, `StatePill`, `card-pop`, `eyebrow`, `marker`, `tnum`). Don't
  invent new visual languages without good reason.
- **Mobile-first:** every new component must work at 375px wide.

## When you're done

1. Write a status report at `~/Documents/studio/docs/overnight/{NN-task-name}.md`
2. Update the agenda's phase status if applicable
3. Stop. Don't start the next task — each is independently scheduled.
