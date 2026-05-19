# Skill harvest — incremental pass (2026-05-17)

> Weekly cadence. Companion to `skill-harvest-findings.md` (2026-05-16, the
> first full pass) and `methods-harvest-findings.md` + `production-reality-
> harvest-findings.md` (round 2/3, both same day). This pass scopes only
> to evidence created in the last 7 days. Build target unchanged:
> `~/Documents/businesses/_shared/skills/{skill}/SKILL.md`.

## New evidence reviewed: 9 files

- `docs/agent-failure-patterns-2026-05-17.md` (137 lines, idea-worker.log forensics)
- `docs/e2e-pipeline-results-2026-05-17.md` (E2E pipeline test, 6/7 failing)
- `docs/overnight/council-review-2026-05-17.md` (first weekly council review)
- `docs/overnight/polish-2026-05-16.md` (first nightly polish run)
- `docs/skill-merge-candidates-2026-05-17.md` (auto-generated merge audit, 211 skills scanned, 11 pairs flagged)
- `docs/day14-os-autonomous-agenda.md` (38-skill Phase 1-6 plan, Telegram-anchored)
- Cross-check against `docs/seeds/skills/` (now ~258 SKILL.md files)
- `docs/overnight/MASTER_LOG.md` (new entries through 2026-05-17 20:00 ET)
- Spot-checked `agent-self-debug`, `error-recovery-resume`, `pipeline-stuckness-detector` for overlap

## New skill candidates (max 3, ranked)

### 1. `worker-cooldown-sidecar`

**Pack:** ops · `agent-meta/`
**Purpose:** Prevent the multi-worker 429 thundering herd. Before any rate-
limited vendor call (Gemini, Anthropic, OpenAI), workers consult a shared
`~/Documents/businesses/_shared/poller/{vendor}-cooldown.json`; if cooldown
is in the future, return early with a P3 queued-Telegram instead of
spawning a parallel doomed retry loop.

**Evidence:**
- `docs/agent-failure-patterns-2026-05-17.md:11-46` — 7-min wall-time window
  (19:57Z–20:04Z) with three workers stacked into the same depleted free-
  tier RPM quota, ~12 burned Gemini calls, zero new output. Single-window
  data point but the mechanism is general — the worker-spawn-on-tap pattern
  guarantees recurrence whenever Jack taps during a 429 storm.
- `docs/agent-failure-patterns-2026-05-17.md:39-46` — proposed fix is
  already specified concretely (sidecar JSON + 90s window + queued P3).
  Skill spec writes itself.

**Proposed SKILL.md outline:**
- The sidecar-file contract (`{cooldown_until: ISO, set_by: pid,
  vendor: "gemini"|"anthropic"|...}`).
- Pre-call check (read sidecar; if `cooldown_until > now()`, exit with
  queued message, do not call vendor).
- Post-429 write (set `cooldown_until = now() + backoff`, where backoff
  scales with consecutive-429 count).
