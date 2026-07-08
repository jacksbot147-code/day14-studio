-- Migration 003 — shared brand-tagged `leads` table (Marque lead migration, task 2/10)
-- Drafted 2026-07-07 (overnight MIGRATE-TO-DAY14 prep). Paste into the Day14 OS
-- Supabase SQL editor. JACK APPLIES THIS — it changes live database structure
-- (agents never touch Supabase infra; no service_role/anon keys from agent code).
-- Idempotent: every statement uses IF NOT EXISTS / OR REPLACE, safe to re-run.
--
-- WHY A SHARED TABLE, NOT `marque_leads`:
--   Day14 is a multi-tenant factory. The roster already holds marque, hot-flash-co,
--   kennum-lawn-care, etc., and every brand site can capture leads. One shared
--   `leads` table with a `brand` (tenant slug) column is the SQL analog of the
--   existing per-tenant `inbox/` + collectAllApprovals pattern: brand/source/kind
--   tags give per-brand filtering AND free cross-brand analytics, while the heavy,
--   product-specific data (Marque's jobs / scored_ads) stays in the Marque Neon DB.
--   Full rationale: AdForge/MIGRATION-DESIGN.md §4.
--
-- SCOPE: the OS receives the lightweight, cross-cutting lead/intake SIGNAL only.
--   Marque's generation pipeline (jobs, scored_ads, video URLs, per-frame scores)
--   is NOT migrated and has no row here.

-- ============================================================
-- Extensions (gen_random_uuid) — already present from base schema; safe to re-run
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- leads — one row per captured lead across ALL Day14 brands
-- Populated by the Marque ingest endpoint (task 4) + backfill (task 7).
-- ============================================================
create table if not exists leads (
  id            uuid primary key default gen_random_uuid(),
  brand         text not null,                      -- tenant slug, e.g. 'marque'
  email         text not null,
  kind          text not null,                      -- waitlist | popup-fiber | popup-sardine | checkout_intent | ...
  tier          text,                               -- pricing tier id (checkout_intent only): starter|growth|agency
  source        text,                               -- provenance, e.g. 'marque-app', 'day14-os-landing'
  external_id   text,                               -- 'marque:{kind}:{email}' — idempotent upsert key
  payload       jsonb not null default '{}'::jsonb, -- room for future per-brand fields
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (brand, external_id)
);

-- kind is intentionally free text (like events.kind) so new brands/lead types
-- need no schema change. brand is the tenant slug from tenants.json.

create index if not exists leads_brand_idx  on leads(brand, created_at desc);
create index if not exists leads_kind_idx   on leads(kind);
create index if not exists leads_email_idx  on leads(email);

-- ============================================================
-- updated_at trigger — reuse set_updated_at() defined in day14-os-schema.sql.
-- Defined OR REPLACE here too so this migration applies standalone if the base
-- schema function was ever dropped.
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists leads_set_updated_at on leads;
create trigger leads_set_updated_at
  before update on leads
  for each row execute function set_updated_at();

-- ============================================================
-- Row Level Security — same deny-by-default posture as migration 002.
-- RLS enabled + zero policies ⇒ anon/authenticated get NOTHING. The API routes
-- and pollers use service_role, which BYPASSES RLS, so this costs the app nothing.
-- The anon key ships in client bundles; without RLS anon could read every lead
-- email. If a future feature needs client-side reads, add a narrow SELECT policy.
-- ============================================================
alter table leads enable row level security;

-- Belt-and-braces: revoke any default grants anon/authenticated may hold.
revoke all on leads from anon;
revoke all on leads from authenticated;

-- ============================================================
-- events.kind for Marque signals — NO SCHEMA CHANGE REQUIRED.
--   The ingest endpoint (task 4) writes events rows with kind in
--   {'marque-intake','marque-ad-scored'} and a null customer_id. events.kind is
--   free text (day14-os-schema.sql has no CHECK on it) and customer_id is a
--   nullable FK, so both are already accepted. Documented here so a future reader
--   knows these kinds are intentional, not typos.
-- ============================================================

-- ── Verification (run after applying) ────────────────────────────────────────
-- 1. Table + columns exist:
select column_name, data_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'leads'
  order by ordinal_position;
--
-- 2. RLS is on (rowsecurity must be true):
select tablename, rowsecurity from pg_tables
  where schemaname = 'public' and tablename = 'leads';
--
-- 3. Idempotent upsert contract holds (should report 1 row, not 2):
--    insert into leads (brand, email, kind, external_id)
--      values ('marque','probe@example.com','waitlist','marque:waitlist:probe@example.com')
--      on conflict (brand, external_id) do nothing;
--    insert into leads (brand, email, kind, external_id)
--      values ('marque','probe@example.com','waitlist','marque:waitlist:probe@example.com')
--      on conflict (brand, external_id) do nothing;
--    select count(*) from leads where email = 'probe@example.com';  -- expect 1
--    delete from leads where email = 'probe@example.com';           -- clean up the probe
--
-- 4. Anon-key probe (expect 0 rows / permission error, NOT data):
--    curl -s "https://<project>.supabase.co/rest/v1/leads?select=*&limit=1" \
--      -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
