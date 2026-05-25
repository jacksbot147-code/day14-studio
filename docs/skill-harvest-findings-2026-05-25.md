# Skill harvest — incremental pass (2026-05-25)

> Weekly cadence. Companion to `skill-harvest-findings.md` (first full pass,
> 2026-05-16) and `skill-harvest-findings-2026-05-17.md` (last weekly pass).
> Scopes only to evidence created/modified in the last 7 days. Build target
> unchanged: `~/Documents/businesses/_shared/skills/{skill}/SKILL.md`.
> Drafts only — no SKILL.md written.

## New evidence reviewed: 16 files

- Overnight runs: `kickoff-2026-05-{18..22}.md`, `eod-2026-05-{18,20,21}.md`,
  `polish-2026-05-{17,18,20,21,22,23}.md`, `empire-pod-launch-kit-2026-05-18.md`,
  `council-review-2026-05-24.md`, `MASTER_LOG.md`.
- 4 auto-generated draft skills under `seeds/skills/_drafts/`
  (auto-small-refund-issuer, cash-runway-monitor,
  rave-gear-reddit-post-draft-generator, stripe-transaction-categorizer).
- 2 new vertical packs: `studio/scripts/verticals/{lawn-care,real-estate}/`.
- 5 new/active business folders: `businesses/{alignmd,day14-realty,hot-flash-co,
  kennum-lawn-care,life-loophole}/`.
- Cross-referenced both prior findings docs — nothing below is a re-propose.

## New skill candidates (max 3, ranked)

### 1. `stale-flag-escalator`

**Pack:** ops · `agent-meta/`
**Purpose:** Any recurring overnight report (kickoff/eod/polish) tracks how
many consecutive runs each open issue has appeared; once it crosses a
threshold (3 runs) the issue stops being re-described and gets *escalated* —
pulled into a top-of-doc "ESCALATED — flagged N×" block, reframed from
description to a forced binary, and (for trivial code fixes) shipped with a
ready-to-paste diff.

**Evidence:**
- `polish-2026-05-23.md:12` — "The hero rotator still renders
  'We shipmarketing sites' ... Sixth nightly polish in a row flagging this
  (05-17, 05-18, 05-20, 05-21, 05-22, tonight). Still a one-line fix." Same
  bug, six identical advisory paragraphs, zero fix.
- `polish-2026-05-23.md:11,13` — Jobber $99/$169 price split flagged
  05-21→05-23; builds-count contradiction flagged 05-20→05-23. Both unchanged.
- `eod-2026-05-18.md:17` / `eod-2026-05-20.md:19` / `eod-2026-05-21.md:20` —
  Splash Jacks video "Second / Fifth / Sixth operator-bound day it has
  slipped"; `kickoff-2026-05-22.md:18` — "A seventh morning of drift is the
  one outcome to rule out."
- `council-review-2026-05-24.md:39-42` — "A deadline with no nudge is
  decoration." Names the exact mechanism.

**Proposed SKILL.md outline:**
- A per-report `open-issues.json` ledger keyed by issue fingerprint with
  `first_seen` + `consecutive_runs` counters.
- The escalation trigger (`consecutive_runs >= 3`) and the top-of-doc
  ESCALATED block format.
- The reframe rule: description → binary ask ("apply this patch" / "do it
  today or kill it in writing").
- Trivial-fix branch: when the issue is a known one-line code fix, emit the
  exact `file:line` diff inline.
- Cross-ref: generalizes `council-execution-enforcement` (last week's open
  question) — the Council-deadline case becomes one instance. Build the
  general skill and let it cover Council.

**Build time:** ~45 min.

### 2. `tenant-state-reconciler`

**Pack:** ops · `agent-meta/`
**Purpose:** Cross-check each tenant's *declared* state (ops JSON `phase`,
empire dashboard) against *on-disk* evidence — migrations present, README
phase claims, git presence, pipeline-store row counts — and flag every drift.

**Evidence:**
- `eod-2026-05-21.md:11` — "the empire dashboard is stale:
  `studio/public/data/ops/alignmd.json` still reports 'phase 0' ... while the
  code is at phase 6"; same line — "None of it is in git —
  `~/Documents/alignmd/` has no repo and no commits."
