# Day14 studio — STATUS ledger

_Lightweight status notes for agent sessions. The compiled agent knowledge base lives at
`docs/agent-context/AGENT-CONTEXT.md`; prime directives in `CLAUDE.md`. This file tracks
in-flight, cross-repo work state so a fresh session knows what is prepped-but-not-live._

## MARQUE -> DAY14 DATA MIGRATION — PREPPED, AWAITING CUTOVER TAPS (2026-07-08)

State: **prepped on this branch (`feat/cinematic-rebuild-2026-06`), NOT live.** The Marque
product (repo `~/Claude/Projects/AdForge`, Vercel `ad-forge`) mirrors its captured leads /
checkout-intents / intakes into this OS when env-configured. All Day14-side pieces are built and
**locally committed** here; nothing deployed. Cross-repo ledger + design + Jack-tap runbook live in
the AdForge repo: `MIGRATE-TO-DAY14-2026-07-07.md`, `MIGRATION-DESIGN.md`, `MIGRATE-CUTOVER-RUNBOOK.md`.

Built here (all env-gated; deploy is a Jack tap):
- **Supabase migration** `docs/seeds/sql/migrations/003-marque-leads.{sql,down.sql,APPLY.md}` — a
  shared brand-tagged `leads` table (`unique(brand, external_id)` for idempotent upsert; RLS
  deny-by-default, service_role bypasses). Idempotent. NOT applied to any live DB (Jack tap #1).
- **Ingest endpoint** `src/app/api/webhooks/marque/route.ts` on `createWebhookHandler` — verifies
  HMAC `x-day14-signature` under `DAY14_INGEST_SECRET`; on valid payloads upserts `leads` (+ inbox
  `subscribe`) for lead kinds, writes `events` (+ inbox `contact`) for `marque-intake`, `events`-only
  for `marque-ad-scored`. Supabase writes gated on `NEXT_PUBLIC_SUPABASE_URL` +
  `SUPABASE_SERVICE_ROLE_KEY` (graceful no-op when unset). Fail-safe 401 when secret/sig missing.
- **Admin surfacing** `src/lib/admin-state.ts` `loadEmpireState()` merges brand-sites brands with no
  synced tenant row into the tenant list as honest zero-state entries, so Marque renders in `/admin`
  tenant views without a `tenants.json` row (which needs `_shared`, unmounted overnight).

Verification (task 8): `npx tsc --noEmit` exit 0; `next build` 100 pages (throwaway /tmp copy);
`npm run check:prices` clean; mock end-to-end forward -> ingest -> dedupe -> fallback all PASS.
Migration head commit here: **a6c4a78** (task 6), on `8e5c879` (task 4), on `7b1d8c8` (task 2).

Cutover taps (Jack): apply migration 003 in Supabase -> set `DAY14_INGEST_SECRET` (match the value
set in the ad-forge project) here in `day14-studio` Vercel -> `git push` + promote-to-production ->
Marque side is then pointed at `https://www.day14.us/api/webhooks/marque`. Full ordered list +
rollback in AdForge `MIGRATE-CUTOVER-RUNBOOK.md`. No push/deploy done by any agent.

Deferred (non-blocking, needs `_shared` mounted): apply the Marque `tenants.json` entry via
`upsertTenant` + run `dossier-folder-initializer` (exact entry in AdForge `MIGRATION-DESIGN.md` §8).
