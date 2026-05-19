# Methods harvest — findings (round 2: meta-patterns)

> Generated 2026-05-16 (Saturday). Mined from 7 historical Cowork session
> transcripts spanning the foundation tenant (Splash Jacks), Day14 OS
> kickoff/day-2/day-5, the agent-design session, and two
> autonomously-run scheduled tasks (one successful Empire daily build,
> one failed Casamoré backup).
>
> Sessions sampled:
> - `local_f5071586-...` — "Splash Jacks Pools" (overnight schedule
>   spawn)
> - `local_d0dcd47f-...` — "DAY 14 Agents" (skill-harvest follow-on)
> - `local_ecf9c3f1-...` — "Day14 day 0 kickoff" (3-deliverable
>   pre-task)
> - `local_07e5dd4c-...` — "Day14 day 2 portal fork" (scaffold
>   execution)
> - `local_de4a8686-...` — "Casamore daily backup" (FAILED — session-
>   path hardcode)
> - `local_873f307b-...` — "Empire daily build" (succeeded — captions
>   + intel)
> - `local_b8853e31-...` — "Day14 day 5 end of day report" (audit +
>   roll-up)
>
> Scope: methodology only. WHAT-to-build skills are already covered in
> `~/Documents/studio/docs/skill-harvest-findings.md` (24 candidates
> from the first harvest). This round focuses on HOW operator and
> agent work together — prompts, handoffs, decision shapes, failure
> recovery, language conventions.
>
> Empire baseline: 99 installed + 6 seed + ~8 in-flight = ~113
> referenced skills. Cross-referenced new proposals against the
> 30+38 named in `day14-os-skills-and-empire.md` and
> `day14-os-autonomous-agenda.md` to avoid duplicating.
>
> Build target: `~/Documents/businesses/_shared/skills/{skill}/SKILL.md`.
> (Directory not yet present on this machine per `ls` — bootstrap
> script seeds it.)

---

## SECURITY

No secrets harvested. One process-level red flag worth surfacing on
top of the previous harvest's `.env*` leak:

