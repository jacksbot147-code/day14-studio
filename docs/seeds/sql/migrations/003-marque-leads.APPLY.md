# Cutover step — apply migration 003 (Marque `leads` table)

_Task 2/10 output. This is the exact "apply this in Supabase" tap for the cutover
runbook (task 9 assembles the full ordered tap list)._

## Who runs this

**Jack only.** Agents never touch the live Supabase DB or hold service_role/anon
keys. This step changes live database structure, so it is a manual Jack tap.

## When in the sequence

This is **cutover tap #1** — it must land **before** the Day14 ingest endpoint
(task 4) is deployed and before the Marque side is pointed at it (task 3), because
the endpoint upserts into `leads`. Order in the full runbook:

1. **➡ Apply `003-marque-leads.sql` in Supabase (this step).**
2. Set `MARQUE_INGEST_SECRET` (a.k.a. `DAY14_INGEST_SECRET`) in the Day14 Vercel
   project; deploy the Day14 branch (task 4).
3. Set `DAY14_INGEST_URL` + `DAY14_INGEST_SECRET` in the Marque Vercel project;
   deploy Marque (task 3).
4. Run the backfill dry-run, then apply (task 7).
5. Confirm Marque leads land in `/admin/inbox` and Marque shows in `/admin/tenants`.

## Exact steps

1. Open the **Day14 OS** Supabase project → **SQL Editor** → **New query**.
   (Same project the base `day14-os-schema.sql` and migrations 001/002 were applied to.)
2. Paste the full contents of
   `docs/seeds/sql/migrations/003-marque-leads.sql` and click **Run**.
   It is idempotent — safe if partially applied or re-run.
3. Run the verification queries embedded at the bottom of the file:
   - `leads` table exists with columns `id, brand, email, kind, tier, source,
     external_id, payload, created_at, updated_at`.
   - `pg_tables.rowsecurity = true` for `leads` (RLS on).
   - The double-insert probe reports **1** row (idempotent upsert holds); delete
     the probe row afterward.
   - Anon-key curl returns **no data** (permission error / empty), confirming RLS
     locks anon out.
4. Confirm the events-poller heartbeat is still fresh afterward (it uses
   service_role and bypasses RLS, so nothing should change) — heartbeat mtime is
   the judge, per the hard rule.

## Rollback

If needed, apply `docs/seeds/sql/migrations/003-marque-leads.down.sql` in the same
SQL editor. ⚠️ It `drop table leads`, deleting **all** captured leads across every
brand — only use it to fully reverse 003. To merely pause Marque ingest without
data loss, unset `DAY14_INGEST_URL` on the Marque side instead.

## events.kind decision (task-1 open item resolved)

No constraint/enum change to `events`. The ingest endpoint writes
`events.kind ∈ {'marque-intake','marque-ad-scored'}` with `customer_id = null`.
`events.kind` is free text in `day14-os-schema.sql` and `customer_id` is a nullable
FK, so both values are already accepted — adding a CHECK would only create future
friction as new brands emit new kinds. Documented inline in the migration.
