-- Migration 001 — add processed_at + processed_by to events table
-- For events-poller dispatch tracking. Paste into Supabase SQL editor.
-- Idempotent (uses IF NOT EXISTS).

alter table events add column if not exists processed_at timestamptz;
alter table events add column if not exists processed_by text;

create index if not exists events_processed_idx
  on events (processed_at)
  where processed_at is null;

-- The partial index speeds up the poller's "find unprocessed" query dramatically.

-- Sanity check
select count(*) as unprocessed_events
  from events
  where processed_at is null;
