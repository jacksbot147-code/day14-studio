# AlignMD — Apple-Grade Redesign Strategy
# 2026-06-03

A parallel 9-phase plan modeled on Day14's overnight redesign pattern, adapted to AlignMD's clinical/healthcare context. This doc lives in `studio/drafts/` as Jack's reference; the actual implementation work happens in the AlignMD repo (`~/Documents/alignmd`). The goal is the same kind of stepped, low-risk push: tokens → hero → product surface → workflows → polish, with every phase landing on its own branch and never blocking the next.

The aesthetic target is "calm clinical" — what a credentialing system *should* feel like if Stripe Atlas and Epic had a kid raised by a graphic designer. Cool palette over warm paper, generous whitespace, serif accents on signal moments, sans-serif everywhere else. Credential-aware UX is the differentiator: the product knows what license a clinician is uploading and adapts the interface to it instead of presenting a generic form.

## Phase 1 — Design tokens · ~3h
Establish a clinical color system in `tailwind.config.ts` and a tokens layer in `globals.css`. Cool blue ladder (50 → 950) anchored on a steady mid-blue (#2E6BE6 or similar) that reads as calm but professional — not the tired Bay Bridge blue every health startup defaults to. Paper-warm neutral background (#FAF8F3, the same one Day14 uses), ink near-black for body, two accent semantics (success-green for completed credentials, attention-amber for gaps — never red unless something is actually denied). Optional premium serif (Newsreader or Source Serif) reserved for H1/H2 and dossier section titles; Inter for everything else. Spacing scale, radii, and an elevation ramp that stays subtle — no marketing-site drop shadows on clinical surfaces.

## Phase 2 — Landing hero rebuild · ~4h
The current AlignMD landing is clinician-facing first, facility-facing second. Lead with the clinician promise — "Upload your packet. We do the rest." — over a screenshot of the credential parser at work. Sub-paragraph names the surface area (license parsing, dossier auto-build, gap surfacing, one-tap submit to facilities) and earns trust with one named partner or design-partner logo. Replace the existing hero gradient with the paper background + cool-blue typographic emphasis. A second below-fold band addresses facilities ("Hire credentialed in days, not weeks") without making the page schizophrenic.

## Phase 3 — Portal redesign · ~8h
This is the actual product surface — the clinician's `(clinician)` route group and the facility's `(facility)` route group. Both currently lean on the default Tailwind scaffold. Apply the new tokens, tighten typographic hierarchy, and rebuild the navigation chrome into a single calm sidebar with three sections (My Dossier · Submissions · Settings for clinicians; Pipeline · Candidates · Settings for facilities). Cards get serif H3s, sans-serif metadata, and a credential-status pill system (Verified · Pending · Action Needed · Expired). Empty states get real copy, not "No items." This is the longest phase because it's the most surface area.

## Phase 4 — Credential checklist UX · ~5h
The current checklist is a flat list; the redesigned one is a *progress spine*. Each credential type (state license, DEA, board cert, NPI, malpractice, employer-verified work history) becomes a row with three states (missing, in-review, verified) and a contextual right-rail that shows what the system needs from the clinician next. Expirations surface as their own attention strip at the top — "Two credentials expire in the next 60 days" — not buried in row metadata. Add a single "What's blocking me from submission?" affordance that lists the exact open items in plain English.

## Phase 5 — Intake parser polish · ~4h
The license-packet parser is AlignMD's actual moat. Make it visible. Today it works in the background; the redesigned intake shows a live "we extracted: license #, state, expiration, board" panel as the upload completes, with confidence indicators and an inline "fix this field" affordance. When confidence is low, the system *says so* instead of silently asking the user to verify everything. Borrow the Day14 evidence-verifier pattern: never claim parsed when the parse failed. A small "what we read from your packet" report becomes shareable as a one-page PDF.

## Phase 6 — Dossier presentation · ~5h
The dossier is the artifact a facility receives. Today it's functional; the redesigned version is presentable — typeset like a clinical CV, paper background, serif section heads, an Apple-grade table of credentials with verification provenance in a quiet right column. Add a public-share mode (tokenized URL, view-only, watermarked) for clinicians who want to send their dossier outside the platform. PDF export uses the same template so the digital and printed versions are visually identical.

## Phase 7 — Admin operator surface · ~6h
The internal `/admin` for AlignMD's operator (Jack, today) mirrors the Day14 admin pattern: an inbox of items that need a human tap (credential exceptions, document re-review, manual NPI lookups), a deploy strip, a scheduled-task panel showing what verification jobs ran overnight, and a per-tenant filter for the day Jack onboards a second facility cohort. Keep the visual language consistent with Day14's admin so muscle memory transfers between products.

## Phase 8 — Pricing + onboarding · ~4h
Pricing page redesign with two tiers (Clinician · free for the first credential pack, paid for ongoing submissions; Facility · seat-based) and an Apple-grade comparison table. Onboarding gets a three-step flow (claim profile → upload first packet → see your dossier) with a real progress indicator and an "I'll finish later" exit that preserves state. Honest copy throughout — no "AI-powered" filler, just what the system does.

## Phase 9 — Marketing site polish · ~3h
Final pass on the marketing surface — `/about`, `/security`, `/for-facilities`, `/for-clinicians`. Tighten typography, consolidate footer, add a `/changelog` page seeded with the last 30 days of shipped credentials so prospects see velocity. Run Lighthouse against every public route and chase any score under 95 on performance or accessibility — clinical buyers are heavier than average on accessibility scrutiny.

**Total: ~42 hours**, splittable across two overnight sprints (Phases 1–4 first sprint, Phases 5–9 second). Same constraint as Day14: never delete, no new deps, every phase ships on its own branch and merges only after a green build.
