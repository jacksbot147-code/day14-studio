-- Migration 002 — enable Row Level Security on all app tables (C3 pre-tunnel blocker)
-- Drafted 2026-07-06 per DAY14/security re-verify #11. Paste into Supabase SQL editor.
-- JACK APPLIES THIS — it changes live database behavior (agents never touch Supabase infra).
--
-- Threat model: the anon key ships in any client bundle that talks to Supabase.
-- Without RLS, anon can read/write every row. The server-side pollers and API
-- routes use the service_role key, which BYPASSES RLS entirely — so locking
-- anon out costs the system nothing.
--
-- Tables referenced by the codebase (grep .from(...) 2026-07-06): events, customers.
-- Idempotent: safe to re-run.

alter table events enable row level security;
alter table customers enable row level security;

-- No CREATE POLICY statements on purpose: RLS enabled + zero policies means
-- anon/authenticated get NOTHING (deny-by-default). service_role bypasses RLS.
-- If a future feature needs client-side reads, add a narrow SELECT policy then.

-- Belt-and-braces: revoke direct grants anon may hold from default Supabase setup.
revoke all on events from anon;
revoke all on customers from anon;

-- ── Verification (run after applying) ────────────────────────────────────────
-- 1. In SQL editor:
select tablename, rowsecurity from pg_tables where schemaname = 'public';
--    → rowsecurity must be true for events + customers.
--
-- 2. Anon-key probe from any terminal (expect 0 rows / permission error, NOT data):
--    curl -s "https://<project>.supabase.co/rest/v1/events?select=*&limit=1" \
--      -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
--
-- 3. Confirm the events-poller still works afterward (it uses service_role,
--    so nothing should change — heartbeat mtime is the judge, per hard rule).
