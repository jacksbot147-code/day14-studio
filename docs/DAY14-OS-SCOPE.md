# Day14 OS — Full Scope Document

> What we built, why it exists, and how to use it.
> Three audiences, three sections: **Jack** (the operator's manual),
> **future employees** (onboarding), **potential clients** (what they're
> buying). Written 2026-06-10, the night the runtime moved to the Mac mini.

---

## 1. The one-paragraph version

Day14 is a productized build studio: custom websites and apps for local
businesses and small teams, shipped in days, from $1,500 single-page
sites to $24k multi-tenant platforms, then operated forever for a
monthly fee. Day14 OS is the operating system behind it — a codebase of
275 skills, background agents, and approval workflows that lets one
person (Jack) run the build studio plus six internal businesses with
the leverage of a staffed agency. The OS runs 24/7 on a Mac mini; Jack
steers from a laptop; nothing customer-facing happens without his tap.

---

## 2. What exists (the inventory)

### The business layer
- **day14.us** — the storefront. Pricing (Spark $1,500 → Platform $24k,
  ops ladder $49/$149/$299/mo), intake form, booking via cal.com/day14/intro,
  case studies, build log.
- **Six internal businesses** — Day14 itself, Hot Flash Co (POD),
  Kennum Lawn Care (agency), Day14 Realty (deal sourcing), AlignMD
  (healthcare SaaS), Life Loophole (tax content). They are the proof:
  "same stack I run my six on."
- **Customer dossiers** — every customer is a folder at
  `~/Documents/businesses/_shared/customers/{slug}/`: intake snapshot,
  brand JSON, pipeline status, refunds, feedback, launch notes.
  Append-only; the audit trail outranks tidiness.

### The OS layer (the four-layer stack)
1. **Telemetry** — `work-register.jsonl` logs everything agents do;
   a hash-chained audit log records consequential actions.
2. **Registry + specs** — 275 skills indexed (`skill-registry.generated.ts`),
   434 edges between them. Each skill is a SKILL.md spec at
   `docs/seeds/skills/{name}/`. Six are fully hand-coded TypeScript
   (audit log, uptime monitor, LTV calculator, churn scorer, refund
   handler, subscription pause).
3. **Runtime** — `dispatch.ts` routes webhook events (Stripe, intake,
   Cal, Resend) to skills; `skill-runner` executes hand-coded
   implementations first, falls back to an LLM agent loop.
4. **Surfaces** — `/dashboard` (empire view), `/dashboard/system`
   (health), `/dashboard/graph` (skill explorer), `/admin` (command
   center + approvals inbox), Telegram bridge, and day14.us itself.

### The background workforce
- **Pollers (LaunchAgents, 24/7):** growth-watcher (detects repeated
  ad-hoc work and drafts new skills — the OS literally grows itself),
  telegram-poller (Jack's phone bridge), events-poller (Supabase
  pipeline transitions), plus ~20 specialist agents (realty scouts,
  lawn-care GM cluster, CS triage, watchdogs).
- **Scheduled Cowork tasks:** morning briefing, nightly polish pass,
  weekly council review, weekly skill harvest — recurring AI work
  sessions with full file access.

### The governance spine (why this is safe)
- **Jack-taps** — any consequential action (emails to customers,
  refunds, deploys, spend) becomes an approval card in `/admin/inbox`
  (and Telegram). Agents propose; Jack disposes.
- **Hard rules** (in CLAUDE.md, binding on every agent): no git pushes,
  no customer-facing sends, no real API calls from agent code, always
  audit-log, always feed the work-register.
- **Security:** `/admin`, `/dashboard`, and internal data JSON are
  gated behind ADMIN_PASSWORD in production; secrets live only in
  `.env.local` and Vercel env.

### The hardware topology (new as of tonight)
- **Mac mini = the engine.** Always on, runs the pollers, dev server,
  and recurring scheduled tasks. Its Cowork instance is the "runtime
  brain" (orientation: `docs/MINI-FIRST-PROMPT.md`).
- **Laptop = the cockpit.** Interactive sessions: building features,
  reviewing drafts, approving taps. No background runtime.
- **One-runtime rule:** exactly one machine runs the LaunchAgents and
  owns `~/Documents/businesses/` at a time. Handovers via
  `scripts/mini-preflight.sh --handover` + rsync; state recorded in
  `_shared/HANDOVER.md`.

---

## 3. For Jack — the operator's manual

### Your daily loop (~20 min)
1. **Morning briefing arrives** (mini, 7:30 AM): health, overnight
   activity, what needs you.
2. **Open `/admin`** — the NEEDS YOU queue is your todo list, sorted
   by priority. Work it top-down. Each card has instructions inline.
3. **Approve or reject jack-taps** — drafts, sends, deploys. Reply
   "done N" on Telegram or tap in the inbox.
4. **One build block** — your highest-leverage hours go to shipping
   customer work or closing prospects, not ops. The OS exists so this
   is most of your day.

### Your weekly loop
- Sunday council review lands; read it, set the week's one priority.
- Check `/dashboard/system` once — anything red for >24h, boot script.

### The commands that matter
| Situation | Command |
|---|---|
| Anything broken / fresh start | `bash ~/Documents/studio/scripts/boot-day14.sh` |
| Is the runtime healthy? | `bash ~/Documents/studio/scripts/mini-verify.sh` |
| Move runtime between machines | `scripts/mini-preflight.sh --handover` + printed rsyncs |
| Test the whole pipeline | `node scripts/e2e-pipeline-test.mjs` |
| Tests / typecheck | `npm test` / `npx tsc --noEmit` |

### The rules you gave yourself (don't break them at 1 AM)
- Push to git = you, manually, deliberately. Never an agent.
- Customer-facing words = you approved them first.
- The audit chain is append-only — fix forward, never rewrite.
- When the OS asks for a credential, it goes in `.env.local` + Vercel,
  never in code, never in chat.

---

## 4. For future employees — onboarding

Welcome. You're joining a system, not a blank slate. In order:

### Day 1 — read, don't touch
1. `CLAUDE.md` at the studio root — the constitution. The eight hard
   rules at the bottom apply to you exactly as they apply to the AI
   agents. (Yes, really: the no-push and no-autonomous-send rules have
   no human exemption without Jack's say-so.)
2. This document, top to bottom.
3. `docs/day14-os-vision.md` — why it's built this way.
4. Browse `/dashboard` and `/admin` on a dev server
   (`npm run dev` in `~/Documents/studio`).

### Day 2 — learn the event flow
Trace one event end to end: a Stripe webhook arrives at
`src/app/api/webhooks/stripe/route.ts` → `dispatch()` looks up the
skill in `SOURCE_ROUTES` → `runSkill()` tries the hand-coded
implementation in `src/lib/skills/` → side effects write to the
dossier, audit log, work-register, and maybe queue a jack-tap.
Run `node scripts/e2e-pipeline-test.mjs` and watch it happen.

### Day 3 — make your first change
- Adding a skill = write `docs/seeds/skills/{name}/SKILL.md`, then
  `npm run registry:generate && npm run graph:generate`.
- Hand-coding a skill = `src/lib/skills/{name}.ts` exporting `run(ctx)`,
  with a matching test in `tests/`. Hand-coded > more specs; the
  empire is large enough.
- Every consequential thing you build must call `auditLog()` and
  `logSkillInvocation()`. The growth-watcher learns from the register —
  unlogged work is invisible work.

### What you'll never do
Push to the remote, email a customer from code, touch a SKILL.md spec
without Jack's tap, bypass the recursive-growth throttle, or put a
secret anywhere but `.env.local`/Vercel env. The system will still be
auditable in five years because everyone — human and AI — obeyed this.

### The mental model that makes it click
Day14 OS treats AI agents like junior staff with excellent memories and
zero authority: they watch everything (work-register), suggest
improvements (growth-watcher drafting skills), do the rote work
(pollers, briefings, drafts), and queue anything that matters for the
one human with authority. Your job as an employee is to raise what the
agents can safely do — by hand-coding skills and tightening specs —
not to compete with them at rote work.

---

## 5. For potential clients — what you're buying

*(This section is safe to adapt into sales material.)*

### The pitch
You get a custom site or app, live in days — built by one operator
with an industrial-grade system behind him, not a 6-week agency
process or a DIY template. After launch, it isn't abandoned: it runs
on Day14 OS, the same platform that operates six of our own businesses
around the clock.

### What "operated on Day14 OS" means for you
- **Uptime watched 24/7** — automated monitoring polls your site; an
  agent flags problems before you notice them.
- **Changes shipped fast** — requests route through the same pipeline
  that builds everything; small fixes land in days, not ticket queues.
- **A real audit trail** — every action on your account is logged,
  append-only. Refunds and account changes follow a written decision
  tree, not a mood.
- **A human gate** — nothing customer-facing is sent or changed
  without operator sign-off. Automation does the work; a person owns
  the decision.

### The offer ladder
| Tier | Price | What ships |
|---|---|---|
| Spark | $1,500 one-time | Single-page site for a local business, live fast |
| Mid tiers | scoped | Multi-page sites, portals, booking/billing wiring |
| Platform | $24,000 one-time | Marketing site + customer portal + admin app + billing, 12 months ops bundled |
| Ops | $49–$299/mo | Hosting + monitoring + ongoing changes on Day14 OS |

15-minute intro call: **cal.com/day14/intro** · **hello@day14.us**

### Honest answers to fair questions
- *"What if you get hit by a bus?"* The system is documented to the
  keystroke (you're reading the proof), every customer has a complete
  dossier, and the codebase is structured for a successor to operate.
- *"Is AI writing my emails?"* AI drafts; a human approves every send.
  That's enforced in the system's rules, not just promised.
- *"Why so fast?"* Because the rote 80% — scaffolding, monitoring,
  follow-ups, ops — is automated, the human hours go entirely into
  the 20% that's actually about your business.

---

## 6. Where it stands today (2026-06-10)

Shipped tonight: runtime moved to an always-on Mac mini; all service
keys live; security middleware gating internal surfaces; E2E pipeline
passing through the work-register. In flight: production flip of
day14.us to the new customer site (merge todo-94), Vercel env keys
(todo-95b), repo going private (todo-96), Telegram bridge re-auth
(parked), first outreach wave (drafts ready in `content/outreach/`).
First external customer: the current mission. Everything in this
document exists to make that customer's experience excellent and
repeatable.

---

## 7. Glossary

- **Jack-tap** — an approval card; nothing consequential happens without one.
- **Skill** — a unit of capability; a spec (SKILL.md) and sometimes code.
- **Dossier** — a customer's append-only folder of record.
- **Work-register** — the JSONL log of everything agents do.
- **Growth-watcher** — the poller that turns repeated ad-hoc work into new skill drafts.
- **Council** — the weekly self-review protocol (specs in docs/seeds).
- **Handover** — moving the runtime between machines; one runtime at a time.
- **Runtime brain / cockpit** — the mini's always-on Cowork instance vs. the laptop's interactive one.
