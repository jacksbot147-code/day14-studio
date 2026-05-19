# Skill harvest — findings

> Generated 2026-05-16 (Saturday). Mined from:
> - All 8 canonical Day14 docs in `~/Documents/studio/docs/`
> - 6 existing seed skills + 3 agent prompts (`~/Documents/studio/docs/seeds/`)
> - The customer dossier template + bootstrap script
> - 11 overnight task reports (`docs/overnight/`)
> - All 5 blog drafts + 4 DM templates + 2 newsletter drafts
> - Council log entry 0001
> - The Splash Jacks Pools repo (`~/Documents/splash-jacks-pools/`) — 40
>   files in `src/lib/`, 9 SKILL.md files in `skills/`, 4 email templates
> - The three studio templates (`~/Documents/studio-templates/`) — read
>   the Site template's `scripts/swap.mjs`, the Portal Phase A skeleton
>   report, and the Platform v0.1.0 scaffold report
> - 4 recent Cowork session transcripts (DAY 14 parent, Splash Jacks 12-
>   task spawn, Day14 day-5 EOD, Casamoré daily backup)
>
> Casamoré and Buildbridge repos are not on this laptop — only Splash
> Jacks is locally checked out. Patterns specific to those tenants are
> sourced from the canonical docs and overnight reports that reference
> them, not the live code.
>
> Build target for new skills (per `day14-os-skills-and-empire.md`):
> `~/Documents/businesses/_shared/skills/{skill}/SKILL.md`.

---

## SECURITY

No secrets or API keys were copied into this doc. One active leak to
note (already flagged in canonical docs, repeating here so it's not
lost across handoffs):

- **Three real `.env` files** containing live Splash Jacks credentials
  (`DATABASE_URL`, `OPENAI_API_KEY`, etc.) are sitting at the root of
  both `studio-templates/studio-template-portal/` and
  `studio-template-platform/`. Source:
  `docs/overnight/00-end-of-day-status.md:25` and
  `docs/overnight/04-portal-skeleton.md:57-67`. `.gitignore` covers
  them but rsync ignored `.gitignore` on the way in. **Delete before
  any commit.** If a future harvester finds these gone, good; if
  still attached, that's the highest-priority cleanup.

Recommended skill candidate `leaked-secret-cleanup` (Top 10 below) is
the durable fix.

---

## Top 10 skill candidates (ranked by leverage)

Leverage = (frequency Jack hits the situation) × (impact of getting it
right) × (how badly a generic LLM would handle it without the skill).

### 1. `scheduled-task-prompt-author`

**Pack:** ops (new sub-pack: `scheduled-tasks/`)
**Purpose:** Authors a new self-contained scheduled-task prompt that
will run in a fresh Cowork session with no operator present.

**Evidence:**
- `docs/SCHEDULED_TASK_CONTEXT.md:1-150` — every overnight task starts
  by reading this file; the contract is well-defined but only encoded
  as prose
- `docs/overnight/AGENDA-2026-05-16.md:81-92` — explicit operating
  contract per task (read context, log to MASTER_LOG, log blockers to
  QUESTIONS_FOR_MORNING, drafts-only, no commits)
- `docs/overnight/MASTER_LOG.md:1-11` — the tracked output format that
  every overnight run appends to
- Every `docs/overnight/0{1..7}-*.md` follows the same shape (headline,
  what landed, what didn't, decisions worth surfacing, recommended
  actions, files touched). 11+ runs of this pattern; it's a template
  that's been refined empirically and is currently invisible to a fresh
  agent.
- Cowork transcript "Day14 day 5 end of day report" — Jack's only
  feedback in the session was about ordering files for sort-stability
  (`00-end-of-day-status.md` prefix to match `00-wakeup-status.md`).
  Pattern matters.

**Proposed SKILL.md outline:**
- The five-section status-report shape (headline, what shipped, what
  didn't, decisions worth surfacing, recommended actions, files
  touched) with worked-example links
- The mandatory operating contract (read SCHEDULED_TASK_CONTEXT first,
  no operator questions, drafts not deploys, log master + questions)
- File-numbering convention (`00-end-of-day-status.md` /
  `00-wakeup-status.md` sort first; `0N-{kebab}.md` for per-task)
- Confidence-rating discipline (the 0.85 / 0.88 / 0.90 footers seen in
  every overnight run)
