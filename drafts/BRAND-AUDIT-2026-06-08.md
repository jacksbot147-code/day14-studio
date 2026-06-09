# Brand Animator Audit — 2026-06-08

_Weekly run. Audited: **day14**, **alignmd**, **life-loophole** (active). **day14-realty** paused (noted, not scored). **hot-flash-co**, **kennum-lawn-care** parked (skipped per brief)._

_This is the **first** BRAND-AUDIT in `drafts/` — no prior `BRAND-AUDIT-*.md` to carry forward. This file establishes the baseline; future runs reference it._

## Summary

- **Most-improved:** No prior audit exists, so no week-over-week delta. Baseline only. day14 is the most mature surface — full `ProfessionalHero`, consistent `DecryptText` signature, plain-English headline that passes the 5-second comprehension test cold.
- **Most-overdue for attention:** **alignmd.** It is an active tenant with **no standalone marketing surface in this repo** — its only buyer-facing presence in `studio` is the `/case-studies/alignmd` page and the homepage bento tile, both of which lead with the jargon phrase "credential-aware staffing." (AlignMD's own brand site lives in a separate `alignmd` repo this agent can't see.)
- **Ship THIS week:** Remove the **live placeholder phone number** in the day14 hero. `professional-hero.tsx` renders `(000) 000-0000` with a `tel:+10000000000` link and a visible-in-source `TODO`. It's a buyer-facing trust failure (MISTAKES-AVOIDED #8) on the flagship — a ~5-minute fix with outsized payoff. **Flagged as a bug below; not fixed from this agent.**

### ⚠️ Bug called out (not fixed here)
- **day14 hero — fake phone number is live.** `src/components/landing/professional-hero.tsx` ~line 168–175: `Jack Boppington · solo operator · (000) 000-0000`, href `tel:+10000000000`, comment `{/* TODO: replace with real phone number */}`. A buyer who taps it dials a dead number. The same persona audit that added this strip noted "if you don't trust phone numbers, why would I trust you to build me one?" — shipping a placeholder one is worse than omitting it. Fix in a normal build task: wire the real number or remove the phone entirely and keep "solo operator · Jack Boppington."

### Data note
- `empire-state.json` is **fresh** (`generated_at 2026-06-09T02:11Z`), not stale. But two drifts are worth flagging: (1) it carries no `paused`/`parked` flags — I followed the brief's taxonomy for tenant status. (2) The homepage `CaseStudies` bento lists **splash-jacks-pools, casamore, buildbridge** as live tiles; none of these are in empire-state's six tenants (day14, hot-flash-co, kennum-lawn-care, day14-realty, alignmd, life-loophole). Either the bento is aspirational/demo copy or empire-state is missing tenants. Reconcile before a buyer cross-checks the two.

## Per-tenant

### day14 — flagship build-studio marketing (`src/app/page.tsx` + `professional-hero.tsx`)
Axis: **Apple clean** (with terminal personality demoted to chrome — StatusLine, PathCrumb, Cmd+K). Correctly executed per SKILL.md.