- `eod-2026-05-20.md:10` — "day14-realty tenant spun up — agents run and a
  scout-report generates, but `ops/properties.json` is still `[]`."
- `eod-2026-05-20.md:13` — "kennum-lawn-care GM agent ran — `ops/gm-report.md`
  + pipeline stores written, all still empty."

**Proposed SKILL.md outline:**
- The reconciliation table: declared `phase` vs migration count vs README
  claim vs git status, one row per tenant.
- The "agent ran but store is empty" check (process succeeded, output
  row-count 0) — distinct from a process being down.
- The git-presence check (`~/Documents/{tenant}/` has a `.git` and >=1 commit).
- Output: a drift list with severity; feeds the eod report.
- Distinct from `autonomous-health-check` (process up/down) — this is
  *data/state* drift, not liveness.

**Build time:** ~40 min.

### 3. `vertical-pack-scaffolder`

**Pack:** build · `verticals/`
**Purpose:** Scaffold a new service-category agent pack with the now-
established shape so the next vertical (HVAC, cleaning, detailing) lands
consistent with lawn-care and real-estate.

**Evidence:**
- `studio/scripts/verticals/lawn-care/` and `.../real-estate/` — both built
  this week with an identical skeleton: per-role agent `.mjs` files +
  `brain.mjs` + `install-*.sh` + `vertical-pack.json` + a phased `ROADMAP.md`.
- `lawn-care/ROADMAP.md:1-20` and `real-estate/ROADMAP.md:1-18` — both
  ROADMAPs follow the same "Phase 1 spine / Phase 2 intelligence / Phase 3
  surfaces+money" structure.

**Proposed SKILL.md outline:**
- The canonical file set (`brain.mjs`, per-role agents, `install-<slug>.sh`,
  `vertical-pack.json`, `ROADMAP.md`).
- The phased-ROADMAP template (spine → intelligence → surfaces+money).
- The `vertical-pack.json` schema (cross-check against the two existing ones).
- Coordinator-agent naming convention (`<vertical>-scout` / `<vertical>-gm`).
- Note: 2 instances so far — borderline on the ">=2 reuse" bar, but the shape
  is documented and obviously templatable; build when vertical #3 is queued.

**Build time:** ~50 min.

## Existing skills that need updates (from new evidence)

- **nightly-polish skill** — must consume `stale-flag-escalator`; six nights of
  identical advisory text is the skill failing its own purpose
  (`polish-2026-05-23.md:12`).
- **`council-decision-followup-tracker`** (seeds) — confirmed *not wired*:
  Council 0001 drifted past both its Friday deadline and its written fallback
  (`council-review-2026-05-24.md:18,28-33`). Last week flagged "shipped but
  not wired"; this week proves it.
- **`vendor-pricing-fact-check`** (proposed, skill-harvest-findings.md lower-
  priority) — strongly reinforced: the compare page's own footnote says a
  pricing fact-check "is scheduled" and it never ran; the $99/$169 split is
  the result (`polish-2026-05-23.md:11,14`). Promote to build-now.
- **`emergent-skill-graduator`** (installed) — should gate the 4 thin auto-
  generated `_drafts/` skills (each is one implementation-plan paragraph,
  `status: draft, needs review`); without a quality bar these pile up.

## Open question for Jack (max 1)

**Should escalation skills be allowed to cross from advisory to *applying*
trivial reversible fixes?** The rotator-space bug is a one-line edit in
`src/lib/site.ts` an agent could land in seconds, but the scheduled-task
contract is "drafts only," so polish has re-flagged it six nights running.
Either (a) grant `stale-flag-escalator` write power for a whitelisted class of
trivial, reversible copy/CSS fixes, or (b) keep it advisory and accept that
one-line fixes wait for an operator-bound morning. Picking (a) closes the
loop; picking (b) keeps the drift but preserves the read-only guarantee.

---

*Confidence: 0.85. Time spent: ~40 min. Drafts only — no SKILL.md written.
Re-run next Sunday 22:00 ET per scheduled cadence.*
