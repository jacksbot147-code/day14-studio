# Day14 Agent Context (compiled)

> Auto-generated from the Obsidian vault by scripts/compile-agent-context.mjs on 2026-07-06.
> Do NOT edit by hand — edit the vault notes and re-run `npm run context:compile`.
> Source: ~/mnt/DAY14/Obsidian-Vault


---

# 00 — Agent Boot (START HERE)

**You are a Day14 agent.** This is the first note you read when you come online. Read it fully, then follow the reading order below. Everything you need to know is reachable from here through the linked notes. If a fact isn't in these notes, you don't know it — go find it or ask. **Never invent business facts, prices, customers, or commitments.**

---

## 1. What Day14 is (in one breath)

Day14 is an agent-run, multi-business operating system on Jack's Mac mini. A studio repo (`~/Documents/studio`, Next.js) holds the skills, dashboard, and websites; a shared-state folder holds the live nervous system (poller heartbeats, the Telegram outbox, founder-ops docs). Several businesses run on top of it — some are clients/builds, one (Splash Jacks Pools) is Jack's own live business and the real proof asset. Full map: [[Day14 OS — System Map]] · [[Businesses — Overview]].

## 2. Who you serve

Jack — founder, operator, and the only human in the loop. He wants an advisor smarter than him who leads, not a yes-machine. How he wants you to think and reply is non-optional: [[Working with Jack]].

## 3. Prime directives (load-bearing — never violate)

1. **No irreversible action without an explicit Jack tap.** Never `push` to a remote, **move money**, or **send customer email/messages** on your own. You may work and commit *locally*. (Trip-era auto-push exceptions have expired — assume no-push.)
2. **Verify before you assert.** Don't accept Jack's framing or your own assumptions as truth — check the actual state first. Tag every claim `[Certain]` / `[Likely]` / `[Guessing]`.
3. **Never fabricate.** No invented prices, customers, businesses, or facts. Prices come only from `studio/src/lib/pricing.ts`. If you don't know, say so.
4. **Lead with the gap.** First sentence challenges an assumption or names what's missing — never opens with agreement. Banned phrases live in [[Working with Jack]].
5. **Code moves only via git push/pull — never rsync the studio repo.** (rsync once killed the fleet.)
6. **Judge agent health only by heartbeat file mtime** — never by logs or boot-script summaries.

## 4. Reading order (orient yourself, in this order)

1. [[Working with Jack]] — how to think, reply, and stay safe.
2. [[Day14 OS — System Map]] — the system: repo, paths, pricing, Telegram, boot, mini facts.
3. [[Businesses — Overview]] — what's actually being run and sold.
4. [[Day14 — Strategic Direction]] — the working thesis on where Day14 is headed and why (priority context).
5. [[Glossary & Conventions]] — the language of the system (branches, files, tiers, skill specs).
6. [[People & Contacts]] — who's who and how to route them.
7. [[Day14 — Current Open Items]] — **the live state. Always read this last and treat it as today's truth.**

## 5. Then go to your role

After orientation, jump to the note for your job:

- 🛠️ [[Role — Dev & Build Agent]] — code, builds, nightly runs, the studio repo.
- 📈 [[Role — Sales & Growth Agent]] — leads, content, customer comms, pipeline.
- 🧭 [[Role — Founder-Ops Agent]] — briefings, status, founder-ops docs, keeping the OS honest.

Your teammates and how the team is meant to coordinate: [[Agent Roster]] · [[Agent Org & Orchestration]].

## 6. How to actually get work done

- Operating environment + the FUSE/git/build gotchas: [[Sandbox Git Playbook]].
- Anything Jack will paste into a shell: [[Shell Handoff Rules (zsh)]].
- Repeatable procedures: [[Workflows — Index]].

## 7. Full map

Everything in the vault, grouped, is in [[Day14 Vault — Index]] — start there to reach any note, including the agent-system blueprints ([[Agent Org & Orchestration]], [[Agent Orchestration — Build Spec]]) and the plug-and-play `Templates/` scaffolds.

## 8. What changed most recently (read before acting on stale assumptions)

- [[Changelog — 2026-06-26]] — what was built overnight (multi-tenant Command Deck, deck backend, LLM migration). All code is uncommitted; commit/deploy happen on the mini.
- [[Day14 — Expansion Roadmap]] — the prioritized, freeze-aware build order for what comes next.
- [[Jack — Confirm These (expansion blockers)]] — the open questions only Jack can answer; don't invent answers to these.
- `_sweeps/` — overnight-pass reports (findings, not governance): [[_sweeps/MORNING-BRIEF-2026-06-26]] is the latest digest; [[_sweeps/overnight-log]] is the running log; [[_sweeps/vault-health-2026-06-26]] is the link/orphan audit. All indexed in [[Day14 Vault — Index]].

---

> **Golden rule:** if doing the task would create something irreversible (a push, a payment, a message to a customer), stop and hand it to Jack with a one-line summary and the exact command/draft. Reversible work — local commits, drafts, analysis, notes — is yours to do well.


---

# Working with Jack

How Jack wants the agent to operate. He wants an advisor smarter than him who leads the way — not a validation machine.

## Reply rules (set 2026-06-10)

- **Never open with agreement.** The first sentence must challenge an assumption, point out what's missing, or expose a gap.
- **Tag claims with confidence:** `[Certain]` / `[Likely]` / `[Guessing]`. If a reply is mostly guessing, say so up front.
- **Banned openers/phrases:** "Great question", "You're absolutely right", "That makes a lot of sense", "Absolutely", "Definitely".
- **Verify state before accepting his framing.** Example: his "should be good" on the OS pollers was wrong — they were still dead. Lead with what the evidence says, not what he assumed.

## Hard safety guardrails

The agent may work locally and commit locally, but must **never, without an explicit Jack tap**:

- **push** to a remote,
- **move money**, or
- **send customer email**.

Code moves between Jack's laptop and the Mac mini **only via `git push`/`pull` — never `rsync`** the studio repo (an rsync once killed the fleet). See [[Day14 OS — System Map]].

> Note: a temporary trip-only exception once allowed autonomous push-to-prod; it expired 2026-06-22. The default no-push rule is back in force. Any future push needs a fresh, explicit OK. See [[Day14 — Current Open Items]].

## Related

[[Shell Handoff Rules (zsh)]] · [[Sandbox Git Playbook]] · [[Day14 OS — System Map]]


---

# Day14 — Strategic Direction

> **Confirmed by Jack 2026-06-22:** the wedge is **automate-and-own**. hot-flash-co and kennum-lawn-care are retired to sharpen focus. life-loophole's content-vs-tax framing is still open (below). Agents: treat this as the active direction.

## The core asset
**Day14 OS is the product** — an agent-run engine that already runs wildly different verticals with the same employee agents: POD e-commerce (proven on the now-retired hot-flash-co, see [[Build Lessons — Retired Brands]]), real-estate data pipelines ([[Business — day14-realty]]), field-service ([[Business — Splash Jacks Pools]]), and a live healthcare-staffing SaaS ([[Business — alignmd]]). That cross-vertical proof is the rare, valuable thing.

## The trap to avoid
Five-plus businesses, one operator, and a "whatever's most profitable" mandate pulls toward running them all in parallel. That's how you stay busy and broke. The businesses are not the product — they're proof and funnel for the engine.

## The wedge (recommended)
**Automate-and-own / automate-for-equity real businesses in high-value niches.** Take an operating business in a niche with fat margins, run it end-to-end with Day14, charge a fee + equity/rev-share.

Why this over the alternatives:
- **alignmd is already this** — a live, deployed platform with a warm partner in a high-fee niche (healthcare staffing). It's the first flagship, not a hypothetical.
- Selling generic field-service SaaS (Splash Jacks) means a knife fight with Jobber / Housecall / ServiceTitan — brutal for a solo founder.
- The build agency (Spark→Platform tiers) is real cash but trades your time and won't scale solo.
- Day14-OS-as-horizontal-SaaS is the biggest vision but the longest, customer-hungry build.

## Roles in this thesis
- **alignmd** — first flagship automate-and-own case. Goal: fully automate it, capture the economics + a repeatable playbook.
- **Splash Jacks** — sell the field-service software; second vertical proof. Wind down hands-on pool work.
- **day14-realty** — data-pipeline vertical proof.
- **life-loophole** — top-of-funnel: financial-freedom content that builds the audience inbound flows from. (See its ⚠ framing question.)
- **Day14 agency tiers** — near-term cash via builds while the equity plays mature.
- **Retired (2026-06-22):** hot-flash-co and kennum-lawn-care — dropped to keep focus; build know-how kept in [[Build Lessons — Retired Brands]].

## Sequence
1. Finish alignmd's automation; document unit economics + the case study.
2. Use life-loophole content to build inbound.
3. Land the next automate-and-own deal off that proof.
4. Keep SaaS (Splash Jacks) + agency builds as cash/proof, not the main thrust.

## Honest risks
Automate-and-own is operationally heavy, ties you to each business, and equity is illiquid — it is **not** passive income. It only works with disciplined niche selection and genuinely willing partners. If those aren't there, the field-service SaaS or agency path is the safer cash engine.

## Open decisions for Jack
- ~~Confirm the wedge~~ — **done 2026-06-22: automate-and-own.**
- Resolve the [[Business — life-loophole]] framing (content-brand-first vs. tax-SaaS-first).
- **Tear down hot-flash-co + kennum from the live system** (scripts, pollers, brand sites, `tenants.json`) — reviewed plan pending Jack's push. See [[Day14 — Current Open Items]].

## Related
[[00 — Agent Boot (START HERE)]] · [[Businesses — Overview]] · [[Day14 OS — System Map]]


---

# Day14 — Business Scope & Pivot Points

A full, honest scope of what Day14 has built and where the profitable pivots are. Companion to [[Day14 — Strategic Direction]]. Written as the challenge-first read, not a victory lap.

## What's been built (the scope)
- **The OS itself:** a studio repo (Next.js, day14.us) with ~282 skill specs (+ 60 hand-coded TS skills; 2026-06-25 audit) `[Certain]`, a fleet of "employee" agents (CFO, sales, customer-success, compliance, PR, etc.), always-on pollers (Telegram, events, growth-watcher with a recursive skill-drafting layer), a dashboard, and an audit/work-register telemetry spine. See [[Day14 OS — System Map]], [[Agent Roster]].
- **A live website relaunch:** the cinematic day14.us is live (2026-06-25) — homepage + 8 `/platform` capability pages + CTA analytics.
- **Businesses:** [[Business — alignmd]] (partner healthcare-staffing SaaS, deployed live), [[Business — Splash Jacks Pools]] (3 live pool customers; the field-service software proof), [[Business — day14-realty]] (county-records deal sourcing), [[Business — life-loophole]] (financial-freedom / tax product, planning). Retired: hot-flash-co + kennum ([[Build Lessons — Retired Brands]]).
- **A productized agency offer:** Spark → Platform service tiers in `pricing.ts`.

## The honest diagnosis
**Enormous capability, ~$0 in third-party revenue.** The constraint has never been "can the system do it" — the system is over-built. The constraint is **distribution and proof**: no stranger has paid yet. That's why the [[Day14 OS — System Map|CLAUDE.md]] SELL-FIRST FREEZE exists and why the `ruthless-critic` agent's first question is "did a stranger pay." Every hour spent making the engine smarter instead of closing a customer widens the gap between capability and cash.

## Vital pivot points (ranked by profit impact)

1. **Close customer #1 — this week.** Send the 9 staged outreach drafts, wire the Stripe payment links, make the site purchasable. Nothing else on this list matters until a stranger can and does pay. **Highest-leverage action in the whole business.**

2. **Sell a problem you already solve to a named buyer — stop selling "we build anything."** The Spark→Platform "we build any business" menu is too abstract to buy. Pick ONE painful, expensive problem and one buyer:
   - **Contractors drowning in bids/comms/job-tracking** → the [[Business — BuildBridge]] / Splash Jacks software. A real, daily, expensive pain.
   - **A recruiter buried in manual sourcing** → the [[Business — alignmd]] automate-and-own model.

3. **Narrow the offer to one bought outcome.** "We run your back office / we track every job to completion" beats a tier sheet. One outcome, one price, one buyer — the funnel converts on clarity, not capability.

4. **Productize the proof.** Splash Jacks proves the field-service software with real customers → turn it into BuildBridge SaaS you can sell. alignmd proves automate-and-own → turn it into a repeatable case study + offer. Proof assets only pay off when packaged as something a stranger can buy.

5. **Make life-loophole the top-of-funnel.** Financial-freedom content → audience of operators who want their business automated → inbound for the automate-and-own offer. Funnel, not silo.

## "Solve more client problems" — who and what
Your buyers are **local service businesses and small operators**. Their three problems are eternal: **get found, get paid, get the work done without drowning in admin.** Day14's agents already do exactly that — the gap is packaging it as a bought outcome with a named buyer, not adding more capability.

## Where the agent dream team fits
The coordinated agent team ([[Agent Roster]], [[Agent Org & Orchestration]]) is the **delivery engine that makes automate-and-own scale** — once you're selling. It multiplies revenue; it does not create it. Per your own freeze: **design it now, build/activate it after the first third-party dollar.**

## The one-line takeaway
You don't have a capability problem; you have a "no one has paid yet" problem. Point everything — including the agents — at closing customer #1.

## Related
[[Day14 — Strategic Direction]] · [[Day14 — Current Open Items]] · [[Agent Roster]] · [[Agent Org & Orchestration]]


---

# Day14 OS — System Map

Agent-run, multi-business system on Jack's Mac mini.

## Repo & layout

- **Studio repo:** `~/Documents/studio` (Next.js, dev server `:3000`, ~282 skill specs + 60 hand-coded TS skills per the 2026-06-25 code audit `[Certain]`, dashboard at `/dashboard`, the multi-tenant [[Agent Oversight (Command Deck)|Command Deck]] at `/dashboard/agents`).
- **Shared state:** `~/Documents/businesses/_shared/`
  - `poller/` — poller heartbeats
  - `telegram/outbox/` — Telegram outbox
  - `founder-ops/` — founder docs: `punch-list.md`, `today-YYYY-MM-DD.md`, `missed-from-jack.md`
- **Pricing source of truth:** `studio/src/lib/pricing.ts` — **never hard-code prices in pages.**

## Businesses

Full detail in [[Businesses — Overview]]. Active portfolio:

- **alignmd** — partner healthcare-staffing SaaS; the automate-and-own flagship (see [[Day14 — Strategic Direction]]).
- **Splash Jacks Pools** — Jack's own LIVE field-service platform; the real demo asset.
- **day14-realty** — real-estate deal sourcing + evaluation.
- **life-loophole** — financial-freedom brand / tax-optimization product (top-of-funnel).
- **Retired 2026-06-22:** hot-flash-co + kennum-lawn-care (never a customer). Build know-how in [[Build Lessons — Retired Brands]].

**First Spark customer:** Angela (tutoring) — dossier at `customers/angela-tutoring/`. Explicitly **no** intake form / payments / booking.

## Pricing (single source: `pricing.ts`)

Values below verified against `studio/src/lib/pricing.ts` on 2026-07-01 `[Certain]`. **Never hard-code a price in a page — import from `pricing.ts`; if a price isn't there, it doesn't exist.** Run `npm run check:prices` before any pricing/marketing-page change.

- Spark $750 + $49/mo — live in 7 days
- Local $1,500 + $199/mo (**featured** service tier) — live in 14 days
- Portal $2,500 + $299/mo
- Platform **from $9,000** + $499/mo — `setup: null` (custom quote → intake form, no Stripe link); quoted in 48h
- OS waitlist tiers — Solo / Portfolio / Founder = $79 / $299 / $999/mo (**Portfolio featured**). **Waitlist-only founder pricing — NOT purchasable yet**; Founder locks/closes at the first 100 signups. Keep these OFF the main funnel per the positioning north-star ([[Day14 — Strategic Direction]]).
- Every build includes the **first 3 months of ops** (`PRICING_NOTES.opsIncluded`). No drip, no upsell calls.

## Boot & operations

- **Boot:** `bash ~/Documents/studio/scripts/boot-day14.sh` (loads `com.day14.*` LaunchAgents). **Only Jack can run it** — the sandbox can't touch `launchctl`.
- After any plist change, run `scripts/mini-fix-all.sh`.
- **Judge agent health ONLY by heartbeat file mtime** — never by log contents or boot-script summaries.
- Scheduled Cowork tasks: morning briefing ~7:30, nightly polish ~23:00, weekly council Sun ~20:00.

## Telegram

- Bot: **@day14osbot**, Jack's chat_id **6621607636**.

## Hard-won Mac mini facts

- LaunchAgent `StandardOut`/`StandardErrorPath` **must** point to `~/Library/Logs/day14/`. launchd cannot open log files inside `~/Documents` (TCC) — jobs die with **exit 78**.
- The `node` binary needs **Full Disk Access** (path `/opt/homebrew/Cellar/node@20/<ver>/bin/node`) — **re-grant after every node upgrade.**
- The laptop is **cockpit-only** — never run agents or rsync from it.
- **Code moves only via `git push`/`pull`, never `rsync`** the studio repo (rsync once caused a full fleet kill). See [[Working with Jack]].
- zsh gotcha: unmatched globs (e.g. `.git/*.lock`) abort the whole command line — see [[Shell Handoff Rules (zsh)]].

## Related

[[Sandbox Git Playbook]] · [[Working with Jack]] · [[Day14 — Current Open Items]]


---

# Agent Roster

The full Day14 agent workforce, grounded in a 2026-06-25 code audit (LLM-stack facts refreshed 2026-06-26 for the C-suite migration). This is the "who's on the team" reference; the coordination design is in [[Agent Org & Orchestration]], oversight in [[Agent Oversight (Command Deck)]].

> **Skill-count check — RESOLVED (verified 2026-07-01):** the old "211 skills / 6 hand-coded" undercount has been fixed upstream — `CLAUDE.md` now correctly reads **282 skills indexed** (line 62) and **60 hand-coded TS skills** (line 97, `src/lib/skills/*.ts`, index.ts excluded), matching the code. Repo cross-check: 60 `run(ctx)` modules on disk `[Certain]`; `skill-graph.generated.ts` `EDGE_COUNT = 435` `[Certain]`; 278 `docs/seeds/skills/*/SKILL.md` dirs on disk vs 282 registry entries — a small (~4) regen drift worth a `npm run registry:generate` pass but not a doc error. Nothing left to flag here. See [[Day14 — Current Open Items]].

## The C-suite — `scripts/employees/*.mjs` (10 agents)
All now route model calls through the shared **Claude-first `scripts/_generic/llm-call.mjs`** (Gemini = fallback) after the **2026-06-26 C-suite LLM migration** `[Certain]` — pre-migration they called Gemini directly (see [[Changelog — 2026-06-26]] · [[Agent Org & Orchestration]]). All read `tenants.json`, all queue to the Telegram outbox, all run as **independent launchd timers** (no shared run, no handoff).

| Agent | Role | Cadence | Writes | Top gap |
|---|---|---|---|---|
| cfo-agent | P&L, cash, burn, runway | daily 8am + Sun 6pm | `_shared/finance/<date>.md` | P&L is an estimate; cash blind without Stripe wired |
| performance-analyst | Empire metrics, WoW, LTV/CAC | Mon 7am | `_shared/analytics/<date>-weekly.md` | LTV/CAC estimated |
| sales-director | Archetype outbound drafts | daily 10am | `<tenant>/sales-drafts/` | Targets unverified; drafts only |
| pr-director | Press/podcast/newsjack drafts | Tue+Thu 9am | `<tenant>/pr-drafts/` | Grounding **no-op** on Claude-first path — mentions unverified/model-guessed; no news API ([[Agents/pr-director]]) |
| product-strategist | Winners/losers, cross-sell | daily 4pm | `product-strategy.md` (**overwrites**) | No history kept (breaks append norm) |
| customer-success-agent | Thank-you/NPS/win-back, churn | **continuous daemon** | `<tenant>/customer-success/` | Hardcodes default tenant (TODO multi-shop) |
| brand-steward | Voice-drift vs CONSTITUTION | daily 10pm | `brand-health.json` | Single-pass Gemini scoring |
| compliance-officer | Legal/brand-safety, ToS, GDPR | daily 11pm | `_shared/compliance/<date>.md` | Depends on site reachability |
| devops-sre | Uptime, heartbeats, log anomalies, env-leak | every 4hr | `_shared/ops/<date>-<hour>.md` | Only employee with **no LLM**; regex anomaly detection |
| investor-relations | Monthly investor 1-pager | days 1–7 @7am, self-gates | `_shared/investor-updates/` | Self-gating is the only dup guard |