| Dimension | Score | Note |
|---|---|---|
| Clarity | 5 | "I build websites and apps in days, not months." Names buyers + `From $1,500`. Passes 5-sec test. |
| Signature | 5 | `DecryptText` on every section eyebrow + headline is the consistent, screenshot-able move. Ember accent owns it. |
| Comprehension hierarchy | 4 | One ember CTA ("Book a 15-min intro call") repeated cleanly; "See pricing" demoted. Footer OS-tenant offer is present but properly demoted (MISTAKES #10 risk contained, not eliminated). |
| Mobile-first polish | 4 | Cmd+K + StatusLine hidden `<md`; headline scales 2.875rem→104px. Solid. |
| Empty-state care | 2 | Loom empty state is buyer-grade ✅, but the **placeholder phone** is a live TODO shown to buyers ❌. |

**Single highest-impact move:** Remove/wire the placeholder phone in the hero (see bug above). **~5 min.**
**Secondary (lower priority):** `ScramblePrice` is imported in `page.tsx` but never used — pricing-tier prices are static text. Re-enable `ScramblePrice` on the **Custom** tier's "Talk to us" / price cell to reinforce the "live data" brand on hover. ~20 min.

### alignmd — active, no standalone marketing surface in `studio`
Axis (intended): **Clinical calm**, cool blue `#3B82F6`. Not realized in this repo — the only surfaces here are `/case-studies/alignmd` (day14-branded) and the homepage tile. The clinical-calm brand site lives in the separate `alignmd` repo, out of this agent's view.

| Dimension | Score | Note |
|---|---|---|
| Clarity | 3 | "Credential-aware staffing, end to end" is in-market jargon; clinical-staffing buyers parse it, adjacent buyers don't (MISTAKES #4). |
| Signature | 2 | No alignmd-specific signature on any studio surface; it borrows day14's chrome. |
| Comprehension hierarchy | 3 | Case-study page has a single clear `NextCta`. |
| Mobile-first polish | 3 | Inherits day14's responsive shell; not independently verified. |
| Empty-state care | 3 | N/A within studio. |

**Single highest-impact move:** Replace the "credential-aware" jargon on the homepage tile + case-study hero with a plain-English line a non-clinical buyer gets instantly — e.g. _"The staffing platform that checks every clinician's license for you."_ Keep "credential-aware" as a secondary phrase for in-market readers. **~30 min.** (Separately: the alignmd brand site itself is un-auditable from here — schedule a run with the `alignmd` repo mounted.)

### life-loophole — editorial-finance brand page (`src/app/brands/life-loophole/page.tsx`)
Axis: **Editorial magazine** (Georgia serif headlines, asymmetric hero, hairline rules). Correct axis. Interactive **Loophole Finder** gives it genuine identity.

| Dimension | Score | Note |
|---|---|---|
| Clarity | 5 | "Legal advantages hide in the tax code. Most people never find theirs." Plain, magnetic, instantly clear. |
| Signature | 3 | The interactive Finder is a real signature, but there's **no animated brand move** — only `StaggerCtas`. Editorial-finance wants a quiet decrypt/typeset moment. |
| Comprehension hierarchy | 4 | One primary "Ask the advisor," ghost "Browse the finder." Clean fold. |
| Mobile-first polish | 3 | `hero-grid` is 2-col; **verify it collapses to single column at 375px** (couldn't confirm the media query in this pass). |
| Empty-state care | 4 | Finder copy is buyer-facing and warm; educational-not-advice disclaimer present throughout. |

**Single highest-impact move:** Add a **scroll-driven `DecryptText`** on the section/article headlines (Finder, Reframe, How-it-works) for the editorial-finance "decoded" brand feel that the wordmark already promises ("Tax strategy, decoded"). **~45 min.**
**Carry-forward note (palette drift):** the page leads with **teal `#0f766e`** + gold secondary, but SKILL.md lists life-loophole's accent as **editorial gold `#ca8a04`**. Pick one source of truth and reconcile `theme`/SKILL so future sessions don't drift further.

### day14-realty — PAUSED
Not scored. empire-state shows heavy backend agent activity (county data, distress scans) but no buyer-facing marketing surface in `src/app/brands/`. No public surface — skip until reactivated.

### hot-flash-co — PARKED
Skipped per brief. (Note: empire-state shows a `PRINTIFY_API_KEY missing` fatal error recurring in its daily-engine — an ops issue, not a brand one. Out of scope for this agent.)

### kennum-lawn-care — PARKED
Skipped per brief. No marketing surface; all-zero pipeline. Skip until reactivated.

## This week's pick

**Kill the fake phone number in the day14 hero.**

The flagship marketing page shows every buyer a real-looking phone number, `(000) 000-0000`, that dials nothing. It's the single cheapest trust win available and it's on the highest-traffic surface in the empire.

1. Open `src/components/landing/professional-hero.tsx`, find the operator strip (~line 168).
2. Either paste the real number into both the visible text and the `tel:` href, **or** delete the phone entirely and keep `Jack Boppington · solo operator`. Remove the `TODO` comment either way.
3. Typecheck + eyeball the hero at 375px, then ship to main on the next normal build pass (not from this agent).

## Standing carry-forwards

No prior `BRAND-AUDIT-*.md` existed at this run, so nothing to suppress as already-dismissed. Opening the ledger:

- **CF-1 (day14):** placeholder phone in hero — _this week's pick._
- **CF-2 (day14):** `ScramblePrice` imported-but-unused; re-enable on Custom tier price.
- **CF-3 (alignmd):** "credential-aware" jargon on studio surfaces; needs plain-English alternate. Also: alignmd brand site is in a separate repo — schedule a run with it mounted.
- **CF-4 (life-loophole):** no animated signature move; add scroll-driven DecryptText on headlines.
- **CF-5 (life-loophole):** palette drift — page leads teal, SKILL says gold. Reconcile.
- **CF-6 (empire-wide):** homepage bento lists splash-jacks-pools / casamore / buildbridge as live, none in empire-state's six tenants. Reconcile marketing claims vs. state.

_Next run: if Jack has shipped any of CF-1…CF-6, mark them done; if he's visibly chosen to ignore one, demote it so we stop recommending it._
