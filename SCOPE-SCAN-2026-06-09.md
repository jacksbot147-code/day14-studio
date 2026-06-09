# Day14 OS — Full Scope Scan & Improvement Plan
2026-06-09

## What exists today

**Stack:** Next.js 14 (app router), React 18, Tailwind 3, framer-motion, Supabase, Stripe, Resend, Anthropic SDK, vitest. ~286 TS/TSX files, 129 app routes.

**Backend (Layer 1–3)**
- `src/lib/` core: dispatch.ts (216 LOC), skill-runner.ts (475), skill-runtime.ts, work-register.ts (106)
- 6 hand-coded skills in `src/lib/skills/` + 211 SKILL.md specs
- Generated: skill-registry (3,652 LOC) + skill-graph (3,755 LOC) = **7,400 LOC imported at module level**
- 20 API routes incl. 4 webhook handlers (stripe, intake, cal, inbound)
- 3 pollers (LaunchAgents): growth-watcher (5m), telegram (5s/2s), events (10s)
- Storage: JSONL work-register, file-based dossiers, Supabase events

**Frontend (Layer 4)**
- Public site: homepage (852 LOC), builds, 5 case studies, tools, calculator, compare, faq, press, intake
- 4 brand sites under `/brands/*` (angela-music, hot-flash-co, kennum-lawn-care, life-loophole)
- Admin hub: ~15 pages (inbox, realty, finance, health, ship, mission-control…)
- Dashboard: command center (30s auto-refresh), graph explorer, system health
- 17 client components

**Tests:** 5 suites — only the hand-coded skills. Zero coverage on dispatch, webhooks, pollers, work-register.

---

## Ranked improvements

### Tier 1 — high impact, low effort (~1 day)

1. **O(n) scans on hot paths.** Customer email lookup walks every dossier on each webhook; pollers re-read the full work-register JSONL each cycle. Fix: in-memory index + tail-read from last byte offset (store offset in heartbeat file).
2. **Lazy-load the generated registry/graph.** 7,400 LOC parsed on every request via module-level imports in `dispatch.ts`, `skill-runtime.ts`, and both dashboard pages. Fix: dynamic `import()` + cache, and serve the graph page its data via a route handler instead of bundling it.
3. **Extract `BrandLayout` + shared brand components.** 3 of 4 brand sites duplicate ~150 LOC of nav/footer each plus ~500 LOC of repeated inline styles. One shared component, themed via the existing `theme.ts` files.
4. **De-client the big pages.** `life-loophole/page.tsx` (774 LOC) is `"use client"` but server-renderable. Audit the other 16 client files — framer-motion should be isolated into small leaf components, not page roots.

### Tier 2 — structural (~2–3 days)

5. **Unify webhook plumbing.** Signature verification + parse + dispatch is repeated per route. Extract a `createWebhookHandler(source, verifier)` factory; add idempotency keys (Stripe retries will double-fire skills today).
6. **Error handling.** Several lib paths swallow errors silently. Standardize: log to work-register + audit-log on failure, surface in /dashboard/system.
7. **Throttle/backoff the Supabase events poller** — 10s fixed polling with no backoff; switch to Supabase Realtime subscription (already in `@supabase/supabase-js`) and kill the poller entirely.
8. **Dedupe Printify fetches** (homepage + product page hit the same endpoint independently) — wrap in `unstable_cache`/ISR.
9. **Tests for the spine.** dispatch routing, webhook signature paths, work-register append/read. These are the highest-blast-radius untested files.

### Tier 3 — polish

10. ISR on brand blog pages; split the 852-LOC homepage into sections; consolidate the per-brand theme.ts shape into one typed interface; extract realty into its own module.

---

## Tooling / package suggestions (the "plugins")

- **Next 15 + Turbopack dev** — meaningful dev-server and build speedup; React 18 stays. Moderate-risk upgrade, do after Tier 1.
- **zod** — validate webhook payloads + intake forms at the boundary (currently hand-parsed).
- **Supabase Realtime** (already installed) — replaces events-poller.
- **next/dynamic** for framer-motion-heavy sections — cuts public-site bundle.
- **vitest coverage** (`@vitest/coverage-v8`) — make the test gap visible in CI.
- Skip: heavy state libs, ORMs, monorepo tooling — adds complexity the empire doesn't need (per CLAUDE.md rule: fewer moving parts, more hand-coded impls).

## Suggested order
Tier 1 items 1–4 first (one day, no behavior change, biggest perf win), then webhook factory + tests, then the Next 15 upgrade.