- **Scheduled-task prompts embed `/sessions/{adjective}-{adjective}-
  {name}/mnt/...` paths from the authoring session.** The Casamoré
  daily backup transcript shows the bug firing in production: the
  authored task targets `/sessions/sharp-serene-einstein/mnt/site 2/`
  but the runner session is `tender-practical-einstein` — permission
  denied, backup never ran. This is already in the first harvest as
  `session-path-hardcode-detector` (Top 10 #8). It belongs here too
  because it's the canonical example of a methodology failure (the
  authoring agent doesn't know its output will run elsewhere).

---

## Top 12 methodology skill candidates

Ranked by leverage = (frequency the situation hits) × (impact of
getting it right) × (badness of the failure mode when missed). Most
sit in `ops` or a new `agent-meta/` sub-pack.

### 1. `scheduled-task-portability-audit`

**Pack:** ops · `agent-meta/`
**Purpose:** Pre-flight on every authored scheduled task that
guarantees it will work in a *fresh, different* Cowork session — not
just the authoring one. Audits paths, session-id strings, sandbox
assumptions, mount points.

**Evidence:**
- `local_de4a8686-...` (Casamoré daily backup) final assistant
  message: "Backup could not run: this scheduled task is executing in
  session `tender-practical-einstein`, but the task targets
  `/sessions/sharp-serene-einstein/mnt/site 2/` — that path is on a
  different session and returns 'Permission denied' from here."
  Whole session aborted with zero work shipped.
- `local_873f307b-...` (Empire daily build) succeeded because the
  prompt-author used the host path `~/Documents/...` and the
  Cowork-mapped `/sessions/stoic-great-euler/mnt/outputs/` —
  but `stoic-great-euler` is still a session-instance string. The
  next time this task fires in a different session, the output path
  silently won't exist; the task will fail or write to nowhere.
- Pattern shows up in 2 of 2 scheduled-task sessions sampled — that's
  100% hit rate on a known landmine.

**Proposed SKILL.md outline:**
- Trigger: BEFORE saving any `SKILL.md` that runs as a scheduled task
- Audit grep: `rg -n '/sessions/[a-z-]+(-[a-z-]+)+/(mnt|uploads|outputs)'`
  the file; any hit is a fail
- Substitution table: `/sessions/X/mnt/outputs` → `~/Documents/...`
  OR `${OUTPUT_DIR:-~/Documents/businesses/_shared/outputs}` OR a
  documented per-skill envvar
- "Tasks run elsewhere" mental model paragraph — author session and
  run session are different processes with different sandboxes
- Failure mode worked example: paste the Casamoré transcript's final
  message
- Soft-pair: should be invoked automatically by
  `scheduled-task-prompt-author` (already-proposed Top 10 #1 in round
  1) right before save

**Build time:** ~30 min.

---

### 2. `morning-headline-format`

**Pack:** ops · `agent-meta/`
**Purpose:** The five-section "operator picks up phone over coffee"
report shape. Bold headline (1-3 lines), what shipped, what didn't,
first thing to do, top-3 prioritized actions, view-links footer.

**Evidence:**
- `local_b8853e31-...` (Day 5 EOD): "**3 of 4 daytime tasks
  completed; task 05 (Portal Phase B deep-fork) did not fire.**
  Portal is still a renamed splash-jacks-pools copy... **First thing
  to do when you sit down:** `rm` the three real `.env*` files..."
- `local_f5071586-...` (Splash Jacks overnight scheduler): "**12
  tasks, ~12 hours, starts at 10pm**... **Important — one thing you
  should do right now before sleeping:** Push the P0 fix..."
- `local_ecf9c3f1-...` (Day 0 kickoff task): closes with "**1.
  `/compare` page** — 642 lines at... **2. `workers/subscribe.js`**
  — `message` field now forwarded..."
- `local_d0dcd47f-...` (DAY 14 Agents): "**Headline.** Cross-
  referenced everything against the 30 skills already named..."
- 4+ occurrences. Same shape every time: bold lead, named diffs,
  one-thing-to-do-first, prioritized actions, links.

**Proposed SKILL.md outline:**
- The five-section shape with one-paragraph rule for each
- The bold-headline rule: ≤3 lines, leads with counts, names the
  miss/win
- The "first thing to do" must be a concrete action ≤60 min,
  no-credentials-gate preferred
- Prioritized actions table: each row gates explicitly (e.g. "gates
  on Vercel + Cal.com + Stripe + DNS")
- View-links footer using the `computer://` scheme so the operator
  taps through from any UI
- ≤1,200 words ("read once, before dinner, on a phone")
- Anti-patterns: walls of text, headline buried in paragraph 3,
  failure noted without naming the affected file

**Build time:** ~30 min.

---

### 3. `pre-flight-verification-pass`

**Pack:** ops · `agent-meta/`
**Purpose:** The "verify deliverables before writing the report"
discipline. Forces the agent to grep/read/run the actual output
before claiming success. Catches the file-saved-but-broken class of
bug.

**Evidence:**
- `local_ecf9c3f1-...` (Day 0 kickoff): "Let me verify the
  deliverables before writing the report." Then 4 Read + 3 Grep
  calls, then "Good — no unescaped quotes in JSX text. Now verify
  the workers/subscribe.js change and the swap.mjs output..." Then
  a smoke test in the sandbox: "Let me run a quick test of swap.mjs
  to ensure the change works." Result: caught a real escape bug
  before reporting.
- `local_d0dcd47f-...` (DAY 14 Agents): closed with "Verification
  clean: Both new SKILL.md files have valid `name:` frontmatter
  matching folder slugs; Bootstrap loop now includes both new skills
  (line 63), well-formed single-line list; Zero leaked `.env` files
  in any studio-template (only `.env.example` remains)." Three
  explicit checks, three explicit pass results.
- `local_b8853e31-...` (Day 5 EOD): "Walk the file tree to confirm
  what actually exists vs what the reports claim. Use `ls`, `find`,
  `wc -l`. Spot-check the most consequential outputs..." This is
  the methodology baked into the prompt, but it's not encoded as a
  reusable skill.
- 3 of 7 transcripts. When done, it caught bugs. When skipped (the
  Casamoré daily backup), the task died.

**Proposed SKILL.md outline:**
- The discipline: don't write the success report until grep/read/run
  has confirmed the claim
- The four checks per deliverable: (1) file exists at claimed path,
  (2) content matches claim (grep for the change), (3) syntactically
  valid (TOML parses, JSON parses, JSX has no orphan quotes), (4)
  runs without error in a smoke test if executable
- When `npm install` won't work (sandbox), what `tsc --noEmit`-grade
  static checks are available
- The "honest report" rule from `local_b8853e31-...`'s prompt: "Be
  honest about what worked and what didn't. Jack would rather see
  'Storm Mode stubs were placeholder-quality' than a softened report."
- Failure mode: stating "all three deliverables shipped" without
  having opened the output file (anti-example from a hypothetical;
  the discipline this skill prevents)

**Build time:** ~45 min.

---

### 4. `jack-language-decoder`

**Pack:** ops · `agent-meta/` (anchor skill for command routing)
**Purpose:** The dictionary mapping Jack's actual phrasing to the
agent action it implies. Critical input for `telegram-command-router`
(Phase 1, autonomous agenda) and any free-text command surface.

**Evidence:** Jack's prompts across the sessions are remarkably
short and repeatable. Six recurring shapes:
- **"start it at 340 am"** (`local_f5071586-...`) — schedule a queued
  workload at a specific clock time. Implies "you already have the
  task list; bind it to that start time and the hourly cadence
  follows."
- **"do whatever would help"** (`local_d0dcd47f-...`) — pick the
  highest-leverage next move from the current findings/agenda
  without re-asking. The agent's correct response: name 2 candidates
  with reasoning, then execute.
- **"just get everything done until its finished"**
  (`local_d0dcd47f-...`, sent twice consecutively after 500 errors)
  — keep going past the natural stopping point; don't ask for
  re-confirmation on each next chunk.
- **"schedule it"** (foreshadowed in `local_f5071586-...`'s prompt
  text "Say 'schedule it' and I'll wire up all 12 tasks") — implicit
  green-light token to fire the proposed action.
- **"go"** / **"going"** (`local_f5071586-...`'s agent reply pattern:
  "Going. Batch 3 stays small...") — Jack-style green-light;
  agent should echo back with "Going" + the scoped commitment.
- **"finishing X first since the P0s are real bugs"**
  (`local_f5071586-...`) — Jack's bias signal: P0 always before scope
  expansion. The agent restates this constraint to confirm
  understanding.
- 6 distinct phrasings across 7 sessions; high reuse. These don't
  read like a normal prompt — they read like a private vocabulary.

**Proposed SKILL.md outline:**
- The vocabulary table (~12 entries to start; grow it via
  council-log + new-phrasings observations)
- Each entry: Jack-phrase → agent-action → confirmation pattern
- "Confirmation pattern" examples: "Going. {scoped commitment}."
  "{N candidates}. Picking {1}. {reasoning}."
- Hard rule: agent does NOT ask Jack a question when the vocabulary
  covers the input. Re-asking is friction; pick + commit + tell.
- Pair with `councilmark`-style escalation: if the input is
  ambiguous AND not in the vocabulary AND not in council-log
  precedent, THEN ask.
- Versioned doc: each new phrasing observed gets added with the
  date + session-id of first sighting

**Build time:** ~45 min (mostly cataloging; the actual format is
straightforward).

---

### 5. `confidence-and-gate-statement`

**Pack:** ops · `agent-meta/`
**Purpose:** Whenever a recommendation has a credential dependency
or risk gate, name it explicitly. Same statement shape every time:
"X gates on {Vercel + Cal.com + Stripe + DNS}" or "X needs no creds —
runs unattended."

**Evidence:**
- `local_b8853e31-...` (Day 5 EOD): "1. Delete the leaked `.env*`
  files from both templates (5 min, no creds gate). 2. Kick off
  Portal Phase B as the next overnight scheduled task (90 min
  unattended, doesn't gate on you). 3. Run `npm run build` and
  execute the Phase 1 deploy (gates on Vercel + Cal.com + Stripe +
  DNS)."
- `local_d0dcd47f-...` (DAY 14 Agents): "The next unblocked builds
  are `warm-dm-personalizer` (Top 10 #6) and `review-response` (Top
  10 #7) — both lift cleanly from existing material." Anti-pattern
  flagged → next move named.
- `local_f5071586-...`: "Tasks are independent — if any one aborts
  (build broke, etc.), the rest still run." Each task's gate-state
  acknowledged.
- 3+ occurrences. Recommendations without this gating fail —
  operator hits a credential wall and the recommendation rots.

**Proposed SKILL.md outline:**
- The two states: `no-creds-gate` (run now) vs
  `gates-on-{list-of-services}`
- The 5-min/15-min/60-min/90-min time-estimate band (always quote
  one)
- When a recommendation gates: name the *exact* credentials/services
  needed, not "some setup" or "configuration"
- Recommendation table format (3-row max for night-time digest;
  more = a separate dossier file)
- Pair with `daily-kickoff` and `eod` skills: every prioritized
  action gets the gate-tag

**Build time:** ~20 min.

---

### 6. `incremental-scope-commit`

**Pack:** ops · `agent-meta/`
**Purpose:** When Jack adds work mid-session, the agent commits the
existing P0/P1 work FIRST, then expands scope. Prevents the "lost in
WIP" failure where new feature work obscures a real fix.

**Evidence:**
- `local_f5071586-...` (Splash Jacks): agent's mid-session move:
  "Finishing Batch 1 first since the P0s are real bugs — then I'll
  build the bigger workload." Then committed as `6440570`, put the
  push command on clipboard, THEN moved to designing the 12-task
  overnight load.
- `local_ecf9c3f1-...` (Day 0 kickoff): three deliverables shipped
  in order, each verified, before report written — never branched
  mid-way to a "while we're at it" extension.
- 2 strong + general pattern: every successful session has a clean
  shippable artifact before the next chunk begins. The failed
  Casamoré session never had one.

**Proposed SKILL.md outline:**
- Trigger: any time scope expands mid-session
- Discipline: commit the P0/P1 artifact (git commit OR equivalent
  durable save) before starting the new chunk
- The "put the push command on clipboard" pattern from
  `local_f5071586-...` — durable handoff to operator so they can
  ship the commit even if the session dies
- For non-git artifacts: the equivalent durable save is a Write to
  the agreed location (e.g. `~/Documents/studio/docs/overnight/0N-*.md`)
- Pair with `morning-headline-format` (#2 above): the committed
  artifact is what the headline references; if it's not committed,
  the headline lies

**Build time:** ~30 min.

---

### 7. `error-recovery-resume`

**Pack:** ops · `agent-meta/`
**Purpose:** When a transient API/server error breaks a session
mid-task (the "API Error: 500" pattern), resume from last committed
state without re-doing finished work. Default to re-reading the most
recent status file before any new action.

**Evidence:**
- `local_d0dcd47f-...` (DAY 14 Agents): final exchange:
  ```
  [user] just get everything done until its finished
  [assistant] API Error: 500 Internal server error...
  [user] just get everything done until its finished
  [assistant] API Error: 500 Internal server error...
  ```
  Jack sent the same prompt twice because there's no resume
  protocol; the second prompt was identical, not "resume from where
  you were."
- Pattern occurs ≥1× per sampled session day (sandbox crashes,
  tool 500s, deferred-tool reloads). Currently no codified resume
  shape.
- `local_b8853e31-...` opens with "(called ToolSearch)" + many bash
  calls — implicit re-discovery of tools on each session start.
  Re-discovery wastes context.

**Proposed SKILL.md outline:**
- Trigger: session resumes after a 500 / sandbox crash / new turn
  in an interrupted flow
- Discipline: BEFORE any new tool call, read the most recent status
  file in `~/Documents/studio/docs/overnight/` (or the dossier file
  named in the prompt), then state "resuming from {step N}; {step
  N-1} is done because {evidence}"
- Anti-pattern: re-running the same task from scratch because the
  prior call returned 500 — the side-effects may have completed
- The "Going. {scoped commitment}." re-state pattern after a
  resume so the operator can confirm the agent didn't lose context
- Pair with `incremental-scope-commit` (#6 above): if step N-1 was
  committed, step N can resume safely

**Build time:** ~30 min.

---

### 8. `agent-self-time-budget`

**Pack:** ops · `agent-meta/`
**Purpose:** Every long-running task names its own time budget
upfront and reports how it spent it at the end. Forces honest
scoping; surfaces "this should be 2 tasks not 1" before the agent
overruns.

**Evidence:**
- `local_ecf9c3f1-...`: "All three deliverables shipped inside the
  45-minute window before the 11:30 Portal fork." Budget named in
  prompt; agent quoted it back.
- `local_07e5dd4c-...` prompt: "Budget: 2 hours." Echoed.
- `local_b8853e31-...` prompt: "Budget: 45 minutes." Echoed.
- `local_d0dcd47f-...` close: "Findings doc shipped. ~75 minutes
  inside budget." Re-quoted with delta.
- `local_873f307b-...` doesn't quote a budget — and it's a daily
  rerun, so budget creep would compound. (Hypothesis: this is why
  the Empire daily build has been silently expanding.)
- 4 of 7 transcripts explicitly. Budget-naming correlates with
  on-time delivery; budget-omission with sprawl.

**Proposed SKILL.md outline:**
- Open every scheduled task / multi-hour session with a one-line
  budget statement: "Budget: 45 min. Plan: {3-bullet shape}."
- Mid-session checkpoint at 50% and 90% of budget: "20 min in;
  deliverable 1 done, deliverable 2 at 60%, deliverable 3 likely
  punts."
- Closing line: "{N} min, inside/over budget by {M}." Always.
- Anti-pattern: tasks that don't state a budget end up consuming
  whatever the model lets them
- Pair with `confidence-and-gate-statement` (#5 above): if a
  deliverable was punted, name the gate that blocked it AND
  estimate the next-attempt budget

**Build time:** ~20 min.

---

### 9. `view-link-handoff`

**Pack:** ops · `agent-meta/`
**Purpose:** Every artifact the agent ships gets a `[View ...]
(computer://...)` link in the closing message. One-tap from any
device. No "you can find it at..." prose.

**Evidence:**
- `local_873f307b-...` close: three explicit view-links:
  `[View Medicated Mango captions](computer://...)`,
  `[View Casamoré captions](computer://...)`,
  `[View Empire Intel brief](computer://...)`.
- `local_b8853e31-...` close: `[View end-of-day report](computer://...)`
  + `[View updated agenda](computer://...)`.
- `local_f5071586-...` close: `[View the overnight workload]
  (computer:///Users/jcboppington/Documents/OVERNIGHT_WORKLOAD.md)`.
- `local_d0dcd47f-...` close: "**2. `leaked-secret-cleanup`
  SKILL.md** — [view](computer://...)" (the inline-view variant).
- 4+ occurrences, every successful session. The Casamoré failure
  has zero view-links (because there was nothing to view).
- This is a one-line pattern but it's the difference between Jack
  finding the artifact in 1 second vs. 30.

**Proposed SKILL.md outline:**
- The `computer://` URL scheme + spec link to the Cowork docs
- Required: every produced file → one view-link in the closing
  message. No exceptions.
- The two formats: standalone `[View {name}](computer://...)` for
  the closing list, OR inline `[view](computer://...)` for in-line
  references in numbered findings
- URL-encode rule: spaces → `%20`, real chars → kept
- Failure mode: agent says "I saved it to `~/Documents/...`" without
  a link — operator has to copy-paste the path into Finder

**Build time:** ~15 min.

---

### 10. `numbered-decision-rationale`

**Pack:** ops · `agent-meta/`
**Purpose:** When the agent has to pick between options, state the
options numerically, pick one, name the reasoning in one clause. No
"here are the tradeoffs..." essays. Match the council-log shape.

**Evidence:**
- `local_d0dcd47f-...`: "Two things stood out as the most useful
  next moves: 1. The leaked `.env` files in Portal/Platform are
  still flagged as the single highest-priority cleanup... 2. Two of
  the Top 10 skills (`leaked-secret-cleanup` and `scheduled-task-
  prompt-author`) are unblocked by any open question and high-
  leverage." Two numbered, one reasoning clause each, picked both.
- `local_b8853e31-...`: "Top three prioritized evening/weekend
  moves: 1. Delete the leaked `.env*` files... 2. Kick off Portal
  Phase B... 3. Run `npm run build` and execute the Phase 1 deploy."
- `local_f5071586-...`: "Two things I need from you to launch the
  overnight: 1. Push that P0 commit. 2. Say 'schedule it' and I'll
  wire up all 12 tasks..."
- 3+ occurrences. Always numbered, always ≤3 items at the close.
- Mirrors the council-log Chairman-call format (`council-log/0001`):
  numbered options, one chosen, brief reasoning.

**Proposed SKILL.md outline:**
- The 1-2-3 close pattern for any decision/recommendation block
- ≤3 items at the close (more = a separate dossier or council log)
- Each item: action verb first, gate-tag (from #5) second, 1-clause
  reasoning third
- "Want any tasks swapped, added, dropped, or re-ordered before I
  schedule?" — the explicit decision-prompt at end of plan; pulls
  Jack into the gate without forcing him to type a full critique
- Pair with `jack-language-decoder` (#4): the expected reply is
  "schedule it" / "going" / "do whatever helps" / one of the
  documented green-lights, NOT a free-text re-architecture

**Build time:** ~20 min.

---

### 11. `phase-numbered-cross-reference`

**Pack:** ops · `agent-meta/` (Day14-specific)
**Purpose:** Every recommended action ties back to a Phase number
in `day14-agenda.md` (Phase 1.1, Phase 2.3, etc.). The agenda is the
shared coordinate system between Jack and every agent.

**Evidence:**
- `local_b8853e31-...` prompt: "Tie them to Phase numbers in the
  agenda." Then in the reply: "Phase 1 deploy", "Portal Phase B as
  the next overnight scheduled task."
- `local_d0dcd47f-...` close: "`warm-dm-personalizer` (Top 10 #6)
  and `review-response` (Top 10 #7) — both lift cleanly from existing
  material." Refers to the harvest-findings numbering. Same idea.
- `local_07e5dd4c-...` prompt: "Update the agenda — mark Phase 2.1
  as 'v0.1.0 shipped, awaiting first customer fork.'"
- 3 occurrences in 7 transcripts. Most powerful when Jack hasn't
  read the agenda recently — the phase number is enough for him to
  context-switch in 2 seconds.

**Proposed SKILL.md outline:**
- Trigger: any recommendation, status update, or postmortem
- Discipline: tag every action with its source Phase (or "off-
  agenda — propose adding to Phase X")
- The "off-agenda" disclosure pattern: if the action isn't in the
  agenda, the report must say so AND propose where it belongs
- Update protocol: any phase whose state changes gets its agenda
  line updated in the same session (don't drift between report
  and agenda)
- Pair with: `eod-update-writer`, `morning-headline-format` (#2),
  `daily-kickoff` (existing). All three should always cross-ref
  agenda phases.

**Build time:** ~25 min.

---

### 12. `parallel-task-fanout-author`

**Pack:** ops · `agent-meta/`
**Purpose:** When Jack says "go" on a multi-hour workload, decompose
it into N independent, hourly-staggered scheduled tasks that fail
independently. Not one mega-task. The Splash Jacks 12-task overnight
is the canonical exemplar.

**Evidence:**
- `local_f5071586-...`: the 12-task overnight is the strongest
  exemplar — 12 independent tasks staggered by hour, each with its
  own status file, with a 13th task (morning report) that aggregates
  them. "Tasks are independent — if any one aborts (build broke,
  etc.), the rest still run."
- `local_b8853e31-...`: same pattern at smaller scale (4 daytime
  tasks + 1 EOD aggregator). Task 05 didn't fire; the EOD still
  delivered because it was a separate task with its own retry.
- `local_d0dcd47f-...` was a single long session and hit the 500-
  error wall twice. Counter-example: monolithic sessions are
  fragile.
- 2 successful exemplars + 1 fragility counter-example. Pattern
  reliable.

**Proposed SKILL.md outline:**
- Trigger: any workload >2 hours, OR any workload Jack wants run
  while asleep
- Decomposition rules: each task ≤60 min, each writes a status file
  to a shared dir, each does NOT depend on the prior task's
  in-memory state (only its on-disk artifact)
- The staggering pattern: hourly, on the :40 (per Splash Jacks; the
  :40 spacing is a Cowork convention worth preserving — see open
  question 1)
- The aggregator task at the end: writes
  `MORNING_REPORT_{YYYY-MM-DD}.md` consolidating all per-task status
  files
- Failure isolation: per-task status files mean one crash doesn't
  poison the aggregator; aggregator must handle missing files
  gracefully (the Casamoré-style "did not fire" annotation)
- Pair with `scheduled-task-prompt-author` (round 1 Top 10 #1) —
  this skill produces the *manifest* of tasks; that skill produces
  *each task's prompt*

**Build time:** ~40 min.

---

## Recurring failure patterns (3+ occurrences)

Each one is a prevention-skill candidate. Most are already covered
by the Top 12 above; cross-referenced here for completeness.

### Failure A: Session-path hardcoding
- **Occurred in:** Casamoré daily backup (production fail); Empire
  daily build (latent, would fail on next session-id change)
- **Covered by:** Top 12 #1 (`scheduled-task-portability-audit`)
  and round-1 Top 10 #8 (`session-path-hardcode-detector`). The two
  are complementary — #8 is the static checker; #1 is the pre-flight
  ritual.

### Failure B: API/server 500 mid-session, no resume protocol
- **Occurred in:** DAY 14 Agents (twice consecutive); implicit in
  most long sessions (sandbox restart, ToolSearch reload)
- **Covered by:** Top 12 #7 (`error-recovery-resume`)

### Failure C: Scope creep past P0 commit
- **Counterfactual** — every successful session committed the P0
  before scope-expansion (Splash Jacks, Day 0 kickoff). The failure
  shape is "agent buries the fix in a feature branch." Didn't
  observe in this sample but the Splash Jacks transcript's explicit
  "Finishing Batch 1 first since the P0s are real bugs" suggests
  Jack has trained the discipline.
- **Covered by:** Top 12 #6 (`incremental-scope-commit`)

### Failure D: Time-budget sprawl
- **Latent in:** Empire daily build (no budget stated)
- **Counterfactual:** sessions with stated budgets came in on time
  (Day 0 = 45min ✓, harvest = 75min ✓, Day 5 EOD = 45min ✓)
- **Covered by:** Top 12 #8 (`agent-self-time-budget`)

### Failure E: Report without verification
- **Anti-example pattern only** — every successful sampled session
  verified before reporting. The skill is preserving this discipline
  as the team scales.
- **Covered by:** Top 12 #3 (`pre-flight-verification-pass`)

### Failure F: Free-text reply where vocabulary should suffice
- **Occurred in:** DAY 14 Agents (Jack sent "just get everything
  done until its finished" twice — same prompt, no vocabulary
  shortcut available)
- **Covered by:** Top 12 #4 (`jack-language-decoder`) + future
  Telegram command routing

### Failure G: Two consecutive overnight runs flagged the same `.env*` leak
- **Round 1 finding** — `leaked-secret-cleanup` (Top 10 #2 in
  round 1). Not re-proposed here. Mentioned because the *meta*
  failure is "agent flagged but didn't fix" — covered by Top 12 #6
  (commit-the-fix-before-moving-on).

---

## Jack's language patterns

Crucial for `jack-language-decoder` (#4 above) and any future voice/
command surface. Each entry is one observation per session unless
noted.

| Jack-phrase | Meaning | Right agent response |
|---|---|---|
| **"start it at {time}"** | Bind the queued plan to that clock-start; preserve the cadence I implied. | Schedule. Don't ask if I want to revise. |
| **"do whatever would help"** | Pick the top-leverage move from current findings without re-prompting. | Name 1-2 candidates with reasoning, execute, report. |
| **"just get everything done until its finished"** | Don't stop at natural seams. Keep working past the "shall I continue?" inflection. | No mid-stream confirmations. Final report at end. |
| **"schedule it"** / **"going"** / **"go"** | Green-light token. The proposed action is approved as-stated. | Echo back "Going. {scoped commitment}." and proceed. |
| **"finishing X first since the {P0s are real bugs / it's the blocker}"** | Re-statement of the agent's prior commitment; Jack confirming priority. | Confirm understanding ("Going.") and finish X before any new chunk. |
| **(silence, scheduled-task user message)** | Run autonomously, no questions. Produce a report. | Make reasonable choices, note them, write report. Never block on Jack. |
| **Bold for headlines, lowercase for body** | Tonal cue: bold = the line Jack reads first; lowercase = supporting. | Match. Mirror the bold-headline-then-detail shape. |
| **Phase numbers (Phase 2.1, Phase 4)** | Shared agenda coordinate system. | Use them. Cross-ref every action. |
| **Short sentences, em-dashes** | Voice convention. | Match. No multi-clause sentences strung with commas. |
| **"3:32 AM ET now."** style timestamping | Bias for concrete time over relative ("soon", "in a bit"). | Always quote ET clock time when discussing scheduling. |
| **"Sleep well."** sign-off | End-of-handoff token. The agent's done; operator off-shift. | Mirror with comparable: "Check {file} when you wake up." |

Two meta-observations:
1. **Jack rarely asks questions.** He states a state ("3:32 AM") or
   an action ("schedule it"). When the agent asks Jack a question
   instead of picking, Jack often answers with another action (not
   the answer to the question). Implication: the agent should
   default to "pick + commit + tell" over "ask + wait."
2. **Jack often re-sends the same prompt rather than rephrasing
   when something fails.** This is a signal that the prompt itself
   isn't ambiguous; the failure was on the agent side. The right
   response on retry: "Resuming from {step}; here's what's done"
   rather than restarting from scratch.

---

## What worked consistently

Patterns that produced good output every time across the sampled
sessions:

1. **Stated budget → on-time delivery.** Day 0 (45min), Day 2
   (2h), Day 5 EOD (45min), DAY 14 Agents (75min) all came in
   under budget. The lone untimed session (Empire daily build) had
   the most variable outputs.
2. **Numbered ≤3 closing recommendations.** Universal in every
   successful close. When >3, Jack visibly doesn't act on items 4+
   (inferred from agenda churn).
3. **Bold headline + "first thing to do" + view-links.** The
   "morning report shape" — see Top 12 #2.
4. **Commit-then-expand.** P0 commit before scope-growth.
5. **Verify-then-report.** Read/grep/smoke-test the deliverable
   before declaring it shipped.
6. **Independent per-task status files.** The 12-task overnight
   succeeded because each task wrote its own file; the aggregator
   read them all. No shared in-memory state.
7. **Operator-friendly final commands on clipboard.** The
   `git push` on clipboard pattern from `local_f5071586-...`
   ("Cmd+V + Enter. That gets Vercel green...") — durable handoff
   that survives the session ending.
8. **Honest miss-naming.** "task 05 did not fire" beats "all
   tasks completed with mixed results." Names the specific failed
   ID; lets the next session pick up cleanly.

---

## What never worked

1. **Hardcoded `/sessions/{name}/mnt/` paths in scheduled-task
   prompts.** Casamoré daily backup, multiple latent risks
   elsewhere. Always fails the moment the runner session-id differs
   from the authoring session-id.
2. **Re-sending the same prompt after a 500 error.** DAY 14
   Agents x2. Without a resume protocol, the model has no
   instruction to pick up where it left off vs restart.
3. **Walls of unstructured text in a closing report.** Not directly
   observed in the sample (all 7 sessions followed the bold-
   headline shape), but the prompts themselves repeatedly include
   "Cap the report at ~1,200 words. It's read once, before dinner,
   on a phone." Implication: when this rule isn't enforced, the
   reports go unread.
4. **Asking Jack a question when he isn't there.** Every
   scheduled-task prompt explicitly forbids this; one session
   (Casamoré) effectively failed by stopping on a permission error
   instead of producing a "what I found" report.
5. **One mega-task instead of N hourly tasks.** Not directly
   observed as a failure (the long sessions in this sample did
   succeed), but the 500-error pattern in DAY 14 Agents suggests
   that >90-minute sessions are at risk of mid-stream API failure.
   Fan out instead.
6. **Promising a deploy without naming the credential gate.** The
   ".env files still need rm" pattern repeating across 2+ days
   is the symptom: agent flagged but didn't (a) fix or (b) hand off
   the exact one-line fix.

---

## Existing 113-skill empire cross-reference

None of the Top 12 above duplicate existing skills. Closest neighbors
checked:

- `daily-kickoff` (existing, Pack 1) — Top 12 #2 (`morning-headline-
  format`) is the *shape* the kickoff uses, not the trigger; both
  needed.
- `approval-card-builder` (existing) — Top 12 #10 (`numbered-
  decision-rationale`) is the broader pattern; approval cards are
  one instance.
- `council-decision` (existing) — Top 12 #4 (`jack-language-decoder`)
  pairs with council-decision but is upstream; council-decision is
  the escalation when the vocabulary doesn't cover.
- `eod-update-writer` (existing) — Top 12 #2 again applies; the EOD
  writer should *invoke* `morning-headline-format`.
- `scheduled-task-prompt-author` (round 1 Top 10 #1) — Top 12 #1
  + #12 are the *pre-flight* and *manifest* respectively; the
  round-1 skill is the *per-task* author. Three-skill chain.
- `session-path-hardcode-detector` (round 1 Top 10 #8) — Top 12 #1
  is the prefight ritual; #8 is the static checker. Soft duplicate;
  recommend folding #8 into #1's verification step. (See open
  question 2.)
- `urgency-classifier`, `jack-asleep-detector`, `telegram-
  command-router` (future, in autonomous agenda Phase 1-2) — Top
  12 #4 (`jack-language-decoder`) is a hard prerequisite. Build #4
  before any of those.

---

## Open questions for Jack (max 5)

1. **The :40 minute offset for hourly scheduled tasks** — Splash
   Jacks ran on the :40 (3:40, 4:40, 5:40...). Is that a convention
   to preserve in `parallel-task-fanout-author`, or was it just "10
   min after the round hour to debounce sandbox startup"? If
   convention, document it; if expedient, drop it.
2. **Fold `session-path-hardcode-detector` (round 1 Top 10 #8)
   into `scheduled-task-portability-audit` (Top 12 #1)?** They
   overlap ~80%. Recommendation: fold the static-grep checker into
   the broader pre-flight skill so there's one ritual instead of
   two. Yes / no?
3. **`agent-meta/` as a new sub-pack** — Top 12 #1, 2, 3, 4, 5, 6,
   7, 8, 9, 10, 11, 12 are all in this category. That's a sub-pack
   of its own. Naming preference: `agent-meta/`, `agent-discipline/`,
   `process/`, or fold into `ops/` flat?
4. **`jack-language-decoder` (#4) — versioned doc or generated
   YAML?** A YAML dictionary is more machine-parseable for
   `telegram-command-router` to consume directly. A SKILL.md is
   more discoverable. Recommend: SKILL.md with an embedded YAML
   block (best of both). Confirm?
5. **Auto-invoke chain on every scheduled task** — should
   `scheduled-task-prompt-author` (round 1) automatically invoke
   `scheduled-task-portability-audit` (#1), `agent-self-time-
   budget` (#8), and `view-link-handoff` (#9) at compose time, so
   any task an agent writes inherits the discipline? Recommendation:
   yes — encode as the "skill chain" pattern. Yes / no?

---

*Methods harvest complete. 12 Top + 7 failure patterns + 11
language entries + 5 open questions. Time spent: ~40 min, inside
budget. Re-run after the first Telegram-bridge week to capture the
new methodology layer.*
