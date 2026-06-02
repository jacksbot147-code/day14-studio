# Skill harvest — incremental pass (2026-06-01)

> Weekly cadence. Companion to `skill-harvest-findings.md` (full pass 2026-05-16),
> `-2026-05-17.md`, `-2026-05-25.md`. Scopes to evidence created/modified in the
> last 7 days. Drafts only — no SKILL.md written. Build target unchanged:
> `~/Documents/businesses/_shared/skills/{skill}/SKILL.md`.

## New evidence reviewed: 17 files

- New overnight runs: `kickoff-2026-05-{27,29}.md`, `eod-2026-05-29.md`,
  `kickoff-2026-06-01.md`, `eod-2026-06-01.md`, `polish-2026-05-{25,28,30}.md`,
  `polish-2026-06-01.md`, `MASTER_LOG.md`.
- New top-level artifacts: `POLISH-AUDIT-2026-05-27.md`,
  `MISSION-CONTROL-PLAN-2026-05-27.md`, `NIGHT-RESULTS-2026-05-27.md`,
  `EVENING-EXTENSION-2026-05-28.md`, `CLAUDE-CODE-POLISH-PROMPT.md`.
- New founder-ops: `briefing-2026-05-29.md` (introduces "Phantom completions"
  section + "Pending Jack actions" widget).
- Cross-referenced all three prior findings docs — nothing below re-proposes.
- No new SKILL.md files landed in `_shared/skills/` since 2026-05-17
  (`find -mtime -10 -name SKILL.md` returns zero). Library still at 172
  installed + 4 drafts.

## New skill candidates (max 3, ranked)

### 1. `phantom-completion-verifier`

**Pack:** ops · `agent-meta/`
**Purpose:** Every scheduled task declares a contract of what it must leave
behind — a WORK-LOG heading, a file at a specific path, an inbox item of a
given `kind`, a section appended to a known doc. After the task fires, a
verifier reads the contract and the filesystem/inbox and emits a phantom
flag for any task whose return said "success" but whose evidence is absent.
Phantoms surface at the top of the next briefing.

