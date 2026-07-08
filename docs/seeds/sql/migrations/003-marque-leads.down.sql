-- Migration 003 — ROLLBACK (down) for the shared `leads` table.
-- Reverses 003-marque-leads.sql. Paste into the Day14 OS Supabase SQL editor.
-- JACK APPLIES THIS — it changes live database structure.
-- Idempotent: uses IF EXISTS, safe to re-run.
--
-- ⚠️ DESTRUCTIVE: `drop table leads` deletes ALL captured leads (every brand,
--    not just Marque). Only run this to fully reverse migration 003. If you just
--    want to stop Marque ingest, unset DAY14_INGEST_URL on the Marque side instead
--    — that leaves the table and its data intact.

-- Drop the trigger first (harmless if the table is already gone).
drop trigger if exists leads_set_updated_at on leads;

-- Indexes drop automatically with the table, but drop explicitly in case the
-- table was created by hand without them.
drop index if exists leads_brand_idx;
drop index if exists leads_kind_idx;
drop index if exists leads_email_idx;

-- Drop the table (RLS + the unique constraint go with it).
drop table if exists leads;

-- NOTE: set_updated_at() is intentionally NOT dropped — it is shared with the
-- customers table (day14-os-schema.sql). Dropping it would break customers'
-- updated_at trigger.
--
-- NOTE: no events rows are removed here. The Marque ingest also writes
-- events(kind='marque-intake'|'marque-ad-scored'). To purge those too (optional):
--   delete from events where kind in ('marque-intake','marque-ad-scored');

-- ── Verification (run after applying) ────────────────────────────────────────
-- Expect 0 rows (table gone):
select count(*) as leads_table_present
  from information_schema.tables
  where table_schema = 'public' and table_name = 'leads';