- The queued-Telegram template ("Quota cooling down until {time}. Your
  request is queued and will resume automatically.").
- Cross-vendor reuse (same sidecar shape for Anthropic/OpenAI; one helper
  function per vendor).

**Build time:** ~30 min.

---

### 2. `approval-reply-router`

**Pack:** ops · `agent-meta/` (sibling of `jack-language-decoder`)
**Purpose:** When inbound text from Jack matches `/^(go|approve[d]?|yes|do
it|ship it|ok)$/i`, the worker resolves the most recent pending tap from
the Telegram outbox archive instead of treating the reply as a new idea.
Prevents single-word-reply → fresh-Gemini-call → junk artifact.

**Evidence:**
- `docs/agent-failure-patterns-2026-05-17.md:49-83` — 5 of ~15 worker runs
  in an 18:55Z–19:44Z window were single-word replies spawning empty
  worker runs; one of them wrote a junk `docs/seeds/skills/go.md` artifact
  into the skill registry.
- `docs/agent-failure-patterns-2026-05-17.md:79-82` — proposed fix is
  already concrete: read most-recent `tap_required: true` from outbox-
  archive per chat_id; resolve or politely no-op if nothing pending.
- Overlap check: `jack-language-decoder` (in seeds) covers the *Cowork
  agent* side ("Go" = green-light at the agent layer). `telegram-command-
  router` (in seeds, Phase 1) covers routing inbound commands. Neither
  resolves the open-approval-card matching from the *worker* / poller
  side — and that's where the bug fires. This is a third sibling, not
  a fold-in.

**Proposed SKILL.md outline:**
- The regex + the chat_id-scoped pending-tap lookup.
- The "match found → execute queued action OR queue an ack-only reply"
  branch.
- The "no pending tap → reply once with 'nothing pending to approve' and
  finish" branch (no Gemini call required).
- Failure mode: junk-skill-spec writes (the `go.md` exemplar from the
  log).
- Pairs with: `telegram-command-router`, `telegram-conversation-state`,
  `jack-language-decoder`.

**Build time:** ~45 min.

---

### 3. `partial-artifact-marker`

**Pack:** ops · `agent-meta/`
**Purpose:** When a worker exits abnormally (rate-limit-exhaustion,
network error, exception, timeout) and at least one artifact was written
during the run, append a `<!-- INCOMPLETE: agent exited at turn N due to
{reason} -->` footer + queue a P3 retry message. Stops silent quality
failures where a half-baked draft looks finished to downstream skills.

**Evidence:**
- `docs/agent-failure-patterns-2026-05-17.md:86-115` — 19:57Z run wrote
  a real draft (`etsy-store-plan-hyper-specific-digital-planners.md`),
  hit a 429 storm before the planned refine-pass, exited "successfully"
  with a shallow artifact. Hour-2 review caught it and had to deepen by
  hand. Without the audit it would have become "the plan."
- Overlap check: `error-recovery-resume` (in seeds) is about *Cowork
  session* 500-recovery. `agent-self-debug` is about an agent's own
  reasoning loop. `pipeline-stuckness-detector` is about customer
  dossiers. None of them mark the *artifacts* that a dying worker leaves
  behind. This is a fourth distinct surface.

**Proposed SKILL.md outline:**
- The trigger (worker exits via exception OR retry-exhausted AND >=1
  file write happened this run).
- The footer format (HTML comment so it doesn't render in Telegram
  previews; structured so a future skill can grep `INCOMPLETE:` and
  resume).
- The retry-message template ("Partial output — {file}. Run died at
  turn {N} ({reason}). Reply 'retry' to resume.").
- The resumable-state file (`~/Documents/businesses/_shared/poller/
  state/{chat_id}.json` with memory + last artifact path + turn number).
- Pairs with: `worker-cooldown-sidecar` (the most common cause of
  abnormal exit) and `approval-reply-router` ("retry" is itself an
  approval-style single-word reply that should resolve here).

**Build time:** ~30 min.

---

## Existing skills that need updates (from new evidence)

- **`telegram-command-router`** (Phase 1, in seeds) — add the approval-
  reply path as a router branch (or pre-router filter) so it never
  reaches the Gemini worker in the first place. Refers out to
  `approval-reply-router` (above) for the matching logic.
- **`error-recovery-resume`** (in seeds, currently Cowork-500 focused) —
  add a "if you wrote artifacts before erroring, run `partial-artifact-
  marker` before exiting" step. Currently silent on artifact handling.
- **`council-decision-followup-tracker`** (in seeds) — Council 0001's
  recommendation wasn't executed; the tracker should already be firing
  this week. Verify the tracker actually runs the scan against
  `council-log/` and surfaces "deadline approaching, no evidence of
  execution" (Friday May 22 for 0001). If it's silent, the skill is
  shipped but not wired.
- **`day14-os-autonomous-agenda.md`** (planning doc, not a skill) — the
  38-skill plan names `urgency-classifier`, `jack-asleep-detector`,
  `auto-approve-low-risk`. The three candidates above all need to
  emit urgency/asleep-aware messages; cross-reference once those Phase
  2 skills exist.

## Open question for Jack (max 1)

**Council 0001's recommendation didn't execute this week — is that a
process failure to encode, or operator judgment that we should leave
alone?** Per `council-review-2026-05-17.md:36-44`: "Council recommends
acquisition; Jack ships infrastructure." This was the *first* council
call and it lost to gut. Two options: (a) build `council-execution-
enforcement` (cadence skill: T-72h, T-24h, T-0 nudges with concrete
unblock asks) so council calls don't quietly age out; (b) accept that
the operator override is the right behavior and downgrade council
recommendations to "advisory, not commitment." Picking (a) hardens
the Council; picking (b) lowers its weight. Worth a fork-call before
0002 lands.

---

*Confidence: 0.85. Time spent: ~40 min. No drafts written — backlog
only. Re-run next Sunday 22:00 ET per scheduled task cadence.*