- Failure mode: agent that asks Jack questions when Jack isn't there
  (cite Casamoré daily backup transcript — task aborted because it
  hardcoded a session path; the better behavior is "produce a report
  of what you found")

**Build time:** ~60 min (mostly distilling pattern from the 7 existing
overnight reports).

---

### 2. `leaked-secret-cleanup`

**Pack:** ops (new sub-pack: `security/`)
**Purpose:** Standard procedure when an agent (or rsync, or
copy-paste) drops real `.env*` / credentials into a template or shared
repo. Identify → verify not yet committed → rm → document → block
recurrence.

**Evidence:**
- `docs/overnight/04-portal-skeleton.md:57-67` — Phase A explicitly
  flagged "These are not template content and must be removed before
  any commit." Phase B was supposed to delete them first; Phase B
  didn't fire.
- `docs/overnight/00-end-of-day-status.md:25,39` — "Three real `.env*`
  files are sitting at the root of both `studio-template-portal/` and
  `studio-template-platform/`. These contain real Splash Jacks secrets
  (DATABASE_URL, OPENAI_API_KEY, etc.). `.gitignore` covers them, but
  rsync ignores `.gitignore` — they only landed because of that.
  Delete before any commit. This is the single highest-priority
  cleanup."
- Two consecutive overnight passes had to flag the same secrets — that
  meets the "bit Jack more than once" bar for a hard guardrail.

**Proposed SKILL.md outline:**
- The trigger conditions (rsync between repos; clone-and-rename; "we
  copied this from prod"; any `.env*` file appearing in
  `studio-templates/`)
- The 4-step procedure: `git log --all -- .env` first to confirm not
  committed; `rm`; rotate the leaked credentials if commit history
  exists; add explicit `find -name '.env*'` to the post-fork sanity
  check
- The pre-commit hook recommendation (one-shot: drop a
  `pre-commit` in `studio-templates/*/.git/hooks/` that fails on any
  `.env*` in the working tree)
- The rsync-specific note: `rsync --exclude='.env*'` should be the
  default invocation in any fork script
- Failure mode: assuming `.gitignore` will save you — it doesn't, on
  any tool that doesn't read it (rsync, cp -R, zip, tar)

**Build time:** ~30 min.

---

### 3. `customer-build-day-1-bootstrap`

**Pack:** build
**Purpose:** Orchestrates Phase 0 + Phase 1 of the build runbook end-
to-end: dossier creation, Cowork session naming, SKU verification,
template fork, brand-swap, infrastructure provisioning, env vars,
first deploy, first email to customer. Returns: preview URL, dossier
path, daily-log seeded, customer notified.

**Evidence:**
- `docs/day14-build-runbook.md:11-99` — Phase 0 and Phase 1 are 90
  minutes of dense procedure that currently lives only as a prose
  runbook. Build Agent prompt
  (`docs/seeds/agents/build-agent.md:52-67`) names this sequence but
  doesn't encode the timing, the parallel infra provisioning, or the
  exact email template.
- `docs/seeds/templates/customer-dossier/README.md:20-32` — dossier
  lifecycle starts at deposit-clearance; the existing template only
  spec's WHAT the dossier contains, not HOW the agent assembles it on
  day 1.
- Library has `template-forker` (Pack 3, per
  `day14-os-skills-and-empire.md:200`) — that's a sub-step. Day-1
  bootstrap is the orchestrator above it.

**Proposed SKILL.md outline:**
- The trigger: Stripe deposit-paid webhook fires + intake form arrives
- The exact 5-substep sequence from runbook §1.1–1.6, with target
  times (15/45/60/15/15/5 min) and parallel-running notes (1.3 infra
  ops run while 1.2 brand-swap is in flight)
- The day-1 email body (verbatim from runbook:88-99, day14-voice
  compliant)
- Required hand-offs to other skills: `intake-parser` for the form,
  `brand-extractor` for the brand.json, `template-forker` for the
  fork, `vercel-deployer` for the deploy, `eod-update-writer` for the
  email
- Exit criteria: `customers.preview_url` written, dossier folder
  staged with 02-build-log.md first entry, customer email queued for
  Jack's approval

**Build time:** ~90 min.

---

### 4. `launch-day-cutover`

**Pack:** build
**Purpose:** Day-14 production cutover: DNS verification, Stripe live-
mode flip, $0.01 test transaction + refund, domain attach in Vercel,
SSL refresh, launch email, schedule the training call. Encodes the
"never auto-flip live mode" guardrail.

**Evidence:**
- `docs/day14-build-runbook.md:172-198` — Phase 4 ("Launch day") is
  one of the highest-stakes sequences in the whole Day14 product and
  is currently encoded only as a checklist.
- `docs/day14-os-skills-and-empire.md:278-279` — boundary list says
  "Flip a customer's Stripe from test mode to live mode" is one of
  the 10 things agents NEVER do without Jack approval. This skill is
  what the agent uses AFTER Jack approves.
- `docs/seeds/agents/build-agent.md:79-86` — Day 14 cutover sub-steps
  named ("Final pre-launch checklist… draft the cutover approval
  card… Jack approves → swap the Vercel project's production domain")
  — but the specific pre-flight commands (`dig {domain}`, `dig
  www.{domain}`, the $0.01-then-refund move) aren't in the agent
  prompt.

**Proposed SKILL.md outline:**
- The pre-flight commands (DNS dig with expected outcomes; the
  Stripe-live $0.01 test transaction protocol)
- The order of operations (DNS verify FIRST — bad DNS means the SSL
  cert request fails; flipping Stripe before the domain is attached
  means real money on a preview URL)
- The launch email + training-call invite (day14-voice, signed Jack)
- Hard-stop conditions: any pre-flight failure → write a "for-the-
  record" approval card, propose deposit-back per SOW, do NOT
  proceed
- The post-launch 72-hour watch (`customer-success`-style monitoring
  + automatic SMS-on-anything-broken)

**Build time:** ~75 min.

---

### 5. `customer-visit-note-writer`

**Pack:** customer (or new: `tenant-runtime/`)
**Purpose:** For shipped Platform-tier customers serving recurring-
visit verticals (pool/lawn/HVAC/cleaning/grooming), writes the 3-4
sentence customer-facing visit note that ends up in the visit-
complete email and the portal's visit-history. Single most-read piece
of writing the SHIPPED PRODUCT produces.

**Evidence:**
- `~/Documents/splash-jacks-pools/skills/customer-visit-note/SKILL.md`
  (entire file, 94 lines) — already exists for Splash Jacks
  specifically. Four worked examples (routine, corrective, heads-up,
  post-storm) all in day14-voice register.
- `~/Documents/splash-jacks-pools/src/lib/emails/visit-complete.ts` —
  the integration point; the visit-complete email pulls this note.
- Day14 OS skill library has `eod-update-writer` (operator → customer
  during build) and `copy-writer` (marketing surfaces). Neither
  covers the post-launch, per-visit, in-product writing that's the
  daily product of every Platform customer.
- Will fire ~weekly per Platform customer. At 5 Platform customers,
  that's 250+ invocations/year.

**Proposed SKILL.md outline:**
- The 3-4 sentence contract (lead with what was found and what was
  done; numbers first; SWFL local condition if relevant; photos
  reference; flag heads-up issues plainly; no marketing fluff)
- The vertical-adapter pattern (pool → chemistry readings; lawn →
  growth + treatment; HVAC → system status + filter)
- The "what to never say" list lifted from Splash Jacks's version
  ("Your pool is sparkling," "We took great care," etc.) — applies
  across all verticals
- Four worked examples (one per vertical, mirroring the Splash Jacks
  examples)
- Always invokes `day14-voice` (or the customer's voice profile, if
  set) before producing

**Build time:** ~60 min (mostly generalizing the Splash Jacks version).

---

### 6. `warm-dm-personalizer`

**Pack:** sales
**Purpose:** Personalize the "I-saw-your-truck" warm DM for SWFL
service-business owners Jack has physically observed. Different from
`cold-dm-drafter` (already in library) — warm DMs reference a real
sighting and convert at 4:1 over cold per Jack's own data.

**Evidence:**
- `docs/overnight/03-customer-comms-pack.md:524-573` — three warm
  templates with 346–347 char counts, all under Instagram's DM limit
- `docs/council-log/0001-first-customer-acquisition.md:81-89` — the
  Executor advisor's exact recommendation, and the Chairman's call:
  "Send 5 DMs from the Executor's list — specific trucks/vans you've
  personally seen in Cape Coral / Fort Myers / Bonita. Personalized
  opener referencing where you saw them."
- `docs/outreach/dm-templates.md:42-46` — Jack's own conversion data:
  "Personalize the first sentence. 'Saw your truck on 75 yesterday'
  beats 'Saw your business on Maps' 4:1 on reply rate."
- Library has `cold-dm-drafter` (Pack 8) — but warm and cold have
  different conversion mechanics and different content; this is a
  different skill, not a parameter on the existing one.

**Proposed SKILL.md outline:**
- The three warm-DM templates (I-saw-your-truck / how-do-you-handle-
  X-today / mutual-mentioned-you) with rewrite rules
- The personalization spec (must name road, truck description, day-
  seen for credibility — "Pine Island Rd Tuesday" beats "Saw your
  business")
- The 346-char Instagram cap (hard-trim, never let DM truncate)
- The two-follow-up cadence (Day 5 with screenshot, Day 14 with case
  study, then stop and re-target in 90 days)
- Calibration check: would Jack send THIS exact message to THIS
  exact person? If no, rewrite the first sentence.

**Build time:** ~45 min.

---

### 7. `review-response`

**Pack:** customer
**Purpose:** Drafts a reply to a public review (Google, Yelp, Facebook,
Nextdoor, BBB) for any shipped Day14 customer. Max 4 sentences,
names reviewer, addresses something specific they said, real next
step on 1–3 star, never corporate apology theater. Reads for the
future-customer audience, not just the reviewer.

**Evidence:**
- `~/Documents/splash-jacks-pools/skills/review-response/SKILL.md`
  (entire file, 117 lines) — already exists for Splash Jacks. Four
  worked examples (5/4/2/1 star), each with internal-note recovery
  steps. Could be lifted to Day14 _shared/ with minimal generalization.
- Every shipped customer will eventually have public reviews — the
  single highest-trust-leverage public surface. Lighthouse moments
  for SWFL service-business prospects deciding to call.
- Library doesn't have this; closest is `complaint-triager` (Pack 7)
  but that's for inbound emails, not public reviews.

**Proposed SKILL.md outline:**
- The 4-sentence cap + the "next-customer-reads-this" framing
- The 5/4/3/2/1 star branch — what each tier requires
- The banned-phrase list ("We appreciate your feedback," "Your
  satisfaction is our priority," "We strive to," "rest assured")
- The internal-note pattern for 1–3 star (named follow-up, real
  remediation, never argue facts publicly)
- Four worked examples, vertical-portable (lift from Splash Jacks
  customer-visit-note, then generalize)
- Always invokes `day14-voice` first

**Build time:** ~45 min (mostly lifting from Splash Jacks).

---

### 8. `session-path-hardcode-detector`

**Pack:** ops (new sub-pack: `security/` or `tooling-correctness/`)
**Purpose:** When writing or auditing a SKILL.md / scheduled-task
prompt / agent prompt, detect and reject hardcoded session-specific
filesystem paths (`/sessions/{adjective}-{adjective}-{name}/mnt/…`)
that work in the authoring session but silently break in every other
session.

**Evidence:**
- `docs/day14-agenda.md:140-142` — Phase 2.5 explicitly named the
  bug: "the SKILL.md hardcodes a session-specific path
  (`/sessions/sharp-serene-einstein/mnt/site 2/`) which silently
  breaks scheduled cron runs."
- Cowork transcript `local_de4a8686-621c-421c-945e-4caf3cfb791f`
  ("Casamore daily backup") shows the bug firing in production:
  "Backup could not run: this scheduled task is executing in session
  `tender-practical-einstein`, but the task targets
  `/sessions/sharp-serene-einstein/mnt/site 2/` — that path is on a
  different session and returns 'Permission denied' from here."
- Already bit at least one scheduled task. Will bit more — every
  new SKILL.md a Cowork agent writes is at risk of capturing the
  authoring-session path.

**Proposed SKILL.md outline:**
- The pattern: `/sessions/{kebab}-{kebab}-{kebab}/mnt/…` is
  session-instance scoped and not durable
- The corrected pattern: use `~/Documents/…` (host path) or the
  documented per-skill path indirection (e.g. read from
  `WORK_DIR=$1` argument, or `WORK_DIR=${WORK_DIR:-~/Documents/...}`)
- The audit grep: `rg -n '/sessions/[a-z-]+/mnt' ~/Documents/`
  surfaces every offender; run it as a sanity check
- Failure mode: a SKILL.md generated in Cowork session X that
  hardcodes `/sessions/X/...` works for the author's smoke test
  and breaks the first time another session loads it
- Should run automatically before any SKILL.md is committed to
  `_shared/skills/`

**Build time:** ~30 min.

---

### 9. `postmortem-writer`

**Pack:** customer (or new: `learning/`)
**Purpose:** After each shipped build, writes the single-page
postmortem (what was in scope vs shipped, hours invested, what
worked, what didn't, what to template-ize next, what to refuse next).
Drives template improvements — the compounding moat.

**Evidence:**
- `docs/day14-agenda.md:213-221` — Phase 4.4 names the format and
  explicitly says "Drives template improvements." Currently encoded
  only as a 5-line prose checklist.
- `docs/day14-build-runbook.md:199` — Phase 5.1 ("Daily smoke test
  on the live URL for the first week — automated via uptime monitor")
  + Phase 4 of agenda — but no actual postmortem template exists in
  `docs/seeds/templates/` (only the customer dossier).
- `docs/day14-os-skills-and-empire.md:388-398` — the §8 "compounding
  moat" thesis depends on postmortems being written and read; without
  this skill, they won't be written consistently.
- Will fire 1× per shipped customer. At 5 customers in 6 weeks per
  the Phase 1–6 plan, that's 5–8 invocations early and 20+ by month 6.

**Proposed SKILL.md outline:**
- The 6-section template (scope-vs-shipped / hours / what worked /
  what didn't / what to template-ize / what to refuse next time)
- The trigger conditions (Day 14 launch confirmed, OR 30 days post-
  launch, OR refunded — write the postmortem in all three cases)
- The "what to template-ize next time" feedback loop — output of this
  field becomes a backlog of `studio-templates/` issues; the skill
  should write those issues into the relevant template repo's
  CHANGELOG.md
- The single-page constraint (forces compression; multi-page
  postmortems don't get re-read)
- Storage: `~/Documents/businesses/day14/customers/{slug}/postmortem.md`
  per the dossier template

**Build time:** ~45 min.

---

### 10. `storm-week-comms`

**Pack:** customer (or new: `swfl-ops/`)
**Purpose:** When a named storm is in the SWFL cone, fires the
storm-week customer comms playbook: pre-storm advisory (T-72h),
day-of pause notice (T-12h), post-storm visit-priority routing,
EOD update batch with storm context. SWFL-specific; non-negotiable
for mobile-service tenants.

**Evidence:**
- `docs/seeds/skills/swfl-context/SKILL.md:53-65` — hurricane season
  is named (June 1 – November 30, peak Aug-Oct), but operational
  comms cadence isn't specified.
- `~/Documents/splash-jacks-pools/skills/review-response/SKILL.md:88`
  — concrete miss: "We had three named-storm visits collide that
  week and the rescheduling went out late; that's on us, and we've
  moved storm-week comms to same-day text confirmations so it
  shouldn't repeat." Storm-week comms is a recurring known failure
  surface.
- `docs/blog-drafts/05-the-storm-mode-moat.md` + agenda Phase 2.3
  Storm Mode bundle — Buildbridge explicitly bundles a Storm Mode
  feature; the customer-facing comms layer is the operator-side
  equivalent.
- Will fire 3–5× per hurricane season (June–November). At 5 customers
  by storm season, that's potentially 15–25 invocations/year.

**Proposed SKILL.md outline:**
- The trigger (NOAA NHC cone includes any SWFL county for an active
  storm — same data source Buildbridge's noaa-poller uses)
- The 4-message cadence (T-72h advisory / T-12h pause / T+24h
  resume-plan / T+72h normalize)
- The customer-facing templates per cadence, in day14-voice
- Vertical adapters (pool: chemistry-rebuild expectation; lawn:
  debris-only first visit; HVAC: power-restoration check)
- The internal operations side: which active builds pause, which
  scheduled tasks defer, what to escalate to Jack vs auto-handle
- Cross-reference: feeds the `morning-briefing-builder` skill during
  storm windows ("3 customers in cone; T-48h, no action needed today")

**Build time:** ~75 min.

---

## Lower-priority candidates (worth capturing, not Top 10)

### `mac-mini-runbook-audit`
**Pack:** ops · **Purpose:** Periodic pre-flight on
`day14-mac-mini-runbook.md` — verify URLs resolve, prices current,
store hours, brew/node paths. **Evidence:**
`docs/overnight/01-runbook-audit.md` (entire 295-line report) is the
exemplar; the agenda implies this should re-run pre-cutover (Jun 10)
and on macOS major-version bumps. **Build:** ~30 min.

### `overnight-agenda-builder`
**Pack:** ops · **Purpose:** Designs a night of overnight tasks for
the laptop/mini. Bottleneck-focused over generic research, staggered
firing windows, each task self-contained. **Evidence:**
`docs/overnight/AGENDA-2026-05-16.md:58-77` — the explicit "Why this
shape, not the generic 8-hour brief" section is the template. Pairs
with `scheduled-task-prompt-author` (Top 10 #1). **Build:** ~45 min.

### `council-log-quarterly-review`
**Pack:** special (extends `council-decision`) · **Purpose:** Re-reads
the full council-log, scores each Chairman call as aged-well /
neutral / aged-poorly, writes a one-page meta-report. **Evidence:**
`docs/seeds/skills/council-decision/SKILL.md:75` — "Quarterly:
re-read the log and note which Chairman calls aged well."
`docs/council-log/0001-first-customer-acquisition.md:166-172` says
the same. The cadence is named but the format isn't. **Build:** ~30 min.

### `lead-first-touch-personalizer`
**Pack:** customer · **Purpose:** Per-source opener for inbound leads
(algae/chemistry/gallons/chat-handoff/referral/unknown). Reads the
Lead row payload + maps to opener template per source. **Evidence:**
`~/Documents/splash-jacks-pools/skills/lead-first-touch/SKILL.md`
(167 lines, three worked examples). Vertical-portable (any Day14
customer with multi-tool lead capture has the same pattern). Library
doesn't have this. **Build:** ~60 min (mostly generalizing).

### `mailerlite-worker-integration`
**Pack:** integrations · **Purpose:** Cloudflare Worker → MailerLite
bridge for Site tier. Required custom fields, message-field handling,
fail-graceful on missing config. **Evidence:**
`~/Documents/studio-templates/studio-template-site/workers/subscribe.js`
(168 lines) + `docs/overnight/07-content-polish.md:128-145`. Library
has Resend skill but not MailerLite, and Site tier uses MailerLite.
**Build:** ~30 min.

### `cloudflare-worker-brand-toml-emit`
**Pack:** integrations (or build) · **Purpose:** Wraps the
`writeWranglerGenerated(brand)` pattern from
`scripts/swap.mjs:228-264` — emits `wrangler.generated.toml` with
SYSTEM_PROMPT sourced from `brand.chatbot_system_prompt`. Removes
the manual `wrangler secret put` step. **Evidence:**
`docs/overnight/07-content-polish.md:147-170`. Already implemented in
Site template; this skill captures WHEN to use it for Portal/Platform
forks. **Build:** ~30 min.

### `gh-repo-fork-from-template`
**Pack:** build · **Purpose:** Standard `gh repo create … --template
…` invocation with the customer-slug naming convention, private,
`gh repo clone`, push initial commit. **Evidence:**
`docs/day14-build-runbook.md:27-36`,
`docs/seeds/agents/build-agent.md:60-63`. Currently scattered across
the runbook and agent prompt; could be one durable skill (or fold
into `template-forker`). **Build:** ~20 min.

### `customer-silence-clock-pause`
**Pack:** customer · **Purpose:** When a customer goes silent during
a build: 48h soft nudge, 96h gentle nudge, 7d clock pause, 14d full
pause + restart-on-reply with SOW citation. **Evidence:**
`docs/day14-build-runbook.md:218`, `docs/day14-os-vision.md:179`
("Customer doesn't reply for days"). Currently described as risk
mitigation; should be a callable skill so the agent doesn't have to
re-invent the cadence each time. **Build:** ~30 min.

### `vendor-pricing-fact-check`
**Pack:** content (or ops) · **Purpose:** Re-verifies competitor
pricing in published blog posts. **Evidence:**
`docs/overnight/07-content-polish.md:23-66` — Jack's content-polish
agent did this work for Jobber, Housecall Pro, GoHighLevel,
Squarespace; three of four prices had moved since the draft was
written. The note at line 64 explicitly says "Pricing has a half-
life" and recommends running this before any republish >90 days
out. **Build:** ~30 min.

### `social-post-from-shipped-feature`
**Pack:** content · **Purpose:** Day14 (not customer) version of
Splash Jacks's `social-post-from-visit` — turns a shipped feature
+ before/after screenshots + customer quote into IG/FB/X content
for Day14's own marketing. **Evidence:**
`~/Documents/splash-jacks-pools/skills/social-post-from-visit/SKILL.md`
(template); `docs/outreach/newsletter-drafts.md:46-60` argues "the
build-log doubles as content." Library has `case-study-writer` and
`newsletter-issue-builder` but no per-feature social-post skill.
**Build:** ~45 min.

### `storm-mode-feature-flag-pattern`
**Pack:** build · **Purpose:** Pattern for shipping a vertical-
specific feature behind `STORM_MODE_ENABLED` so the same template
serves multiple verticals. Generalizes the Storm Mode wiring.
**Evidence:** `docs/overnight/06-platform-scaffold.md:54-62`
(`STORM_MODE_ENABLED`, 12 explicit refs across 4 files);
`~/Documents/studio-templates/studio-template-platform/src/features/storm-mode/`.
**Build:** ~30 min.

### `rsync-ignores-gitignore`
**Pack:** ops · **Purpose:** Specific guardrail: when rsync-ing one
repo into another (the Portal Phase A pattern), `.gitignore` is NOT
honored; use explicit `--exclude` patterns. **Evidence:**
`docs/overnight/00-end-of-day-status.md:25`,
`docs/overnight/04-portal-skeleton.md:64-67`. Could fold into
`leaked-secret-cleanup` (Top 10 #2) since the symptoms overlap.
**Build:** ~15 min.

### `approval-card-format`
**Pack:** customer · **Purpose:** Encodes the exact approval-card
shape (change in plain English, proposed git diff, preview URL after
the change). **Evidence:**
`docs/seeds/agents/build-agent.md:71,128`,
`docs/seeds/agents/pm-agent.md:74`. Could fold into the existing
`approval-card-builder` (Pack 7) — recommend folding, not new skill.
**Build:** ~15 min.

### `stripe-link-metadata-spec`
**Pack:** integrations · **Purpose:** The exact PaymentIntent
metadata keys/values for Day14 Stripe Payment Links (sku, sla_days,
guarantee_days, vertical, deposit_usd, balance_usd, monthly_usd,
customer_email, customer_company, sow_url, event). **Evidence:**
`docs/overnight/03-customer-comms-pack.md:236-339` (3 SKU blocks).
Recommend folding into existing `stripe-payment-link-creator` (Pack
2) rather than new skill. **Build:** ~15 min (fold-in).

### `splash-jacks-voice-vs-day14-voice` (foundation question, not a
new skill)
Splash Jacks's `splash-jacks-voice/SKILL.md` overlaps heavily with
the Day14 `day14-voice` skill but has pool-specific rules (FC ppm,
EXIF photos, "lanai," "screened cage"). Open question for Jack
below — not built as a skill, just flagged.

---

## Patterns that are NOT skills (rejected, with reasoning)

- **"Always escape JSX quotes as `&rsquo;`/`&ldquo;`/`&rdquo;`."** —
  Already in `SCHEDULED_TASK_CONTEXT.md:113-115` as a quality bar.
  Better as a lint rule + the existing context doc than a SKILL.md.

- **"Sentence-case everything; never Title Case."** — Already in
  `day14-voice/SKILL.md:37-39` and reinforced in
  `copy-writer/SKILL.md`. Folding twice; don't triple.

- **"Use `git config --global user.name`/`user.email`."** — Mac mini
  runbook one-time setup. One-off, not reusable judgment.

- **"Don't run `pmset sleep` (the verb form)."** — Tahoe-specific
  runbook footnote (`01-runbook-audit.md:75-82`). Too narrow.

- **"Reserve the Mac mini at Coconut Point before driving."** —
  One-time decision specific to one purchase. Won't repeat.

- **"`xcode-select --install` before Homebrew."** — Runbook edit, not
  reusable judgment. Already captured in `01-runbook-audit.md`.

- **"Tweet the build-log."** — Sales channel-specific marketing tip,
  not a repeatable judgment. Belongs in a play, not a skill.

- **"Capacitor mobile wrapper init steps."** — Per-customer setup
  documented at `mobile/README.md`; one-time per customer, not a
  reusable skill.

- **"Sundays at 7pm ET = retro pass."** — Cadence, not judgment.
  Belongs in scheduled tasks, not a skill.

- **"Drop SITE price to $1,500 + $99/mo for the next 5 case-study
  customers if funnel stalls."** — One-shot pricing experiment from
  the agenda's risk table. The `pricing-decision-helper` skill
  already covers when-to-discount; adding this as a separate skill
  would conflict.

- **"`council: should I take Acme at half price`" as an SMS trigger.**
  — Phone-first invocation interface. UX, not judgment.

- **"The 5-min Splash Jacks Loom walkthrough."** — One-time content
  recording from Council 0001. Skill is `social-post-from-shipped-
  feature` (above), not a per-video skill.

---

## Skills currently in the library that need updating

### `cold-dm-drafter` (Pack 8) — needs splitting
Add a sibling `warm-dm-personalizer` (Top 10 #6). Different
conversion mechanics (4:1 per `outreach/dm-templates.md:42-46`),
different content rules, different cadence. Cold and warm should not
share one skill.

### `stripe-payment-link-creator` (Pack 2) — needs widening
Fold in the metadata spec from `03-customer-comms-pack.md:236-339`.
Currently the skill is named in the library but the per-SKU metadata
contract (11 keys: sku, sla_days, guarantee_days, vertical,
deposit_usd, balance_usd, monthly_usd, customer_email,
customer_company, sow_url, event) lives only in the overnight
comms pack. Move into the skill so it's invokable.

### `eod-update-writer` — needs widening (small)
Already exists at `docs/seeds/skills/eod-update-writer/SKILL.md`.
Should absorb the bad-day variant (subject `Day {{n}} — slower than
I wanted`) from `03-customer-comms-pack.md:163-179` as a worked
example. Currently the skill only shows good-day examples; the
"name the slip without spinning it" judgment is the harder case and
deserves an exemplar.

### `template-forker` (Pack 3) — needs narrowing
Currently described as "Execute the build runbook end-to-end" — too
broad. Should be the actual fork + brand-swap step (Phase 1.1 + 1.2
of the build runbook). The end-to-end orchestration belongs in
`customer-build-day-1-bootstrap` (Top 10 #3).

### `approval-card-builder` (Pack 7) — needs spec detail
Add the explicit format (change-in-plain-English, proposed-diff,
preview-URL-after-change) from `build-agent.md:71,128` and
`pm-agent.md:74`. Currently the skill is named but the format
contract isn't anywhere callable.

### `swfl-context` — possibly needs splitting (open question)
Today's `swfl-context/SKILL.md` is excellent for marketing-side
copywriting (cities, climate, customer behavior). Splash Jacks has a
SEPARATE `swfl-pool-context/SKILL.md` with chemistry + water-hardness
+ equipment-pattern detail. As more verticals come online the
ops-side context (pool / lawn / HVAC / etc.) will need its own home —
either widen `swfl-context` with vertical sub-sections, or split into
`swfl-context-marketing` + `swfl-{vertical}-ops` skills. See open
question #1.

---

## Open questions for Jack (max 5)

1. **Tenant-specific vs `_shared/` for daily-use skills.** Splash Jacks
   has 6 daily-use skills in `~/Documents/splash-jacks-pools/skills/`
   (review-response, customer-visit-note, lead-first-touch, social-
   post-from-visit, green-pool-recovery, chemistry-dose-and-explain).
   Three are vertical-portable (review-response, customer-visit-note,
   lead-first-touch) and were proposed above for `_shared/skills/`.
   Two are pool-only (green-pool-recovery, chemistry-dose-and-explain).
   One is borderline (social-post-from-visit). Plan: lift the three
   portable ones to `_shared/skills/` with vertical adapters; keep the
   pool-only two in `splash-jacks-pools/skills/`. Confirm before I
   write any of them.

2. **Promote runbook procedures to skills, or keep as prose?** The
   build runbook's Phase 0+1 (day-1 bootstrap) and Phase 4 (launch-day
   cutover) are currently dense prose only. Promoting them to skills
   (Top 10 #3 and #4) makes them invokable by the Build Agent and the
   PM Agent. Risk: skill + prose drift. Recommend writing the skills
   as the source of truth and shrinking the runbook to "see SKILL
   library." Yes / no?

3. **`scheduled-task-prompt-author` as a SKILL.md vs a README +
   template files?** The pattern is template-y enough that a `scripts/
   new-overnight-task.sh` + a README might serve better than a
   SKILL.md. But Cowork agents don't naturally consult `scripts/`
   READMEs — they consult skills. Recommend SKILL.md (Top 10 #1).
   Confirm?

4. **Is `splash-jacks-voice` different enough from `day14-voice` to
   warrant its own skill at the `_shared/` level?** They overlap ~70%
   (operator-not-agency, plain English, no buzzwords, numbers over
   adjectives, no exclamation points). Splash Jacks adds: chemistry-
   readings register, SWFL-pool-specific language (lanai, screened
   cage, FC ppm). Three options: (a) keep separate as tenant-specific,
   (b) widen `day14-voice` with vertical-adapter sub-sections, (c)
   split into `day14-voice-marketing` + `day14-voice-{vertical}-ops`.

5. **Pre-commit hook for leaked-secret-cleanup — yes or no?** Adding a
   `.git/hooks/pre-commit` to each `studio-templates/*` repo that
   greps for `.env*` in the working tree and fails would prevent
   recurrence. Standard practice. The skill (#2 above) is the
   procedure for cleanup; the hook is the prevention. Worth shipping
   alongside?

---

*Harvest complete. 10 Top + 14 lower = 24 candidates, plus 5 library
updates and 5 open questions. Time spent: ~75 min, inside budget.
Re-run quarterly per the council-log-quarterly-review cadence — next
target pass after customers #1 and #2 ship.*
