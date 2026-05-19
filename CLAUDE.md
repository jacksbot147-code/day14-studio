# Day14 OS — architecture for agents

Future Claude (or any agent) joining this codebase: read this first.

## What this is

Day14 OS is the operating system that runs Jack Boppington's productized
AI-leveraged build studio. It is NOT the build studio itself — it is the
system of code, skills, agents, and pollers that automates the build
studio's ongoing operation.

The codebase has four conceptual layers:

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 4 — Surfaces (how Jack interacts)                         │
│   /dashboard, /dashboard/system, /dashboard/graph, Telegram     │
└─────────────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3 — Runtime (how skills execute)                          │
│   src/lib/dispatch.ts       — event → skill routing             │
│   src/lib/skill-runner.ts   — actual execution (hand-coded/LLM) │
│   src/lib/skill-runtime.ts  — loadSkill, suggestSkills          │
└─────────────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2 — Registry + Specs (what skills exist)                  │
│   src/lib/skill-registry.generated.ts  — 211 skills indexed     │
│   src/lib/skill-graph.generated.ts     — 426 edges between them │
│   docs/seeds/skills/{name}/SKILL.md    — the canonical specs    │
└─────────────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1 — Telemetry (what happened)                             │
│   src/lib/work-register.ts → ~/Documents/businesses/_shared/    │
│                              growth/work-register.jsonl         │
│   audit-log-generator → ~/Documents/businesses/_shared/audit/   │
└─────────────────────────────────────────────────────────────────┘
```

## The three pollers (LaunchAgents on macOS)

These run 24/7 in the background:

1. **growth-watcher.mjs** — every 5 min, scans work-register for repeated
   ad-hoc actions. When it finds 2+ across distinct contexts, drafts a
   new SKILL.md. Recursive layer detects patterns in the growth cluster
   itself; throttled by `recursive-growth-throttle`.

2. **telegram-poller.mjs** — every 5s polls Telegram for inbound, every
   2s drains the outbox. Inbox writes to `_shared/telegram/inbox/`;
   outbox reads from `_shared/telegram/outbox/`.

3. **events-poller.mjs** — every 10s polls Supabase `events` table for
   pipeline transitions. Fires post-launch follow-ups, cancellation
   detection, etc.

Each writes a heartbeat to `_shared/poller/{name}-heartbeat.log` every
60 seconds. The `/dashboard/system` page checks freshness.

## The hand-coded skills

Most of the 211 skills are specs (SKILL.md only). Six are also fully
implemented in TypeScript at `src/lib/skills/`:

- `audit-log-generator.ts` — append-only hash-chained audit log
- `uptime-monitor.ts` — polls customer URLs
- `customer-ltv-calculator.ts` — realized + projected LTV per customer
- `churn-risk-scorer.ts` — 0-100 score from work-register signals
- `refund-handler.ts` — 7/30-day decision tree + Jack-tap
- `subscription-pause-handler.ts` — pause + dossier write

When invoked via `runSkill(name, ctx)`, the runner first tries the
hand-coded path. If no impl exists, falls back to the LLM agent loop
(skill-runner.ts) which uses Anthropic SDK + tool use.

## The event flow

```
Stripe / Resend / Cal / Intake webhook
       ↓
src/app/api/webhooks/{source}/route.ts
       ↓ (signature verify, parse, run existing logic)
       ↓
dispatch({source, type, customer_slug, intentText, payload})
       ↓
SOURCE_ROUTES table lookup → skill name
       ↓
invokeSkill(name, ctx) → runSkill(name, ctx)
       ↓ (tries hand-coded, falls back to LLM)
       ↓
side effects: writes audit log, dossier files, queues Telegram, etc.
```

## The dossier shape

Every customer has a folder at `~/Documents/businesses/_shared/customers/{slug}/`:

- `00-intake.md` — intake form snapshot
- `01-brand.json` — name, vertical, status, monthly_amount, signup_date, stripe_customer_id, etc.
- `02-status.md` — pipeline state transitions
- `03-refunds.md` — refund history (appended-to)
- `03-feedback.md` — customer feedback history
- `05-launch.md` — launch-day notes
- `06-feedback.md` — post-launch feedback

When you write to a dossier, append. Never overwrite the file contents
of an existing entry — the audit trail matters more than tidiness.

## Hard rules for agents working on this codebase

1. **Never push to git remote.** Local commits OK; push requires Jack.
2. **Never modify SKILL.md specs without Jack-tap.** Specs are governance.
3. **Never call Stripe/Resend with real API keys from agent code.**
   Surface a Jack-tap card; let Jack execute.
4. **Never send customer-facing emails autonomously.** All outbound to
   customers requires explicit approval.
5. **Always audit-log consequential actions.** Use the `auditLog()`
   function from `src/lib/skills/audit-log-generator.ts`.
6. **Always log skill invocations.** Use `logSkillInvocation()` from
   `src/lib/work-register.ts`. This feeds growth-watcher.
7. **Never bypass the recursive-growth-throttle.** Meta-skill drafts
   must respect the caps.
8. **Always regenerate registry + graph after adding a SKILL.md.**
   `npm run registry:generate && npm run graph:generate` (or `npm run build`).

## Where to look first

- I added a feature → `src/app/dashboard/page.tsx` and `actions.ts`
- I need to add a skill → `docs/seeds/skills/{name}/SKILL.md` then regen
- I need to hand-code a skill → `src/lib/skills/{name}.ts` exporting `run(ctx)`
- I'm reading webhook flow → `src/app/api/webhooks/{stripe,intake,cal,inbound}/route.ts`
- The dispatcher routing table → `src/lib/dispatch.ts` `SOURCE_ROUTES` constant
- The skill-runner LLM tools → `src/lib/skill-runner.ts` `buildAgentTools()`

## Tests

```
npm test           # vitest, runs once
npm run test:watch # vitest, watch mode
```

Test files at `tests/*.test.ts`. New hand-coded skills should have
a matching test before being shipped.

## The one-command boot

```
bash ~/Documents/studio/scripts/boot-day14.sh
```

Idempotent. Installs deps, regenerates registry + graph, loads
LaunchAgents, starts dev server detached, runs E2E pipeline test,
prints health summary. Safe to re-run.

## Live surfaces (when dev server up)

- `http://localhost:3000`              — public homepage (day14.us)
- `http://localhost:3000/dashboard`    — empire command center, auto-refresh 30s
- `http://localhost:3000/dashboard/graph`  — skill graph explorer
- `http://localhost:3000/dashboard/system` — full health check across all components

## Don't

- Don't list options in long bullet lists. Jack works fast; suggest one path.
- Don't ask for permission for reversible filesystem operations. Just do it.
- Don't add complexity that requires more skills. The empire is large.
  Adding hand-coded TypeScript implementations is more valuable than adding
  more SKILL.md files.
- Don't break the audit chain. Append-only.