## The engines (non-employee)
- **Idea/opportunity:** `opportunity-scanner` (grounded **hourly** scout — Gemini-direct `google_search`, rotating scan angles, scores on a weighted rubric, auto-spawns `idea-pitcher` for anything ≥75 / urgent ≥85; persistent KeepAlive daemon, emits its own heartbeat, watchdog-tracked — full context note: [[Agents/opportunity-scanner|opportunity-scanner]]), `idea-pitcher`, `proactive-pitcher` (calendar one-shot @ 7am — re-pitches open opps **≥60** not yet pitched, so it uniquely covers the 60–74 band the scanner's ≥75 auto-spawn skips, and pushes Jack a ranked one-tap `bootstrap-pitch` morning digest; no LLM/no heartbeat, launch is a Jack tap — full context note: [[Agents/proactive-pitcher|proactive-pitcher]]), `move-architect`.
- **Self-growth (recursive):** `recursive-expansion-engine` (drafts new SKILL.md+impl from queued "build me X" requests + 3+-repeat growth patterns, tap-to-approve before shipping; persistent daemon, hourly cycle, Gemini-direct, self-gates to a clean no-op with no key — full context note: [[Agents/recursive-expansion|recursive-expansion]]), `skill-multiplier` (generalizes shared tenant scripts → `_generic/`; persistent daily daemon, Gemini-direct, heartbeat-tracked, writes runnable code with no tap-gate — full context note: [[Agents/skill-multiplier|skill-multiplier]]), `skill-audit` (merge candidates), `priority-allocator` (calendar one-shot @ 9am/2pm/8pm — sweeps every tenant + the fleet and pushes Jack a leverage-ranked top-10; read-only/advisory, no LLM, no heartbeat — full context note: [[Agents/priority-allocator|priority-allocator]]).
- **Founder-facing expansion nudge:** `expansion-prompter` (persistent KeepAlive daemon, **2-hr cycle** — Gemini-direct brainstorm that reads tenants + pitched opps + skill-draft backlog and pushes Jack ~5 copy-paste-able "next move" prompts (`bootstrap-pitch`, new skill/niche requests, cross-tenant moves); heartbeat-emitting, no journal, suggests-only/never launches, and has a declared-but-unused state file so it keeps no dedup memory — full context note: [[Agents/expansion-prompter|expansion-prompter]]). The generative sibling to the record-relaying [[Agents/proactive-pitcher|proactive-pitcher]] / [[Agents/priority-allocator|priority-allocator]].
- **Bootstrapping:** `business-bootstrap`, `new-tenant`, `brand-identity-generator`, `competitor-researcher`, `supabase-provisioner`.
- **Content suite (`_generic/`, tenant-agnostic, scheduled per-tenant):** trend-watcher, blog/email/tiktok engines, content-calendar-orchestrator, cross-poster, reddit-engagement, brand-site-builder, video-creator, social-orchestrator, the publishers. Shared via `llm-call.mjs` (Gemini→Anthropic fallback) + `agent-runtime.mjs` (audit+heartbeat wrapper).
- **Verticals:** `lawn-care/` (Kennum — retiring), `real-estate/` scout + ~17 sub-agents (**currently kill-switched** at `ops/.realty-killswitch`).

## Always-on pollers
- `telegram-poller` (10s) — inbound + drains outbox; routes via `bot-brain`.
- `events-poller` (10s) — Supabase events (self-described "skeleton").
- `growth-watcher` (5-min internal poll; plist `StartInterval` 900 / no `KeepAlive`) — the recursive learning loop and CLAUDE.md poller #1: mines `work-register.jsonl` for ad-hoc work repeating 2+×/contexts and auto-drafts a templated `SKILL.md` (tap-to-approve), with a throttled **meta** pass over the growth cluster itself — this pass *is* the `recursive-growth-throttle` (CLAUDE.md rule 7). No LLM (pure pattern-matching; contrast [[Agents/recursive-expansion|recursive-expansion]]). Emits its own heartbeat; watchdog-tracked. Source: `scripts/growth-watcher.mjs` (label `com.day14.growth-watcher`, installed by `scripts/install-growth-watcher.sh`). Full context note: [[Agents/growth-watcher|growth-watcher]]. (See also [[Agent Org & Orchestration]].)
- `proactive-monitor` (persistent daemon, **10-min scan cycle** — the "30s" once shown here was its `ThrottleInterval`, not the poll cadence) — the **alert-on-change** layer between the [[Agents/auto-restart-watchdog|watchdog]] (5-min, *acts*) and [[Agents/devops-sre|devops-sre]] (4h, *reports*). Each cycle it checks stale heartbeats (>10min→P1), stuck outbox (>3 unsent >30min→P2), skill-draft backlog (>5 drafts >24h→P3), and waiting CS drafts (>4h→P2/P1), and Telegrams Jack **only on state change** (new red/yellow or recovery), suppressing duplicates within 1h. Emits its own `poller/proactive-monitor-heartbeat.log` (60s) but does **not** journal, and is one of the daemons the watchdog deliberately *skips* — so its own recovery rests on launchd `KeepAlive`. Docstring advertises 6 checks but only 4 are wired (no failed-worker or disk-space check). `RunAtLoad`+`KeepAlive`, `ThrottleInterval` 30. Source: `scripts/proactive-monitor.mjs` (label `com.day14.proactive-monitor`, installed by its own `scripts/install-proactive-monitor.sh`). Full context note: [[Agents/proactive-monitor|proactive-monitor]].
- `auto-restart-watchdog` (persistent daemon, 5-min cycle) — the fleet's self-healer. Scans every `_shared/poller/*-heartbeat.log`, reads the **last heartbeat line's timestamp** (not file mtime — subtle divergence from CLAUDE.md's "judge health by mtime only"), and if a daemon is stale past its threshold **and** its LaunchAgent is loaded, kicks it with `launchctl kickstart -k`. Default stale threshold **12 min**, with per-vertical overrides for interval-scheduled one-shots (`lawn-care-gm-`→45m, `realty-scout-`→80m) so their normal between-run idle isn't misread as a crash — and for those overridden agents it only restarts when the `stderr.log` is *freshly written* (a real crash signal), otherwise treats the gap as healthy idle. Restart discipline: **exponential backoff** (5→10→20 min, cap 30) between attempts on the same agent, **max 3 restarts / 30 min**, then it gives up and fires a **P1** alert (`🛑 Watchdog gave up`); each successful kick emits a **P2** (`🔧 Watchdog restarted`) and an audit-log entry. Intentionally **skips** itself, `proactive-monitor`, and `recursive-expansion` (the latter self-gates to a clean exit with no Gemini key + is `KeepAlive{SuccessfulExit:false}`, so staying down is its designed healthy state). Installed `RunAtLoad`+`KeepAlive`, `ThrottleInterval` 120, `agent-runtime.mjs`-wrapped so it emits its own `poller/auto-restart-watchdog-heartbeat.log` (every 60s) and journals to [[Agent Journal & Handoffs|Agent Journal]]. State: `_shared/founder-ops/watchdog-state.json`. Source: `scripts/auto-restart-watchdog.mjs` (label `com.day14.auto-restart-watchdog`, installed by `scripts/install-platform-agents.sh`). Full context note: [[Agents/auto-restart-watchdog|auto-restart-watchdog]].
- `outbox-deadletter` (persistent daemon, 30-min cycle) — Telegram-outbox hygiene: archives sent msgs >24h → `_sent/<YYYY-MM>/`, dead-letters unsent msgs (>6h, `retry_count` ≥3) → `_dead/` + P2 alert, and bumps `retry_count` on stragglers each pass. `RunAtLoad`+`KeepAlive`, `ThrottleInterval` 300 (5-min relaunch throttle — looser than the watchdog's 120 since its own cycle is 30-min), `agent-runtime.mjs`-wrapped so it emits its own `_shared/poller/outbox-deadletter-heartbeat.log` (watchdog tracks it) and journals to [[Agent Journal & Handoffs|Agent Journal]]. Source: `scripts/outbox-deadletter.mjs` (label `com.day14.outbox-deadletter`, installed by `scripts/install-platform-agents.sh`). Full context note: [[Agents/outbox-deadletter|outbox-deadletter]].
- `system-pulse` (persistent daemon, 30-min cycle) — the fleet's **ambient reassurance** notifier: every 30 min it Telegrams Jack a one-line P3 pulse of empire activity (`🫀 Pulse · N/M daemons green · quiet 30m, all running`), aggregating opps count, skill-draft backlog, cross-tenant audit-log activity in the last 30m, waiting CS drafts + queued posts, and daemon heartbeat health — deltas tracked in `founder-ops/system-pulse-state.json`. No LLM (pure filesystem aggregation, only `TELEGRAM_CHAT_ID` gates it); always chatty (~48 cards/day) unlike the change-gated [[Agents/proactive-monitor|proactive-monitor]]. `RunAtLoad`+`KeepAlive`, `ThrottleInterval` 120; emits its own `poller/system-pulse-heartbeat.log` (60s, watchdog-tracked) but does **not** journal. Source: `scripts/system-pulse.mjs` (label `com.day14.system-pulse`, installed by `scripts/install-platform-agents.sh`). Full context note: [[Agents/system-pulse|system-pulse]].
- `growth-narrator` (persistent daemon, **90-sec cycle**) — the fleet's **play-by-play announcer**: tails every tenant's `audit-log.jsonl` and Telegrams Jack a chatty emoji one-liner per event (`💸 <slug>: NEW SALE …`, `🎥 AI video done`, `🚀 launch complete`) from a fixed ~18-verb `NARRATORS` template table. No LLM (canned strings, only `TELEGRAM_CHAT_ID` gates it). Deliberately *samples* — 5-min per-tenant + 2-min empire throttle + one narration per cycle — so it's the per-event companion to the aggregate [[Agents/system-pulse|system-pulse]] pulse, not a complete log. Emits its own heartbeat (60s, watchdog-tracked); does **not** journal. Source: `scripts/growth-narrator.mjs` (label `com.day14.growth-narrator`, installed by `scripts/install-platform-agents.sh`). Full context note: [[Agents/growth-narrator|growth-narrator]].
- `video-pipeline-watcher` (persistent daemon, **60-sec cycle**) — the fleet's **raw-footage → publishable-clips** worker: watches every tenant's `raw-footage/` dir and, when a clip lands (and is size-stable), runs the full short-form pipeline — `ffmpeg` audio extract → Whisper transcription (OpenAI API or local `whisper` fallback) → SRT → three burned-in-caption cuts (9:16 / 1:1 / 4:5) → Gemini per-platform copy (TikTok/Reels/Shorts/Pinterest, grounded on the tenant `CONSTITUTION.md`) → `edited-content/<timestamp>/` + a P3 "video edits ready" card. Edits/drafts only — **never publishes** (posting is Jack's manual step). Emits its own heartbeat (60s, watchdog-tracked); does **not** journal. `ffmpeg`-hard (missing it degrades silently while the heartbeat stays green). Social-copy call is Gemini-direct on the checked-out tree (the `llmCall` migration lives only on the unmerged `chore/gemini-to-anthropic-2026-06` branch; Whisper path untouched). Source: `scripts/video-pipeline-watcher.mjs` (label `com.day14.video-pipeline`, installed by `scripts/install-platform-agents.sh`). Full context note: [[Agents/video-pipeline-watcher|video-pipeline-watcher]].
- `gamified-dashboard` (15-min interval one-shot; plist `StartInterval` 900 / `RunAtLoad` / no `KeepAlive`) — re-renders the empire as static RPG-themed HTML snapshots in `_shared/` (`empire.html` + `tenant-<slug>.html` + employees/content-pipeline/skills/opportunities/finance pages): XP/levels, 17 achievements, streaks, "battle log" = audit events. No LLM, no Telegram, no journal, **no heartbeat** (health = `empire.html` mtime). Explicitly an offline mirror of the canonical live `day14.us/admin` (from `empire-state.json` via `sync-empire-state.mjs`); headline numbers read from that canonical snapshot, else local fallback. Source: `scripts/gamified-dashboard.mjs` (label `com.day14.gamified-dashboard`, installed by `scripts/install-platform-agents.sh`). Full context note: [[Agents/gamified-dashboard|gamified-dashboard]].
- `auto-todo-sync` (hourly) — syncs human todos.
- `admin-sync` (15-min interval one-shot; plist `StartInterval` 900 / `RunAtLoad`, invoked `--push`) — sweeps the whole fleet's on-disk state into `studio/public/data/empire-state.json` + per-tenant `ops/<slug>.json` so the **Vercel** `/admin` can render without a Mac FS, then auto-commits + `git push origin HEAD`. No LLM/heartbeat/journal (health = `generated_at` freshness + stdio logs). ⚠ Repo-observed 2026-07-02: the JSON is fresh but no `sync:` commit has landed on any branch since 2026-06-05 — the push leg is dead and the cloud dashboard is serving stale state. Its working push also sweeps **any local commit on the active branch** to origin within ~15 min — the standing exception to "never push," with teeth. Source: `scripts/sync-empire-state.mjs` (label `com.day14.admin-sync`, installed by `scripts/install-admin-sync.sh`). Full context note (incl. the companion `com.day14.local-admin` KeepAlive dev-server): [[Agents/admin-sync|admin-sync]].

## The skill layer
282 SKILL.md specs (`docs/seeds/skills/`) + 60 hand-coded `run(ctx)` modules. Events route via `dispatch.ts` → `skill-runner.ts` (hand-coded fast path, else Claude Agent SDK loop with 6 tools: read_file, write_file, queue_telegram_card, log_action, request_jack_tap, finish). Skill loop uses **Anthropic** (Claude Agent SDK); the C-suite `.mjs` agents now route through the shared Claude-first `llm-call.mjs` as well (post-2026-06-26 migration), so the old "two stacks" split is collapsing — though ~21 other `.mjs` scripts still call Gemini directly. See [[Agent Org & Orchestration]] · [[Day14 — Current Open Items]]. `[Certain]`

## Per-agent context notes (`Agents/`)
One full context note per agent — purpose, cadence, inputs, outputs, LLM, journal location, handoff protocol, and guardrails — so each agent has its own complete brief (the tables above are the index; the notes are the detail). All 25 notes in `Agents/` are indexed here.

**C-suite employees (10)** — the `scripts/employees/*.mjs` roster in the table above:
- [[Agents/cfo-agent]] · [[Agents/performance-analyst]] · [[Agents/sales-director]] · [[Agents/pr-director]] · [[Agents/product-strategist]]
- [[Agents/customer-success-agent]] · [[Agents/brand-steward]] · [[Agents/compliance-officer]] · [[Agents/devops-sre]] · [[Agents/investor-relations]]

**Platform / infra agents (15)** — the always-on pollers, self-growth engines, founder-ops triage, idea-pipeline scout + pitchers, the media worker, the static-snapshot dashboard renderer, and the cloud-dashboard state syncer (installed outside `install-employees.sh`; detailed inline under *Always-on pollers* and *The engines* above):
- [[Agents/auto-restart-watchdog]] · [[Agents/proactive-monitor]] · [[Agents/outbox-deadletter]] · [[Agents/recursive-expansion]] · [[Agents/growth-watcher]] · [[Agents/priority-allocator]] · [[Agents/skill-multiplier]] · [[Agents/opportunity-scanner]] · [[Agents/system-pulse]] · [[Agents/growth-narrator]] · [[Agents/proactive-pitcher]] · [[Agents/expansion-prompter]] · [[Agents/video-pipeline-watcher]] · [[Agents/gamified-dashboard]] · [[Agents/admin-sync]]

## Related
[[Agent Org & Orchestration]] · [[Agent Oversight (Command Deck)]] · [[Day14 OS — System Map]] · [[Role — Dev & Build Agent]]


---

# Agent Journal & Handoffs

The vault → agents path is the compiled context (read-only). This is the **return path**: agents write back when they finish a job or need to tell a future job something. Notes live in the vault, so Obsidian shows them *and* the next `npm run context:compile` folds them back into everyone's context — closing the loop.

## The three write-backs (helper: `scripts/_generic/agent-journal.mjs`)

1. **Journal** — "what I just did." One line per job, appended to `Agent Journal/<agent>.md`.
   `await journal("cfo-agent", "Daily P&L written", { tenant: "day14" })`
   Auto-fires for any agent wrapped in `tryRun` (it journals every completion + failure).

2. **Handoff** — "something a future job / another agent / Jack needs to know." Appended to [[Handoffs & Open Questions]].
   `await handoff("realty-scout", "County CSV columns changed — parser needs 'APN2'", { tag: "blocker" })`

3. **Append to a note** — add a timestamped line under an existing note's `## Agent log` section (never overwrites curated content).
   `await appendToNote("Business — alignmd", "Confirmed partner contact: …", { agent: "sales-director" })`

## Rules for agents
- **Append, never overwrite.** Curated notes are governance; add to the `## Agent log` section, don't rewrite the body.
- **Journaling never blocks a job** — the helper is best-effort and silent on failure.
- **Handoffs are for the future** — leave what the next run needs: a blocker, a changed assumption, a half-finished task, a question for Jack.
- **Resolve, don't delete** — strike through a handoff (`~~…~~`) when it's handled, so the history survives.
- Still bound by [[Working with Jack]]: no push, no money, no customer send without a Jack tap.

## Where it lives
- `Agent Journal/<agent>.md` — per-agent run logs (auto-generated).
- [[Handoffs & Open Questions]] — the shared cross-agent message board.
- Both are folded into the compiled `AGENT-CONTEXT.md`, so a fresh agent reads recent handoffs as part of its context.

## Related
[[Agent Org & Orchestration]] · [[Agent Roster]] · [[00 — Agent Boot (START HERE)]]


---

# Handoffs & Open Questions

Where any agent (or Jack) leaves a note for future jobs, other agents, or Jack himself. **Append-only**; resolve an item by striking it through (`~~…~~`), don't delete — the history matters. Newest at the bottom. Protocol: [[Agent Journal & Handoffs]].

- **2026-06-26 00:00** system → `seed`: Write-back channel is live. Agents wrapped in `tryRun` auto-journal; use `handoff()` to post here. This loop feeds back into the compiled context on the next `npm run context:compile`.
- **2026-06-26** day-sweep → all agents / Jack: Three jobs done, vault-only. (1) Created `Agents/` with one context note per C-suite employee (10: cfo-agent, performance-analyst, sales-director, pr-director, product-strategist, customer-success-agent, brand-steward, compliance-officer, devops-sre, investor-relations) — each covers purpose, cadence, inputs, outputs, LLM (now Claude-first `llm-call.mjs`), `Agent Journal/<name>.md`, handoff protocol, guardrails; uncertain items tagged ⚠ CONFIRM. Linked from [[Agent Roster]] + [[Day14 Vault — Index]]. (2) Applied the two pending hub fixes from [[_sweeps/MORNING-BRIEF-2026-06-26]]: added [[Business — BuildBridge]] to [[Businesses — Overview]] table + Index business-scope; added [[Brand — House of Love Co]] to Overview under a new "Powered by Day14 (non-pillar)" heading (no longer an orphan). (3) Added empty `## Agent log` sections to [[Day14 — Current Open Items]], [[Business — alignmd]], [[Business — day14-realty]] for `appendToNote()` write-backs. All 541 wikilinks verified, 0 broken. **For Jack:** ~~the per-agent notes flag several ⚠ CONFIRM gaps (exact launchd labels, dup guards, heartbeat emission on the C-suite timers)~~ *(resolved 2026-07-06 — repo-verified across all `Agents/` notes; see entry at bottom)* and one norm break to fix — product-strategist still overwrites `product-strategy.md` (no history).
- **2026-06-26** day-sweep (hub-fixes verify) → all agents / Jack: Hub fixes from [[_sweeps/MORNING-BRIEF-2026-06-26]] confirmed **already in place** (a prior sweep applied them) — [[Business — BuildBridge]] is in the [[Businesses — Overview]] table (with its ⚠ framing-pending note) and the [[Day14 Vault — Index]] business-scope section; [[Brand — House of Love Co]] is reachable from Overview under the "Powered by Day14 (non-pillar)" heading. No re-apply needed (would have duplicated). Re-verified wikilinks: 563 instances, 0 broken (the 3 flagged are intentional `[[Note name]]`/`[[note]]` examples in conventions text). Vault-only, no commits/customer contact.
- **2026-06-26** day-sweep (stripe+deploy runbook) → Jack: Wrote [[Runbook — Go Live & Get Paid]] — a copy-paste, zero-thinking runbook for the two pure-mechanics blockers that are gated on Jack, not the agents. **Part A (Stripe):** find the `acct_…` id in the dashboard account switcher / Settings → Business → Account details (or `stripe config --list`), `echo` it as `STRIPE_ACCOUNT` into `~/Documents/studio/.env.local`, `set -a && source .env.local && set +a && npx tsx scripts/create-stripe-payment-links.ts`, paste the 3 printed `STRIPE_PAYMENT_LINK_*` lines back, rebuild — noting the key is `sk_org_live` (**real charges**). **Part B (Ship):** kill `next dev` before any build, `git status`, stage the deck+backend+LLM+journal+activation paths, `npm run build` (the real gate), commit local-only, flip Vercel Production Branch `main → redesign`, push. Every command is a bare ```bash block with **no inline `#` comments** (zsh treats `#` as an arg, per [[Shell Handoff Rules (zsh)]]). Linked from [[Day14 — Current Open Items]]. **Jack still executes** — runbook does not push, charge, or contact anyone. Vault-only, no commits/customer contact.
- **2026-06-26** day-sweep (per-agent notes verify) → all agents / Jack: Confirmed the `Agents/` per-employee context notes already exist and are **complete** — all 10 (cfo-agent, performance-analyst, sales-director, pr-director, product-strategist, customer-success-agent, brand-steward, compliance-officer, devops-sre, investor-relations) carry every required section (purpose · cadence · inputs · outputs · LLM = Claude-first `llm-call.mjs` · journal `Agent Journal/<name>.md` · handoff protocol · guardrails · known gap), and all 10 are linked from [[Agent Roster]]. No re-create (would have duplicated). Re-verified wikilinks: 574 instances, 0 broken (5 flagged are the intentional `[[Note name]]`/`[[note]]` protocol examples). ~~Open ⚠ CONFIRM items still standing for Jack: exact launchd labels, dup guards, and heartbeat emission on the C-suite timers~~ *(resolved 2026-07-06 — repo-verified, see entry at bottom)*; plus the norm break to fix — product-strategist overwrites `product-strategy.md` (no history). Vault-only, no commits/customer contact.
- **2026-06-26** `vault-curator` → all agents (DEMO — this is what a good handoff looks like): Three kinds of thing belong here, written so the *next* run can act without re-deriving context. **(1) Blocker:** "`npm run context:compile` skips `Agent Journal/` because the compiler's glob only globs `*.md` at vault root, not subfolders — per-agent run logs never reach `AGENT-CONTEXT.md`. Next devops run: widen the glob in `scripts/context-compile.mjs` to recurse, then re-verify a journal line appears in the compiled output. ⚠ unverified — I read the symptom, not the compiler source." **(2) Question for Jack:** "Should agent-log lines in business notes get pruned after they fold into the compiled context, or accrete forever? Affects whether `appendToNote()` needs a retention cap. Defaulting to accrete-forever until told otherwise." **(3) Changed assumption:** "Previously assumed every agent emits a heartbeat on its launchd timer — the C-suite timers (cfo-agent et al.) do **not** yet, so fleet-health-by-heartbeat will read them as dead. Don't alarm on missing C-suite heartbeats until the emit is wired." Resolve any of these by striking through (`~~…~~`) once handled — don't delete. Vault-only, no commits/customer contact.
- **2026-06-26 16:50 UTC** `vault-curator` (QA/currency sweep) → all agents / Jack: Comprehensive currency pass done; the only real stale-fact cluster was the C-suite LLM migration not being reflected in [[Agent Roster]] / [[Day14 OS — System Map]] / [[Day14 — Business Scope & Pivot Points]] / [[Glossary & Conventions]] (skill count + Gemini-direct) — all fixed and confidence-tagged. Three items left **unresolved for a human, intentionally**: **(1) Minor frontmatter lag (not fixed, to avoid claiming edits I didn't make):** [[Businesses — Overview]] still reads `updated: 2026-06-22` but its body already carries the BuildBridge row + "Powered by Day14" House-of-Love section added by later sweeps; likewise [[Business — Splash Jacks Pools]], [[Business — life-loophole]], [[Business — BuildBridge]] had `## Agent log` sections appended after their `updated: 2026-06-22` stamp. A future sweep (or whoever next edits the body) should bump those four `updated` fields. **(2) Consolidation watch (not an error):** [[Day14 — Strategic Direction]] ↔ [[Day14 — Business Scope & Pivot Points]] still overlap on wedge/pivots — currently an acceptable thesis-vs-scope split, but keep one fact in one home on future edits (carried from [[_sweeps/vault-health-2026-06-26]]). **(3) Out-of-vault, already tracked:** the stale `211/6` skill counts in `CLAUDE.md` are governance (Jack edits) — logged in [[Day14 — Current Open Items]], not touched here. Vault-only, no commits/customer contact.
- **2026-06-26** session (tenant registry + homepage proof) → all agents / Jack: **(1) tenants.json completed + bug-fixed.** Five newer-schema entries (`display_name`/`stage`, no `status`) were invisible on `/dashboard/tenants` because the dashboard buckets by `status` and a null status falls into no bucket — this is what hid day14-realty + 4 others. Fixed by hardening `src/lib/tenants.ts` `getTenants()` with `normalizeTenant()` (coalesce name←display_name←slug, derive status from stage, default owner/billing/skill_packs) **and** backfilling explicit `status` in the data. **Added 3 missing real businesses:** splash-jacks-pools, buildbridge, house-of-love-co. Registry now = **9 tenants**, all bucketed (active: day14, alignmd, life-loophole, splash-jacks-pools, buildbridge, house-of-love-co · paused: day14-realty · archived: hot-flash-co, kennum). **(2) House of Love Co = Casamoré** (Jack-confirmed same brand) — merged to one tenant `house-of-love-co` (aliases casamore/Casamoré, domain houseoflove.co); see [[Brand — House of Love Co]]. **(3) Homepage proof** (`src/components/cinematic/Proof.tsx` + `cinematic.css`) expanded 2 → **4 live tiles** (Splash Jacks, AlignMD, BuildBridge, Casamoré) in a 2×2 grid. BuildBridge links to its internal `/case-studies/buildbridge` walkthrough until Jack supplies the production URL (app built, URL pending); the other three link to live sites. **Open for Jack:** (a) BuildBridge prod URL → swap one `href` + flip tag to "· live"; (b) loader + Proof changes are **code, uncommitted** → ship on next build/commit/push (Jack-gated); tenants.json changes are **data, already live** and sit outside git (`_shared`). Vault-only, no commits/customer contact.
- **2026-06-26** session (sales funnel — ran live, freeze lifted) → Jack: Sourced **12 verified** SWFL local-service prospects with weak/Facebook-only web presence + a real contact channel each (cited sources), and drafted a tone-matched cold outreach email per prospect in Jack's operator voice. Verticals: pool service, mobile detailing, mobile mechanic, lawn care, handyman, pressure washing. Excluded ~10 candidates that turned out to have real websites (kept honest). Output: `~/Claude/Projects/DAY14/sales/prospects-2026-06-26.md`. **Drafts only — nothing sent; Jack reviews + sends.** Two contact caveats noted in the file (Sharky's use the 239 #; 2 Veterans has an out-of-state cell). The scheduled 11:30 PM `day14-night-1-sales-funnel` block was **disabled** (ran live instead). Vault-only note; no commits/customer contact.
- **2026-06-27** `day14-night-2-gemini-migration` (Part 1 — .mjs side) → all agents / Jack: **Gemini→Anthropic full transfer, Part 1 done on branch `chore/gemini-to-anthropic-2026-06` (local commit `8ac6f4b`, NOT pushed).** Goal met: every TEXT LLM call in `scripts/*.mjs` now routes through `_generic/llm-call.mjs`, which is **Anthropic-only** (Claude Haiku). **Central changes:** (1) `llm-call.mjs` — removed the Gemini text code path; `llmCall()` signature kept stable (`useGrounding`/`preferAnthropic`/`model` still accepted but are no-ops; legacy Gemini model names dropped in favour of the Anthropic default); header rewritten to "Anthropic-only". (2) `_generic/_lib.mjs` — its `callGemini(prompt, env, opts)` now delegates to `llmCall`, which transitively migrates **every `_generic` engine** that imports it: blog-post, email-newsletter, cross-poster, tiktok-script, trend-watcher, hashtag-researcher, reddit-engagement, content-calendar-orchestrator, pinterest-pin-generator. **Direct-call scripts rewritten onto `llmCall`:** bot-brain, idea-pitcher, opportunity-scanner, expansion-prompter, skill-multiplier, recursive-expansion-engine, video-pipeline-watcher (text social-copy only — its OpenAI Whisper transcription path is untouched). **Residual guard cleanup** (these already used `llmCall`; flipped their `GEMINI_API_KEY` precondition guards → `ANTHROPIC_API_KEY`): all 9 `employees/*` (brand-steward, cfo-agent, compliance-officer, customer-success-agent, investor-relations, performance-analyst, pr-director, product-strategist, sales-director), plus competitor-researcher, brand-identity-generator, business-bootstrap. 27 files committed; `node --check` passes on all 27. **TEXT script still NOT migrated (deferred, on purpose):** `scripts/idea-worker.mjs` — it's a native Gemini **function-calling agent loop** (multi-turn tool use via `functionDeclarations` + grounded research returning source citations). `llmCall` is single-shot text-only and cannot carry that protocol; this needs a proper Anthropic **tool-use** rewrite, not a mechanical swap. Its `GEMINI_API_KEY` guard/alias logic was left intact so it keeps working on Gemini until rewritten. **Image/audio holdouts deferred to Part 2 (Anthropic can't gen images or transcribe — left on Gemini):** cc-nano-banana, skill-bridge, generate-hot-flash-designs, hot-flash-co-{daily,marketing}-engine, workday-o8-image-composition, workday-t16-banana-loophole-heroes, workday/t17-brand-heroes, _internal/{banana-refire,generate-og-day14-os,landing-images-2026-06-02,og-refresh-2026-06-09}, transcribe-voice, merch-attacher (image parts), launch-hot-flash-co + new-store-bootstrap (image-gen paths only — their TEXT already routes through `llmCall`). `scripts/connect-gemini.sh` (shell setup) left as-is. **Notes:** vestigial `const GEMINI_MODEL = "gemini-2.5-flash"` lines remain unused in several migrated files (harmless, left to keep the diff focused); the sandbox dropped the exec bit on some scripts (100755→100644) — cosmetic, they run via `node`. The pre-existing uncommitted working-tree changes (CLAUDE.md, AGENT-CONTEXT.md, public/data/*, Proof.tsx, cinematic.css, tenants.ts, *.generated.ts, create-stripe-payment-links.ts) were deliberately **left unstaged** — not part of this commit. ⚠ **unverified — needs mini `npm run build`** (only `node --check` was run; no `next build`, no daemon/poller restart, no push). Vault-only handoff; no customer contact.
- **2026-06-27** `day14-night-3-blackboard-handoff` (Part 2 — TypeScript side + cleanup) → all agents / Jack: **Gemini→Anthropic full transfer, Part 2 done on branch `chore/gemini-to-anthropic-2026-06` (local commit `28c6d3f`, parent `8ac6f4b`, NOT pushed).** Text generation is now Claude-first across `src/` too. **What landed (21 files):** (1) New `src/lib/anthropic-call.ts` — typed Claude Haiku text helper mirroring `gemini-call.ts`'s interface so callers swap with one import/name change; retries on 429+529. (2) `gemini-call.ts` kept but **deprecated for text** — its Anthropic fallback now delegates to `callAnthropic` (single Anthropic path); zero text callers remain in `src/`. (3) **13 text skills migrated** `callGemini`→`callAnthropic`: blog-post-generator, customer-service-triage, email-newsletter-composer, etsy-listing-writer, etsy-pricing-validator, etsy-product-mockup-prompts, etsy-shop-policies-generator, etsy-tag-researcher, pod-design-brief-generator, pod-niche-researcher, pod-product-mix-recommender, social-cross-post, viral-hook-rewriter. Also **removed 3 stale `model: "gemini-2.5-flash"` args** (in pricing-validator/tag-researcher/niche-researcher) that would have been sent as an invalid Anthropic model — they now use the Claude default. (4) **Image holdout quarantined:** `src/lib/skills/image-generator.ts` tagged with a `HOLDOUT:` header — it's the **only** remaining intentional Gemini caller in `src/`; `GEMINI_API_KEY` is now image-gen-only. `connect-gemini.sh` re-headed (text→`connect-anthropic.sh`, key now image-only). (5) Cosmetic LLM-provider wording scrubbed: `tools/page.tsx` ("Gemini-search"→"research"), `stack/page.tsx` ("Gemini-grounded scan"→"AI scan"), admin `health`+`ship` integration cards (Gemini relabeled "image-gen holdout", Anthropic copy now says it drives content). Image-gen status text in `cinematic-image.tsx`/`empire-constellation.tsx` deliberately **left untouched**. **No audio skill exists** — the "transcript" grep hits were text labels (`phone-transcript` channel, "in-person transcription" copy), not real audio calls; nothing to quarantine there. ✅ **Verified: `npx tsc --noEmit` exit 0** (full project typechecks clean) + grep confirms no `callGemini`/`gemini-call` left outside the image holdout + commit contains 0 `*.generated.ts` and 0 `.mjs`. ⚠ **Known regression — lost web grounding:** Anthropic has no drop-in for Gemini `googleSearch`, so `useGrounding` is a **no-op** in `anthropic-call.ts` (empty `sources`); etsy-pricing-validator, etsy-tag-researcher, pod-niche-researcher (and blog-post-generator's `use_research`) now answer from model knowledge, not live search — each file carries a dated NOTE. To restore: wire a web-search tool into `anthropic-call.ts` (~0.5–1 day). ⚠ **Not run:** `next build`, no daemon restart, no live Claude call (needs `ANTHROPIC_API_KEY` + mini) — recommend one live invocation of blog-post-generator + etsy-tag-researcher on the mini before relying on them. ⚠ **Sandbox git note:** `.git/index.lock` AND `.git/HEAD.lock` were stale and **un-removable** (FUSE unlink block), so the commit was made via plumbing (`write-tree`/`commit-tree`) + writing the branch ref file directly. Commit is real and on-branch, but `.git/index` is now stale vs HEAD — **on the mini, run a bare `git reset` once** to reconcile the index before further work. Pre-existing uncommitted working-tree changes (Part 1's staged `.mjs`, `*.generated.ts`, CLAUDE.md, AGENT-CONTEXT.md, public/data/*, etc.) were left untouched. **Decision memo for Jack** (image-provider options: keep Gemini / OpenAI gpt-image-1 / Replicate / Fal, with effort + recommendation): `~/Claude/Projects/DAY14/gemini-holdouts-2026-06-27.md`. **Still on Gemini after Parts 1+2 (legit holdouts):** all image-gen scripts/skills + `scripts/idea-worker.mjs` (Gemini function-calling agent loop — needs a proper Anthropic tool-use rewrite, deferred in Part 1). Vault-only handoff; no commits to remote, no customer contact.
- **2026-06-27 ~09:35 UTC** `day14-night-4-fleet-and-rollup` (Gemini-purge verification + fleet diagnostic + roll-up) → all agents / Jack: **Purge verified GREEN on `chore/gemini-to-anthropic-2026-06`** (commits `8ac6f4b`+`28c6d3f` present): `npx tsc --noEmit` exit 0, `node --check` clean on 18 migrated+residual `.mjs`. The 53 grep hits for Gemini markers are mostly **vestigial** (`_lib.mjs callGemini()` and `gemini-call.ts` both delegate to Anthropic; `GEMINI_MODEL` consts dead). **3 TEXT scripts still call `generativelanguage` directly = follow-up pass needed:** (1) `scripts/idea-worker.mjs` — Gemini function-calling + grounding loop, live via Telegram, 0 Anthropic refs (also 429-dead since mid-May per founder-ops briefings — porting it fixes a long outage too); (2) `scripts/hot-flash-co-marketing-engine.mjs` — plain marketing text on `gemini-2.5-flash`, **easy mechanical port to `llmCall`**; (3) `scripts/hot-flash-co-daily-engine.mjs` — grounded research text (image paths legit holdout). All image (cc-nano-banana, image-generator.ts, imagen/nano-banana, OG/banana/hero scripts) + audio (`transcribe-voice.mjs`) holdouts are EXPECTED. Full detail + recommended follow-up: `~/Claude/Projects/DAY14/gemini-purge-verify-2026-06-27.md`. **FLEET (read-only, heartbeat mtime only):** 9 pollers live (<1m). **🟠 Cluster of 6 down ~30 h** — auto-restart-watchdog, customer-success, events-poller, expansion-prompter, growth-narrator, system-pulse all stopped within ~60 s on Jun 26 03:13–03:14 → single host event (mini sleep / lost launchd session); **the watchdog itself is in the dead set so nothing self-healed → priority restart.** **🔴 ~16.5-day group** — gmail-cs-triage / stripe-cs-loop / vercel-deploy-monitor (no plist in repo = likely retired during relaunch; recommend deleting orphan heartbeat files) + per-tenant lawn-care-gm-kennum + realty-scout-day14-realty (Jack decides retire vs reinstate). Copy-paste restart runbook (boot script + `launchctl kickstart -k` by exact `com.day14.*` label, verify loop) in `~/Claude/Projects/DAY14/fleet-health-2026-06-27.md`. **ROLL-UP:** could NOT `git add` from the sandbox — `.git/index.lock` (0-byte, from night-3's plumbing commit) is un-removable here (FUSE block). **No build risk found:** verified `src/lib/anthropic-call.ts` IS committed in HEAD `28c6d3f` (the index's `D ` on it is just stale-index-vs-HEAD drift from the plumbing commit, not a pending delete). On the mini: `rm -f .git/index.lock .git/HEAD.lock && git reset` to reconcile, then `git add` the 5 real-uncommitted paths (Proof.tsx, cinematic.css, tenants.ts, docs/agent-context/AGENT-CONTEXT.md, CLAUDE.md — all confirmed differ from HEAD; NOT generated files, NOT create-stripe-payment-links.ts). Ready commit message in the fleet report. **Agent blackboard / handoff build was DEFERRED** to prioritize the Gemini purge — re-add when Jack wants it. Read-only on fleet; no commits/builds/restarts/customer contact.

- **2026-06-27** `daily-prospect-finder` → Jack: New prospect list ready at `sales/prospects-2026-06-27.md` — **9 verified Facebook-only SWFL businesses** (painting, auto/boat detailing, pressure washing/paver sealing, pool, mobile mechanic; Cape Coral/Lehigh Acres/Bonita Springs/Fort Myers/Naples). All zero-website (every candidate with a real domain was dropped); 7 have public emails, 2 are phone-only call scripts. Drafts in file, not sent. Note: tree/irrigation/window/junk verticals now website-saturated — future runs should lean painting + detailing and widen to Marco Island/Estero/Sanibel/Punta Gorda.

- 2026-06-28 — Daily prospect list ready (`sales/prospects-2026-06-28.md`): 5 verified Facebook-only SWFL businesses (Aces Tree Service, D's Trees & Landscaping, Dawg Spaw Mobile Grooming, Lora's Mobile Dog Grooming, Precision Welding & Fabrication), each with verified contact + cold-email draft. Hard day — common verticals now saturated with website-owners; ~30+ candidates checked, many excluded for having sites. File includes recommendations to widen the net (loosen bar to weak/no-booking sites, push geography out, fresh micro-verticals).
- **2026-06-28** session (website additions — ran live) → Jack: Built, all UNCOMMITTED on branch feat/cinematic-rebuild-2026-06, needs mini `npm run build` to verify. (1) **Flow-in motion:** audited the cinematic reveal system — already strong (staggered reveals + count-up stats everywhere); the one gap was the footer popping in, now wrapped in `<Reveal stagger>` (`SiteFooter.tsx`). (2) **ROI/savings calculator:** new `src/components/cinematic/RoiCalculator.tsx` (+ `.cin-roi*` CSS in cinematic.css), honest estimate (assumptions shown: ~60% admin automation, ~15% capture lift), quotes NO Day14 price. Mounted on the homepage between Proof and Pricing (`CinematicHome.tsx`); accepts `initialTrade` prop. (3) **Five trade-specific vertical pages:** added pool-service, lawn-care, pressure-washing, handyman, mobile-detailing to `VERTICALS` + extended `VerticalSlug` in `src/lib/site.ts`; embedded `<RoiCalculator initialTrade=…>` into `src/app/verticals/[slug]/page.tsx` (defaults each page to its trade). Outreach from the daily prospect finder can now deep-link to the matching trade page. Previews for Jack: `~/Claude/Projects/DAY14/{hero-preview-grand.html (REJECTED — kept old hero), roi-calculator-preview.html}`. **For Jack:** SELL-FIRST FREEZE was lifted today (CLAUDE.md). Open decision: image-gen/audio Gemini holdouts (memo coming from overnight block). Vault-only note; no commits/customer contact.
- 2026-06-28 22:34 ET generator-build-loop: completed queue item 1 (lead-capture API). New file src/app/api/preview-lead/route.ts — POST appends to _shared/growth/preview-leads.jsonl, email-validated, IP rate-limited, no autonomous send. [generator-build-loop, uncommitted, needs mini build]

- [2026-06-28 23:05 ET] Generator item 2 — email-capture island on /preview/[token]: new src/app/preview/[token]/EmailCapture.tsx (client, POSTs to /api/preview-lead, inline states, no autonomous send) + wired into src/app/preview/[token]/page.tsx. (generator-build-loop, uncommitted, needs mini build)
- 2026-06-28 (generator-build-loop): completed queue item #3 — outreach generator. Added pure `generateOutreach(d, origin?)` + `previewUrl()` + `PREVIEW_ORIGIN` to src/lib/preview.ts (operator-voice cold email tied to preview link via same encodePreview codec; honest, drafts-only). Files: src/lib/preview.ts. [generator-build-loop, uncommitted, needs mini build]

- [2026-06-29] generator-build-loop — item 4 (prospect-finder preview links): BLOCKED direct (~/Claude/Scheduled is outside writable folders); staged paste-in patch + inline encodePreview codec doc at ~/Claude/Projects/DAY14/generator-item4-prospect-finder-preview-patch.md (verified token round-trip). Jack: paste block into day14-daily-prospect-finder/SKILL.md to close. Files: generator-item4-prospect-finder-preview-patch.md, generator-build-queue.md. [generator-build-loop, uncommitted, needs mini build, needs-jack-paste]

- **2026-06-29 00:33** generator-build-loop → Jack: Queue item 5 (Multi-page: services) done. Created `src/app/preview/[token]/services/page.tsx` — additive cinematic services page from `tradeContent().services`, same sticky honesty ribbon, noindex, CTAs to booking + back to `/preview/<token>`. Tags: generator-build-loop, uncommitted, needs mini build.- **2026-06-29** generator-build-loop → Jack: Queue item 6 (multi-page about) done. Created `src/app/preview/[token]/about/page.tsx` — additive new route mirroring services/page.tsx (sticky honesty ribbon, `var(--cin-*)` tokens, noindex, same preview.ts imports). Generated trade+city-tailored "About {name}" header, an honest editable-placeholder intro, three generic "What to expect" pillars, platform paragraph, and closing CTAs. No fabricated founder/team/customer/testimonial. Tagged: generator-build-loop, uncommitted, needs mini build.

- 2026-06-29 01:34 ET — Generator queue item 7 (Multi-page: contact) done: created `src/app/preview/[token]/contact/page.tsx` (additive route, embeds EmailCapture island from item 2, honesty ribbon + cinematic tokens, noindex; no fabricated contact details, no autonomous send). [generator-build-loop, uncommitted, needs mini build]

- 2026-06-29 02:06 ET — generator-build-loop: item 8 (Preview shell + nav) done. Created src/app/preview/[token]/layout.tsx (sticky shared honesty ribbon + Home/Services/About/Contact nav under business name); removed duplicate inline ribbon from page.tsx + services/about/contact pages. tsc --noEmit clean. Tags: generator-build-loop, uncommitted, needs mini build.

- 2026-06-29 (generator-build-loop): completed queue item 9 — expanded `TRADE_CONTENT` in `src/lib/preview.ts` with 6 new trades (hvac, cleaning, pest, salon, roofing, electrician), each tagline + 6 services, and extended `normalizeTrade` keyword routing. tsc clean. Files: src/lib/preview.ts. #generator-build-loop #uncommitted #needs-mini-build
- generator-build-loop (2026-06-29): completed queue item 10 — honest preview proof section. New `src/app/preview/[token]/Proof.tsx` (server component, pulls live+public CASE_STUDIES, no fabricated testimonials, data-cta hooks) wired into `src/app/preview/[token]/page.tsx`. DEVIATION: did NOT link AlignMD (not in CASE_STUDIES + positioning north-star keeps the equity play off cold traffic); linked the real publicly-live builds (Splash Jacks, Casamoré) instead. tsc rc=0. Tagged: generator-build-loop, uncommitted, needs mini build.

- 2026-06-29 03:33 ET — generator-build-loop: item 11 (Preview FAQ) done. Created src/app/preview/[token]/Faq.tsx (honest 4-Q&A: speed/included/pricing/ownership; pricing links to /pricing not dead /#pricing anchor) + wired into page.tsx. tsc clean. [generator-build-loop, uncommitted, needs mini build]
- [generator-build-loop] Item 12 (responsive pass) done — appended one additive `@media (max-width:560px)` block to `src/app/cinematic.css` (hero Build-it console + assembling dashboard + `.cin-hcta` CTA clusters; `.cin-bo-title` ellipsis; preview pages verified already-fluid). Files: src/app/cinematic.css. Tags: generator-build-loop, uncommitted, needs mini build.

- 2026-06-29 04:37 ET — generator-build-loop item 13 (accessibility pass): added skip-link + `<main id="cin-main">` landmark and `.cin-pnav` class in `src/app/preview/[token]/layout.tsx`; appended additive item-13 a11y block to `src/app/cinematic.css` (focus-visible/hover for .cin-skip, .cin-pnav, .cin-proof-card, .cin-link, .cin-seg-go, .cin-build-hint a — the proof/link classes previously had NO CSS). Confirmed assembling dashboard already collapses under reduced-motion. tsc rc=0, braces 506/506. **generator-build-loop, uncommitted, needs mini build**

- [generator-build-loop] Item 14 (CTA analytics) done: preview `data-cta` tags were inert (no `<CanvasField>` on preview routes = no delegated `track()` listener). Added `src/app/preview/[token]/CtaAnalytics.tsx` (client island, mirrors CanvasField's delegated `[data-cta]`→`track("cta_click")` pattern, adds `surface:"preview"`) + wired into `src/app/preview/[token]/layout.tsx`. Files: CtaAnalytics.tsx (new), layout.tsx (import+mount). tsc rc=0. — generator-build-loop, uncommitted, needs mini build
- 2026-06-29 generator-build-loop: item 15 (SEO/meta) — new `src/app/preview/[token]/meta.ts` (`previewMetadata`: noindex + canonical + OG/Twitter text tags, text-only `summary` card, `absolute` titles); delegated the 4 preview `generateMetadata`s (page/services/about/contact) to it. tsc rc=0. [generator-build-loop, uncommitted, needs mini build]
- **2026-06-29 06:0X** generator-build-loop → Jack: Queue item 16 (brand-kit scaffold, text-only) done. Added pure `brandKit(trade)` to `src/lib/preview.ts` (per-trade palette hex + font pairing, all 12 trade slugs + `other` fallback, normalized via `normalizeTrade`) and new server component `src/app/preview/[token]/BrandStarter.tsx`, wired into `src/app/preview/[token]/page.tsx` (between Faq and EmailCapture). Honest: "starting point, not finished brand," NO logo image (provider still blocked), no fabricated prices/metrics. `npx tsc --noEmit` rc=0. Tagged: generator-build-loop, uncommitted, needs mini build.
- 2026-06-29 generator-build-loop: completed queue item 17 (image-provider research, RESEARCH ONLY). Wrote ~/Claude/Projects/DAY14/image-provider-options-2026-06-29.md — recommends OpenAI GPT Image 1.5 for logo+social (best text fidelity, lowest effort, sync REST + transparent PNG; pin to gpt-image-1.5 not deprecating gpt-image-1), Replicate FLUX as fallback. No code. [generator-build-loop, uncommitted, needs mini build]

- 2026-06-29 07:0X ET — generator-build-loop item 18 (QA + ship-readiness) DONE — queue complete. `npx tsc --noEmit` rc=0 (clean across all 13 new generator files + 2 modified); no new `.mjs` so `node --check` N/A. Wrote `~/Claude/Projects/DAY14/generator-ship-report-2026-06-29.md` with the full file inventory, exact `git add` paths, commit message, DO-NOT-stage list (public/data, stripe script, generated registry/graph), and 4 open follow-ups (item-4 prospect-finder patch staged not applied; image provider = OpenAI GPT Image 1.5 unwired; preview links dead until deploy; `next build` gate is mini-only). Flagged **Hero.tsx must ship in the same commit** (imports `encodePreview` from the untracked `preview.ts`). Updated `Day14 — Current Open Items` (new COMMIT+DEPLOY generator bullet). **generator-build-loop, uncommitted, needs mini build**
- **2026-06-29** session (agent↔vault wiring verify) → all agents / Jack: Made the context compiler **self-maintaining** — `scripts/compile-agent-context.mjs` now auto-includes every root-level vault note (minus a volatile denylist: Current Open Items, Jack's Action Board, Jack — Confirm These, Changelog, Vault Index) on top of the curated `FULL_CONTEXT_NOTES`, so new notes reach agents WITHOUT editing the script. Recompiled: AGENT-CONTEXT.md now **35 notes / 1831 lines** (previously 24) — agents previously had NO context on BuildBridge, House of Love/Casamoré, the Instant Preview generator, or the orchestration design; all now included. Verified READ path (preamble injection in `llm-call.mjs` + `loadAgentPreamble`) and WRITE path (`journal()` writes to `Agent Journal/<name>.md`; confirmed real agents journaling today — devops-sre, sales-director, compliance-officer, brand-steward, outbox-deadletter). **Fleet liveness (heartbeat mtime):** core healthy (~16 pollers at 0m). STALE: gmail-cs-triage, stripe-cs-loop, vercel-deploy-monitor (~19d — need a mini restart, non-urgent); lawn-care-gm-kennum + realty-scout stale BY DESIGN (kennum retired / realty kill-switched). **Uncommitted (ride next commit):** `scripts/compile-agent-context.mjs`, `docs/agent-context/AGENT-CONTEXT.md`, `docs/agent-context/agent-preamble.md`. Agents already read the fresh working-tree context now; commit is for durability. Vault-only, no push/customer contact.

- **2026-06-29** themed-preview-loop item 1 (extend brandKit theme tokens) DONE — `src/lib/preview.ts`: added `mood`/`bg`/`heroGradient` to `BrandKit`, reconciled all 12 BRAND_KITS to the THEME TOKENS table (card `surface`=#ffffff on light moods / dark surface on dark moods; `ink` now mood-aware text color), added `PreviewTheme` interface + `previewTheme(trade)` accessor (with mood-derived `line`). Feeds item 2 theme plumbing. `npx tsc --noEmit` rc=0. **themed-preview-loop, uncommitted, needs mini build**

- 2026-06-29 21:04 — themed-preview item 2 (theme plumbing) done: new `src/app/preview/[token]/theme.tsx` (previewFontHref + previewThemeCss + PreviewThemeHead emitting `--pv-*` scoped to `.pv-root` + Google Fonts preconnect/link). tsc rc=0. [themed-preview-loop, uncommitted, needs mini build]
- **2026-06-29 22:11** agent-collab-loop: Item 1 done — built `scripts/_generic/blackboard.mjs` (shared run-context blackboard: openRun/postFinding/readFindings/addArtifact/listRun/closeRun, append-only posts.jsonl, best-effort/never-throw; node --check + --selftest pass). `agent-collab-loop, uncommitted, not live-scheduled`
- 2026-06-29 22:40 — agent-collab-loop: built `scripts/_generic/agent-registry.mjs` (queue item 2) — read-only capability map of all 10 C-suite agents (purpose/inputs/outputs/handsOffTo) grounded in Agent Roster + Org&Orchestration §3 edges; exports getAgent/allAgents (+agentNames/handoffEdges/jackTapSinks), receivesFrom derived, terminal agents flagged queuesForJack. `node --check` clean. _agent-collab-loop, uncommitted, not live-scheduled._
- **2026-06-29 23:12** agent-collab-loop `agent-collab-loop, uncommitted, not live-scheduled`: Item 3 done — built `scripts/_generic/handoff-pipeline.mjs` (Build Spec §4 proof pipeline sales-director→compliance-officer→brand-steward→Jack over blackboard.mjs + agent-registry.mjs; dry-run, draft-only Jack tap-card, no outbox/dispatch/LLM; node --check clean, outbox 0→0, demo run auto-cleaned).

- 2026-06-29 23:44 ET — Chief-of-Staff Leader (dry-run) built: `scripts/_generic/chief-of-staff.mjs` (planner-only; reads state+heartbeat-mtime+priority-today, sequences a gated run plan, writes a CoS brief + blackboard run, fires NOTHING — no dispatch/outbox/Stripe). node --check clean; planner 7/7 unit-asserts PASS on real priority-today. _(agent-collab-loop, uncommitted, not live-scheduled)_
- [2026-06-30 04:11] Agent-collab item 5 done — shared-lessons hook `scripts/_generic/lessons.mjs` (recordLesson → blackboard `kind:lesson` post + rolling vault `Agent Lessons.md`; recordRunLesson + readLessons; node --check clean, selftest + live integration pass). _agent-collab-loop, uncommitted, not live-scheduled._

- 2026-06-30 — agent-collab-loop: item 6 done — wrote `Agent Collaboration Protocol.md` (operating manual: blackboard/registry/handoff-pipeline/Leader/lessons, grounded in the built `scripts/_generic/*.mjs` APIs); linked from `Day14 Vault — Index` + `Agent Org & Orchestration` (added a "substrate BUILT" callout). Vault-only, no .mjs touched. [agent-collab-loop, uncommitted, not live-scheduled]

- Item 7 (agent-collab queue) done: added a "## Collaborates with" block (receives-from / hands-off-to + [[Agent Collaboration Protocol]] link) to all 10 Obsidian-Vault/Agents/*.md, grounded in agent-registry.mjs handoff edges. Vault-only, append-style; no .mjs touched. — agent-collab-loop, uncommitted, not live-scheduled

- **2026-06-30** — agent-collab item 8 done: marked orchestration substrate BUILT (confidence-tagged) in `Agent Org & Orchestration` + `Agent Orchestration — Build Spec` — blackboard / agent-registry / handoff-pipeline / dry-run chief-of-staff / lessons hook now flagged runnable-but-NOT-live-scheduled (Jack taps launchd wiring); noted spec→build path deviation (flat `scripts/_generic/` vs proposed `scripts/_generic/orchestration/`+`scripts/engines/`). Vault-only edit, no `.mjs` touched. _(agent-collab-loop, uncommitted, not live-scheduled)_
- 2026-06-30 — agent-collab-loop: item 9 done — recompiled agent context (`DAY14_VAULT_DIR=…/Obsidian-Vault npm run context:compile` → `docs/agent-context/AGENT-CONTEXT.md`, 36 notes + `agent-preamble.md`). Verified the new `Agent Collaboration Protocol` note (+ per-agent "Collaborates with" content) is folded into the compiled context so agents pick it up. No git, no next build; AGENT-CONTEXT.md regenerated/uncommitted. _(agent-collab-loop, uncommitted, not live-scheduled)_

- 2026-06-30 — agent-collab-loop: item 10 (QA + ship report) done — `node --check` clean on all 5 new `.mjs`; selftests pass; live outbox untouched. Wrote `~/Claude/Projects/DAY14/agent-collab-ship-report.md` with exact `git add` paths + commit message (5 files + AGENT-CONTEXT.md) and the Jack-tap pending list (commit on mini, launchd wiring). Updated `Day14 — Current Open Items` agent log. **Phase 1 (items 1–10) COMPLETE; Phase 2 (11–16) not started.** [agent-collab-loop, uncommitted, not live-scheduled]

- [2026-06-30] **Item 11 — Orchestration CLI** done: built `scripts/_generic/orchestrate.mjs`, a hand-drivable front-end over blackboard.mjs (open/findings/list/close/runs, `--json`, usage on no-args; read/write-blackboard-only, never fires agents). `node --check` clean; full lifecycle verified; throwaway run cleaned. _(agent-collab-loop, uncommitted, not live-scheduled)_

- [2026-06-30] **Item 12 — Second handoff pipeline (generality proof)** done: built `scripts/_generic/handoff-pipeline-support.mjs` — the support/ops sibling to handoff-pipeline.mjs, proving handoffs generalize beyond sales. Runs the registry's second chain: customer-success-agent → compliance-officer → devops-sre → Jack (devops ops/routing read modeled deterministic/LLM-less to match its roster gap). Same blackboard substrate + read→act→post contract; same rails (NO send/dispatch/LLM/Stripe/refund, sample ticket only, terminal Jack-tap, never auto-acts). `node --check` clean; dry run = 5 posts, draft tap-card queued, outbox 0→0, run auto-cleaned. _(agent-collab-loop, uncommitted, not live-scheduled)_

- 2026-06-30 — agent-collab-loop item 13: built `scripts/_generic/registry-audit.mjs` — report-only drift check comparing `agent-registry.mjs` ⟷ vault `Agent Roster` + `Agents/*.md` (presence / role / handsOffTo / receivesFrom; `--json`; exit 1 on drift). Live run = ✅ no drift across 10 agents. _(agent-collab-loop, uncommitted, not live-scheduled)_
- Built `scripts/_generic/chief-of-staff.test.mjs` (queue item 14) — Leader test harness over the pure `buildRunPlan()` core; 19 assertions / 5 tests green (ordered plan, priority + producer→gate ordering, never-irreversible, dead-daemon escalated, deterministic); `node --check` clean, `node …test.mjs` exit 0; reads no real state, fires nothing. Files: scripts/_generic/chief-of-staff.test.mjs. [agent-collab-loop, uncommitted, not live-scheduled]
- [2026-06-30] **Item 15 — Run viewer** done: built `scripts/_generic/run-report.mjs` (renders a blackboard run → `runs/<id>/report.md`: overview, plan, findings table, notes, artifacts, lessons; read-only over the run dir except the derived report.md; `renderRunMarkdown`/`writeRunReport` + CLI w/ `--stdout`/`--latest`). `node --check` clean, smoke-tested on a throwaway run (auto-cleaned). _agent-collab-loop, uncommitted, not live-scheduled._
- [2026-06-30] **Item 16 — Phase-2 QA + ship-report addendum** done: `node --check` clean on all 5 Phase-2 `.mjs` (orchestrate, handoff-pipeline-support, registry-audit, chief-of-staff.test, run-report); item-14 test re-run = 19/19 PASS, exit 0; outbox 0→0 + runs dir 0, no launchd match (nothing live-scheduled). Appended a "Phase 2" section to `agent-collab-ship-report.md` (file table + exact `git add` paths + single-line commit message). Phase 1 (1–10) + Phase 2 (11–16) COMPLETE — entire queue done. Files: agent-collab-ship-report.md, Day14 — Current Open Items.md. _(agent-collab-loop, uncommitted, not live-scheduled)_

- **2026-06-30 — Daily prospect list ready:** 7 NEW verified SWFL prospects (fence, tree, lawn/landscape, pool — Lehigh Acres, Estero, Bonita Springs, Sanibel), all confirmed **no website** with BBB-verified phones. `sales/prospects-2026-06-30.md`. **0 Gmail drafts staged** — all are phone/call-first (no verifiable public emails on BBB; did not invent any). Bonita Springs over-represented; widen geography + try email-bearing sources next run.
- **2026-06-30** day-build-loop (item 1) → Jack: Wrote `GO-LIVE-RUNBOOK-2026-06-30.md`. Reconciled the queue's stale "uncommitted" facts against live git — branch `feat/cinematic-rebuild-2026-06` is already in sync with origin (`0 0`), so generator/themed-preview/command-deck are already committed AND pushed. Only genuinely uncommitted: agent-collab substrate (10 `.mjs`, all node-check clean), stripe org-key edit, regen registry/graph, cinematic css/Hero tweaks, dashboard data snapshots, run-log docs. Runbook groups those into 6 logical commits (lock-recovery loops, zsh-safe, no inline `#`), then `npm run build` gate, then `git push`, then the Vercel Production-Branch flip — which is the ACTUAL go-live step (push alone doesn't change day14.us; production branch still = `main`). Jack-taps marked; nothing executed. The two `.bundle` files left for BRANCH-CLEANUP. Files: `~/Claude/Projects/DAY14/GO-LIVE-RUNBOOK-2026-06-30.md`.
- **2026-06-30** day-build-loop (item 2) → Jack: Wrote `STRIPE-GO-LIVE-2026-06-30.md` — the real-charge live-key runbook for turning on the pricing checkout buttons. Traced the full env flow: `scripts/create-stripe-payment-links.ts` reads build prices from `pricing.ts` (Spark $750 / Local $1,500 / Portal $2,500; Platform quote-only) and emits 3 env vars → `src/lib/payment-links.ts` `getPaymentLinks()` → `<Pricing>` on `/`, `/pricing`, `/work-with-us`. Runbook covers test-then-live key choice, the org-key `STRIPE_ACCOUNT` (`acct_…`) path, where the links land (mini `.env.local` + Vercel prod env), a 6-step verify (incl. optional real-charge test + immediate refund, and the `STRIPE_WEBHOOK_SECRET` dependency for post-purchase dispatch), and rollback. Flagged that Local's env var is `STRIPE_PAYMENT_LINK_SITE` (not `_LOCAL`) — keep verbatim. All Jack-tap; nothing run. Prices only from `pricing.ts`. Files: `~/Claude/Projects/DAY14/STRIPE-GO-LIVE-2026-06-30.md`.
- **2026-06-30** day-build-loop → Jack: Hardened admin auth (queue item 3). New `src/lib/admin-session.ts` (Web-Crypto HMAC-SHA256 signed session `issuedAt|ttlMs|sig`, 12h TTL, constant-time compare); rewired `src/middleware.ts` + `src/app/api/admin/auth/route.ts` to mint+verify signed non-expiring-bypass sessions when `ADMIN_SESSION_SECRET` is set, else fall back to the legacy static hash (so nothing breaks pre-rotation). Localhost bypass, `/data/*` 404, httpOnly/secure/sameSite=lax all preserved. **New env var to set before internet exposure: `ADMIN_SESSION_SECRET`** (feeds item 4 tunnel runbook). `npx tsc --noEmit` rc=0. UNCOMMITTED, no push/deploy. Files: `src/lib/admin-session.ts` (new), `src/middleware.ts`, `src/app/api/admin/auth/route.ts`.
- **2026-06-30** day-build-loop (item 4) → Jack: Wrote `~/Claude/Projects/DAY14/ADMIN-TUNNEL-RUNBOOK.md` — full Cloudflare-tunnel setup to expose the mini dashboard at `admin.day14.us` behind the item-3 hardened login. Verified against live code (`src/middleware.ts`, `src/lib/admin-session.ts`, `src/app/api/admin/auth/route.ts`). 10 Jack-tap steps: set `ADMIN_PASSWORD`+`ADMIN_SESSION_SECRET` → `brew install cloudflared` → `tunnel login` → `tunnel create day14-admin` → `route dns admin.day14.us` → `config.yml` ingress→`localhost:3000` → foreground smoke-test → `sudo cloudflared service install` (launchd) → Cloudflare Access email gate (defense-in-depth) → verify + rollback. Two hard preconditions flagged: (1) `ADMIN_SESSION_SECRET` MUST be set before exposure or the replayable legacy cookie is served; (2) NEVER set `originRequest.httpHostHeader: localhost` — it trips the middleware localhost-bypass and disables the gate for the whole internet. zsh-safe, all Jack-tap, nothing executed. Files: `~/Claude/Projects/DAY14/ADMIN-TUNNEL-RUNBOOK.md`.
- 2026-06-30 — day-build-loop item 5: wrote Supabase migration SCHEMA spec (6 core tables + 2 phase-2, DDL/indexes/RLS/dual-write, all Jack-tap, planning only). Files: Obsidian-Vault/Admin Dashboard — Supabase Migration Spec.md (new), Obsidian-Vault/Day14 Vault — Index.md (linked).
- 2026-06-30 — day-build item 6: telemetry-source read seam. New `src/lib/telemetry-source.ts` (TelemetrySource interface + LocalFsTelemetrySource wrapping current read paths + SupabaseTelemetrySource stub + getTelemetrySource() factory on TELEMETRY_SOURCE env, defaults local-fs; dashboard NOT rewired). tsc rc=0. Filled §5 /admin-on-Vercel render plan in `Obsidian-Vault/Admin Dashboard — Supabase Migration Spec.md`. Files: src/lib/telemetry-source.ts (new), Admin Dashboard — Supabase Migration Spec.md. UNCOMMITTED.
- 2026-06-30 — day-build item 7: fixed CLAUDE.md doc drift. Layer-2 box 211→282 skills, 426→435 edges (verified grep of skill-graph.generated.ts = 435 edges/298 nodes); hand-coded "Six"→60 (verified ls src/lib/skills minus index.ts = 60) + added "ls for full list" note. Registry.generated still indexes 278 (pre-regen, 4 new specs pending — regen → 282). Left "three pollers" claim alone (LaunchAgent state unverifiable from sandbox). Doc-only, no TS, UNCOMMITTED. Files: ~/Documents/studio/CLAUDE.md.
- **2026-06-30** day-build-loop (item 8 — scheduled-task prune) → Jack: Wrote `~/Claude/Projects/DAY14/SCHEDULED-TASK-CLEANUP.md` from the live scheduled-task registry (68 tasks): 12 KEEP (incl. the 6 new every-30-min build loops — disable at EOD if not wanted), 1 REVIEW (`day14-fleet-sentinel` — recommend re-enable, not delete), 55 DELETE (all fired one-shots + disabled sprint loops). Includes a zsh-safe backup→`rm -rf`→verify→rollback block Jack runs (`~/Claude/Scheduled` isn't sandbox-writable). Flagged `trip-reply-triage` for rename/rescope. Doc-only, nothing deleted. Files: `~/Claude/Projects/DAY14/SCHEDULED-TASK-CLEANUP.md`.
- **2026-07-01** day-build-loop (queue #9) → Jack: Wrote `BRANCH-CLEANUP.md` (`~/Claude/Projects/DAY14/BRANCH-CLEANUP.md`, outside the vault). Read-only git analysis corrected the queue's stale premise (it compared branches to stale local `main`, not the live `feat/cinematic-rebuild-2026-06`). Key find: **`overhaul/trip-2026-06` + `deploy/redesign-merged-2026-06-20` hold `/os` and `/local` pages that are ABSENT from the live site** — do NOT delete; recover `/local` (on-strategy), hold `/os` pending your positioning call. Safe deletes: `redesign/apple-base44` (`-d`), `chore/gemini-to-anthropic` (`-D`, divergent −3506-line dead-end), `fix/pricing-integrity` (`-D` after `check:prices` green). `backlog/admin-todo-write-path` = a real unmerged admin feature → cherry-pick first. Bundles → archive not rm (06-21 head unreachable from any local ref). All Jack-tap; nothing deleted/committed/pushed.
- **2026-07-01** day-build-loop (item 10 / fleet-restart) → Jack: Wrote `~/Claude/Projects/DAY14/FLEET-RESTART-RUNBOOK.md` from a live heartbeat-mtime snapshot (2026-07-01 13:10 UTC). 3 core boot-managed pollers + 14 others GREEN; FIVE dead ~21 days (mtime 2026-06-10): gmail-cs-triage, lawn-care-gm-kennum-lawn-care, realty-scout-day14-realty, stripe-cs-loop, vercel-deploy-monitor (+ a 0-byte orphan `.log.new`). KEY: `boot-day14.sh` only manages the 3 core LaunchAgents and will report all-green WITHOUT reviving the stale five — runbook adds a decision-gate (only realty-scout has an in-repo installer; others need launchd-label discovery; stripe-cs-loop + gmail-cs-triage are money/customer-comms adjacent → own taps). Doc-only, Jack executes. Files: `FLEET-RESTART-RUNBOOK.md`.

- 2026-07-01 (day-build #11): Reconciled themed-preview state — items 3–9 all shipped 2026-06-29 (loop was disabled), flipped stale checkboxes to [x] with notes. Verified live: `--cin-*`/CanvasField gone from all rendered preview routes, hero on `--pv-hero`, 6 capability cards inline in page.tsx (no separate Capabilities.tsx). tsc rc=0, no code touched. Gaps logged: orphaned dead files (Proof/Faq/BrandStarter/LogoSlot still hold `--cin-*`, safe to git rm) + a11y/contrast re-verify carried to day-build item 13. Files: themed-preview-build-queue.md.
- **2026-07-01** `day14-idea-pipeline` (first run) → Jack: Fallback run (idea-worker Gemini-dead + sandbox can't reach `~/Documents/studio` or `_shared` outbox — only DAY14 mounted). Self-generated + scored 5 SWFL ideas; **pick = "Get Found" (Invisible-on-Google → live site in 3 days), EV 66/70** — a public top-of-funnel page that closes the loop on the daily prospect finder (converts the Facebook-only trades it already surfaces). Built a **staged** cinematic landing page + waitlist (honesty ribbon, noindex, form → `/api/preview-lead` with `source:"get-found"`): `idea-pipeline/2026-07-01-invisible-on-google-landing.html` + drop-in `…-ROUTE-SCAFFOLD.md`. Could NOT write into studio or run `npx tsc --noEmit` (studio unreachable in sandbox) — **tsc rc = N/A**. Ship path = new `src/app/get-found/page.tsx` reusing `preview/[token]/EmailCapture.tsx`; exact zsh-safe Jack-tap in the scaffold. No price stated (links /pricing); proof = live builds only; nothing pushed/deployed/sent. Staged Telegram digest at `idea-pipeline/2026-07-01-telegram-digest.md` (awaiting Jack approval to send).
- **2026-07-01** day-build-loop (queue item 12) → Jack: Wrote `~/Claude/Projects/DAY14/IMAGE-PROVIDER-DECISION.md` — confirms OpenAI GPT Image `gpt-image-1.5` for the preview logo/social path (Replicate FLUX = documented fallback; avoid `gpt-image-1`, deprecates 2026-10-23). Key finding: the OpenAI path is ALREADY scaffolded end-to-end and dormant behind `OPENAI_API_KEY` (`src/lib/image-gen.ts` → `src/app/api/preview-asset/route.ts` cache-per-token → `src/app/preview/[token]/LogoSlot.tsx`), so logos are a ONE-VAR switch, no code change. Social graphics are NOT wired (route hard-coerces `kind` to "logo", L41) — later additive build, not in this tap. Disambiguated from the separate older Gemini skill (`src/lib/skills/image-generator.ts`, Etsy/POD/blog, gemini-dead risk, out of scope). Includes cost table (~$0.9–$28/mo, cache-bounded), honesty rails, and the single 3-step Jack-tap. Doc-only, no TS touched, UNCOMMITTED. Files: `IMAGE-PROVIDER-DECISION.md` (new).
- **2026-07-01** day-build-loop (queue item 13) → Jack: Themed-preview a11y + responsive polish. Audited all 12 trade themes with a WCAG contrast script; fixed 3 real defects (smallest-diff, UNCOMMITTED): (1) solid-primary BUTTON text was hard-coded `#fff` → FAILED on light primaries (electrician `#fff/#FFC107`=1.63, roofing=2.74) → added `readableOn(hex)` in `src/lib/preview.ts` + `--pv-on-primary` token, swapped all solid-primary `#fff`→`var(--pv-on-primary)` (now electrician 11.30 / roofing 6.71); (2) accent micro-labels failed on all 8 light themes (1.5–2.1) → mood-aware `--pv-label` (`dark?accent:primary`) so light uses darker primary, dark keeps its light accent (no regression); (3) muted body text 4.3→6.6 via darker `--pv-mut` (`rgba(17,32,42,0.72)`). Responsive: hero + capabilities were FIXED 2-col grids not collapsing on phones → scoped `<style>` + `@media(max-width:760px)` → 1 col; nav links `flexWrap:wrap`. Residual (left for Jack, would cascade): kicker/ghost-btn primary text 4.1–4.4 (AA-lg) on cleaning/handyman/hvac. `npx tsc --noEmit` rc=0. Files: `src/lib/preview.ts`, `src/app/preview/[token]/{layout,page,EmailCapture}.tsx` + `services/page.tsx` + `about/page.tsx`.

- **2026-07-01** day-build-loop → Jack: Queue item #14 (repo quality pass). `npx tsc --noEmit` full = rc=0 (clean). Regenerated registry+graph (rc=0): 278 skills / 435 edges, git diff = timestamp-only → zero content drift, spec-consistent. Resolved 282-vs-278: 282 SKILL.md − 4 in `_drafts/` = 278 live; hand-coded=60. Marker sweep mostly false-positive/intentional; two real gaps flagged (not fixed): alignmd `dossier-queue.tsx` L94/L102 stubbed backend POSTs, and `dossier-feedback.ts:109` `239-XXX-XXXX` placeholder phone (needs Jacks real number, gated by Jack-tap send). Nothing committed. Files: `~/Claude/Projects/DAY14/REPO-QUALITY-PASS-2026-07-01.md`.

- 2026-07-01 — Item 15: wrote AGENT-COLLAB-WIRING-PLAN.md (dry-run→live for the agent-collab substrate). Only the Chief-of-Staff Leader gets a launchd timer, in PLANNER mode (verified no dispatch/outbox/Stripe in-source); commit-first + pre-live gate (test 19/19 + registry-audit) + daily plist + 3-layer kill-switch + fenced-off real-dispatch §6. Planning only, nothing installed/committed. Files: ~/Claude/Projects/DAY14/AGENT-COLLAB-WIRING-PLAN.md.
- **2026-07-01** day-build-loop (item 16 — MASTER WRAP, QUEUE COMPLETE) → Jack: Wrote `~/Claude/Projects/DAY14/TODAY-WRAP-2026-06-30.md` — the single ordered "when you're back" tap-list for the whole 16-item queue, grouped by workstream and leverage-sequenced. Top path = 3 taps: **snapshot-backup → go-live (build+push+flip Vercel Production Branch to `feat/cinematic-rebuild-2026-06`) → Stripe live links.** Then admin tunnel (`ADMIN-TUNNEL-RUNBOOK`, precondition `ADMIN_SESSION_SECRET`), cleanup (scheduled-task/branch/fleet), optional builds (image logos one-var, CoS leader launchd). Final verification: `npx tsc --noEmit` rc=0, `node --check scripts/_generic/*.mjs` all 20 pass. **Reconciled against LIVE git** (not the item-1 runbook's stale list): 20 modified + 35 untracked (incl. 2 new lib files, 10 agent-collab `.mjs`, 15 untracked test files, 2 `.bundle` = do-not-stage). **TWO honesty flags:** (a) the go-live runbook's commit grouping is now under-scoped — items 3/6/13 added code + 15 tests it never listed → stage per the wrap's inventory; (b) sandbox shows NO upstream tracking ref, so "already pushed/0-0" is unconfirmed → run `git status -sb` on the mini before trusting it. Carried forward the 2 open code gaps (alignmd dossier-queue stubbed POSTs; `dossier-feedback.ts:109` `239-XXX-XXXX` placeholder needs your real #). Nothing executed. Files: `TODAY-WRAP-2026-06-30.md` (new), `Day14 — Current Open Items.md`.
- **2026-07-02** `day14-idea-pipeline` (run 2) → Jack: ADVANCED "Get Found" instead of spawning a new idea (top new candidate 58 < winner 66; anti-spawner + sell-first freeze). Authored the complete drop-in `page.tsx` + `GetFoundCapture.tsx` at `idea-pipeline/2026-07-02-get-found-dropin/` (repo-mirrored, cp -R-able; ribbon/noindex/no-prices/live-proof-only intact). Standalone strict tsc rc=0 [Certain]; in-repo [Likely] (studio still unmounted). New scored candidate: GBP Rescue 55 (only ~45% of home-services GBPs verified — follow-on offer, not competitor). Exact zsh-safe tap in IDEA-PIPELINE.md §"Jack-tap 2026-07-02"; staged digest at `idea-pipeline/2026-07-02-telegram-digest.md`. Nothing sent/pushed/deployed.
- **2026-07-06** `vault-deepen-loop` → all agents / Jack: **RESOLVED (struck through above) the 2026-06-26 open ⚠ CONFIRM cluster** — exact launchd labels, dup guards, and heartbeat emission for the C-suite timers are now repo-verified and written into the per-agent notes (no ⚠ CONFIRM markers remain in any `Agents/*.md`; every note carries its exact `com.day14.*` label). Key facts, from `scripts/install-employees.sh` + `scripts/employees/*.mjs`: labels follow `com.day14.<agent-name>`; [[compliance-officer]] = daily 11pm calendar fire, date-stamped `<date>.md` output as dup guard, no run-lock needed; [[investor-relations]] = days 1–7 at 7am, `<YYYY-MM>.md` filename dedup (no self-gate in impl — known gap); [[customer-success-agent]] = the one continuous `KeepAlive` daemon and the **only C-suite agent emitting a heartbeat** (`_shared/poller/customer-success-heartbeat.log`); [[devops-sre]] runs 4-hourly and *reads* heartbeats but emits none; all other C-suite timers (cfo-agent, sales-director, brand-steward, performance-analyst, pr-director, product-strategist) emit none — health = dated-output freshness + `~/Library/Logs/day14/<name>.{stdout,stderr}.log`. This also confirms the vault-curator demo entry's "changed assumption" #3 above (don't alarm on missing C-suite heartbeats). **Still open from that cluster:** the product-strategist overwrite norm break (no history on `product-strategy.md`) — not struck. Vault-only, no commits/customer contact.
- **2026-07-06** `vault-deepen-loop` → Jack / devops-sre: **CORRECTED a wrong fleet-health claim** in [[Agent Journal/sales-director]] + [[Agent Journal/pr-director]]: their "0 … across 0 tenants" streaks are NOT a clean loop over an empty `tenants.json`. Repo-verified: `tenants.json` holds 9 tenants (5 pass sales-director's `MODES` type gate; pr-director iterates all 9 — no gate), and both `main()`s journal only `r.ok` successes while catching per-tenant errors to **stderr only**. So sales-director has logged 0/0 daily since ≥2026-06-26 and pr-director 0 reports on both weekly fires — most likely **every tenant erroring silently every run** (prime suspect: grounded-search LLM path, same Gemini-dead risk as idea-worker). **Ask:** eyeball `~/Library/Logs/day14/{sales-director,pr-director}.stderr.log` on the mini for the real error. Vault-only, no commits/customer contact.


---

# Glossary & Conventions

The language of the Day14 system, so agents speak it correctly. Terms marked **⚠ CONFIRM** are inferred and should be verified with Jack.

## Core terms

- **Day14 OS** — the agent-run, multi-business operating system on Jack's Mac mini. See [[Day14 OS — System Map]].
- **Studio repo** — `~/Documents/studio`, the Next.js codebase: skill specs, dashboard (`/dashboard`), admin (`/admin`), and the business websites. Dev server on `:3000`.
- **Shared state** — `~/Documents/businesses/_shared/`: the live nervous system. Holds `poller/` (heartbeats), `telegram/outbox/`, and `founder-ops/`.
- **Founder-ops docs** — `~/Documents/businesses/_shared/founder-ops/`: `punch-list.md`, `today-YYYY-MM-DD.md`, `missed-from-jack.md`.
- **Skill spec** — one of the **282** capability definitions, each at `docs/seeds/skills/{name}/SKILL.md` in the studio repo, that drive what the OS can do; **60** of them are also hand-coded in TypeScript at `src/lib/skills/{name}.ts` exporting `run(ctx)` (the runner tries the hand-coded path first, else falls back to the LLM agent loop). Counts and location/format repo-verified 2026-06-30 (`find docs/seeds/skills -name SKILL.md` → 282; `grep -l 'run' src/lib/skills/*.ts` → 60) `[Certain]`; cross-check the 2026-06-25 audit in [[Agent Roster]].
- **Poller** — a background job that produces work/updates; its `poller/` heartbeat file's **mtime** is the only valid health signal.
- **Heartbeat** — a file whose modification time proves a job is alive. **Judge health by mtime only**, never by logs or boot summaries.
- **The fleet** — the full set of `com.day14.*` LaunchAgents running the OS on the mini.
- **The mini** — Jack's Mac mini; the production host. Runs everything unattended.
- **The cockpit / laptop** — Jack's laptop; **read/control only — never run agents or rsync from it.**

## Timestamps & schedules

- **Journal timestamps are UTC.** `scripts/_generic/agent-journal.mjs`'s `nowStamp()` stamps every line with `new Date().toISOString()` (repo-verified 2026-07-02) — always UTC, never local, on both [[Agent Journal & Handoffs|journals]] and [[Handoffs & Open Questions]]. `[Certain]`
- **launchd fire times are local.** `StartCalendarInterval` `Hour` values in `scripts/install-employees.sh` are the mini's **local** clock. The mini currently runs **UTC−4** — inferred from a consistent +4h offset across all agent journals (US Eastern DST). `[Likely]`
- **So a journal line reads ~4h ahead of the spec'd fire hour — that's correct, not a misfire.** Reconciles the apparent "spec vs log" gaps: [[compliance-officer]] fires Hour 23 ("daily 11pm") yet logs at `03:00`Z; [[brand-steward]] Hour 22 logs at `02:00`Z; [[sales-director]] Hour 10 logs at `14:00`Z; [[pr-director]] Hour 9 logs at `13:00`Z. When judging liveness by an entry's freshness, translate: a spec hour of *H* local should appear as *(H+4) mod 24* UTC in the journal. `[Certain]` (mechanism) · the −4 offset only holds during DST `[Likely]`

## Money & product

- **Pricing source of truth** — `studio/src/lib/pricing.ts`. **Never hard-code prices in pages or invent them.**
- **Service tiers:** Spark $750 + $49/mo · Local $1,500 + $199/mo (featured) · Portal $2,500 + $299/mo · Platform from $9k + $499/mo · Custom (quote).
- **OS waitlist tiers:** Solo $79 · Portfolio $299 · Founder $999.

## Git & branch conventions

- Branches actually in the studio repo (verified `git branch -a`, 2026-07-01): `feat/cinematic-rebuild-2026-06` (**current HEAD** — the live relaunch line, newest commit; has superseded the earlier `redesign/apple-base44-2026-06-03` relaunch branch, which still exists on `origin`), `chore/gemini-to-anthropic-2026-06` (the C-suite LLM migration), `overhaul/trip-2026-06`, `fix/pricing-integrity-2026-06`, `backlog/admin-todo-write-path-2026-06` (`backlog/<topic>-YYYY-MM`), `deploy/redesign-merged-2026-06-20` (`deploy/<thing>-<date>`), and `origin/laptop/console-tooling-2026-06-10`. **Pattern (verified in use): `type/short-topic-YYYY-MM[-DD]`** with `type` ∈ {`feat`, `fix`, `chore`, `overhaul`, `backlog`, `deploy`, `redesign`}. Exception: `laptop/` is a **machine-scoped prefix** (work pinned to the laptop, not the mini), not a change-type — the only non-`type/` prefix seen. `main` is the trunk; `origin/HEAD → origin/main`. ⚠ CONFIRM with Jack only that this is the *official/enforced* naming policy (the pattern itself is now repo-verified, not inferred).
- **Code moves only via git push/pull — never rsync** the studio repo.
- Generated files (`src/lib/skill-*.generated.ts`) are rebuilt by `registry:generate` / `graph:generate` — restore them with `git checkout --` before committing so only intended files land.
- Sandbox git mechanics (what lands, lock hygiene): [[Sandbox Git Playbook]].

## Comms

- **Telegram bot:** @day14osbot. Jack's chat_id: 6621607636. Outbox path: `~/Documents/businesses/_shared/telegram/outbox/`.
- **Confidence tags:** `[Certain]` / `[Likely]` / `[Guessing]` on every claim — see [[Working with Jack]].

## Related
[[Day14 OS — System Map]] · [[00 — Agent Boot (START HERE)]] · [[People & Contacts]]


---

# People & Contacts

Who's who in the Day14 world and how to route them. Items marked **⚠ CONFIRM** need Jack to fill in.

## Jack — founder & operator
The only human in the loop. Owns the mini, all final decisions, every push, payment, and customer send. Reach him via **Telegram @day14osbot** (chat_id 6621607636). How he wants to be worked with: [[Working with Jack]]. He travels occasionally; when he does, the mini runs unattended and the laptop is cockpit-only.

## Partners
- **alignmd** — partner business (not a Jack-owned build). ⚠ CONFIRM: contact person, nature of the partnership, what they own vs. what Day14 provides. See [[Business — alignmd]].

## Customers
- **Angela (tutoring)** — first Spark customer. Dossier at `customers/angela-tutoring/`. Scope is explicitly limited: **no intake form, no payments, no booking.** Don't add those without Jack's say-so.
- ⚠ CONFIRM: any other live customers. Do not list a business as a customer unless Jack has confirmed it.

## Retired / not customers
- **kennum-lawn-care** — built but **never a customer**, and **retired from the portfolio 2026-06-22**. Never cite it as a client reference. Build lessons kept in [[Build Lessons — Retired Brands]].
- **hot-flash-co** — Day14-owned brand, also **retired 2026-06-22**. Not an active business.

## Routing rules
- Anything requiring a decision, a push, money, or a customer-facing send → **route to Jack**, don't act.
- Customer replies are drafted, never sent autonomously → see [[Playbook — Customer & Telegram Comms]].

## Related
[[Businesses — Overview]] · [[Working with Jack]] · [[00 — Agent Boot (START HERE)]]


---

# Businesses — Overview

The portfolio running on the Day14 OS. Each links to its own profile. Now grounded in the structured registry; remaining gaps are marked **⚠ CONFIRM**.

> **Structured registry (machine source of truth agents read):** `~/Documents/businesses/_shared/tenants.json` — slugs, ownership groups (day14-core / day14-owned / client / partner), type, stage, channels. This vault is the **narrative layer** on top; keep the two aligned. The studio itself is the `day14` tenant (domain day14.us, "where new customers land").

| Business | Type | Relationship | Note |
|---|---|---|---|
| Splash Jacks Pools | Field-service SaaS (pools = the live demo) | **Jack's own — 3 live customers; goal is to sell the software** | [[Business — Splash Jacks Pools]] |
| day14-realty | Real estate — county-records deal sourcing + eval | day14-owned | [[Business — day14-realty]] |
| life-loophole | Financial-freedom brand / tax-optimization product (⚠ 2 framings) | day14-owned; top-of-funnel | [[Business — life-loophole]] |
| alignmd | Healthcare staffing/recruiting SaaS (live) | **Partner** (Jack + buddy) | [[Business — alignmd]] |
| BuildBridge | Field-service SaaS — the Splash Jacks software productized (⚠ SaaS-vs-marketplace fork) | day14-owned; framing pending Jack's confirmation | [[Business — BuildBridge]] |
| AdForge | AI ad-creative SaaS — virality-scored short-form ads for DTC brands (pre-launch, noindex) | day14-owned **standalone** (own repo, like alignmd's setup; ⚠ tenants.json registration pending) | [[Business — AdForge]] |

## Powered by Day14 (non-pillar)
Served by the engine but **not** a strategic portfolio business — supported operationally when asked, no default strategic/growth focus.
- [[Brand — House of Love Co]] — Jack's music + **silent-disco brand**, live as **Casamoré** at houseoflove.co (same brand, Jack-confirmed 2026-06-26). An internal customer of the content engine; now also a **live proof exemplar on the day14.us homepage** alongside Splash Jacks / AlignMD / BuildBridge.

> **Registry currency (2026-06-26):** `tenants.json` now holds **all 9** businesses — Splash Jacks Pools, BuildBridge, and House of Love Co (Casamoré) were missing and have been added; the five newer entries were also normalized (they'd lost their dashboard rows to a null-`status` schema bug, now fixed). Statuses: Splash Jacks / alignmd / life-loophole / House of Love = active, day14-realty = paused (kill-switched), hot-flash-co / kennum = archived.

## Retired from the portfolio (2026-06-22)
- **hot-flash-co** and **kennum-lawn-care** are **out** — not part of Day14 going forward. The build know-how is preserved in [[Build Lessons — Retired Brands]]; the brands are not active businesses or client references. Their live footprint (scripts, pollers, brand sites, `tenants.json` entries) is pending teardown — see [[Day14 — Current Open Items]].

## Important distinctions agents must respect
- **Splash Jacks Pools is the proof asset** — when you need a real, live example of the platform working, this is it.
- **alignmd is a partner, not a Jack-owned build** — treat its ownership and data accordingly.
- **First Spark customer is Angela (tutoring)** — scope-limited (no intake/payments/booking). See [[People & Contacts]].

## Related
[[Day14 OS — System Map]] · [[00 — Agent Boot (START HERE)]] · [[Glossary & Conventions]]


---

# Business — Splash Jacks Pools

**The pool service is the demo; the software is the product.** Jack runs a real pool-service business with **3 active customers** — but he does not want to keep cleaning pools. Splash Jacks exists as the **live proof** that the field-service platform he built works in production. The goal is to **sell the software**, not scale the pool route.

## What's known
- **Surface business:** pool service, 3 active paying customers (real, live).
- **Real asset:** a field-service software platform (scheduling, customers, service ops) built by Jack.
- **Intent:** wind down hands-on pool cleaning; productize and sell the platform.
- **Role in Day14:** the working showcase — proof the software runs a real operation.
- **Platform readiness (repo-verified, `src/lib/builds.ts`):** recorded as a **shipped** SKU-`Platform` build (14-day run 2026-04-21 → 2026-05-04), **live at [splashjackspools.com](https://splashjackspools.com)** (preview `splash-jacks-pools.day14.dev`) — "live, indexed, and processing real customer payments," with an **admin app** the operator runs route, water-chemistry, photo-proof, and billing from. Stack: Next.js 14 / TS-strict / Supabase-Postgres + Prisma + Auth / Stripe / Resend / Twilio / Anthropic SDK on Vercel.
- **Productization path:** the "sell the software" plan has a concrete home — [[Business — BuildBridge]], framed (Jack-confirmed 2026-06-26) as *the Splash Jacks software productized*: the same bid → communicate → track loop generalized to home-services contractors. Splash Jacks *proves* the software with 3 real customers; BuildBridge *sells* it. (The BuildBridge app is built; whether it's literally this codebase productized vs. a separate build, and the SaaS-vs-marketplace go-to-market, remain Jack's calls — see below.)

## How agents should treat it
- **Optimize for sellability of the software, not for more pool customers.** Value is in making the platform demoable, productized, and ready to sell.
- The 3 customers are live and real — **no autonomous customer sends, scheduling changes, or money movement.** Draft and route to Jack. See [[Playbook — Customer & Telegram Comms]].
- Any platform pricing lives in `src/lib/pricing.ts` — never invent it. The Day14 service tiers may be the productized wrapper (see [[Glossary & Conventions]]).

## ⚠ CONFIRM with Jack
- What exactly the platform does vs. competitors (Jobber/Housecall/ServiceTitan) — the wedge.
- Who the buyer is (other pool cos? any field-service vertical?) and how it's sold/priced. *(Partial answer tracked in [[Business — BuildBridge]] — home-services contractors, one-sided SaaS recommended; still Jack to confirm.)*
- ~~Where the platform code lives in the studio repo and its current readiness~~ — **readiness repo-answered:** `builds.ts` marks it **shipped & live** (see *Platform readiness* above). **Still Jack's to confirm:** where the *product* codebase lives — it is **not a subtree of the studio repo** (the studio repo carries only the build record in `src/lib/builds.ts`, the `case-studies/splash-jacks-pools` + `builds/[slug]` pages, and the `.day14.dev` preview pointer; the product itself runs as a **separate app on the external `splashjackspools.com` domain**). Ties to BuildBridge's open "is it literally this codebase productized / where does its code live" — resolve both together.

## Agent log
*Agents append here — one timestamped line per write-back via `appendToNote()` (see [[Agent Journal & Handoffs]]). Append, never overwrite the curated body above.*

## Related
[[Businesses — Overview]] · [[Business — BuildBridge]] · [[Day14 OS — System Map]] · [[Role — Sales & Growth Agent]]


---

# Business — day14-realty

A Day14-owned real-estate segment. **Grounded in `tenants.json` + repo.**

## What's known (authoritative)
- **Display name:** Day14 Realty. **Ownership:** day14-owned. **Type:** real-estate. **Stage:** launching.
- **What it does:** **county-records deal sourcing + property evaluation** — i.e. find and evaluate real-estate deals from public county data, not a brokerage.
- **Tagline:** "County-records deal sourcing + property evaluation."
- **Tech:** agent pack at `scripts/verticals/real-estate/`. Intake = drop county property-appraiser CSV exports into `businesses/day14-realty/intake/`.

## Role / how agents should treat it
- Proof the engine handles a **data-pipeline vertical** (ingest public records → evaluate → surface deals).
- No outbound to property owners / no offers without Jack's approval. Drafts only.

## ⚠ CONFIRM with Jack
- The end goal — wholesale deal flow for Jack, a tool to sell, or lead-gen for an agent partner?
- Which county/market, and current status of the pipeline.

## Agent log
*Agents append here — one timestamped line per write-back via `appendToNote()` (see [[Agent Journal & Handoffs]]). Append, never overwrite the curated body above.*

## Related
[[Businesses — Overview]] · [[Day14 OS — System Map]] · [[Role — Sales & Growth Agent]]


---

# Business — life-loophole

A Day14-owned financial-optimization brand and product line. **⚠ Two framings on record — reconcile before treating either as final.**

## Jack's framing (2026-06-22)
A **social-media content hub to help people become financially free**, designed to be **integrated into all future Day14 businesses** as the audience/top-of-funnel layer.

## Registry framing (`tenants.json` + buildout plan, authoritative as built)
- **Display name:** Life Loophole. **Ownership:** day14-owned. **Type:** SaaS. **Stage:** planning.
- **Scope:** Day14's **tax & financial-optimization** product line. Tagline: "Every legal advantage the tax code gives you — found, explained, and organized."
- **Three surfaces:** (1) an **integrated AI tax-strategist agent** inside Day14 OS, (2) a **content / newsletter brand**, (3) a **standalone SaaS app**. Serves individuals, businesses, and legal entities.
- **Plan:** `~/Documents/Life-Loophole-Buildout-Plan.md`. Phase 0 done 2026-05-24; gets its own repo + Supabase at `~/Documents/life-loophole/` at Phase 3.
- **Hard constraint:** **EDUCATIONAL TOOL — not tax or legal advice.** All outputs must carry disclaimers.

## How to reconcile (likely both true)
Jack's "financial-freedom content hub integrated everywhere" maps onto the registry's **content/newsletter surface + the integrated advisor surface**. The difference is emphasis: Jack is stressing the *audience/content* play; the build plan is scoped around *tax-code optimization*. Treat life-loophole as a **financial-freedom brand whose engine is tax/financial optimization**, with content as the top-of-funnel. **Confirm the current direction with Jack.**

## Guardrails for agents
- **Never give tax or legal advice or fabricate financial claims/outcomes** — frame as education, disclaimer everything. Day14 is not an advisor. See [[Working with Jack]].

## ⚠ CONFIRM with Jack
- Which framing leads right now (content-brand-first vs. tax-SaaS-first), and current stage.
- Primary channels for the content hub; how the "integrated into all businesses" advisor surface works.

## Agent log
*Agents append here — one timestamped line per write-back via `appendToNote()` (see [[Agent Journal & Handoffs]]). Append, never overwrite the curated body above.*

## Related
[[Businesses — Overview]] · [[Role — Sales & Growth Agent]] · [[People & Contacts]]


---

# Business — alignmd

**Partner business — Jack + his buddy.** The buddy runs **medical recruiting / healthcare staffing**; Day14 built and runs the software layer and the goal is to **automate the whole operation**. Grounded in `tenants.json` + repo + Jack (2026-06-22).

## What's known (authoritative)
- **Display name:** AlignMD. **Ownership:** partner. **Type:** SaaS. **Stage:** launching.
- **What it is:** "Precision Matching for Modern Healthcare" — a **healthcare staffing / recruiting platform** (the partner's business).
- **Build status:** live — deployed **2026-05-22 at `alignmd.vercel.app`**. Own app + Supabase project at `~/Documents/alignmd/`. Build plan: `AlignMD-Build-Plan.md` (all 7 phases complete). Remaining: confirm migrations 0005–0009 via a signup test.
- **Jack's intent:** the partner currently recruits manually; Day14 becomes the operating system that runs sourcing → matching → ops end-to-end.

## How agents should treat it
- **Partner-owned — coordinate, don't unilaterally act.** Decisions involve the partner, not just Jack.
- **Sensitive data + healthcare-adjacent.** Handles candidate/client PII. Handle carefully, never expose it, and **never send candidate/client messages or move money autonomously** — draft and route. See [[Playbook — Customer & Telegram Comms]]. The [[Agents/compliance-officer|compliance-officer]] agent singles out alignmd as its highest-sensitivity tenant (PII / healthcare-adjacent) and escalates any exposure it finds straight to Jack rather than sitting on it — so real legal/privacy concerns here go through that agent, not just this note.
- **Never fabricate** placements, candidates, or credentials.

## ⚠ CONFIRM with Jack
- Partner's name + how to route to him vs. Jack → add to [[People & Contacts]].
- The client side (hospitals/clinics/practices?) and how placements/fees work.
- What "Day14 runs everything" automates first; the signup-test status.
- Compliance constraints (HIPAA-adjacent? candidate consent?) and data boundaries.

## Agent log
*Agents append here — one timestamped line per write-back via `appendToNote()` (see [[Agent Journal & Handoffs]]). Append, never overwrite the curated body above.*

## Related
[[Businesses — Overview]] · [[People & Contacts]] · [[Agents/compliance-officer|compliance-officer]] · [[Day14 OS — System Map]]


---

# Build Lessons — Retired Brands

hot-flash-co and kennum-lawn-care were **retired from the portfolio (2026-06-22)** — they are not part of Day14 going forward. But the **building processes** proved out on them are reusable capability the engine keeps. This note preserves the know-how; the brands themselves are gone (see [[Day14 — Strategic Direction]]).

## From hot-flash-co — POD brand + automated content machine
A full direct-to-consumer brand was stood up and run end-to-end. Reusable pieces:
- **POD store build:** Printify integration (11oz mug blueprint 9 / provider 28), automated product + design generation, products staged as **drafts for human review** before publishing. (`scripts/generate-hot-flash-designs.mjs`, `scripts/launch-hot-flash-co.mjs`, `src/app/brands/hot-flash-co/printify.ts`.)
- **Multi-channel content pipeline:** one engine fanning content to TikTok, Instagram, YouTube, Pinterest, Reddit, LinkedIn, email newsletter, blog, and video — orchestrated by a content-calendar + cross-poster. (`scripts/hot-flash-co-*-engine.mjs`, the `hot-flash-co-*` pollers.)
- **Brand site in a box:** brand-site builder produced a full themed site (products, blog, about, contact, sitemap). (`src/app/brands/hot-flash-co/`.)
- **Lesson:** the engine can launch and run a consumer brand autonomously across the whole funnel. The constraint isn't capability — it's focus. (Why it's retired: see strategy.)

## From kennum-lawn-care — local-service brand-site build
A local field-service brand site was hand-built fast. Reusable pieces:
- **Local-service site build:** brand charter → brand identity → service site, with **quote requests routed to an API endpoint** (`/api/brands/<slug>/contact`). Built 2026-05-20.
- **Lesson:** repeatable "stand up a credible local-service brand + lead-capture site in a day" process — directly reusable for [[Business — Splash Jacks Pools]]-style field-service plays.

## How agents should use this
- **Do not treat hot-flash-co or kennum as active businesses or client references.** They're retired. (Old `tenants.json` entries are pending cleanup — see [[Day14 — Current Open Items]].)
- **Do reuse these build processes** when standing up a new brand, store, content pipeline, or local-service site.

## Related
[[Day14 — Strategic Direction]] · [[Businesses — Overview]] · [[Workflows — Index]]


---

# Sandbox Git Playbook

How to do real work safely inside the nightly / Cowork sandbox against Jack's `~/Documents`. Consolidates the three hard-won lessons: the FUSE unlink block, build verification limits, and folder-grant scoping.

## 1. The FUSE mount blocks `unlink`/`rmdir` (not `rename`)

The sandbox FUSE-mounts `~/Documents` (and DAY14) so that **create / write / rename work, but `unlink` and `rmdir` are denied** ("Operation not permitted").

What this means for git:

- **A single `git commit` DOES land.** Git's atomic ref update is a *rename* (`HEAD.lock`→`HEAD`, `<branch>.lock`→`<branch>`), and rename is permitted — so the commit completes and HEAD advances.
- What's denied is git's *cleanup unlink* of leftover lock/temp files. A run leaves stale `.git/HEAD.lock` (0-byte) and `.git/objects/**/tmp_obj_*`. The `tmp_obj_*` blobs are harmless (git ignores them).
- **Clear stale locks at end of run by renaming them aside, never `rm`:** `mv .git/HEAD.lock .git/HEAD.lock.stale`. After that, `git update-ref`/commit works again.
- After a `git status`, a fresh `.git/index.lock` appears — rename it aside as the **last** step, then use only read-only git (`log`/`show`/`rev-parse`/`cat-file`) so it isn't recreated.

### Pitfalls

- **Never probe the write path with `git update-ref --no-deref HEAD HEAD`** — `--no-deref` writes the SHA straight into `.git/HEAD` and **detaches HEAD**. Re-attach with `git symbolic-ref HEAD refs/heads/<branch>`.
- **Never rename a `.lock` file to a name git will read as a ref.** When clearing `.git/refs/heads/<branch>.lock`, do NOT rename it in place (e.g. `…lock.stale`) — it stays inside `refs/heads/` and git parses the 0-byte file as a ref, crashing `clone`/`fetch` with `BUG: refs.c:1106: create called without valid new_oid`. Move such files **out of the refs tree** (e.g. `.git/_stale_locks_quarantine/`). Root-level `.git/index.lock` / `HEAD.lock` are safe to rename in place.

## 2. Multi-step git ops (cherry-pick / rebase / merge)

These re-lock the index *between* internal steps and must `unlink .git/index.lock` mid-way — which the mount denies, so the next step fails with `index.lock: File exists` and nothing lands.

Two working patterns:

- **Throwaway real-fs clone:** `git clone --no-hardlinks <mount path> /tmp/sw-$$-$(date +%s)` (use a unique path — a prior run left `/tmp/studio-work` owned by `nobody`, un-removable). Do the cherry-pick/merge there, verify, and hand Jack a `git push` or a fresh `git bundle`.
- **Squash-via-patch onto the mount** (lands a multi-commit reconciliation as ONE commit):
  1. In the real-fs clone, cherry-pick the N commits (zero-conflict verify), then `git diff base..tip > /tmp/x.patch`.
  2. On the mount: `git apply --check --index x.patch` → `git apply --index x.patch` → single `git commit`.
  3. `git apply --index` prints `unable to unlink …: Operation not permitted` warnings for *modified* files but **still writes new content to index + worktree** — verify `git diff --quiet -- <file>` per modified file afterward.
  4. Record origin SHAs + authors in the commit message (collapses N commits into 1).

## 3. Build verification — what runs and what doesn't

The sandbox repo **does have `node_modules`** (macOS-installed), so:

- **`tsc --noEmit` and `tsc -p tsconfig.test.json --noEmit` RUN** and are the correct per-item verification gate (finishes under the 45s shell timeout). Don't assume "no node_modules" and skip checks.
- The `registry:generate` + `graph:generate` steps run and regenerate `src/lib/skill-*.generated.ts` — **restore those with `git checkout --` before committing** so only intended files land.

What **cannot** run in-sandbox (all are **Jack's gate on the mini**):

- `npm run build` / `next build` — needs `@next/swc-linux-arm64-gnu`; the offline registry returns `EAI_AGAIN` / `ETARGET` 404, so even a fresh `npm ci` in `/tmp` won't supply Linux SWC. The "clone to /tmp + fetch back" idea does **not** solve the build offline; real `next build` must run on the mini.
- `npm test` / `vitest` — dies with `Cannot find module @rollup/rollup-linux-arm64-gnu`.
- Lighthouse.

Workflow: work in a real-fs `/tmp` clone, symlink `node_modules` from the mount, build+commit there, then `git fetch <clone> <branch>:<branch>` into the mount repo to fast-forward the (not-checked-out) branch — pollers/working-tree untouched.

## 4. Folder grants — sandbox only sees what's granted

Cowork scheduled tasks (under `/Users/jack/Claude/Scheduled/`) run in a sandbox that **only sees folders explicitly granted to the workspace.** Default is the DAY14 project folder + outputs/uploads — **NOT `~/Documents`.** The **Read/Write/Edit file tools are also gated** to granted folders (Glob can *index* the whole host, but Read refuses "outside connected folders" and bash has no `~/Documents` mount, so git is impossible).

This silently degraded tasks (e.g. the sell-sprint engine produced placeholder templates and staged zero drafts because it couldn't read the prospect list or `pricing.ts`).

- **Fix:** grant with `mcp__cowork__request_cowork_directory` (e.g. path `~/Documents`). After granting, bash sees it at `/sessions/<id>/mnt/Documents`; Read/Write use `/Users/jack/Documents`.
- Access is **per-grant, not all-or-nothing.** A task editing the studio repo needs **both** `~/Documents/studio` (code) **and** `~/Documents/businesses/_shared` (live outbox/heartbeat state).
- **Before wiring any autonomous task** that needs the prospect list, pricing, or the studio repo, confirm the folder is granted — otherwise it runs blind. Keep such tasks **READ-ONLY** on `~/Documents/businesses` to avoid racing the mini's live agents.

## Quick checklist for a nightly run

1. Confirm the right folders are granted (§4).
2. Stage only your own files — pollers dirty `public/data/*` and `*.generated.ts` concurrently; don't sweep them in.
3. Verify with `tsc` (§3). Restore generated files before committing.
4. Commit locally (§1). For multi-step merges, use a `/tmp` clone or squash-via-patch (§2).
5. Rename away any stale `.lock` as the last step (§1). Leave the **push for Jack** (see [[Working with Jack]]).

## Related

[[Day14 OS — System Map]] · [[Working with Jack]] · [[Day14 — Current Open Items]]


---

# Shell Handoff Rules (zsh)

Rules for any command block Jack will **paste** into his Mac mini's interactive zsh.

## No inline `#` comments inside pasteable command lines

Jack's interactive zsh runs with `interactive_comments` **off**, so `#` is parsed as an **argument**, not a comment.

- A handoff block like `npm run build      # the real gate` made `next build` receive `#`, `the`, `real`, `gate` as args → failed with `Invalid project directory provided, no such directory: …/studio/#` and `zsh: number expected`. It **looked like a build failure but the build never ran** (only the prebuild generate hooks did).
- **Apply:** put explanations as prose **outside** the code fence. Every line inside a ```bash block must be a bare, runnable command.

## Unmatched globs abort the whole line

An unmatched glob (e.g. `.git/*.lock` when no lock file exists) aborts the **entire** command line in zsh. Relevant when scripting lock cleanup — see [[Sandbox Git Playbook]].

## Related

[[Working with Jack]] · [[Day14 OS — System Map]] · [[Sandbox Git Playbook]]


---

# Workflows — Index

Repeatable procedures. Each playbook or runbook is a checklist an agent can follow end-to-end. Add new ones here as patterns stabilize.

## Playbooks
- [[Playbook — Nightly Build & Commit Run]] — verify, commit locally, leave the push for Jack.
- [[Playbook — Customer & Telegram Comms]] — draft, never send; route to Jack.

## Runbooks
- [[Runbook — Go Live & Get Paid]] — the two Jack-blocked mechanics (flip the Stripe/live payment config, then ship the redesign + uncommitted Command Deck work), reduced to copy-paste steps.

## Underlying mechanics (read these too)
- [[Sandbox Git Playbook]] — the environment's git/build/grant constraints every workflow depends on.
- [[Shell Handoff Rules (zsh)]] — formatting any command block Jack will paste.

## Related
[[00 — Agent Boot (START HERE)]] · [[Day14 Vault — Index]]


---

# Playbook — Nightly Build & Commit Run

How an agent does a nightly studio-repo work session safely. Depends entirely on [[Sandbox Git Playbook]] — read it first.

## Preconditions
1. **Confirm folder grants.** You need `~/Documents/studio` (code) and, if touching live state, `~/Documents/businesses/_shared`. Without grants you run blind. Grant via `mcp__cowork__request_cowork_directory`.
2. Keep `~/Documents/businesses` **read-only** unless the task explicitly requires a write — don't race the mini's live agents.

## Steps
1. **Do the work** on your branch. Stage **only your own files** — pollers concurrently dirty `public/data/*` and `*.generated.ts`; don't sweep them in.
2. **Verify with tsc** (the only in-sandbox gate): `tsc --noEmit` and `tsc -p tsconfig.test.json --noEmit`. These RUN (node_modules is present).
3. **Restore generated files** before committing: `git checkout -- src/lib/skill-*.generated.ts` (regenerated by `registry:generate`/`graph:generate`).
4. **Commit locally.** A single commit lands on the mount. For cherry-pick/rebase/merge, use a throwaway `/tmp` clone or squash-via-patch — see [[Sandbox Git Playbook]] §2.
5. **Lock hygiene (last step):** rename aside any stale `.git/HEAD.lock` / `.git/index.lock` (never `rm`); then use read-only git only.
6. **Leave the push for Jack.** Hand him the branch name + a one-line summary. Never push. See [[Working with Jack]].

## What you CANNOT verify in-sandbox (Jack's gate on the mini)
- `npm run build` / `next build` (Linux SWC unavailable offline), `npm test` / `vitest`, Lighthouse. tsc is your only signal.

## Definition of done
- tsc clean, generated files restored, intended files only, locks cleaned, branch + summary handed to Jack.

## Related
[[Sandbox Git Playbook]] · [[Role — Dev & Build Agent]] · [[Shell Handoff Rules (zsh)]]


---

# Playbook — Customer & Telegram Comms

How an agent handles anything that leaves the system as a message. **Default: draft, never send.**

## Hard rule
**No autonomous customer email/messages, and no money movement.** You draft; Jack sends. This is a prime directive — see [[00 — Agent Boot (START HERE)]].

## Drafting a customer reply
1. **Gather real context first** — order/account/history from the relevant source. Never invent facts, prices, or commitments. Prices come from `studio/src/lib/pricing.ts`.
2. **Match scope.** Respect each customer's limits (e.g. Angela: no intake/payments/booking — see [[People & Contacts]]).
3. **Write in Jack's voice**, address the specific issue, propose a concrete next step.
4. **Stage it as a draft** and surface it to Jack with a one-line "why this." Do not send.

## Telegram (internal, to Jack)
- Bot @day14osbot, chat_id 6621607636, outbox at `~/Documents/businesses/_shared/telegram/outbox/`.
- Use for status, asks, and approvals. Keep messages short and lead with the decision needed.
- Jack disliked the old `done N` deep-link flow — prefer the `/admin` to-do write path. See [[Day14 — Current Open Items]].

## Escalation
- Anything irreversible (send, payment, booking, push) → **stop and route to Jack** with the exact draft/command ready to approve.

## Related
[[People & Contacts]] · [[Role — Sales & Growth Agent]] · [[Working with Jack]]


---

# Role — Dev & Build Agent

You own code, builds, and the studio repo. You make the platform better without ever breaking the live fleet.

## Your domain
- `~/Documents/studio` (Next.js): skill specs, dashboard `/dashboard`, admin `/admin`, business sites.
- Branch work, local commits, tsc verification, nightly overhaul runs.

## Your default loop
Follow [[Playbook — Nightly Build & Commit Run]] every session. Mechanics live in [[Sandbox Git Playbook]].

## Non-negotiables
- **Never push.** Commit locally; hand Jack the branch + summary. ([[Working with Jack]])
- **Never rsync** the studio repo — git push/pull only.
- **tsc is your only in-sandbox gate.** `npm run build`/tests/Lighthouse are Jack's gate on the mini.
- **Restore generated files** before committing; stage only your own files.
- **Don't touch pollers / `businesses/_shared` write paths** unless the task requires it — judge fleet health by heartbeat mtime, never logs.
- **Prices come from `pricing.ts`** — never hard-code or invent.

## When you hand off
Give Jack: branch name, what changed, tsc status, and the exact next command — formatted per [[Shell Handoff Rules (zsh)]] (no inline `#` comments).

## Check before you start
[[Day14 — Current Open Items]] — there may be a held merge, an unflipped Vercel branch, or a branch already ahead of origin.

## Related
[[Day14 OS — System Map]] · [[Glossary & Conventions]] · [[00 — Agent Boot (START HERE)]]


---

# Role — Sales & Growth Agent

You drive leads, content, and customer relationships across the portfolio. You move the pipeline without ever sending on Jack's behalf unprompted.

## Your domain
- The businesses in [[Businesses — Overview]] — know which are live, which are builds, which is the proof asset (Splash Jacks Pools).
- Lead triage, content/campaigns, customer comms, follow-ups.

## Non-negotiables
- **Draft, never send.** No autonomous customer email/messages; no money movement. Stage drafts, route to Jack. See [[Playbook — Customer & Telegram Comms]].
- **Never invent** prices, customers, or claims. Prices come from `pricing.ts`. If a fact isn't in the vault, get it or flag it.
- **Respect customer scope** — e.g. Angela (tutoring): no intake/payments/booking. See [[People & Contacts]].
- **Never cite kennum-lawn-care or hot-flash-co** — both retired 2026-06-22, never client references. See [[Build Lessons — Retired Brands]].
- **alignmd is a partner, not a client** — represent it accordingly.

## How to use the proof asset
When you need a real, live example, use **Splash Jacks Pools** — Jack's own working platform. See [[Business — Splash Jacks Pools]].

## Check before you start
[[Day14 — Current Open Items]] for anything customer-facing in flight.

## Related
[[Working with Jack]] · [[People & Contacts]] · [[00 — Agent Boot (START HERE)]]


---

# Role — Founder-Ops Agent

You keep the OS honest and keep Jack oriented. You produce briefings, track status, maintain founder-ops docs, and surface what's slipping — leading with the gap, not the reassurance.

## Your domain
- `~/Documents/businesses/_shared/founder-ops/`: `punch-list.md`, `today-YYYY-MM-DD.md`, `missed-from-jack.md`.
- Briefings (morning ~7:30, nightly polish ~23:00, weekly council Sun ~20:00).
- Fleet health and the live status note. The self-healing arm is [[Agents/auto-restart-watchdog|auto-restart-watchdog]] (scans every daemon's heartbeat, `launchctl kickstart`s the stale ones, P1s Jack when it gives up); its sibling [[Agents/outbox-deadletter|outbox-deadletter]] keeps the Telegram outbox from rotting. You *judge* fleet health; the watchdog *acts* on it.

## Non-negotiables
- **Judge fleet health by heartbeat mtime only** — never logs or boot-script summaries. ([[Day14 OS — System Map]]) Note the enforcement daemon [[Agents/auto-restart-watchdog|auto-restart-watchdog]] diverges slightly — it parses the last heartbeat *line's* timestamp, not file mtime (equivalent in practice; see that note's caveats).
- **Verify before you report.** Don't pass along Jack's "should be fine" — check actual state. ([[Working with Jack]])
- **Lead with what's wrong or missing.** Tag confidence `[Certain]`/`[Likely]`/`[Guessing]`.
- **Keep `businesses/_shared` reads safe** — don't race live agents; write only via the intended paths (e.g. `/admin` to-do write path, not the disliked Telegram `done N` deep-link).
- **Never push, send, or move money** — escalate to Jack.

## Your most important standing job
Keep [[Day14 — Current Open Items]] accurate. It's the note every other agent treats as today's truth — if it's stale, the whole fleet is misinformed. Retire items as they close; add new ones as they appear.

## Check before you start
Read [[Day14 — Current Open Items]] and the latest `today-YYYY-MM-DD.md`.

## Related
[[Day14 OS — System Map]] · [[Businesses — Overview]] · [[00 — Agent Boot (START HERE)]] · [[Agents/auto-restart-watchdog|auto-restart-watchdog]] · [[Agents/outbox-deadletter|outbox-deadletter]] · [[Agent Oversight (Command Deck)]]


---

# Admin Dashboard — Supabase Migration Spec

> **Why this exists.** The `/dashboard` + `/admin` surfaces read **100% local
> filesystem** state on the mini (`~/Documents/businesses/_shared/...`,
> `work-register.jsonl`, poller heartbeats, `tenants.json`, customer dossiers).
> That is why `/admin` **cannot run on Vercel as-is** — Vercel has no access to
> the mini's disk. Two paths give Jack remote admin access:
> 1. **Tunnel** (serve the mini through Cloudflare) — see `~/Claude/Projects/DAY14/ADMIN-TUNNEL-RUNBOOK.md` (file outside the vault); ships today.
> 2. **Supabase telemetry migration** (this note) — move the *read model* into
>    Supabase so `/admin` renders on Vercel with no tunnel. Tracked project, not a same-day task.
>
> **Scope of THIS note (queue item 5):** the **schema** — tables, columns,
> indexes, RLS posture, and the dual-write plan. The read-seam adapter
> (`telemetry-source.ts`) and the `/admin-on-Vercel` render plan were **item 6**,
> now landed: `src/lib/telemetry-source.ts` exists (uncommitted) — the
> `TelemetrySource` interface, `LocalFsTelemetrySource` + `SupabaseTelemetrySource`
> (a stub that throws `"not wired"`), and the `getTelemetrySource()` factory that
> keys off `TELEMETRY_SOURCE`. The render/cutover plan is written up in [[#5. /admin-on-Vercel render plan|§5]]
> below — nothing is wired yet; every cutover step is still a Jack-tap.
>
> **Planning only.** No SQL is applied here. No Supabase project change, no env
> var, no code wired. Every "apply" step is a **Jack-tap**.

Related: [[Day14 — Current Open Items]] · runbooks outside the vault: `~/Claude/Projects/DAY14/GO-LIVE-RUNBOOK-2026-06-30.md` · `~/Claude/Projects/DAY14/ADMIN-TUNNEL-RUNBOOK.md`

---

## 1. What the dashboard actually reads (the read model to mirror)

Grounded in live code, not assumption:

| Local source (mini disk) | Read by | Shape |
|---|---|---|
| `_shared/growth/work-register.jsonl` | `dashboard/page.tsx` `gatherStats()`, growth-watcher | append-only JSONL of `WorkEntry` + `timestamp` (`src/lib/work-register.ts`) |
| `_shared/poller/*-heartbeat.log` | `gatherStats()` (last line → age), `/dashboard/system` | one timestamped line per beat; freshness = `now − lastBeat`, **stale > 10 min** |
| `_shared/tenants.json` | `src/lib/tenants.ts` `getTenants()`, dashboard, dispatcher | `{schema_version, tenants[], tenant_types{}}`; **dual schema** (see §2.3) |
| `_shared/customers/{slug}/01-brand.json` (+ `02-status.md`, `03-refunds.md`, `03/06-feedback.md`) | dossier views, customer-index | per-customer brand JSON + appended markdown logs |
| `docs/seeds/skills/_drafts/{name}/SKILL.md` and `_drafts/_meta/{name}/SKILL.md` | `gatherStats()` drafts panels | dir-per-draft; meta carries `recurrence_risk:` frontmatter |
| `_shared/growth/meta-circuit-state.json`, `growth-log.md`, `meta-gaps.md` | `gatherStats()` (counts + circuit) | circuit JSON; markdown `## ` headers counted |
| `skill-registry.generated.ts` | dashboard counts | compile-time import — **stays in code**, not a DB table |
| `_shared/telegram/outbox/*.json` | unsent-cards panel | card JSON (`urgency`, `text`, `sent_at`) |
| `_shared/founder-ops/energy-log.jsonl` | energy trend | JSONL `{date, energy, mood, note}` |
| `_shared/audit/...` (hash-chained) | audit verifier | `AuditEntry` + `hash`/`prev_hash` (`audit-log-generator.ts`) |

Six tables below cover the **core** dashboard read model (queue item 5's list).
Two more (`telegram_outbox`, `energy_log`) are needed for **full** `/admin`
parity and are specced as **Phase-2** in §3.7. The skill registry stays a
compile-time import — no table.

---

## 2. Schema (DDL — planning only; Jack applies)

Conventions: snake_case; `timestamptz` everywhere; `raw jsonb` on every mirror
table for forward-compat (store the full source object so a schema drift never
loses data); `ingested_at`/`updated_at` audit columns. SQL `--` comments are
safe (this is not a zsh paste block).

### 2.1 `work_register` — append-only event log (per-event dual-write)

```sql
create table public.work_register (
  id            bigint generated always as identity primary key,
  ts            timestamptz not null,            -- record.timestamp (ISO)
  action_phrase text        not null,
  context       text        not null,
  type          text,                            -- 'error' surfaces on /system
  agent         text,
  customer_slug text,
  invoked_skill text,
  is_ad_hoc     boolean     not null default false,
  is_meta       boolean     not null default false,
  source        text,
  notes         text,
  content_hash  text        not null,            -- sha256(ts|action_phrase|context) for idempotent dual-write
  raw           jsonb       not null,
  ingested_at   timestamptz not null default now(),
  unique (content_hash)
);
create index work_register_ts_idx          on public.work_register (ts desc);
create index work_register_skill_idx       on public.work_register (invoked_skill);
create index work_register_customer_idx    on public.work_register (customer_slug);
create index work_register_error_idx       on public.work_register (ts desc) where type = 'error';
create index work_register_adhoc_idx       on public.work_register (ts desc) where is_ad_hoc;
```

The JSONL has no native id, so `content_hash` is the natural key — re-running the
backfill or a double-fire upsert is a no-op (`on conflict (content_hash) do nothing`).

### 2.2 `poller_heartbeats` — current beat per poller (timer-snapshot upsert)

```sql
create table public.poller_heartbeats (
  poller       text        primary key,          -- 'growth-watcher', 'telegram-poller', 'events-poller', ...
  last_beat_at timestamptz,                       -- parsed from the last heartbeat line
  meta         jsonb,                             -- optional: pid, host, extra fields
  updated_at   timestamptz not null default now()
);
```

Staleness is **derived at read time** (`now() - last_beat_at > interval '10 minutes'`),
not stored, so a row never goes "false-fresh" if the snapshotter stops — query
the age live. Honors the prime directive "judge fleet health by heartbeat mtime only."

### 2.3 `tenants` — registry mirror (timer-snapshot upsert)

```sql
create table public.tenants (
  slug                text        primary key,
  name                text        not null,       -- normalized: name ?? display_name ?? slug
  type                text,
  status              text        not null,       -- normalized: active | paused | archived (stageToStatus fallback)
  owner               text,
  domain              text,
  primary_color       text,
  intake_form         text,
  enabled_skill_packs jsonb       not null default '[]',
  stripe_account      text,                        -- billing.stripe_account
  tier                text,                        -- billing.tier
  monthly_amount      numeric     not null default 0,
  notes               text,
  raw                 jsonb       not null,        -- full registry entry, pre-normalization
  updated_at          timestamptz not null default now()
);
create index tenants_status_idx on public.tenants (status);
```

**Schema-drift note (carry the `tenants.ts` normalizer into the writer):** the
registry has two shapes — older `name`/`status`/`billing`, newer
`display_name`/`stage` with no billing. Write the **normalized** values into the
typed columns (so the dashboard never re-implements `normalizeTenant`) AND keep
the untouched entry in `raw`. The normalizer lives at `src/lib/tenants.ts`
(`normalizeTenant`) — that function is the canonical drift handler to mirror.

### 2.4 `dossier_index` — one row per customer (timer-snapshot upsert)

```sql
create table public.dossier_index (
  slug                text        primary key,
  name                text,
  type                text,
  domain              text,
  status              text,
  monthly_amount      numeric,
  tier                text,
  signup_date         timestamptz,
  stripe_customer_id  text,                        -- present in richer 01-brand.json variants
  enabled_skill_packs jsonb       not null default '[]',
  last_status         text,                        -- tail of 02-status.md transitions
  refund_count        int         not null default 0,   -- derived: count of 03-refunds.md entries
  feedback_count      int         not null default 0,   -- derived: 03-/06-feedback.md entries
  dossier_path        text,                        -- pointer; files stay on mini
  raw                 jsonb       not null,         -- full 01-brand.json
  updated_at          timestamptz not null default now()
);
create index dossier_index_status_idx on public.dossier_index (status);
```

`01-brand.json` itself varies (some omit `stripe_customer_id`, `primary_color`);
columns are nullable and `raw` carries the full object. The markdown dossier
*bodies* (intake, launch notes, full refund/feedback logs) stay on the mini —
this is an **index**, not a dossier store.

### 2.5 `drafts_index` — pending skill drafts (timer-snapshot upsert)

```sql
create table public.drafts_index (
  name            text        not null,
  kind            text        not null,            -- 'domain' | 'meta'
  recurrence_risk numeric,                          -- meta only (from SKILL.md frontmatter)
  skill_md_path   text,
  status          text        not null default 'pending',  -- pending | promoted | archived
  detected_at     timestamptz,
  updated_at      timestamptz not null default now(),
  primary key (name, kind)
);
create index drafts_index_kind_idx on public.drafts_index (kind, status);
```

Composite PK `(name, kind)` because a domain and meta draft could share a name.
Snapshotter sets `status='pending'` for dirs present under `_drafts/`; when a
draft leaves (promoted/archived via `dashboard/actions.ts`) the next snapshot
flips its `status` (don't delete — keeps an audit trail of what was reviewed).

### 2.6 `empire_state` — periodic rollup snapshot (append; read latest)

```sql
create table public.empire_state (
  id                  bigint generated always as identity primary key,
  captured_at         timestamptz not null default now(),
  skill_count         int,
  domain_skill_count  int,
  meta_skill_count    int,
  drafts_domain       int,
  drafts_meta         int,
  work_register_count int,
  growth_detections   int,
  meta_detections     int,
  circuit_open        boolean,
  circuit_reason      text,
  circuit_since       timestamptz,
  unsent_cards        int,
  p0_cards            int,
  stale_pollers       int,
  system_color        text,                         -- 'green' | 'yellow' | 'red' (same rule as gatherStats)
  raw                 jsonb,
  unique (captured_at)
);
create index empire_state_captured_idx on public.empire_state (captured_at desc);
```

Append-per-snapshot so the dashboard can also chart trend over time; the top
StatCards read `order by captured_at desc limit 1`. The `system_color` rule must
mirror `gatherStats()`: red if any P0 OR stale poller OR circuit open; yellow if
any P1 OR >2 meta drafts; else green. Compute it in the snapshotter, store it,
so Vercel and the mini agree.

---

## 3. RLS posture

```sql
alter table public.work_register     enable row level security;
alter table public.poller_heartbeats enable row level security;
alter table public.tenants           enable row level security;
alter table public.dossier_index     enable row level security;
alter table public.drafts_index      enable row level security;
alter table public.empire_state      enable row level security;
-- (Phase-2) telegram_outbox, energy_log: same.
```

- **RLS on, zero policies → deny-all to `anon` and `authenticated`.** This is the
  default and it is the desired default. None of this telemetry should ever be
  publicly readable.
- **`service_role` bypasses RLS.** That key is the only writer (pollers' dual-write
  and the backfill) **and** the only reader. The Vercel `/admin` route reads
  Supabase **server-side** with `SUPABASE_SERVICE_ROLE_KEY`, behind the existing
  middleware admin gate (`src/middleware.ts` + the hardened
  `src/lib/admin-session.ts` from queue item 3). So the access control stays
  exactly where it is today — the signed `admin-session` cookie — and Supabase
  contributes no second public surface.
- **Hard rule: never ship `SUPABASE_SERVICE_ROLE_KEY` to the browser.** All reads
  go through the Next server (Server Component / route handler). No client-side
  Supabase reads in this design. If a future client-read feature is wanted, add a
  single explicit `authenticated` SELECT policy gated on a custom claim — not now.
- This matches today's `events`-table usage via `src/lib/supabase-server.ts`
  (service-role, server-only), so no new key class is introduced.

---

## 4. Dual-write plan

Principle: **the mini's local files stay the source of truth through the whole
migration.** Supabase is a *secondary* read model written best-effort. A Supabase
outage must never break the mini — mirror `logAction()`'s swallow-errors,
never-throw contract.

**Two write cadences:**

1. **Per-event (only `work_register`).** In `src/lib/work-register.ts`
   `logAction()`, after the existing `appendFile`, call a new best-effort
   `telemetrySink.appendWorkRegister(record)` (try/catch, console-only on
   failure, no throw). This is the only high-frequency, append-shaped stream.

2. **Timer snapshot (everything else).** `tenants`, `dossier_index`,
   `drafts_index`, `poller_heartbeats`, `empire_state` are *derived* state —
   cheapest to recompute and upsert on a timer rather than hook every file
   change. Add a small snapshotter (a new poller `telemetry-snapshot.mjs`, ~every
   2–5 min, heartbeat like the others) that recomputes the same values
   `gatherStats()` + `getTenants()` produce and upserts them. Idempotent (PK
   upserts; `work_register` uses `content_hash` do-nothing).

**New write seam (this is the *write* counterpart to item 6's read seam):**
`src/lib/telemetry-sink.ts` — server-only, wraps the existing
`supabase-server.ts` service-role client; exposes `appendWorkRegister()`,
`upsertTenants()`, `upsertDossierIndex()`, `upsertDrafts()`,
`upsertHeartbeats()`, `writeEmpireSnapshot()`. Each guarded so failures are
logged via `logError()` and swallowed.

**Backfill (one-time, idempotent, Jack-tap):** a script reads existing
`work-register.jsonl` (bulk insert with `content_hash` de-dupe), `tenants.json`,
all `customers/*/01-brand.json`, `_drafts/**`, and current heartbeat lines, then
upserts. Safe to re-run.

**Cutover:** once Supabase has parity and item 6's `telemetry-source.ts` read
seam is wired, point the Vercel `/admin` build at the Supabase implementation;
the mini keeps reading local (or either). No data loss — dual-write keeps both in
sync. Rollback = flip the read seam back to local-FS; Supabase tables are
harmless if ignored.

**Order of operations (all Jack-tap):**
1. Apply DDL (§2) + RLS (§3) in the Supabase SQL editor.
2. Land `telemetry-sink.ts` + the `logAction` hook + `telemetry-snapshot.mjs` (uncommitted → Jack reviews → commit/push).
3. Run the backfill once; verify row counts vs local.
4. Install the snapshotter launchd plist (Jack-tap; same pattern as the other pollers).
5. Let it run dual-write for a day; diff Supabase vs `gatherStats()` for parity.
6. Wire item 6's read seam to Supabase for the Vercel `/admin` build.

**Env vars introduced (document, Jack sets):** none new for Supabase itself
(`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` already exist for the `events`
table). The Vercel `/admin` deploy needs those two present in Vercel's env (they
are mini-only today) — that env change is a Jack-tap, part of item 6.

### 3.7 Phase-2 tables (full `/admin` parity, not in item-5's core six)

For the dashboard panels beyond the core read model:

- **`telegram_outbox`** — `filename` PK, `urgency`, `text`, `sent_at`,
  `created_at`, `raw jsonb`. Read-only mirror so the "unsent cards" panel renders
  on Vercel. **Sends still happen only on the mini** via `telegram-poller` — the
  Vercel surface shows them, it does not send (prime directive: no autonomous
  customer/Telegram sends).
- **`energy_log`** — `date` PK, `energy int`, `mood int`, `note text`,
  `ts timestamptz`. Mirror of `founder-ops/energy-log.jsonl` for the energy
  trend. Note: `logEnergyCheckin()` (a dashboard server action) would need a
  dual-write too if check-ins are made from the Vercel surface.

Both follow the same timer-snapshot + RLS-deny-all + service-role pattern.

---

## 5. /admin-on-Vercel render plan

> **Completed in queue item 6** (alongside `src/lib/telemetry-source.ts`, landed
> uncommitted). The read seam exists; this section is the cutover plan that
> consumes it. Nothing below is wired yet — every step is a Jack-tap.

### 5.1 The seam that makes this possible

`src/lib/telemetry-source.ts` (item 6) defines a `TelemetrySource` interface with
three reads — `getWorkRegister()`, `getHeartbeats()`, `getTenants()` — and two
implementations:

- `LocalFsTelemetrySource` — wraps today's exact read paths (work-register.jsonl,
  `poller/*-heartbeat.log`, `tenants.ts`). Output matches `gatherStats()` field
  for field, so swapping a reader to the seam is behavior-preserving.
- `SupabaseTelemetrySource` — a stub that throws `"not wired"` until this cutover.

A `getTelemetrySource()` factory picks the impl from `TELEMETRY_SOURCE` (anything
other than `"supabase"` → local-FS). The dashboard still calls `fs` directly
today; **wiring it to the factory is step 5.3 below, not done yet.**

### 5.2 Which routes flip, and what each needs

The local-FS dashboard touches more than the three seam reads. The cutover is
staged so the three core reads move first, then the long-tail panels:

- **Flips via the seam (core, item-5 tables exist):**
  `src/app/dashboard/page.tsx#gatherStats()` — the `work-register.jsonl`
  line-count + entries, the `poller/*-heartbeat.log` loop, and tenant reads all
  become `src.getWorkRegister()` / `src.getHeartbeats()` / `src.getTenants()`.
  `src/app/dashboard/system/page.tsx` reads the same heartbeats + error entries —
  flips the same way.
- **Needs Phase-2 tables first (§3.7), keep on local-FS until then:** the
  telegram-outbox "unsent cards" panel, the `_drafts/` + `_drafts/_meta/` SKILL.md
  scans, `growth-log.md` / `meta-gaps.md` markdown counts, `meta-circuit-state.json`,
  and the energy-log panel. These read files the core six tables don't carry, so
  on Vercel they render empty/degraded until their mirror tables land. Gate them
  behind a `hasFullTelemetry` flag so the Vercel build hides rather than errors.
- **Stays local-only, never flips:** the draft-action + card-action server
  actions (`draft-actions.tsx`) and `EnergyCheckinForm` write to the mini's disk
  and queue Telegram. On Vercel these are **read-only views**; the write buttons
  must be hidden or no-op'd (prime directive: no autonomous sends, and Vercel has
  no disk to write to anyway).

### 5.3 Cutover steps (all Jack-tap, in order)

1. Land the Supabase reads inside `SupabaseTelemetrySource` (replace the three
   `throw`s with service-role `select`s against the item-5 tables). `npx tsc
   --noEmit`. Uncommitted → Jack reviews → commit.
2. Rewire `gatherStats()` (and `system/page.tsx`) to call `getTelemetrySource()`
   instead of `fs`. With `TELEMETRY_SOURCE` unset this is a **no-op on the mini**
   (still local-FS) — verify the mini dashboard is byte-identical before exposing
   anything.
3. Add `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` to Vercel env (mini-only
   today). **Jack-tap env change.**
4. Set `TELEMETRY_SOURCE=supabase` in Vercel env only (NOT on the mini). Now the
   Vercel `/admin` build reads Postgres; the mini stays local-FS.
5. Gate the Phase-2-dependent panels behind `hasFullTelemetry` so the first
   Vercel deploy renders the core three cleanly and hides the rest.

### 5.4 Build-time vs request-time on Vercel

`/dashboard` is already `export const dynamic = "force-dynamic"` +
`revalidate = 0`, so it renders **per-request** — correct for live telemetry and
unchanged by this migration. Do **not** let it statically prerender (no data at
build time, and the service-role key must never reach a build artifact). Reads go
through a Route Handler / Server Component using the service-role client
server-side only; the key is never shipped to the browser.

### 5.5 The admin gate carries over unchanged

`src/middleware.ts` + `ADMIN_SESSION_SECRET` (item 3) gate `/admin /dashboard
/app /data/*` by signed cookie. That logic is host-agnostic and works identically
on Vercel — **with one precondition already flagged in `ADMIN-TUNNEL-RUNBOOK`:**
`ADMIN_SESSION_SECRET` MUST be set in Vercel env before exposure, or the legacy
replayable static-hash cookie is served to the whole internet. The localhost
bypass keys off the real `Host` header, so it never triggers on a Vercel domain —
the gate is fully active there. No middleware change is needed for the migration.

---

## Open questions for Jack
- Snapshot cadence: 2 min (fresher, more writes) vs 5 min (cheaper)? Default proposed: **2 min** to match the heartbeat-staleness 10-min window comfortably.
- Keep the **tunnel** (`~/Claude/Projects/DAY14/ADMIN-TUNNEL-RUNBOOK.md`) as the day-one remote-admin path and treat Supabase as the durable v2? (Recommended: yes — tunnel today, Supabase migration as a tracked project.)
- Do you want trend charts off `empire_state` history, or is latest-snapshot enough for v1? (Schema supports both.)


---

# Agent Collaboration Protocol

How the Day14 agents stop being ten soloists on wall-clock timers and start working as a **team**: a shared memory they all read and write, a directory of who can do what, explicit handoffs where one agent's output becomes the next agent's input, and a Leader that decides run order. This note is the **operating manual** for that collaboration — the *why* lives in [[Agent Org & Orchestration]] and the *full spec* in [[Agent Orchestration — Build Spec]]; this is how an agent actually participates, with the real, built files.

> **Build status (confidence: high — verified this session).** The collaboration substrate is BUILT and runnable under `scripts/_generic/`: `blackboard.mjs`, `agent-registry.mjs`, `handoff-pipeline.mjs`, `chief-of-staff.mjs`, `lessons.mjs`. It is **not yet live-scheduled** — no launchd plist, no live dispatch, no customer/Stripe/Telegram sends. Wiring the Leader and pipeline into the fleet is a separate **Jack-tap** step. Everything below is exercised today via `node` only.

## The four pieces

1. **The blackboard** — `scripts/_generic/blackboard.mjs`. One shared run-context per orchestration run. Agents read it before acting and post their findings after, so a peer's conclusion is visible mid-run instead of buried in a sibling folder.
2. **The capability registry** — `scripts/_generic/agent-registry.mjs`. A static, read-only map of each C-suite agent's purpose, inputs, outputs, and who it hands work to. The directory, not the dispatcher.
3. **The handoff pipeline** — `scripts/_generic/handoff-pipeline.mjs`. The proof that one agent's output flows into the next: `sales-director → compliance-officer → brand-steward → (Jack tap)`, every arrow a blackboard post.
4. **The Leader** — `scripts/_generic/chief-of-staff.mjs`. Reads empire state, decides what should run and in what order, posts the plan to the blackboard, and writes a daily brief. Sequences and drafts only — it never auto-approves.

Plus a learning hook: **shared lessons** — `scripts/_generic/lessons.mjs` — so agents record "what worked / change next time" across runs.

## How an agent participates (the contract)

Every orchestrated agent follows the same small loop. It does **not** rewrite its core logic — collaboration is additive. An agent invoked without a `runId` (e.g. its own legacy timer) still works standalone.

```
1. read what was handed to me:   const inbound = await latestForAgent(runId, MY_NAME)
2. read the shared context:      const ctx     = await readFindings(runId)
3. do my existing job, informed by ctx (and only ctx — no hidden side channels)
4. drop any output as an artifact: const rec   = await addArtifact(runId, label, srcPath)
5. post my finding + handoff:     await postFinding(runId, MY_NAME, key, value, { for: NEXT, status })
6. heartbeat as always (mtime is the only liveness signal)
```

### The blackboard API (what's actually built)

Run-context lives at `~/Documents/businesses/_shared/orchestration/runs/<run-id>/` — a `run.json` header, an append-only `posts.jsonl` body, and an `artifacts/` dir. The lib is **best-effort: every function is wrapped so it never throws** — a coordination layer must not be able to break a job.

| Function | Use |
|---|---|
| `openRun(goal, opts?)` → `runId` | start a run (the Leader does this) |
| `postFinding(runId, agent, key, value, opts?)` | append one finding; `opts.for` names the next agent, `opts.status` is `pending`/`pass`/`fail`/`needs-changes` |
| `readFindings(runId, agentOrFilter?)` | read peer context (the whole board, or filtered) |
| `latestForAgent(runId, agent)` | "what was handed to me" — inbound handoffs |
| `addArtifact(runId, label, srcPath)` / `putArtifact(runId, name, contents)` | stash a produced file |
| `listRun(runId)` / `listRuns()` | inspect a run / enumerate runs |
| `setRunStatus(runId, status)` / `closeRun(runId, summary)` | lifecycle (`open` → `awaiting-jack` → `closed`) |
| `getRun(runId)` | read the header |

`posts.jsonl` is **append-only** — mirrors the dossier/audit norm ("the audit trail matters more than tidiness"). Never overwrite a post.

## Consulting the capability registry

Before handing off, an agent (or the Leader) asks the registry who does what and who comes next. It is pure data — it triggers nothing.

```js
import { getAgent, allAgents, handoffEdges, jackTapSinks } from "./agent-registry.mjs";
const sd = getAgent("sales-director");   // → { purpose, inputs, outputs, handsOffTo:["compliance-officer"], … }
```

Each record carries `name`, `role`, `purpose`, `cadence`, `inputs`, `outputs`, `handsOffTo[]`, and flags like `queuesForJack`. `receivesFrom` is derived by inverting `handsOffTo`. The handoff edges grounded in [[Agent Roster]] + [[Agent Org & Orchestration]] §3:

```
cfo-agent ──pricing rec──▶ sales-director
product-strategist ──winners/cross-sell──▶ sales-director
performance-analyst ──metrics──▶ investor-relations
pr-director ──press draft──▶ brand-steward
sales-director ──outbound draft──▶ compliance-officer ──gate──▶ brand-steward ──voice-check──▶ (Jack)
customer-success-agent ──reply draft──▶ compliance-officer ──gate──▶ devops-sre ──route──▶ (Jack)
```

**Terminal agents queue for a Jack tap** (`queuesForJack:true`) rather than handing to a peer. That human tap is the only sink through which customer/money/push work leaves the building.

## The proof handoff pipeline

`handoff-pipeline.mjs` runs one real flow end-to-end through the blackboard, the template every future pipeline copies:

1. **sales-director** drafts outbound, writes each to `artifacts/`, and posts `{ kind:"draft", for:"compliance-officer", status:"pending" }`. Unverified targets are flagged in `notes` per its roster gap.
2. **compliance-officer** wakes on that post (`latestForAgent` returns the draft), checks legal/brand-safety/ToS/GDPR, and posts a gate: `pass` → forwards to `brand-steward`; `fail` → short-circuits to `__jack__` with the reason (no further automated steps).
3. **brand-steward** wakes on a passed gate, scores the draft against the brand CONSTITUTION, and posts a score: `pass` → `__jack__`; `needs-changes` → loops back to `sales-director` **once** (capped to avoid cycles).
4. **Queue for Jack.** A post landing `for:"__jack__"` becomes a single Command Deck tap item + one Telegram card. The run goes to `awaiting-jack`. **Nothing sends without Jack's tap** — the hard line.

Each step reads the prior agent's finding off the board (not a side channel) and posts its own. In the built file every step is a deterministic dry-run stub with a `[DRY-RUN / SAMPLE]` marker — real agents drop in behind the same contract later without changing the orchestration. It makes **no** customer send, no Stripe, no Telegram outbox write (the live poller drains that dir); the "queue for Jack" step writes a DRAFT tap-card to `artifacts/` only.

```
node scripts/_generic/handoff-pipeline.mjs          # dry-run, prints a trace
node scripts/_generic/handoff-pipeline.mjs --json    # machine-readable
node scripts/_generic/handoff-pipeline.mjs --keep     # keep the demo run dir
```

## The Leader's role

`chief-of-staff.mjs` is the *scheduler of agents* — an engine, not a C-suite employee. Each tick it:

1. **`loadEmpireSnapshot()`** — reads `empire-state.json`, `founder-ops/priority-today.json`, `operator-todos.json`, the work-register tail, the vault "Needs Jack" items, and heartbeat **mtime only**. Best-effort: missing inputs degrade gracefully and are recorded.
2. **`buildRunPlan(snapshot)`** — a pure, deterministic planner. Seeds steps from `priority-today` by score via a responsibility table, **drops dead daemons to escalations** (never plans around them), flags skill-approvals as TAP, then applies `handoffEdges()` to inject + topo-order the gates (compliance → brand/devops) after each producer so outbound is **always gated**. Terminal Jack-tap sinks are identified.
3. **`writeChiefOfStaffBrief()`** — appends a daily brief to `_shared/founder-ops/` (what it ran, the one-line reason for the order, what it deferred, the escalations).
4. **`runOnce()`** — opens a blackboard run, posts the plan + escalations (`for:"__jack__"`), writes the brief, closes the run.

The Leader **sequences and drafts — never auto-approves an irreversible action.** It does not call `dispatch()`, does not fire any agent, does not write to `telegram/outbox/`, does not touch Stripe. "What it WOULD trigger" is logged into the plan and brief only; turning that into real dispatch is a separate Jack-tapped wiring step.

```
node scripts/_generic/chief-of-staff.mjs            # dry-run, prints the plan
node scripts/_generic/chief-of-staff.mjs --no-write  # plan only; write nothing
```

## Learning across runs

After a run, an agent or the Leader records a lesson with `recordLesson(runId, { agent, worked, changeNextTime, tags })` (`lessons.mjs`). It writes to **two** places: a `kind:"lesson"` finding on the blackboard run, and a rolling [[Agent Lessons]] note so the next `npm run context:compile` folds accumulated lessons back into every agent's compiled context. `readLessons({ limit, tag, agent })` lets an agent consult prior lessons before planning. Best-effort, never throws.

## Guardrails this protocol never crosses

The collaboration layer is exactly where these get tempting to bypass, so they are restated:

- **The Leader sequences and drafts; Jack taps.** No auto-approval of push, payment, or customer/candidate send — ever. `for:"__jack__"` is the only way work leaves the building.
- **One execution lane.** When live, triggered work goes through `dispatch()` like everything else; blackboard writes are audited. No shadow side channels.
- **Heartbeat mtime is the only liveness signal.** A dead daemon is escalated, never silently planned around.
- **Append, never overwrite** — `posts.jsonl`, briefs, dossiers.
- **No fabricated data; prices only from `pricing.ts`.** The sample tenant in the pipeline is explicitly labelled; prices are never invented.
- **Best-effort, non-blocking.** The blackboard and lessons libs never throw — coordination must not break a job.

## Related
[[Agent Org & Orchestration]] · [[Agent Orchestration — Build Spec]] · [[Agent Roster]] · [[Agent Oversight (Command Deck)]] · [[Agent Journal & Handoffs]] · [[Handoffs & Open Questions]] · [[Working with Jack]] · [[Day14 OS — System Map]]


---

# Agent Deck Backend Architecture

The real backend behind the [[Agent Oversight (Command Deck)]] — built so Jack's god-view runs today and a Platform customer's scoped view is a clean fork, not a rewrite. Lives at `src/lib/agent-deck/`.

> **✅ BUILT 2026-06-26** (confidence: high — written this session, uncommitted): the typed `DeckState` contract, the file-backed `DeckRepository`, and both surfaces (god-view + scoped customer view) all exist; the deck reads/writes through this service and tenant isolation is enforced inside it. **⏳ PENDING:** the Supabase adapter and real per-customer auth (steps 3–4 below) — additive forks, not a rebuild.

## The contract (why this scales)
Everything speaks one typed domain — `DeckState` — and storage hides behind one interface, `DeckRepository`. Surfaces never touch raw files or a DB directly:

- `getDeck(tenant)` → `DeckState`. `tenant === null` = god-view (admin of admins, every agent + tap). `tenant === slug` = one business, scoped to only its data.
- `resolveDeckTap(tenant, kind, id, decision)` → audited, tenant-isolated write (a scoped caller can only act on its own tenant's items).

Because callers depend on the interface, not the storage, swapping the backend is one line: `DAY14_DECK_BACKEND=supabase` + a `SupabaseDeckRepository` implementing the same shape. **No page, API, or write path changes.**

## Files
- `types.ts` — `DeckState`, `AgentRow`, `TapItem`, `DeckRepository`, priority helpers. The stable contract.
- `file-repository.ts` — file-backed adapter. Projects the live `_shared` operator state (`empire-state.json`, `operator-todos.json`, outbox taps, poller log mtimes, `brand-health-empire.md`, `priority-today.json`) into typed `DeckState`, **filtered by tenant**. Writes flip `operator-todos.json` / resolve outbox taps, audit-logged first, with tenant-isolation checks.
- `index.ts` — service entry; selects the adapter (file now; supabase stub commented for later).

## Surfaces on top of it
- `src/app/dashboard/agents/page.tsx` — the god-view, pure presentation, calls `getDeck(null)`.
- `src/app/api/dashboard/agents/approve/route.ts` — god-view write; delegates to `resolveDeckTap(null, …)`.
- `src/app/api/agents/state/route.ts` — read API (live polling / future customer client).
- Auth mirrors `src/middleware.ts`: localhost trusted; hosted/LAN needs the `admin-session` cookie.

## Migration path to multi-tenant SaaS (the fork, de-risked)
1. ✅ **Contract + file adapter + god-view** (2026-06-26).
2. ✅ **Shared DeckView + scoped customer page** (2026-06-26) — `src/app/dashboard/agents/deck-view.tsx` renders both views. `/app/[tenant]/agents` calls `getDeck(slug)`; tenant comes from the route, never the client. Isolated write at `/api/app/[tenant]/agents/approve` (re-checks isolation in `resolveDeckTap`). `/app/*` gated in `middleware.ts`. Today it's admin/localhost-gated → **Jack-preview mode** (Jack can open any customer's lens).
3. **Supabase adapter** — `SupabaseDeckRepository` implementing `DeckRepository`, per-tenant rows (Day14 already provisions per-tenant Supabase). Flip `DAY14_DECK_BACKEND=supabase`. *(pending)*
4. **Real per-customer auth** — each customer logs in and sees ONLY their slug; the route tenant must equal the authenticated customer's tenant. *(pending)*

## Demo (Jack-preview, today)
- God-view: `/dashboard/agents` (all tenants).
- A customer's lens: `/app/day14-realty/agents` (only day14-realty's agents/taps/activity). Try `/app/alignmd/agents` too — shows the honest empty-scope state where a tenant has no daemons yet.

## What's intentionally NOT built yet
The Supabase adapter and real per-customer auth (steps 3–4). The contract + both views exist, so those are additive forks, not a rebuild.

## Related
[[Agent Oversight (Command Deck)]] · [[Agent Org & Orchestration]] · [[Day14 OS — System Map]] · [[Day14 — Current Open Items]]


---

# Agent Lessons

Rolling log of what worked and what to change next time, written by agents
and the Leader after orchestration runs. Append-only, newest at the bottom.
Folded back into agent context on the next `npm run context:compile`.

Format: `- [stamp] (agent) WORKED: … → NEXT: … [run: id] #tags`

## How this note is written

Auto-created and appended by `scripts/_generic/lessons.mjs` — the shared-lessons
hook (item 5 of the agent-collab build queue). `recordLesson(runId, { agent,
worked, changeNextTime, tags })` writes each lesson to **two** places: a
`kind:"lesson"` finding on the blackboard run, and one Markdown line appended
here so the next `npm run context:compile` folds accumulated lessons back into
every agent's compiled context. `readLessons({ limit, tag, agent })` lets an
agent consult prior lessons before planning. The library is best-effort and
never throws (mirrors [[Agent Journal & Handoffs]]'s vault write-back path). The
note path defaults to this vault (`Agent Lessons.md`), overridable via
`DAY14_VAULT_DIR`. The header above is created once by `ensureLessonsNote()` on
the first write, so this file is byte-compatible with what the code emits.

## Status (2026-07-01, repo-verified)

The `lessons.mjs` module is **BUILT** (`recordLesson` / `readLessons` exist,
shipped 2026-06-30), but it is **not yet wired into any orchestration run** —
`recordLesson` has zero call sites across `scripts/` and `src/` (only a
docstring mention in `registry-audit.mjs`). So no lessons have been recorded
yet and this note carries only its header until an agent or the Leader starts
calling the hook. The skill-promotion side of the learning loop
(repeated-handwork detector + `emitLearningSignal`) is likewise still unbuilt.
See [[Agent Orchestration — Build Spec]] §5.2, [[Agent Org & Orchestration]]
(shared-lessons bullet), and [[Agent Collaboration Protocol]] for the design.

## Related

[[Agent Collaboration Protocol]] · [[Agent Orchestration — Build Spec]] · [[Agent Org & Orchestration]] · [[Agent Journal & Handoffs]] · [[Agent Roster]]

<!-- Recorded lessons append below this line (newest at the bottom), one per run. -->


---

> **🔧 BUILT 2026-06-30 (confidence: high — files verified this session, NOT yet live-scheduled).** The freeze lifted (CLAUDE.md, 2026-06-26) and the orchestration substrate is now runnable code — but **nothing is wired into launchd and nothing fires live**; Jack taps that. What exists:
> - **Blackboard (§2)** — `scripts/_generic/blackboard.mjs` (`openRun`/`postFinding`/`readFindings`/`addArtifact`/`closeRun` + `latestForAgent`; run.json header + append-only posts.jsonl + artifacts/). ✅ runnable, `--selftest` passes.
> - **Agent capability registry (NEW, not in original spec)** — `scripts/_generic/agent-registry.mjs`: static who-does-what / who-hands-to-whom map (10 C-suite agents, `getAgent`/`allAgents`, handoff edges + Jack-tap sinks), grounded in [[Agent Roster]]. The Leader + agents read it.
> - **One handoff pipeline (§4)** — `scripts/_generic/handoff-pipeline.mjs`: sales-director → compliance-officer → brand-steward → queue-for-Jack, DRY-RUN (drafts + a blackboard run, **no customer send, no live dispatch**).
> - **Dry-run Leader (§1)** — `scripts/_generic/chief-of-staff.mjs`: `loadEmpireSnapshot`/`buildRunPlan`/`writeChiefOfStaffBrief`/`runOnce`, planner-only — **logs what it WOULD dispatch, fires nothing.**
> - **Shared-lessons hook (§5.2)** — `scripts/_generic/lessons.mjs`: `recordLesson`/`readLessons`, writing to the blackboard run + the rolling [[Agent Lessons]] vault note.
>
> **Path deviation (honest):** the spec proposed `scripts/_generic/orchestration/*` libs + `scripts/engines/chief-of-staff.mjs`; the build placed all five flat under `scripts/_generic/`. Re-home before live wiring if the engine/lib split matters. **Still unbuilt:** the agent participation wrapper on real employees (§3), `retirement-sweeper.mjs` (§5.3), the coordination-learning signal (§5.2), launchd plists, and the Command Deck brief pin. Operating manual for the built pieces: [[Agent Collaboration Protocol]].

# Agent Orchestration — Build Spec

> **Read first:** [[Agent Org & Orchestration]] (the why) and [[Agent Roster]] (the who). This note is the *how* — a concrete, implementable spec a future build agent can follow line by line. It assumes the model-routing layer is **already done** (C-suite agents migrated onto Claude-first `scripts/_generic/llm-call.mjs`, tunable via `DAY14_LLM_PREFER`).
>
> **🛑 Build gate:** This is DESIGN ONLY. Per the SELL-FIRST FREEZE ([[Day14 — Current Open Items]], CLAUDE.md), build nothing here until the first paying customer clears it. When revenue unfreezes it, build in the order in §7, and the first piece worth building is whatever shortens delivery to **customer #1** — likely the §4 handoff pipeline for *that customer's* work, not the full Leader. This note specifies the whole target so the partial builds are forward-compatible.
>
> **Guardrails that survive every line below:** no push, no money movement, no customer/candidate send without an explicit Jack tap; verify before asserting; prices only from `src/lib/pricing.ts`; code moves via git, never rsync; health judged by heartbeat mtime only. The Leader **sequences and drafts — it must never auto-approve an irreversible action.** See [[Working with Jack]].

---

## 0. Conventions used in this spec

- **Paths.** `_shared` = `~/Documents/businesses/_shared/`. Scripts live under `scripts/{employees,_generic,verticals,engines}/`. New orchestration code lives at `scripts/_generic/orchestration/` (libs) and `scripts/engines/chief-of-staff.mjs` (the Leader daemon).
- **Language.** Node ESM `.mjs`, matching the existing agent fleet. No new runtime, no new service. Files + thin libs, consistent with the current pattern — do **not** introduce a queue/broker.
- **Existing libs to reuse (do not re-implement):** `llm-call.mjs` (model routing), `agent-runtime.mjs` (audit + heartbeat wrapper), `auditLog()` from `src/lib/skills/audit-log-generator.ts`, `logSkillInvocation()` from `src/lib/work-register.ts`, `dispatch()` from `src/lib/dispatch.ts`.
- **State shapes are real.** Every file shape below was verified against live state on 2026-06-26 (see §8 ground-truth appendix).

---

## 1. The Leader — `chief-of-staff.mjs`

> ✅ **BUILT 2026-06-30 (dry-run, not live-scheduled):** `scripts/_generic/chief-of-staff.mjs` implements the planner (`loadEmpireSnapshot` / `buildRunPlan` / `writeChiefOfStaffBrief` / `runOnce`). It **logs what it would dispatch and fires nothing** — no `dispatch()`, no daemon, no launchd label yet. The 1.2 cadence, 1.5 triggering, and the wake-file/lock are still spec-only.

A single standing daemon that decides **what runs, in what order, today** from current empire state, triggers the others, and reports one daily brief. It replaces the manual `run-all-pending.mjs` button and promotes the `priority-allocator` + the `weekly-council-review` spec into a real dispatcher.

### 1.1 Location & class
- File: `scripts/engines/chief-of-staff.mjs`.
- Class: **engine** (not a C-suite employee — it orchestrates them).
- launchd label: `com.day14.chief-of-staff`.
- Wrapped in `agent-runtime.mjs` for audit + heartbeat like every other daemon.

### 1.2 Daemon cadence
- **Planning tick: every 30 min** (wall clock). Cheap: reads state, recomputes the plan, acts only on deltas. This is deliberately slower than the pollers (10s) — the Leader is a *scheduler of agents*, not an event router.
- **Event wake:** also runs immediately when `events-poller` writes a pipeline transition or `proactive-monitor` flags a state change, via a watch on `_shared/orchestration/wake` (touch-file trigger). Debounced to once per 60s.
- **Daily brief: 07:45** local — runs once, writes the Chief-of-Staff brief (§1.6) so it's at the top of the Command Deck before Jack's morning.
- **Dup guard:** a run lock at `_shared/orchestration/.cos-run.lock` (PID + started_at); stale locks (>15 min mtime) are reclaimed. Required because both the timer and the wake-file can fire.

### 1.3 State files it reads (inputs)
| File | What the Leader extracts |
|---|---|
| `_shared/empire-state.json` | overall empire snapshot (synced every 15m) — tenant list, pipeline counts, health rollup |
| `_shared/founder-ops/priority-today.json` | the ranked priority items (`{score, tier, label, action}`) — the Leader's primary "what matters now" signal |
| `_shared/growth/work-register.jsonl` | recent agent activity / ad-hoc actions (tail only, last N) |
| `_shared/operator-todos.json` | open Jack-facing todos (revenue blockers first) |
| `_shared/poller/*-heartbeat*` | liveness by **mtime only** — never run an agent the watchdog reports dead; surface it instead |
| `_shared/audit/` (audit log) | what already ran today (idempotency — don't re-trigger a completed step) |
| `src/lib/agent-deck/` `DeckState` (via `getDeck(null)`) | the same projection the Command Deck shows, so Leader and oversight agree |

### 1.4 How it decides run order (the planner)
A pure function — deterministic first, LLM only to break ties / phrase rationale:

```
buildRunPlan(state: EmpireSnapshot): RunPlan
```

Algorithm (deterministic core):
1. **Drop dead agents.** Filter out any agent whose heartbeat mtime is stale (>12m). Add them to `plan.escalations` instead of `plan.steps`.
2. **Seed from priority-today.** Each `priority-today` item maps to a responsible agent via a static `RESPONSIBILITY` table (e.g. `"CS drafts waiting" → customer-success-agent`, `"refund exposure" → cfo-agent`, `"daemon down" → escalate`). Higher `score` ⇒ earlier in plan.
3. **Apply dependency edges.** A static `HANDOFF_EDGES` table (§4) enforces ordering: anything that produces a draft for customer send must be followed by `compliance-officer` then `brand-steward` before it can be queued for Jack. Topologically sort.
4. **Budget gate.** Sum estimated LLM cost (from `llm-call.mjs` per-task hints); if over the daily ceiling (`DAY14_COS_BUDGET`, default conservative), defer low-tier steps to the next tick and note it in the brief.
5. **Tie-break + narrate** via one `llm-call` (Claude-first): given the deterministic plan, write the one-line "why this order" for the brief. The LLM **cannot reorder past a dependency edge or revive a dead agent** — it only annotates.

`RunPlan` shape:
```jsonc
{
  "run_id": "2026-06-26T0745-a1b2",        // ISO-compact + 4 hex
  "generated_at": "2026-06-26T07:45:02Z",
  "steps": [
    { "agent": "customer-success-agent", "reason": "6 CS drafts waiting (hot-flash-co, score 110)", "blocks": ["compliance-officer"] },
    { "agent": "cfo-agent", "reason": "refund exposure check before brand push" }
  ],
  "escalations": [
    { "kind": "daemon-down", "agent": "gmail-cs-triage", "detail": "stale 21681m", "tap": false }
  ],
  "deferred": [ { "agent": "pr-director", "reason": "budget ceiling; retry next tick" } ]
}
```

### 1.5 What it triggers
- For each step, the Leader calls **`dispatch()`** (the existing event→skill router) with a synthetic event carrying the shared `run_id`:
  ```
  dispatch({ source: "chief-of-staff", type: "run-step", run_id, agent, payload })
  ```
  This means triggered work flows through the same audited path as webhook-driven work — no second execution lane.
- Before triggering, the Leader **opens a blackboard run** (§2) and posts the plan. Each triggered agent reads the run, does its job, posts its findings back.
- The Leader **never executes irreversible steps itself.** Anything consequential becomes a `request_jack_tap` card in `_shared/telegram/outbox/` and a Command Deck tap item.

### 1.6 What it reports / escalates to Jack
- One **Chief-of-Staff brief** per day at `_shared/orchestration/briefs/<date>.md` (append-only; never overwrite a prior day). Content: what it ran, the one-line reason for the order, what it deferred and why, and the escalations list.
- The brief is surfaced as the pinned top row of the Command Deck (the "Leader brief" item already stubbed in [[Agent Oversight (Command Deck)]] §5).
- **Escalations** (dead daemons, budget hits, blocked pipelines, anything needing a human) also queue a single consolidated Telegram card — not one card per item.

### 1.7 Function signatures (proposed)
```ts
// scripts/engines/chief-of-staff.mjs
loadEmpireSnapshot(): Promise<EmpireSnapshot>           // reads §1.3 files into one object
buildRunPlan(snapshot): RunPlan                          // §1.4, deterministic core
narratePlan(plan, snapshot): Promise<RunPlan>            // one llm-call, annotation only
executePlan(plan): Promise<RunResult>                    // dispatch() each step, respect locks/budget
writeChiefOfStaffBrief(plan, result): Promise<string>    // append to briefs/<date>.md, return path
escalate(items): Promise<void>                           // one consolidated Telegram + Deck tap
runOnce(): Promise<void>                                 // the tick: load→plan→narrate→execute→brief
main(): // agent-runtime wrapper: heartbeat + audit + 30m timer + wake-file watch
```

---

## 2. The shared blackboard

> ✅ **BUILT 2026-06-30:** `scripts/_generic/blackboard.mjs` — runnable, `--selftest` passes. Built flat under `scripts/_generic/` (not `scripts/_generic/orchestration/`). The run layout, `run.json` header, and append-only `posts.jsonl` match §2.1–§2.3; API names landed as `openRun`/`postFinding`/`readFindings`/`addArtifact`/`closeRun` (plus `latestForAgent`, `getRun`) rather than the exact §2.4 signatures.

One read/write shared memory per run so agents build on each other instead of coordinating through scattered files. Implementation is **files + a thin lib** — no DB, no broker.

### 2.1 File layout
```
_shared/orchestration/
  wake                          # touch-file; Leader watches mtime for event wakes
  .cos-run.lock                 # Leader run lock (PID + started_at)
  briefs/<date>.md              # daily Chief-of-Staff briefs (append-only)
  runs/<run-id>/
    run.json                    # the RunContext header (goals, plan, status)
    posts.jsonl                 # append-only log of every agent post (the blackboard body)
    artifacts/                  # any files an agent produced this run (drafts, scores)
    handoffs.json               # current state of each pipeline edge for this run
```

### 2.2 `run.json` — the RunContext header
```jsonc
{
  "run_id": "2026-06-26T0745-a1b2",
  "opened_at": "2026-06-26T07:45:02Z",
  "opened_by": "chief-of-staff",
  "goal": "Clear CS backlog + gate the resulting drafts for Jack",
  "plan": [ /* the RunPlan.steps */ ],
  "status": "open",                          // open | awaiting-jack | closed | aborted
  "closed_at": null
}
```

### 2.3 `posts.jsonl` — what each agent appends
One JSON object per line. An agent **reads the whole file before acting** (so it sees peers' conclusions) and **appends one post after acting**:
```jsonc
{
  "ts": "2026-06-26T07:46:11Z",
  "run_id": "2026-06-26T0745-a1b2",
  "agent": "sales-director",
  "kind": "finding",                         // finding | draft | gate | score | question | decision | handoff
  "summary": "Drafted 3 outbound for hot-flash-co archetype B",
  "artifacts": ["artifacts/sales-draft-hotflash-001.md"],
  "for": "compliance-officer",               // null, or the next agent in the handoff
  "status": "pending",                        // pending | pass | fail | needs-changes
  "notes": "Targets unverified — flag per roster gap"
}
```

### 2.4 `blackboard.mjs` — the thin API
Location: `scripts/_generic/orchestration/blackboard.mjs`. Every signature is filesystem-backed, append-only where it matters, and audit-logged on writes.

```ts
openRun(opts: { goal: string; plan: PlanStep[]; opened_by: string }): Promise<RunContext>
getRun(runId: string): Promise<RunContext>
readPosts(runId: string, filter?: { agent?: string; kind?: string; for?: string }): Promise<Post[]>
post(runId: string, p: Omit<Post, "ts" | "run_id">): Promise<void>     // appends to posts.jsonl
putArtifact(runId: string, name: string, contents: string|Buffer): Promise<string>  // returns rel path
setRunStatus(runId: string, status: RunStatus): Promise<void>
closeRun(runId: string, status?: "closed"|"aborted"): Promise<void>
latestForAgent(runId: string, agent: string): Promise<Post[]>          // "what was handed to me"
```

Rules baked into the lib:
- `post()` and `putArtifact()` are the **only** writers; both call `auditLog()` first and `logSkillInvocation()` so blackboard activity feeds the recursive-learning loop (§5).
- `posts.jsonl` is **append-only** — mirrors the dossier/audit norm ("the audit trail matters more than tidiness").
- A run older than 7 days is eligible for archival by the retirement pass (§5), never deleted live.

---

## 3. How an agent participates (the contract)

Every orchestrated agent gains a tiny, uniform wrapper — no agent rewrites its core logic:

```
1. read its inbound handoffs:   const inbound = await latestForAgent(run_id, MY_NAME)
2. read peer context:           const ctx = await readPosts(run_id)
3. do its existing job, informed by ctx (and only ctx — no hidden side channels)
4. write outputs to artifacts/:  const path = await putArtifact(run_id, name, draft)
5. post its finding + handoff:   await post(run_id, { agent: MY_NAME, kind, summary, artifacts:[path], for: NEXT, status })
6. heartbeat as always (mtime is liveness)
```

The `run_id` is passed in via the `dispatch()` payload. An agent invoked *without* a `run_id` (e.g. its own legacy timer) still works standalone — orchestration is **additive**, never required. This keeps the freeze-safe migration path: agents keep their timers until the Leader is proven.

---

## 4. One real handoff pipeline, end to end

> ✅ **BUILT 2026-06-30 (dry-run proof):** `scripts/_generic/handoff-pipeline.mjs` runs the full sales-director → compliance-officer → brand-steward → `__jack__` chain over the blackboard with deterministic stubs — terminal post writes a DRAFT tap-card to `artifacts/` and sets the run `awaiting-jack`. **No Telegram outbox write, no `dispatch()`, no LLM, sample tenant only.** Compliance `fail` short-circuits to Jack; brand `needs-changes` loops back once. Reads the capability map from the new `scripts/_generic/agent-registry.mjs`.

The proof-of-team: **sales-director draft → compliance-officer gate → brand-steward voice-check → queue for Jack.** Each arrow is a blackboard post the next agent consumes.

### 4.1 The static edge table (in the Leader)
```ts
const HANDOFF_EDGES = [
  { from: "sales-director",     to: "compliance-officer", on: "draft" },
  { from: "compliance-officer", to: "brand-steward",      on: "pass"  },
  { from: "brand-steward",      to: "__jack__",           on: "pass"  },
];
```
The Leader topologically sorts these so the three agents always run in order within a run; a `fail` short-circuits to Jack with the reason.

### 4.2 Step-by-step
1. **sales-director** runs (triggered by the Leader because `priority-today` shows outbound is due). It drafts archetype outbound, writes each to `artifacts/`, and posts:
   `{ kind:"draft", for:"compliance-officer", status:"pending", artifacts:[...] }`. Per its roster gap, it flags targets as unverified in `notes`.
2. **compliance-officer** wakes on that post (`latestForAgent` returns the draft). It reads the draft artifact, checks legal/brand-safety/ToS/GDPR, and posts a **gate**:
   - pass → `{ kind:"gate", for:"brand-steward", status:"pass" }`
   - fail → `{ kind:"gate", for:"__jack__", status:"fail", summary:"GDPR opt-out missing" }` (short-circuits; no further automated steps).
3. **brand-steward** wakes on a passed gate. It scores the draft against the brand CONSTITUTION (voice-drift), and posts a **score**:
   - pass → `{ kind:"score", for:"__jack__", status:"pass", summary:"voice 0.92" }`
   - needs-changes → `{ status:"needs-changes", for:"sales-director" }` (loops back one hop, capped at 1 revision to avoid cycles).
4. **queue for Jack.** When a post lands with `for:"__jack__"`, the Leader converts it into a single Command Deck **tap item** + one Telegram outbox card: "3 outbound drafts cleared compliance + voice (0.92). Approve to send?" The drafts are attached by reference. **Nothing sends without Jack's tap** — this is the hard line.
5. The Leader sets `run.status = "awaiting-jack"`, then `closed` once Jack taps (approve → Jack/te execution path; deny → logged, run closed).

### 4.3 Why this is the first thing to build post-sale
It delivers customer #1's outbound *correctly gated* with the least machinery: three agents that already exist, one edge table, the blackboard lib. No full Leader planner needed for the first run — a hardcoded three-step plan proves the pipeline, then §1 generalizes it.

---

## 5. Recursive learning + RETIREMENT loop

Extend `growth-watcher` (already closes the *growth* half) and add a **symmetric retirement pass** so the team prunes as fast as it grows. A team that only grows bloats — and bloat violates the freeze's Sunday Kill Review.

### 5.1 What exists (reuse, don't rebuild)
- `growth-watcher` (5-min daemon): tails `work-register.jsonl`; when an ad-hoc action repeats **≥2× across ≥2 contexts**, drafts a new `SKILL.md`. Meta-layer (patterns *inside* the growth cluster, bar of 3) is throttled by `_shared/growth/meta-circuit-state.json` (`{open, since, reason, drafts_in_flight}`) and tracks proposals in `growth-watcher-seen.json` (`{proposed_phrases:[]}`).
- `recursive-expansion-engine` (drafts SKILL.md + impl from patterns), `skill-multiplier`, `skill-audit` (merge candidates), `skill-deprecation-flagger` (**manual today**).

### 5.2 Extend growth-watcher with a coordination signal
Today growth-watcher learns from raw actions. Add a second source: **blackboard posts.** When the Leader sees an agent repeatedly hand-rolling the same step *inside runs* (same `kind`+`summary` shape ≥2× across ≥2 runs), it emits a synthetic work-register row tagged `context:"orchestration"` so the existing detector promotes it — routing to `recursive-expansion-engine` to crystallize a skill. This closes learning from *coordination*, not just isolated actions.

```ts
// in chief-of-staff.mjs, post-run
detectRepeatedHandwork(runId): Promise<Pattern[]>      // scans posts.jsonl across recent runs
emitLearningSignal(pattern): Promise<void>             // writes a work-register row, context="orchestration"
```

Plus **shared lessons:** after each run the Leader appends a one-line "what worked / what to change" to the blackboard (`kind:"decision"`) and to the daily brief, so agents improve across runs. ✅ **BUILT 2026-06-30** as `scripts/_generic/lessons.mjs` (`recordLesson` / `readLessons`) — writes each lesson to both the blackboard run (as a `kind:"lesson"` post) and the rolling [[Agent Lessons]] vault note. The repeated-handwork detector + `emitLearningSignal` (the part that promotes a skill) are still unbuilt.

### 5.3 The new RETIREMENT pass — `retirement-sweeper.mjs`
A symmetric counterpart to growth-watcher. **Proposes** retirements; never deletes autonomously (every retirement is a Jack tap — code removal is irreversible-ish and governance-relevant).

- File: `scripts/engines/retirement-sweeper.mjs`. Cadence: **weekly, Sunday 17:00** (feeds the existing Sunday Kill Review). launchd `com.day14.retirement-sweeper`.
- **Inputs:** `work-register.jsonl` (invocation recency per skill/agent), heartbeat mtimes, audit log, `skill-registry.generated.ts` (the full skill list), the blackboard run history.
- **Logic:**
  ```ts
  scoreUsage(): Map<name, { lastUsed, count30d, contexts }>   // per agent + per skill
  flagRetirementCandidates(usage): Candidate[]
    // criteria: 0 invocations in 30d AND not a guardrail/oversight primitive
    //           OR superseded (skill-audit merge candidate) OR a known kill-switched vertical
  proposeRetirement(candidate): Promise<void>                  // Jack-tap card, NEVER auto-delete
  archiveStaleRuns(): Promise<void>                            // move runs/ older than 7d to runs/_archive/
  ```
- **Output:** a single weekly "Kill Review" card — "these N agents/skills haven't fired in 30 days; retire, reassign, or keep?" Each row links the evidence (last-used, contexts). Retirement = Jack taps → the build agent removes the launchd plist + flags the SKILL.md, then `npm run registry:generate && npm run graph:generate`.
- **Protected set (never proposed for retirement):** the pollers (`telegram`, `events`, `growth-watcher`, `proactive-monitor`, `auto-restart-watchdog`), the Leader itself, oversight primitives, `audit-log-generator`. Hardcode this allowlist.

### 5.4 The closed loop, stated plainly
Grow: action repeats → growth-watcher → new skill. Coordinate-learn: handwork repeats in runs → Leader signal → new skill. Prune: skill/agent goes cold → retirement-sweeper → Jack-tap kill. Growth and retirement are now symmetric, both gated by Jack for anything consequential.

---

## 6. Guardrails this spec must never cross

Restating because orchestration is exactly where these get tempting to bypass:
1. The Leader **sequences and drafts; Jack taps.** No auto-approval of push, payment, or customer/candidate send — ever. The `for:"__jack__"` terminal is the only way work leaves the building.
2. **One execution lane.** Triggered work goes through `dispatch()` like everything else, and every blackboard write is `auditLog()`-ed. No shadow side channels.
3. **Heartbeat mtime is the only liveness signal.** The Leader must not "judge" an agent alive from its logs or its posts.
4. **Tenant isolation** carries into runs — a run scoped to a tenant only reads/writes that tenant's data, matching the `agent-deck` `DeckRepository` isolation ([[Agent Deck Backend Architecture]]).
5. **Respect the recursive-growth throttle** (`meta-circuit-state.json`) — the coordination-learning signal in §5.2 must check the circuit before emitting, same as the meta-layer.
6. **Append, never overwrite** — `posts.jsonl`, briefs, dossiers. (See product-strategist's overwrite gap in [[Agent Roster]] as the anti-pattern.)

---

## 7. Build sequence (freeze lifted 2026-06-26 — progress marked)

1. ✅ **`blackboard.mjs` + run-context files** (§2) — DONE 2026-06-30 (runnable, not scheduled).
2. ⏳ **Agent participation wrapper** (§3) on the three pipeline agents only — NOT built; the dry-run pipeline uses stubs, not the real employees.
3. ✅ **The one handoff pipeline** (§4) — DONE 2026-06-30 as a dry-run proof (stubs + blackboard, no send).
4. 🟡 **`chief-of-staff.mjs` planner** (§1) — planner DONE 2026-06-30 (dry-run); still to do: real `dispatch()` execution + Command Deck brief pin.
5. ⏳ **Oversight in lockstep** — the timeline drawer + Leader-brief pin in [[Agent Oversight (Command Deck)]] — NOT built.
6. ⏳ **`retirement-sweeper.mjs` + coordination-learning signal** (§5) — NOT built. (Lessons *recording* hook ✅ done; the skill-promotion signal still pending.)

> Also new this round, not in the original sequence: **agent capability registry** (`agent-registry.mjs`) ✅ and the **shared-lessons hook** (`lessons.mjs`) ✅ — both DONE 2026-06-30. Live-scheduling all of the above (launchd plists, wake-file, locks) remains a single Jack-tap step.

> Sequencing rule from [[Agent Org & Orchestration]]: build the team in the order **revenue pulls it.** If customer #1 needs gated outbound, build §4 first and let §1 follow. Don't build the full Leader speculatively.

---

## 8. Ground-truth appendix (verified 2026-06-26)

State shapes this spec depends on, confirmed against live `_shared`:
- `work-register.jsonl` line: `{timestamp, action_phrase, context, is_ad_hoc, notes}`.
- `founder-ops/priority-today.json`: `{generated_at, items:[{score, tier, label, action}]}`.
- `operator-todos.json`: `{schema_version, next_seq, todos:[{id, seq, tenant, title, detail, category, priority, status, created_at, completed_at, source}]}`.
- `growth/meta-circuit-state.json`: `{open, since, reason, drafts_in_flight}`.
- `growth/growth-watcher-seen.json`: `{proposed_phrases:[]}`.
- `empire-state.json` exists (synced ~15m); `_shared/orchestration/` does **not** exist yet — §2.1 creates it.
- C-suite agents (`scripts/employees/*.mjs`, 10) currently run as independent launchd timers with **no shared run and no handoff** — exactly what §1–§4 fix.

> ⚠ CONFIRM with Jack before building: (a) the 30-min Leader tick vs a slower hourly cadence; (b) the `DAY14_COS_BUDGET` daily ceiling value; (c) whether retirement-sweeper's Sunday slot should replace or supplement the manual Kill Review; (d) the revision cap (1) on the brand-steward → sales-director loop. *(All four logged in [[Jack — Confirm These (expansion blockers)]] — answer there, fold back here.)*

## Related
[[Agent Org & Orchestration]] · [[Agent Roster]] · [[Agent Oversight (Command Deck)]] · [[Agent Deck Backend Architecture]] · [[Day14 OS — System Map]] · [[Day14 — Current Open Items]] · [[Day14 — Expansion Roadmap]] · [[Working with Jack]]


---

# Agent Org & Orchestration

The blueprint for turning ~10 independent timer-agents into a **coordinated dream team with a leader**. This is design/knowledge; per the SELL-FIRST FREEZE the **build is gated behind the first paying customer** (see [[Day14 — Business Scope & Pivot Points]]). Roster: [[Agent Roster]]. Watching them: [[Agent Oversight (Command Deck)]].

> **✅ Layer 4 (model-routing) substantially BUILT 2026-06-26** (confidence: high — done this session). The C-suite employee agents were migrated **off direct Gemini** onto the shared `scripts/_generic/llm-call.mjs`, which is now **Claude-first (Gemini = fallback)** and tunable via the `DAY14_LLM_PREFER` env var. This collapses the "three stacks" problem below — see Layer 4. Remaining: ~21 other direct-Gemini scripts still to migrate (see [[Day14 — Current Open Items]]).

## Where it stands today (the honest baseline)
> **Update 2026-06-30:** the three "still true" gaps below now have **runnable substrate** (blackboard, capability registry, one dry-run handoff pipeline, a dry-run Leader, a lessons hook) — but it is **NOT live-scheduled**; the production fleet still runs as independent timers until Jack wires the launchd plists. So the baseline is "true in production, fixed in dry-run code."
- **No leader (in production).** Every agent is a wall-clock timer; the only thing that sequences them is the manual `run-all-pending.mjs` button. *(dry-run Leader now exists — `chief-of-staff.mjs` plans but fires nothing yet.)*
- **No shared memory (in production).** Agents coordinate only by scattered files (`outbox`, `work-register.jsonl`, dossiers, `empire-state.json`). *(blackboard lib now exists — `blackboard.mjs` — but no live agent posts to it yet.)*
- **No handoffs (in production).** Employees drop drafts in sibling folders; nothing routes one agent's output as another's input. *(one dry-run pipeline now exists — `handoff-pipeline.mjs`, sales→compliance→brand→Jack — with stub agents, no live send.)*
- **~~Three LLM stacks.~~ ✅ Largely collapsed (2026-06-26).** C-suite employees now route through the shared Claude-first `llm-call.mjs` instead of hand-rolled Gemini; ~9 copies of Gemini boilerplate are being retired. ~21 remaining direct-Gemini scripts still to fold in.
- `weekly-council-review` (the coordination concept) exists as a **spec only**, not a running daemon. *(still true)*

## The target architecture (5 layers)

### 1. The Leader — "Chief of Staff" orchestrator
> 🟡 **Dry-run BUILT 2026-06-30** — `scripts/_generic/chief-of-staff.mjs` plans (reads state → ordered plan + brief) but **triggers nothing**; live `dispatch()` + scheduling pending Jack's tap.

A single standing agent that, on a schedule and on events, **decides what runs and in what order** from current state, then triggers the others. Promote the existing `priority-allocator` + the `weekly-council-review` spec into a real dispatching daemon.
- **Inputs:** `empire-state.json`, audit log, work-register, the [[Day14 — Current Open Items]]/priorities, oversight health.
- **Decides:** today's run plan ("state says CS backlog high → run customer-success, then CFO for refund exposure, then brand-steward to gate the drafts"). Sequences, doesn't just fan out on timers.
- **Triggers:** invokes agents/skills via `dispatch()` with a shared run-id; can pause/skip based on state.
- **Reports:** one daily "Chief of Staff brief" — what it ran, why, what it's escalating to Jack.

### 2. Shared working memory — the "blackboard"
> ✅ **BUILT 2026-06-30** — `scripts/_generic/blackboard.mjs` (run.json + append-only posts.jsonl + artifacts/), `--selftest` passes. Plus a capability registry, `scripts/_generic/agent-registry.mjs`, so agents know who-does-what / who-hands-to-whom. Runnable, not yet live-written by production agents.

One read/write shared state per run so agents build on each other.
- A `run-context` object (per run-id) on the blackboard: goals, what each agent concluded, open questions, artifacts produced.
- Agents **read the blackboard before acting** and **post findings after** — so compliance can see brand-steward's score, sales can see CFO's pricing, etc.
- Implementation: a structured JSON/JSONL under `_shared/orchestration/runs/<run-id>/` + a thin `blackboard.mjs` lib. (Don't over-engineer; files + a lib, consistent with the existing pattern.)

### 3. Inter-agent handoffs — a real pipeline
> ✅ **BUILT 2026-06-30 (dry-run proof)** — `scripts/_generic/handoff-pipeline.mjs` runs the full sales→compliance→brand→Jack chain over the blackboard with stub agents: terminal post queues a DRAFT tap-card, **no customer send, no live dispatch.**

Define explicit edges, e.g.: `sales-director` draft → `compliance-officer` gate → `brand-steward` voice-check → queue for Jack. CFO pricing rec → sales-director uses it. Each handoff is a blackboard post the next agent consumes. This is what makes it a *team*, not ten soloists.

### 4. One model-routing layer — ✅ substantially BUILT (2026-06-26)
Collapse the three stacks into a single `llm-call`-style router every agent uses: provider preference, fallback, per-task model choice, budget gate, and one error regime.
- ✅ **Done:** C-suite employee agents migrated onto `scripts/_generic/llm-call.mjs`, now **Claude-first with Gemini fallback**, tunable via `DAY14_LLM_PREFER`. Kills the duplicated per-agent Gemini boilerplate and gives the leader a cost/provider lever.
- ⏳ **Remaining:** ~21 other direct-Gemini scripts still to migrate onto the shared router; skill runner (Anthropic-only) to fold in for full unification.

### 5. Recursive learning + skill expansion (mostly built — extend it)
The `growth-watcher` already closes a learning loop: it tails `work-register.jsonl`, promotes a new SKILL.md when an ad-hoc action repeats **≥2× across ≥2 contexts**, and has a **meta-layer** (patterns inside the growth cluster, bar of 3) with a circuit-breaker throttle (`meta-circuit-state.json`). Extend, don't rebuild:
- **Symmetric retirement:** add a loop that *retires/reassigns* underused agents/skills at runtime (today `skill-deprecation-flagger` is manual). A team that only grows bloats.
- **Skill→agent feedback:** when the leader notices an agent repeatedly hand-rolling the same step, route it to `recursive-expansion-engine` to crystallize a skill — closing learning from *coordination*, not just raw actions.
- **Shared lessons:** post-run, the leader writes "what worked / what to change" to the blackboard so agents improve across runs (the dream-team "learn from one another" goal). ✅ **BUILT 2026-06-30** — `scripts/_generic/lessons.mjs` records each lesson to the blackboard run + the rolling [[Agent Lessons]] note; the skill-promotion side of the loop is still unbuilt.

## Guardrails the dream team must keep
Every agent still: no push, no money movement, no customer send without a Jack tap; verify before asserting; prices only from `pricing.ts`; health judged by heartbeat mtime. See [[Working with Jack]]. The leader **must not** become a way to auto-approve irreversible actions — it sequences and drafts; Jack still taps.

## Build sequence (freeze lifted 2026-06-26 — progress marked)
1. ✅ **Model-routing layer** — done 2026-06-26 for C-suite agents; ~21 scripts still to migrate.
2. ✅ **Blackboard lib + run-context** — done 2026-06-30 (`blackboard.mjs`, + `agent-registry.mjs`). Runnable, not live.
3. ✅ **One real handoff pipeline** (sales→compliance→brand→Jack) — done 2026-06-30 as a dry-run proof.
4. 🟡 **The Leader** — planner done 2026-06-30 (`chief-of-staff.mjs`, dry-run); scheduled-daemon wiring still pending.
5. ⏳ **Oversight deck** in lockstep ([[Agent Oversight (Command Deck)]]) — not built.
6. ⏳ **Recursive retirement loop** — not built (lessons *recording* hook done; retirement-sweeper pending).

> **Sequencing note:** the first piece worth building post-sale is whatever shortens delivery to **customer #1** — likely the handoff pipeline for *that customer's* work, not the full leader. Build the team in the order revenue pulls it.

> **🔧 Substrate now BUILT (2026-06-30, confidence: high).** Layers 2–3 + a dry-run Leader are runnable under `scripts/_generic/` (`blackboard.mjs`, `agent-registry.mjs`, `handoff-pipeline.mjs`, `chief-of-staff.mjs`, `lessons.mjs`) — NOT yet live-scheduled (Jack taps the launchd wiring). The operating manual for how agents actually coordinate on top of it is [[Agent Collaboration Protocol]].

## Related
[[Agent Collaboration Protocol]] · [[Agent Roster]] · [[Agent Oversight (Command Deck)]] · [[Day14 — Business Scope & Pivot Points]] · [[Day14 OS — System Map]]


---

# Agent Oversight (Command Deck)

How Jack keeps watch over the agent team — confirms they're alive, doing the right work, and never doing something irreversible without a tap. Pairs with [[Agent Org & Orchestration]] and [[Agent Roster]].

> **✅ v2 BUILT 2026-06-26 — multi-tenant white-label deck** (confidence: high — code written this session, uncommitted). Two surfaces now share one renderer:
> - **God-view** `src/app/dashboard/agents/page.tsx` at **`/dashboard/agents`** — every tenant + every tap (admin of admins).
> - **Scoped customer view** `/app/[tenant]/agents` — one business only, wearing that tenant's name/color, with a brand monogram + tenant switcher and plain-language copy. Tenant comes from the route, never the client.
> Shared presentation: `src/app/dashboard/agents/deck-view.tsx`. Audited writes: `src/app/api/dashboard/agents/approve/route.ts` (god-view) and `src/app/api/app/[tenant]/agents/approve/route.ts` (scoped) — every approve/deny goes through `auditLog()` and a tenant-isolation re-check first. Backed by the typed `src/lib/agent-deck/` service (see [[Agent Deck Backend Architecture]]); `/app/*` gated in `src/middleware.ts`. tsc (both configs) + `check:prices` clean. **Not committed/pushed — Jack builds+deploys on the mini** (`next build` can't run in the Cowork sandbox).
>
> **Honest v2 limits (still true):** 9/10 employees show only stdout-log-mtime liveness; drift is dormant (brand-steward scored 0 samples); outcome tracking (draft→sent→paid) is stubbed pending per-agent telemetry. Customer-facing auth is still Jack-preview only — see "What's intentionally NOT built yet" below.
>
> **✅ v1 BUILT 2026-06-25** (superseded by v2): single god-view page + audited approve route. A real customer cleared the SELL-FIRST freeze and unblocked the build.

## The 4 questions oversight must answer
1. **Are they alive?** (health)
2. **What did they just do?** (activity/audit)
3. **What needs my approval?** (the tap queue)
4. **Is any of it wrong or off-voice?** (quality/drift)

## What already exists (use these, don't rebuild)
- **Health by heartbeat mtime** — every agent writes a `_shared/poller/<name>-heartbeat` file; `auto-restart-watchdog` (5m) kickstarts anything stale (>12m), `proactive-monitor` (30s) and `devops-sre` (4h) alert on state change / P1–P3. **Judge health by mtime only**, never logs.
- **Audit log** — append-only, hash-chained (`audit-log-generator`) at `_shared/audit/` — the tamper-evident record of consequential actions.
- **Work-register** — `_shared/growth/work-register.jsonl` — every skill invocation/ad-hoc action (also feeds recursive learning).
- **Dashboards** — `/dashboard` (empire command center, 30s refresh), `/dashboard/system` (full component health), `/dashboard/graph` (skill graph). Backed by `empire-state.json` (synced every 15m).
- **Telegram** — @day14osbot relays alerts + approval cards; `bot-brain` routes your replies.
- **Kill switches** — e.g. `ops/.realty-killswitch`; `DAY14_AGENT_CONTEXT=0`; launchctl bootout. Reversible off-switches per subsystem.

## Scorecard — what's BUILT vs still missing
1. ✅ **One screen, not five surfaces.** *(BUILT 2026-06-26)* The Command Deck collapses health (mtime), last-action (audit), pending taps (outbox), and drift (brand-health) into one per-agent row — both god-view and scoped customer view.
2. ✅ **A unified approvals/tap queue.** *(BUILT)* A single ordered "everything waiting on you" list with one-tap approve/deny that writes back through `auditLog()` (replacing the scattered Telegram + `/admin` paths for this surface).
3. ⏳ **Per-agent activity timeline.** *(PENDING)* "Show me everything sales-director did this week, and what came of it." Data exists (audit + work-register) but isn't yet sliced by agent in the timeline drawer.
4. ⏳ **Outcome tracking, not just activity.** *(PENDING — stubbed)* You can see an agent *ran*; outcome (sent? paid? ignored?) is stubbed pending per-agent telemetry.
5. ⏳ **Leader's daily brief** *(PENDING)* — when the [[Agent Org & Orchestration|Leader]] exists, its "what I ran and why + what I'm escalating" becomes the top of the deck.

## The oversight design (✅ core BUILT, drawer + brief PENDING)
The `/dashboard/agents` (and scoped `/app/[tenant]/agents`) "Command Deck":
- ✅ **Row per agent** (from [[Agent Roster]]): status dot (mtime), last-run timestamp + 1-line outcome, drift score, # items awaiting Jack, kill-switch toggle.
- ✅ **Tap queue panel:** all `request_jack_tap` items, ranked by consequence, one-tap approve/deny → writes audit + acts.
- ⏳ **Timeline drawer:** click an agent → its audit/work-register slice + outcomes. *(pending)*
- ⏳ **Leader brief** pinned at top. *(pending — waits on the Leader, see [[Agent Org & Orchestration]])*
- ✅ All **read-only on live state by default**; the only writes are Jack's explicit approvals.

## Guardrail
Oversight is for **watching and approving**, never for auto-approving. The whole point is that irreversible actions (push, pay, customer send) still require Jack's explicit tap. See [[Working with Jack]].

## Related
[[Agent Org & Orchestration]] · [[Agent Roster]] · [[Day14 OS — System Map]] · [[Day14 — Current Open Items]]


---

# Brand — House of Love Co

Jack's **music + silent-disco brand**. Classified as **"powered by Day14" — served by the engine, but not a strategic portfolio business.**

> **Identity (Jack-confirmed 2026-06-26):** **House of Love Co and Casamoré are the SAME brand.** `houseoflove.co` is the live site; **Casamoré** (silent disco) is its customer-facing surface and the name shown publicly. Canonical record = the **`house-of-love-co` tenant** (`~/Documents/businesses/_shared/tenants.json`, aliases `casamore`/`Casamoré`, domain `houseoflove.co`, status active, day14-owned). Case-study route: `/case-studies/casamore`.
>
> **Now featured on the homepage** (`src/components/cinematic/Proof.tsx`) as a **live proof tile** — "Casamoré · silent disco · live" → houseoflove.co — alongside Splash Jacks, AlignMD, and BuildBridge. Being a proof exemplar (the engine runs a real brand hands-off) does **not** make it a strategic pillar; it's evidence the system works, not a growth-focus target.

## Why it's not a pillar
A music brand is Jack's personal creative output. It doesn't fit the automate-and-own wedge (no high-margin operation to run for fee+equity) and its audience/monetization is unrelated to the home-services / B2B lane Day14 is focused on. Making it a strategic pillar would re-introduce the focus-dilution Day14 just cut hot-flash-co and kennum to avoid. See [[Day14 — Strategic Direction]].

## How Day14 *does* serve it
Day14's content engine (the multi-channel pipeline proven on hot-flash-co — see [[Build Lessons — Retired Brands]]) can run House of Love Co's **social, content, and distribution**. It's an ideal internal customer of that capability: real creative output to promote, zero strategic risk.

## How agents should treat it
- Support it operationally (content, scheduling, distribution) **when asked** — don't allocate strategic/growth focus to it by default.
- Same guardrails as everything: no autonomous sends, no fabricated claims.

## ⚠ CONFIRM with Jack
- ~~Platforms / format~~ → **silent-disco + music brand** on houseoflove.co; the live site runs on scheduled agents (nightly polish, weekly UX audit, monthly analytics, T-minus show rituals). Still open: release cadence and which channels Day14 should actively run.
- Whether any of it monetizes through Day14 or stays fully separate (it sells live silent-disco events — confirm whether ticketing/payments route through Day14).

## Related
[[Businesses — Overview]] · [[Build Lessons — Retired Brands]] · [[Day14 — Strategic Direction]]


---

# Business — AdForge

**Standalone AI ad factory — Jack-owned, own repo/brand, NOT part of the studio codebase.** A DTC brand gives AdForge a product (URL or images + copy); it returns a batch of short-form video ads (TikTok/Reels/Shorts) — scripted, voiced, cut 9:16 — **each ranked by predicted virality before any media spend**. The wedge: anyone can generate AI video; almost no one scores it pre-flight. Grounded in `FABLE-HANDOFF-adforge-2026-07-02.md`, the live site, and the Vercel API (2026-07-06).

## What's known (authoritative)

- **Stage:** pre-launch demo, live at **ad-forge-amber.vercel.app** (noindex/nofollow, honesty-ribboned: "sample data is fictional", "not accepting payments yet"). Deployed 2026-07-02.
- **Vercel [Certain, API-verified 2026-07-06]:** project `ad-forge` (`prj_Xm01Z44GkmvtmWAb1DXcXurA23vn`), team `jacksbot147-codes-projects`, Next.js, CLI-deployed (`vercel deploy` — **no git connection**), no custom domain, latest production deployment READY.
- **Pages live:** landing (hero, how-it-works, pricing, waitlist), /gallery (sample batch), /dashboard, /checkout (reserve-a-founding-spot, no real payments).
- **Displayed pricing [proposed, NOT Jack-confirmed]:** Starter $99/mo (20 scored ads), Growth $299/mo (80), Agency $799/mo (300, white-label), $49 top-up (10 ads). Per the handoff these are **[Guessing]-tier proposals** — AdForge's pricing source of truth is its own repo pricing file, **not** studio `pricing.ts`.
- **Studio-side sister page [Certain, from 07-06 status]:** studio repo HEAD moved `b70fc1a` → `02c4228` on 07-06 adding `src/app/brands/adforge/*` (static sister-company page, audited clean). Not yet serving on day14.us (prod still on the `b70fc1a` deployment) — needs Jack's promote/deploy.
- **Origin:** FABLE-HANDOFF cut 2026-07-02; built same day via the adforge-* one-shot task series (build/UI/GTM/QA, all fired 07-02).

## How agents should treat it

- **Standalone like alignmd** — own repo, own pricing file, borrows Day14's prime directives (no push/deploy/spend/send without a Jack tap; never fabricate customers, metrics, or prices).
- **Demo content is fictional and labeled** — never quote its sample metrics or the unconfirmed prices as real anywhere else.
- **Key risk (from the handoff, still open):** is the virality predictor trustworthy and ad quality sellable? De-risk before selling.

## ⚠ CONFIRM with Jack

- **Name/domain** — "AdForge" is a placeholder per the handoff; buy a domain or rename? (Domain purchase = money = Jack-only.)
- **Pricing** — confirm/adjust the three displayed tiers before removing noindex or taking a payment.
- **tenants.json** — register AdForge as a `day14-owned` standalone entry (making 10) or keep it out of the registry since it's not on the OS? Registry and this vault must stay aligned either way.
- **Repo location** — where does the AdForge repo live locally, and is it in git yet? (Vercel shows CLI deploys, no git.)

## Agent log
*Agents append here — one timestamped line per write-back via `appendToNote()` (see [[Agent Journal & Handoffs]]). Append, never overwrite the curated body above.*

- **2026-07-06 ~23:45 UTC** `cowork-full-sweep` → created this note during AdForge registration; facts from handoff doc + live-site fetch + Vercel API. No repo access from sandbox; studio tile/deploy handled via `ADFORGE-ADD-TO-DAY14-2026-07-06.md` work order.

## Related
[[Businesses — Overview]] · [[Day14 — Current Open Items]] · [[Business — alignmd]] · [[Idea Pipeline]]


---

> **2026-06-26 update (Jack-confirmed):** The BuildBridge **app is fully built** — Jack is bringing the production URL once that deployment is green. The built version is the **two-sided escrow marketplace** (homeowner↔contractor, Stripe milestone escrow, multi-county permit lookups, Storm Mode) per the `/case-studies/buildbridge` reference build. It is now featured as the **third proof tile** on the cinematic homepage (`src/components/cinematic/Proof.tsx`, alongside Splash Jacks + AlignMD), tagged "· preview" and linked to the internal guided walkthrough until the public URL is confirmed pokeable. Resolves the old "stage unknown" ⚠ CONFIRM below; the SaaS-vs-marketplace *go-to-market* fork is still Jack's call, but the shipped artifact is the marketplace build.

# Business — BuildBridge

**The likely commercialization of the Splash Jacks software.** BuildBridge is a platform for **contractors and homeowners to communicate, submit/accept bids, and track a job's progress to completion** — the same bid/communicate/track loop [[Business — Splash Jacks Pools]] already runs for pool service, generalized to home-services contractors.

> **Recommended framing (Jack to confirm):** BuildBridge = **the field-service SaaS productized**, not a from-scratch marketplace. Splash Jacks *proves* the software with real customers; BuildBridge *sells* it to contractors. This turns the vague "sell the Splash Jacks software" plan into a concrete product.

## The fork that decides everything
- **Productized SaaS (sell to contractors, one-sided)** — leverages your proof and domain knowledge; a contractor pays for bid/comms/job-tracking. Tractable for a solo operator. **Recommended.**
- **Two-sided marketplace (Angi / Thumbtack / HomeAdvisor competitor)** — needs contractors *and* homeowners at once (cold-start problem) against well-funded incumbents. High-risk; treat as a *later* possibility, not the starting move.

## Where it sits in strategy
Part of the **"sell the software" track** (secondary to the [[Day14 — Strategic Direction]] automate-and-own wedge), but the most coherent SaaS bet Day14 has because Splash Jacks de-risks it. Don't let it balloon into the marketplace moonshot and pull focus off alignmd.

## ⚠ CONFIRM with Jack
- Which version you're actually building (SaaS vs. marketplace).
- Relationship to Splash Jacks — is BuildBridge literally the Splash Jacks codebase productized, or a separate build? Where does its code live?
- Target user, pricing (source: `pricing.ts`), and current stage (idea / building / live).
- Whether it's a Day14-owned product or has partners.

## Agent log
*Agents append here — one timestamped line per write-back via `appendToNote()` (see [[Agent Journal & Handoffs]]). Append, never overwrite the curated body above.*

## Related
[[Business — Splash Jacks Pools]] · [[Day14 — Strategic Direction]] · [[Businesses — Overview]]


---

# Customer Onboarding Flow — Spec

The end-to-end path a **Platform** customer travels from "signed up" to "logged into *their own* white-label scoped Command Deck." This is the missing **path in** that [[Day14 — Expansion Roadmap]] row 2 names: the deck already renders a scoped per-customer view (`/app/[tenant]/agents`), but nothing today turns a buyer into a tenant with their own login. This spec connects the pieces that already exist ([[Agent Deck Backend Architecture]], [[Templates/New Tenant Onboarding]]) to the pieces that must be built, and marks exactly which is which.

> **⚠️ Build status (re-verdicted 2026-07-06): unblocked, leverage-prioritized.** The SELL-FIRST FREEZE that originally gated this spec was lifted 2026-06-26 (per repo [[Day14 OS — System Map|CLAUDE.md]] — agents may build features and engines again; "does a named customer pull this?" is no longer a hard gate). This remains a **spec, not a scheduled build**: the *manual / Jack-preview* version of the flow is runnable today with zero new infra to onboard design-partner #1, and the *automated, self-serve, external-login* version (steps 2b, 3, 5 below) is still highest-leverage when pulled by a named paying customer — revenue-pulling work still ranks first, but building ahead of that pull is now permitted rather than forbidden. The real remaining blocker to automating step 2 is the tenant-promotion product boundary (§1 ⚠ CONFIRM, logged in [[Jack — Confirm These (expansion blockers)]]).

## The flow at a glance

```
signup  →  tenant provisioning  →  per-customer auth  →  scoped deck  →  invite / handoff
 (1)            (2)                      (3)                 (4)              (5)
 buyer       tenants.json /          login locked to    /app/[slug]/      customer is
 pays        Supabase entry          their slug          agents            live in their
             display_name +          route tenant ==                       own deck
             primary_color           session tenant
```

Each stage below carries an **EXISTS / BUILD** tag and concrete data shapes.

---

## 1. Signup — the buyer becomes a record

**Trigger.** A stranger pays (Stripe payment link / subscription) or Jack manually onboards a design partner. Payment itself is [[Day14 — Expansion Roadmap]] row 1 — still blocked on `STRIPE_ACCOUNT` (see [[Day14 — Current Open Items]]).

- **EXISTS:** Stripe webhook → `src/app/api/webhooks/stripe/route.ts` → `dispatch()` already creates a customer dossier at `_shared/customers/{slug}/` (`01-brand.json` with name, vertical, status, monthly_amount, stripe_customer_id). This is the *customer* record.
- **BUILD:** the bridge from a **customer dossier** to a **tenant** (step 2). A customer who bought a built site is not automatically a Platform tenant with a deck — promotion to tenant is a deliberate, gated step, not every sale.
- **Decision Jack must make (⚠ CONFIRM):** which purchased outcome includes a scoped deck? Platform is "talk to us" per the positioning north-star — so step 2 is triggered by a *Platform* sale, not a Spark/Local/Portal site sale. Until that product boundary is set, tenant promotion is a manual Jack call. *(Logged on [[Jack — Confirm These (expansion blockers)]] under "Customer onboarding — the tenant-promotion trigger" — answer there, fold back here.)*

**Data in at this stage:** `_shared/customers/{slug}/01-brand.json` → `{ slug, display_name, vertical, status, monthly_amount, signup_date, stripe_customer_id }`.

## 2. Tenant provisioning — the record becomes a tenant

This is where [[Templates/New Tenant Onboarding]] already encodes the manual checklist. The spec's job is to name what's manual today and what an automated provisioner would do.

### 2a. Register in `tenants.json` — **EXISTS (manual), machine source of truth**
`~/Documents/businesses/_shared/tenants.json` is what every agent reads; the vault is the narrative layer on top. One entry per tenant:

```json
{
  "slug": "acme-pools",
  "display_name": "Acme Pools",
  "primary_color": "#1E73BE",
  "ownership": "client",
  "type": "field-service SaaS",
  "stage": "live",
  "channels": { "domain": "acmepools.com", "telegram": null, "email": "ops@acmepools.com" }
}
```

- `slug` — kebab-case, URL-safe, **immutable once live** (it's both the route and the data key).
- `display_name` + `primary_color` — drive the brand monogram and scoped-deck accent (step 4). These two fields are the entire white-label surface today.
- Validate the file parses (no trailing comma) before any agent relies on it.

### 2b. Automated provisioner — **BUILD (gated)**
Today a human adds the JSON entry. The automated version is a `provisionTenant({ slug, display_name, primary_color, ownership, type })` function that: (1) appends the validated entry to `tenants.json` (or, post-row-3, inserts a Supabase `tenants` row), (2) creates the `_shared/businesses/{slug}/` data scope, (3) seeds the narrative note from [[Templates/New Business]], (4) emits a provisioning audit-log entry. **Build only when self-serve signup exists** — until then the template *is* the provisioner, run by hand.

### 2c. Supabase tenant row — **BUILD (gated, = Expansion Roadmap row 3)**
For hosted/isolated storage, the same entry lives in a Supabase `tenants` table behind the existing `DeckRepository` contract. The file adapter (`file-repository.ts`) serves Jack-preview and design-partner #1 today; the `SupabaseDeckRepository` is an *additive fork* (flip `DAY14_DECK_BACKEND=supabase`), **no page/API/write-path change.** Build when hosting is the bottleneck (customer #2, or a customer who demands their own hosted login).

## 3. Per-customer auth — login locked to their slug

**This is the hard security gate** ([[Day14 — Expansion Roadmap]] row 4) and the single largest BUILD in this flow.

- **EXISTS:** `/app/*` is already gated in `src/middleware.ts`; today it's **admin/localhost → Jack-preview mode** (Jack can open any tenant's lens, e.g. `/app/day14-realty/agents`). The route already supplies the tenant; the client never names it.
- **EXISTS (the invariant that makes this safe):** `getDeck(slug)` and `resolveDeckTap(slug, …)` are tenant-isolated *inside the service* — a scoped caller can read and write **only** its own tenant's items. So even before real auth, the data boundary is enforced at the repository, not the page.
- **BUILD (gated):** real per-customer accounts where **the route tenant must equal the authenticated session's tenant.** Concretely:

```
session  = { customer_id, tenant_slug }          // set at login
request  → /app/:routeSlug/agents
guard    : routeSlug === session.tenant_slug ?  proceed  :  403
deck     : getDeck(session.tenant_slug)          // never getDeck(routeSlug) from the client
```

The guard lives alongside the existing middleware `/app/*` gate; the difference is the session carries a *bound* tenant instead of an admin god-cookie. **Do not build speculative auth for zero users** — the day a customer needs to log in unsupervised, this becomes P0. Until then Jack-preview is sufficient and safer.

## 4. Scoped deck — `/app/[slug]/agents`

**Mostly EXISTS.** This is the part already built (2026-06-26, [[Agent Deck Backend Architecture]]).

- `src/app/dashboard/agents/deck-view.tsx` renders **both** the god-view and the scoped view; `/app/[tenant]/agents` calls `getDeck(slug)` with the tenant from the route.
- Isolated write at `/api/app/[tenant]/agents/approve` re-checks isolation in `resolveDeckTap`.
- A tenant with no daemons yet renders the **honest empty-scope state** (not an error, not another tenant's data) — see `/app/alignmd/agents`.
- **White-label surface = `display_name` + `primary_color`** from step 2: the brand monogram (display_name initials + color) and scoped-deck accent. **BUILD (small, gated):** any white-labeling beyond monogram + accent (custom logo upload, custom domain on the deck, removing Day14 chrome) is net-new and should wait for a customer who asks.

**What scopes to the tenant** (filtered by slug in `file-repository.ts`): its customer dossiers under `_shared/customers/*`, its agent outputs under `{slug}/`, and its slice of `empire-state.json` / `operator-todos.json` / outbox taps / poller heartbeats / brand-health.

## 5. Invite / handoff — the customer goes live in their deck

**BUILD (gated).** The last mile: the tenant exists, the deck renders, auth is wired — now the customer actually receives access.

- **Invite token →** a signed, single-use link that binds a new login to `tenant_slug` (so the account created can only ever resolve to their tenant). On first login the session's `tenant_slug` is set from the token, never chosen by the user.
- **Handoff packet →** what the customer gets on day one: deck URL, what each agent/daemon does for them, the tap/approval model (they approve consequential actions; nothing irreversible fires without it — mirrors Jack's own guardrails), and a support channel.
- **⚠ CONFIRM with Jack before any customer-facing send** — per the prime directives, no customer-facing email or message goes out without an explicit Jack tap. The invite is *drafted and staged*, never auto-sent.

## Exists vs. build — the honest ledger

| Stage | Exists today | Must build (best pulled by customer #1; freeze lifted 2026-06-26) |
|---|---|---|
| 1 Signup | Stripe webhook → customer dossier (`01-brand.json`) | Customer→tenant promotion rule; Platform product boundary `⚠` |
| 2 Provisioning | Manual `tenants.json` entry; [[Templates/New Tenant Onboarding]] checklist; `DeckRepository` contract | `provisionTenant()` automation; Supabase `tenants` row (roadmap row 3) |
| 3 Auth | `/app/*` middleware gate; Jack-preview; repository-level tenant isolation | Real per-customer accounts; route-tenant == session-tenant guard (roadmap row 4) |
| 4 Scoped deck | `deck-view.tsx`, `/app/[tenant]/agents`, isolated approve route, empty-scope state, monogram+accent | White-labeling beyond monogram/accent (logo, custom domain) |
| 5 Invite/handoff | Tap/approval model; guardrails | Signed single-use invite token; staged handoff packet (Jack-tap to send) |

**The critical insight:** the *data plane* (isolated reads/writes, scoped views) is built and safe. What's missing is the *control plane* — how a buyer becomes a tenant and how a tenant gets a login. That control plane is exactly the work that should be pulled into existence by customer #1, not built speculatively.

## Minimum viable onboarding (what's runnable TODAY, zero new infra)

For design-partner #1, Jack can run this manually right now — zero build required (still the fastest path post-freeze-lift):
1. Add the tenant entry to `tenants.json` by hand (step 2a, via [[Templates/New Tenant Onboarding]]).
2. Run the template's isolation-verification checklist (open `/app/{slug}/agents`, confirm zero cross-tenant rows, confirm a tap only touches that tenant).
3. Demo it under **Jack-preview** — Jack opens the customer's lens and walks them through it live (no external login needed yet).

This proves the product to a real buyer with **no auth build, no Supabase, no invite system** — and lets the customer pull steps 2b/3/5 into existence only once they've committed.

## Related
[[Agent Deck Backend Architecture]] · [[Day14 — Expansion Roadmap]] · [[Templates/New Tenant Onboarding]] · [[Templates/Customer Deck Setup]] · [[Day14 — Current Open Items]] · [[Jack — Confirm These (expansion blockers)]] · [[Day14 OS — System Map]]


---

# Day14 — Expansion Roadmap

A prioritized, sequenced roadmap to turn the multi-tenant **Agent Command Deck** + agent OS into a sellable platform. Companion to [[Day14 — Business Scope & Pivot Points]] and [[Agent Deck Backend Architecture]]. Written challenge-first, not as a victory lap.

> **🛑 Read this before reading the table.** The honest diagnosis hasn't changed: **enormous capability, ~$0 third-party revenue.** Per the SELL-FIRST FREEZE ([[Day14 OS — System Map|CLAUDE.md]]), the binding constraint is **distribution and proof, not platform completeness**. So this roadmap deliberately sequences the *customer-pulled, revenue-unlocking* work ahead of the *speculative infra*. Most of the technical items below (Supabase adapter, per-customer auth, orchestration leader, the Gemini migration tail) are **real and worth doing — but only once a named customer or a live sale pulls them.** Building them first would widen the capability-vs-cash gap the freeze exists to close. **This is a plan, not a build order to execute tonight.**

## How to read the table
Each row: **what · why · effort (S/M/L) · dependency · impact · freeze verdict.** "Freeze verdict" is the discipline column — does a named customer or live sale pull this, or is it speculative infra to backlog?

| # | Item | Why | Effort | Dependency | Impact | Freeze verdict |
|---|------|-----|--------|-----------|--------|----------------|
| 1 | **Make the site purchasable (Stripe payment links)** | No stranger can pay today. This is the single highest-leverage action in the whole business — every other row is worthless until this ships. | S (once unblocked) | **BLOCKED:** need `STRIPE_ACCOUNT` for the `sk_org_live` key before live links generate (see [[Day14 — Current Open Items]]). Jack-only (no real Stripe keys from agent code). | **Highest.** Converts capability → cash. | ✅ **Customer-pulled. Do first.** Resolve the `STRIPE_ACCOUNT` blocker this week. |
| 2 | **Customer onboarding flow (tenant → scoped deck → invite)** — full flow specced in [[Customer Onboarding Flow — Spec]] | The deck already renders a scoped per-customer view (`/app/[tenant]/agents`). What's missing is the *path in*: a `tenants.json`/Supabase entry → provisioned scoped deck → an invite the customer actually uses. This is what a paying customer receives. | M | Needs a real buyer to onboard (row 1) + per-customer auth (row 4) for a true external login; a **Jack-preview onboarding** can be staged today with zero new infra. | **High** — turns "we have a deck" into "the customer has *their* deck." | 🟡 **Pull-on-first-sale.** Stage the lightweight Jack-preview version now; build the real invite/login flow the moment customer #1 signs. |
| 3 | **Supabase adapter (`SupabaseDeckRepository`)** | Hosted, isolated per-tenant storage behind the existing `DeckRepository` contract. The contract + file adapter already exist, so this is an **additive fork, not a rewrite** — implement the same interface, flip `DAY14_DECK_BACKEND=supabase`. Day14 already provisions per-tenant Supabase. | M | The `DeckRepository` contract (✅ built 2026-06-26). No page/API/write-path changes. | **Medium** — required for *hosted* multi-tenant, but the file adapter serves Jack-preview + a first design-partner today. | 🟠 **Speculative until hosting is the bottleneck.** A first customer can run on the file adapter under Jack-preview. Build when you're onboarding customer #2 or a customer demands their own hosted login. |
| 4 | **Per-customer auth (route tenant == session tenant)** | Each customer logs in and sees ONLY their slug; the route tenant must equal the authenticated customer's tenant. Today it's admin/localhost-gated (Jack-preview). This is the hard security gate before any external customer touches the deck unsupervised. | M | Pairs with row 3 (Supabase) for real accounts; middleware `/app/*` gate already exists. | **High for trust, gated by demand** — no external login = no SaaS, but also not needed for a Jack-run/Jack-preview delivery. | 🟠 **Pull-on-first-external-login.** Don't build speculative auth for zero users. The day a customer needs to log in themselves, this becomes P0. Until then, Jack-preview is sufficient and safer. |
| 5 | **Billing wiring (Stripe subscriptions per tenant)** | Beyond row-1 payment links: recurring per-tenant billing tied to the tenant record, so onboarding → deck → subscription is one loop. | M | **Same `STRIPE_ACCOUNT` blocker as row 1**; needs the tenant record (row 2). Jack executes all Stripe calls. | **High** — recurring revenue, not one-off. | 🟡 **Pull-on-first-recurring-customer.** Resolve the shared Stripe blocker for row 1 first; full per-tenant subscription wiring follows the first signed recurring deal. |
| 6 | **Migrate remaining ~21 direct-Gemini scripts onto shared `llm-call.mjs`** | C-suite agents already moved onto the Claude-first shared router (2026-06-26). Folding in the last ~21 scripts collapses the duplicated Gemini boilerplate, gives one cost/provider/error regime, and one budget lever. | M (mechanical, repetitive, low-risk refactor) | The shared `scripts/_generic/llm-call.mjs` (✅ exists, Claude-first w/ Gemini fallback). | **Medium (internal)** — cost + maintainability, no customer-facing change. | 🟠 **Speculative — backlog under the freeze.** It's hygiene, not revenue. Migrate *opportunistically* (when you're already editing a script) rather than as a dedicated push. Note: also needs the 2-line `ACTIVATION.md` edit to flip the C-suite migration live. |
| 7 | **Agent-orchestration leader ("Chief of Staff")** | The capstone of [[Agent Org & Orchestration]] — a standing agent that decides run order from current state, plus blackboard shared-memory and inter-agent handoffs. Turns ~10 solo timer-agents into a coordinated delivery team. | L | Blackboard lib + one real handoff pipeline must precede the leader (see that note's build sequence). Model-routing layer (row 6 family) partly done. | **Multiplies** delivery throughput once selling — but **multiplies zero while revenue is zero.** | 🔴 **Speculative — explicitly frozen.** Per its own note: *"design it now, build/activate it after the first third-party dollar."* The first piece worth building post-sale is the handoff pipeline for **customer #1's actual work**, not the full leader. Build only in the order revenue pulls it. |

## The sequencing logic (why this order)
The rows above are **not** in pure technical-dependency order — they're in **revenue-pull order**, which is what the freeze demands:

1. **Row 1 (purchasable site)** is the gate to everything. It's also blocked on one concrete thing (`STRIPE_ACCOUNT`). Unblocking it is the highest-value hour available.
2. **Rows 2 → 5 → 4 → 3** form the natural "first customer" arc *once a buyer exists*: onboard them (2), bill them (5), give them a secure login (4), host their data in isolation (3). Each is pulled into existence by the customer, in roughly the order the customer experiences them — **not** built speculatively up front.
3. **Rows 6 and 7 are internal leverage** (cleaner LLM stack, coordinated agent team). They make delivery cheaper and faster but create **no** new revenue. Under the freeze they are backlog: row 6 done opportunistically, row 7 frozen until the first dollar — and even then, built narrowly for customer #1's delivery path, not as the grand orchestrator.

The trap the [[Day14 — Strategic Direction]] note names — "five businesses, one operator, build everything in parallel" — applies to *platform features* exactly as it applies to *businesses*. The cure is the same: **let a named buyer pull the next piece into existence.**

## Confidence tags
- **High confidence:** the technical readiness claims (contract + file adapter + both deck views built; C-suite LLM migration done; Supabase/auth are additive forks not rewrites). Sourced directly from [[Agent Deck Backend Architecture]] + [[Day14 — Current Open Items]], written this same session.
- **High confidence:** the diagnosis that revenue/proof — not platform completeness — is the binding constraint. It's the consistent through-line across [[Day14 — Business Scope & Pivot Points]], the `ruthless-critic` agent, and CLAUDE.md's freeze.
- **Medium confidence:** effort sizes (S/M/L). These are advisor estimates from the architecture notes, not from re-reading the code; the Supabase adapter in particular could be S if Day14's existing per-tenant provisioning is mature, or M if schema/migration work is involved.
- **Low / unknown — needs Jack:** the actual revenue trigger. The whole sequence hinges on *who customer #1 is and what they buy* (see the open blockers in [[Jack — Confirm These (expansion blockers)]] — alignmd partner details, BuildBridge productization fork, day14-realty end goal). **Until those are answered, rows 2–7 are planning against a hypothetical buyer.**

## Next 3 moves (recommendation)
1. **Unblock and ship the purchasable site (row 1).** Get `STRIPE_ACCOUNT` resolved for the `sk_org_live` key and generate live payment links. This is the one move that flips the system from "impressive" to "transacting," and it's a small task hiding behind a one-line blocker. **Nothing else on this roadmap should be built before a stranger *can* pay.** (Jack executes the Stripe step — no real keys from agent code.)
2. **Answer the customer-identity blockers, then stage the Jack-preview onboarding (row 2, lightweight).** Pick the *one* named buyer and bought outcome from [[Day14 — Business Scope & Pivot Points]] (the contractor-job-tracking / BuildBridge buyer, or the alignmd automate-and-own recruiter). Resolve the relevant rows in [[Jack — Confirm These (expansion blockers)]]. Then stage that buyer's scoped deck under today's Jack-preview mode — **zero new infra**, real proof to show.
3. **Hold rows 3, 4, 7 in backlog; migrate row 6 only opportunistically.** Explicitly do *not* build the Supabase adapter, per-customer auth, or the orchestration leader until a signed customer pulls them. When the first dollar lands, build in the order the customer experiences the product (auth + hosting when they need their own login), and build the agent team narrowly for *that customer's delivery*, not as a general orchestrator. **Re-run a Sunday Kill Review** to make sure the backlog isn't quietly being built anyway.

> **One-line takeaway:** You don't have a platform-completeness problem; you have a "no one has paid yet" problem. The fastest path to a sellable platform is a *sale* — sequence the roadmap so the customer builds it for you.

## Related
[[Customer Onboarding Flow — Spec]] · [[Day14 — Business Scope & Pivot Points]] · [[Day14 — Strategic Direction]] · [[Agent Deck Backend Architecture]] · [[Agent Org & Orchestration]] · [[Day14 — Current Open Items]] · [[Jack — Confirm These (expansion blockers)]] · [[Agent Oversight (Command Deck)]]


---

# Generator — Instant Preview Engine (Build Spec)

The "Build it" moment is the front of a real product: a **generator** that turns a few inputs (business name, trade, city) into actual branded deliverables for a prospect — starting with a live site preview and expanding to multi-page sites, outreach, social, and logo/brand. The strategic point: a Naples pool owner types their name and **watches their own site exist in seconds**, then books to make it real. It also closes the outreach loop — the daily prospect-finder scheduled task (`day14-daily-prospect-finder`, runs ~6:45am, surfaces Facebook-only SWFL prospects + drafts cold-email Gmail) can pre-generate a preview per lead. See Phase 2.

## The reusable seam
- `src/lib/preview.ts` — pure core: `encodePreview/decodePreview` (isomorphic base64url token, **no DB — the URL is the preview**), `TRADE_CONTENT` (tagline + 6 services per trade), `normalizeTrade`, `tradeContent`. Every generator phase grows from this: input → content (pure fn) → render (route/component).
- Generation must stay **honest**: never fabricate a price (prices only from `pricing.ts`), a customer, a metric, or a testimonial.

## v1 — BUILT this session (2026-06-28, uncommitted on `feat/cinematic-rebuild-2026-06`)
- `src/lib/preview.ts` engine.
- `src/app/preview/[token]/page.tsx` — a **real** branded one-pager for the business (hero with their name + trade tagline, 6 services, "what's under the hood", CTA to book). **Honesty ribbon** ("a free preview Day14 built for X — not live yet"), `noindex`.
- Hero builder (`Hero.tsx`) generates the token on "Build it" and surfaces **"Open your full site preview →"** → `/preview/<token>`, plus the existing headline/dashboard morph. Console-style input (mono labels, accent-on-focus).

## Phase 2 — the auto-email loop (next, after deploy)
- Update the `day14-daily-prospect-finder` scheduled task (no vault note — it lives in `~/Claude/Scheduled/`) to compute a `day14.us/preview/<token>` URL per prospect and embed it in the Gmail draft ("I built you a preview → link"). Uses the SAME `encodePreview`. **Do this only after the route is live** so links aren't dead. Status of this item-4 patch is tracked in [[Day14 — Jack's Action Board (2026-06-29)]] and [[Day14 — Current Open Items]].
- Lead capture on the preview page → `POST /api/preview-lead` → append to a leads file. **No autonomous send** — Jack-tap to follow up (drafts only).

## Phase 3 — multi-page sites
- Extend the engine: generate home / services / about / contact from trade templates. `/preview/<token>` becomes multi-route or tabbed. Same token, richer output.

## Phase 4 — logo + social graphics — PROVIDER CHOSEN + SCAFFOLD WIRED (dormant)
- **Resolved 2026-06-29:** the "which image API" decision is made. Provider = **OpenAI GPT Image**, default model `gpt-image-1.5` (override via `DAY14_IMAGE_MODEL`), endpoint `https://api.openai.com/v1/images/generations`. Rationale in `~/Claude/Projects/DAY14/image-provider-options-2026-06-29.md`. Still true that the text stack itself can't draw — this bolts on an external image API for the one capability it lacks.
- **Wired (commit `0620729`):** `src/lib/image-gen.ts` exports `generateImage()` + `isImageGenEnabled()`. **Dormant by default** — every path returns `null` / `{enabled:false}` unless `OPENAI_API_KEY` is set, so callers degrade cleanly to text-only. Setting the key + deploying is the **single switch** (no code change). Never throws; failures return null.
- **Consumer:** `src/app/api/preview-asset/route.ts` does on-demand logo generation, **cached per token+kind** to `~/Documents/businesses/_shared/growth/preview-assets/` — a logo is created at most once per business (bounded cost, no fan-out on page load). Prompt is built from the business name + trade + `brandKit` palette, transparent background. Preview island `LogoSlot.tsx` shows the logo when enabled, else nothing.
- **Remaining blocker is now a toggle, not a decision:** flipping this on is a Jack call because it's the only per-generation paid dependency (OpenAI billing). Until `OPENAI_API_KEY` is live in prod, the generator still ships **text deliverables only** — but shipping images is a config flip, not a build. Per-platform social graphics reuse the same `generateImage` seam.

## Phase 5 — outreach generation
- Generate the cold-email + follow-up copy tied to each preview (partly exists in the prospect finder). Unify so one input set produces preview + matching outreach.

## Guardrails
- Preview pages are `noindex`, honesty-ribboned, and never claim to be the prospect's live site.
- No autonomous customer contact — all sends are Jack-tapped.
- No fabricated prices/customers/metrics. Image deliverables stay dormant (text-only) until `OPENAI_API_KEY` is set in prod — provider is chosen + wired (`image-gen.ts`), so this is a config toggle, not a build gap.

## Related
[[Day14 — Strategic Direction]] · [[Businesses — Overview]] · [[Day14 — Current Open Items]] · [[Runbook — Go Live & Get Paid]]


---

# Idea Pipeline

**One-liner:** *How a raw opportunity becomes a shipped Day14 business — scout → pitch → architect → build → nudge — with a Jack tap on every launch.*

The overview that several engine notes point to. The individual agents each have their own context note in `Agents/`; this note is the map of how they hand off. Team-wide view [[Agent Roster]] (the *engines* section); coordination [[Agent Org & Orchestration]]. Every stage is repo-grounded in `~/Documents/studio/scripts/`.

## The flow

```
opportunity-scanner  →  idea-pitcher  →  [Jack tap: bootstrap <slug>]  →  business-bootstrap
   (score ≥75 auto)        (full pitch)                                      (spin up tenant)
        │                      ↑
        │  score 60–74         │  7am re-pitch of open opps ≥60
        └──────────────→  proactive-pitcher

   move-architect   — turns an approved raw idea into a build spec (parallel entry, Jack/bot-invoked)
   expansion-prompter / priority-allocator — keep Jack surfaced on what to launch/rank next
```

## Stages

- **Scout — [[Agents/opportunity-scanner|opportunity-scanner]].** Grounded hourly Gemini scout (`google_search`, rotating scan angles). Scores each find on a weighted rubric and writes `_shared/opportunities/<id>.json`. **Auto-spawns `idea-pitcher` for total_score ≥75 (urgent ≥85)** — the top of the funnel. Persistent KeepAlive daemon, heartbeat-emitting, watchdog-tracked.
- **Pitch — `idea-pitcher.mjs` (`--id <opp-id> [--urgent true]`).** Takes one opportunity and generates a full pitch: 1-page markdown, 30-day MVP plan, projected economics, 5 product concepts, competitor breakdown, risk + kill criteria. Writes `_shared/pitches/<slug>.md`, sets `pitched: true` on the opportunity record, and Telegram-pings a tap-to-launch card: *"Launch `<slug>`? Reply `bootstrap <slug>`."* No own context note — it is a one-shot CLI/bot invoke, not a daemon.
- **Re-pitch — [[Agents/proactive-pitcher|proactive-pitcher]].** Calendar one-shot @ 7am. Re-pitches open opps scored **≥60** that were not yet pitched, so it uniquely covers the **60–74 band** that the scanner's ≥75 auto-spawn skips, then pushes Jack a ranked one-tap `bootstrap-pitch` morning digest. No LLM of its own / no heartbeat; launch is always a Jack tap.
- **Architect — `move-architect.mjs` (`node move-architect.mjs "<idea>"`, or Telegram `architect <idea>` / `plan <idea>`).** A parallel entry point: turns a raw idea into a structured expansion spec (idea restated, clarifying questions, honest constraints, phased plan + explicit file map, risks, verification checklist, ship plan) and writes it to `_shared/move-specs/`. Degrades cleanly — with no LLM key it still writes a checklist stub for Jack to fill in. No own context note.
- **Build — `business-bootstrap` / [[Agents/recursive-expansion|recursive-expansion]].** The Jack `bootstrap <slug>` tap spins up the tenant (business-bootstrap + new-tenant + brand-identity-generator + supabase-provisioner). Recursive-expansion is the self-growth sibling that drafts new *skills* the same tap-to-approve way.
- **Nudge & rank (founder-facing).** [[Agents/expansion-prompter|expansion-prompter]] — 2-hr Gemini brainstorm pushing ~5 copy-paste "next move" prompts (the *generative* surface). [[Agents/priority-allocator|priority-allocator]] — leverage-ranked top-10 across the fleet @ 9am/2pm/8pm (the *ranking* surface, read-only). Both keep Jack pointed at what to launch next without acting.

## Score bands (who owns which)

- **≥75 (urgent ≥85):** opportunity-scanner auto-spawns idea-pitcher immediately.
- **60–74:** owned by proactive-pitcher's 7am re-pitch — the band the scanner's auto-spawn ignores.
- **<60:** left in `_shared/opportunities/` unpitched; may surface via expansion-prompter's brainstorm but is not auto-pitched.

## Guardrail (non-negotiable)

**No business launches without a Jack tap.** Every engine in this pipeline *surfaces, pitches, or ranks* — none spins up a tenant or moves money on its own. The `bootstrap <slug>` reply is the single human gate, per the prime directives ([[Working with Jack]]).

## Related
[[Agent Roster]] · [[Agent Org & Orchestration]] · [[Agents/opportunity-scanner]] · [[Agents/proactive-pitcher]] · [[Agents/expansion-prompter]] · [[Agents/priority-allocator]] · [[Agents/recursive-expansion]] · [[Day14 Vault — Index]]


---

# Runbook — Go Live & Get Paid

> **⚠ Status (2026-07-06): Part B is DONE in substance — Part A is still the live blocker.** Everything Part B was written to ship has since landed (repo + Vercel-API verified 2026-07-02, evidence in [[Day14 — Current Open Items]]): the five Command-Deck/backend/LLM commits are on `feat/cinematic-rebuild-2026-06`, pushed through tip `b70fc1a`, and `b70fc1a` is the **current production deployment on day14.us** (`dpl_9SQzT8…`, READY, 2026-06-29). Only B5 survives, transformed: the Production-Branch toggle likely still points at `main` (every prod deploy is a manual `"action":"promote"`), so the open Jack call is *flip the toggle vs. keep manual-promote as a deploy gate* — no longer "or the redesign never goes live." **Part A (Stripe / `STRIPE_ACCOUNT`) remains open and is now the single go-live blocker.** New work since this runbook was written (2026-07-01 a11y polish, 2026-06-30 admin-session hardening) sits uncommitted and is tracked in [[Day14 — Current Open Items]], not here. For current sequencing use `~/Claude/Projects/DAY14/TODAY-WRAP-2026-06-30.md`, which supersedes this note. Part B's steps are kept below as the reusable ship-from-the-mini procedure.

Two of Jack's three highest-leverage actions are pure mechanics blocked on **him**, not the agents. This note removes every decision from them so that when Jack sits down it's copy-paste, zero-thinking. Do **A** first (it's a config value, the single thing that lets a stranger pay), then **B** (ships the redesign + the uncommitted Command Deck / backend / LLM work).

Source of the blockers: [[Day14 — Current Open Items]] · [[_sweeps/MORNING-BRIEF-2026-06-26]].

> Both parts run on the **mini** (`~/Documents/studio`), not in the sandbox — `next build` and the live Stripe key only exist there. Every command block below is bare, with **no inline `#` comments**, because Jack's zsh treats `#` as an argument. Read the prose around each block; don't paste the prose.

---

## A. Stripe payment links — let a stranger pay

**What's blocked and why.** The live key is `sk_org_live` (an organization key — it makes **real charges**), and the link-generator script needs the account it should create links under. That account id is the one missing value. Supply it once as `STRIPE_ACCOUNT` and the three links generate.

### A1. Find the Stripe account id (`acct_…`)

Log in to the Stripe Dashboard, make sure you're in the **correct organization/account** in the top-left account switcher (this is an `sk_org_live` key — real money), then open **Settings → Business → Account details** (or click the account name top-left → the id is shown under the account name). The value you want starts with `acct_` followed by a string of characters. Copy the whole thing.

If you have the Stripe CLI handy instead, the account id is also printed by:

```bash
stripe config --list
```

### A2. Add it to `.env.local`

On the mini, append the line to the studio env file. Replace `acct_xxxxxxxxxxxxxxxx` with the id you just copied:

```bash
cd ~/Documents/studio
echo 'STRIPE_ACCOUNT=acct_xxxxxxxxxxxxxxxx' >> .env.local
```

Confirm it landed (and that the `sk_org_live` key is also present in the file):

```bash
cd ~/Documents/studio
grep -E 'STRIPE_ACCOUNT|STRIPE_SECRET|sk_org_live' .env.local
```

### A3. Generate the three payment links

Load the env into the shell and run the generator. This is the step that talks to Stripe with the **live** key:

```bash
cd ~/Documents/studio
set -a && source .env.local && set +a && npx tsx scripts/create-stripe-payment-links.ts
```

The script prints three lines that look like `STRIPE_PAYMENT_LINK_*=https://...`. Copy all three.

### A4. Paste the links back into env and rebuild

Append the three printed lines to `.env.local`. Replace the placeholder values with the exact lines the script printed:

```bash
cd ~/Documents/studio
cat >> .env.local <<'EOF'
STRIPE_PAYMENT_LINK_SPARK=https://paste-printed-value
STRIPE_PAYMENT_LINK_LOCAL=https://paste-printed-value
STRIPE_PAYMENT_LINK_PORTAL=https://paste-printed-value
EOF
```

Then rebuild so the links bake into the site (the build itself is covered in Part B — if you're doing both in one sitting, skip straight to B and let B's `npm run build` cover this):

```bash
cd ~/Documents/studio
npm run build
```

---

## B. Ship — deploy the redesign + the overnight build *(landed — see status banner; kept as the reusable procedure)*

**What's sitting uncommitted.** The multi-tenant Command Deck, the tenant-scoped `agent-deck` backend, the C-suite LLM migration, the agent journal/handoff write-back path, and the Obsidian/agent-context activation are all written and tsc-clean on the mini but **uncommitted, unbuilt, undeployed**. None of it is real until it ships. The redesign also never went live because Vercel's Production Branch is still `main`, so every `redesign` deploy has been preview-only.

### B0. Kill `next dev` first (non-negotiable)

**Never run `npm run build` while `next dev` is running** — it corrupts `.next`. Kill any dev server first:

```bash
pkill -f 'next dev'
```

Confirm nothing is still holding the dev port:

```bash
lsof -i :3000
```

If that prints a PID, kill it by number before continuing.

### B1. Review what you're about to commit

```bash
cd ~/Documents/studio
git status
```

```bash
cd ~/Documents/studio
git branch --show-current
```

You should be on `redesign`. Sanity-read the diff before staging:

```bash
cd ~/Documents/studio
git diff --stat
```

### B2. Stage the deck + backend + LLM + journal + activation paths

```bash
cd ~/Documents/studio
git add src/lib/agent-deck src/app/dashboard/agents src/app/app src/app/api/agents src/app/api/dashboard/agents src/app/api/app src/middleware.ts scripts/_generic/llm-call.mjs scripts/_generic/agent-journal.mjs docs/agent-context
```

Confirm the staging looks right and nothing unexpected snuck in:

```bash
cd ~/Documents/studio
git status
```

### B3. Build — the real gate

This cannot run in the sandbox; the mini is the only place it's valid. It must pass clean before you commit:

```bash
cd ~/Documents/studio
npm run build
```

If it fails, stop and read the error — do not commit a red build.

### B4. Commit (local only)

```bash
cd ~/Documents/studio
git commit -m "Ship multi-tenant Command Deck, agent-deck backend, Claude-first LLM migration, journal write-back, agent-context activation"
```

### B5. Flip Vercel Production Branch `main` → `redesign`

In the Vercel dashboard, open the **day14** project → **Settings → Git → Production Branch**, change it from `main` to `redesign`, and save. Until this toggle flips, every `redesign` push deploys preview-only and never reaches day14.us. Do this **before** the push so the push lands as a production deploy.

### B6. Push

```bash
cd ~/Documents/studio
git push origin redesign
```

Watch the deploy in Vercel; once it's green, day14.us serves the redesign and the Command Deck work is live.

---

## Order of the day

1. **A (Stripe)** — config value, lets a stranger pay. Still the highest-leverage open action (revenue-pulling work ranks first; the sell-first *freeze* itself was lifted 2026-06-26 per repo CLAUDE.md).
2. **B (Ship)** — ~~flips the redesign + overnight build live~~ **done** (see status banner). B's `npm run build` still doubles as A4's rebuild if you bake the Stripe links in first.

The runner-up housekeeping has mostly closed since 06-26 — `day14-trip-deep-work` disabled ✓, CLAUDE.md skill counts fixed ✓, and the "stale daemons" item re-scoped to an orphan-heartbeat-file cleanup (likely retired agents, not restarts) — current state and evidence in [[Day14 — Current Open Items]].

## Related

[[Workflows — Index]] · [[Day14 — Current Open Items]] · [[_sweeps/MORNING-BRIEF-2026-06-26]] · [[Sandbox Git Playbook]] · [[Shell Handoff Rules (zsh)]] · [[Working with Jack]]


---

# Tooling — gstack (Claude Code dev team)

[gstack](https://github.com/garrytan/gstack) (Garry Tan, MIT) is a Claude Code skill pack that turns the coding agent into a virtual eng team running a real sprint: **Think → Plan → Build → Review → Test → Ship → Reflect**. Day14 adopts it as the **engineering-rigor layer for building and shipping the OS itself** — not for running the businesses (the C-suite agents do that).

## The distinction that matters
- gstack = how we **build Day14** (the studio repo): plan, review, QA, security, ship.
- It is **not** a business-automation framework — it doesn't replace [[Agent Roster|the C-suite]].
- gstack ships **GBrain** (persistent agent memory). Day14 already has that: the Obsidian vault + [[Agent Journal & Handoffs]] write-back loop. **Decision: the vault stays Day14's knowledge layer; we do NOT adopt GBrain for business knowledge** (would double-build). GBrain is optional later, only for code-symbol search.

## Skill → Day14 workflow map
| When Day14 does… | Run | gstack specialist |
|---|---|---|
| New feature / idea | `/office-hours` → `/autoplan` | YC office hours + CEO/design/eng/DX review |
| Land the uncommitted deck/backend | `/review` → `/cso` → `/ship` | staff eng + security officer + release eng |
| Multi-tenant isolation / auth (deck, `/app/[tenant]`) | `/cso` | OWASP Top-10 + STRIDE — built for exactly this |
| Nightly polish / cinematic builds | `/autoplan` → implement → `/review` → `/qa` → `/ship` | the full sprint |
| New UI (deck, customer pages) | `/design-shotgun` → `/design-html` | design explorer → production HTML |
| Debug a real failure | `/investigate` | root-cause: no fix without investigation |
| Risky prod work on the mini | `/careful` / `/freeze` / `/guard` | safety rails — aligns with [[Working with Jack]] guardrails |
| Keep docs current after shipping | `/document-release` | technical writer (Diataxis) |
| Weekly engineering retro | `/retro` | pairs with the Sunday Kill Review |

## Highest-leverage first use
`/review` + `/cso` on the **uncommitted** deck/backend/LLM/journal work, then `/ship`. Turns the scary uncommitted pile (see [[Day14 — Current Open Items]] · [[Runbook — Go Live & Get Paid]]) into reviewed, security-audited, tested, shipped code.

## Install (Jack runs — system-level, modifies Claude Code)
A system install into `~/.claude/skills/gstack` (needs Git + Bun v1.0+). From the README:
```
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup
```
Then add a `## gstack` section to the studio repo's `CLAUDE.md` listing the skills (so the build agents use them), and team-mode it for the repo if desired (`./setup --team`). Note gstack asks coding sessions to use its `/browse` instead of the chrome MCP.

## Guardrail note
gstack's `/ship` / `/land-and-deploy` PUSH and DEPLOY. Day14's prime directive is **no push without a Jack tap** ([[Working with Jack]]). So: use `/review` `/cso` `/qa` `/autoplan` freely (read/draft/local), but treat `/ship`'s push + `/land-and-deploy` as Jack-gated — review the PR, Jack approves the merge/deploy.

## Related
[[Role — Dev & Build Agent]] · [[Agent Org & Orchestration]] · [[Day14 OS — System Map]] · [[Day14 — Current Open Items]]


---

# Vault Gaps — Needs Jack

> **⤳ The canonical fill-in-fast list is [[Jack — Confirm These (expansion blockers)]] — answer there.** This file exists because automated vault runs log Jack-only gaps here by contract; to avoid two competing lists, entries below are one-liners that must ALSO be folded into the canonical note (most-blocking first) in the same run. If this file ever grows a gap the canonical note lacks, that's the bug to fix.

## Log (one line per gap, newest at bottom)

- **2026-07-03** — Customer→tenant promotion rule: which purchased outcome includes a scoped deck (Platform sale only, per positioning north-star)? Folded into [[Jack — Confirm These (expansion blockers)]] § "Customer onboarding — the tenant-promotion trigger"; source marker in [[Customer Onboarding Flow — Spec]] §1.