**Evidence:**
- `EVENING-EXTENSION-2026-05-28.md:52-58` — E5 invents the contract:
  "`scripts/lib/verify-evidence.mjs` exporting `verifyTaskCompletion({ taskId,
  mustExist: [paths], mustAppendTo: [{file, sectionTitle}], mustHaveInboxItem:
  [{tenant, kind}] })`" and wires `morning-briefing.mjs` to emit `⚠` for any
  fired task lacking evidence.
- `briefing-2026-05-29.md:19-38` — "Phantom completions (7)" — verifier ran
  against `scripts/scheduled-task-expectations.json`, caught
  `workday-t04-stop-slop-brand-copy`, `…-t05`, `…-t06`, `…-t09` (multiple
  inbox kinds missing), `…-e2`, `…-e3`, `…-e7`. Receipts include exact misses
  (`no heading containing "T4" in WORK-LOG.md`, `inbox day14 has 0 items of
  kind="landing-headline-pick", expected ≥ 1`).
- `eod-2026-06-01.md:11-25` — same shape recurring: tasks "ran" but produced
  only auto-sync commits, no human artifacts. Pattern wants formal naming.

**Proposed SKILL.md outline:**
- The `scheduled-task-expectations.json` schema: `{taskId, mustExist[],
  mustAppendTo[{file,sectionTitle}], mustHaveInboxItem[{tenant,kind,minCount}]}`
- The verifier API surface and how it gets called from `morning-briefing.mjs`.
- The phantom-flag display contract (one bulleted ⚠ entry per task at the top
  of the next briefing, with the exact miss receipts).
- The "expectations live next to the task prompt" pattern so phantom checks
  ride along with each scheduled task at authoring time, not as a separate
  list to keep in sync.
- Cross-ref: distinct from `pre-flight-verification-pass` (upstream — checks
  inputs before action) and `autonomous-health-check` (process up/down).
  This is the "did the action *actually produce its declared output*" pass.

**Build time:** ~45 min.

### 2. `commands-for-jack-recorder`

**Pack:** ops · `agent-meta/`
**Purpose:** When a scheduled task hits the sandbox boundary (launchctl,
sudo, paid signup, browser-only step, paste a secret) it must record the
action to a single durable file — `~/Documents/COMMANDS-FOR-JACK.md` — under
date headers, with `{label, cmd, why, urgency}`. The morning briefing reads
this file and surfaces a "Pending Jack actions" widget at the top. Any agent
that would otherwise silently no-op uses this skill instead.

**Evidence:**
- `EVENING-EXTENSION-2026-05-28.md:38-46` — E4 names the pattern explicitly:
  "The scheduled-task sandbox can't reach `launchctl`, `sudo`, or anything
  outside the studio worktree. Today this meant T1's launchctl unload silently
  became a 'dear-diary' entry. Fix the pattern." Specifies
  `scripts/lib/jack-actions.mjs` + `recordJackAction({label, cmd, why,
  urgency})` + briefing widget pulling from the file.
- `briefing-2026-05-29.md:12-13` — widget already in production: "Pending Jack
  actions: **3** (1 high-urgency) — see `~/Documents/COMMANDS-FOR-JACK.md`".
- `eod-2026-06-01.md:33-45` — 13-day Anthropic-key-paste drought is the
  canonical failure mode this skill exists to surface: same item re-flagged
  every report because there's no other channel for it.

**Proposed SKILL.md outline:**
- The `COMMANDS-FOR-JACK.md` file format (date headers, action blocks with
  label/cmd/why/urgency, atomic append semantics).
- The `recordJackAction()` API and where every agent that hits a sandbox wall
  must call it instead of `console.error`-ing.
- The briefing widget contract: top-of-doc, count + highest-urgency one-liner.
- The "drain" pattern: how Jack marks actions done (strike-through? move to a
  done section? auto-detect from telegram-poller restart events?).
- Cross-ref: distinct from `escalation-pattern-detector` (catches drift after
  the fact) — this is the *prevention* surface that keeps actions from being
  buried in chat history in the first place.

**Build time:** ~40 min.

### 3. `polish-audit-orchestrator`

**Pack:** build · `customer-facing/`
**Purpose:** When the operator runs a full visual/voice/CRO sweep across
every customer-facing surface — public site + N brand sites + admin — this
skill provides the canonical structure: per-tier walk → orphan-page
detection → voice violations (verbatim cites) → top-3 moves per tier →
prioritized punch list ranked by user-impact-per-hour with effort estimates
→ deferred list with reasons. Stops the operator from re-inventing the
methodology each pass.

**Evidence:**
- `POLISH-AUDIT-2026-05-27.md` — 184 lines, 5 tiers (`day14.us` / Life Loophole
  / Kennum (dropped this pass) / Hot Flash Co / `/admin`). Every tier follows
  the same shape: "What's already great" → page-by-page findings → voice
  violations → top 3 moves. Final "Prioritized punch list — top 12" with
  effort + "Why it earns its slot" columns. Final "Deferred" section.
- `CLAUDE-CODE-POLISH-PROMPT.md:23-43` — the *input* contract: read 5 docs,
  walk 5 tiers, name installed plugins (`stop-slop`, `cc-nano-banana`,
  `ui-ux-pro-max`, `marketing-skills`), hard rules (mobile-first, reduced-
  motion, 60fps, no push/deploy).
- `polish-2026-06-01.md:10` — the *triggering condition*: "Same domain, two
  pitches" (homepage pivoted to Day14 OS while /about, /compare still sell
  the SKU). This is exactly the "design-system orphan / voice break" the
  audit framework was built to catch — and the recurrence proves the
  framework deserves to be a skill, not a one-off doc.

**Proposed SKILL.md outline:**
- The tier rubric (public site / per-brand / admin / parked-but-tracked).
- The four lenses applied per page: design-system membership (`globals.css`
  + `container-page` + brand tokens or "orphan"), voice violations (verbatim
  quote + constitution rule broken), CRO gaps (primary CTA, trust signals,
  lead-magnet pattern), motion/a11y gaps (reduced-motion respect, focus rings).
- The punch-list rubric: rank by user-impact-per-hour, columns `Tier | Item |
  Effort | Why it earns its slot`, total estimate at the bottom, explicit
  Deferred section so future passes don't re-evaluate the same drops.
- Plugin call-outs: name `stop-slop` / `cc-nano-banana` / `ui-ux-pro-max` /
  `marketing-skills` as the rubric source so the audit never invents
  unattributed taste.
- Cross-ref: distinct from `nightly-polish` (single-page, recurring) — this
  is the *campaign* version: full empire sweep, written once per ~month, the
  punch list becomes a backlog feeding daily ship-cycles.

**Build time:** ~50 min.

## Existing skills that need updates (from new evidence)

- **`voice-drift-detector`** — extend from tone/slop to **product-positioning
  coherence**. The new failure mode is two pages on the same domain telling
  two different product stories: homepage = "Day14 OS waitlist" /
  `/about` + `/compare` + case study = "fixed-price 14-day platform builds."
  Same domain, two pitches (`polish-2026-06-01.md:10`). A drift check across
  hero H1s + meta descriptions + primary CTA targets would catch this in one
  pass.
- **`nightly-polish`** — must now consume both `phantom-completion-verifier`
  (just proposed) *and* `stale-flag-escalator` (proposed 2026-05-25, still not
  built). Twelve-night streak on Jobber price split, eleven on "We
  shipmarketing sites," twelfth on the self-referential fact-check footnote
  (`polish-2026-06-01.md:13-14`) — the skill is failing its own purpose.
- **`stale-flag-escalator`** (proposed 2026-05-25, status: not built) —
  evidence promoted from strong to overwhelming. Twelve consecutive nights of
  identical copy bugs (`polish-2026-06-01.md:13-14`); 13-day Anthropic-key
  drought (`eod-2026-06-01.md:33-39`). Re-promote to build-now.
- **`emergent-skill-graduator`** (installed) — the 4 `_drafts/` skills flagged
  last week (`auto-small-refund-issuer`, `cash-runway-monitor`,
  `rave-gear-reddit-post-draft-generator`, `stripe-transaction-categorizer`)
  are now in the daily briefing as routine sign-offs
  (`briefing-2026-05-29.md:198-205`) — still no movement on graduation. The
  skill exists; the workflow that consumes it does not.

## Open question for Jack (max 1)

**The plan-vs-output gap is now structural (`eod-2026-06-01.md:55-62`:
"Week 1 + Week 2 = 0-for-12. Week 3 is 0-for-3..."). Should a
`plan-rebaseline-trigger` skill fire automatically — pushing a Council
Outcome block to `0001-…md` once a configurable miss-streak (e.g. 12 of 15
days) is crossed — or stay advisory, with the EOD just continuing to surface
the gap and waiting for an operator-bound morning? Option A closes a loop the
last three weekly findings docs have all flagged in different forms; Option B
preserves the scheduled-task "drafts only" guarantee. The same question lives
under `stale-flag-escalator` from last week — answering it once unblocks both.

---

*Confidence: 0.85. Time spent: ~40 min. Drafts only — no SKILL.md written.
Re-run next Sunday 22:00 ET per scheduled cadence.*
