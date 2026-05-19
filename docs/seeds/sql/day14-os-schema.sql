-- Day14 OS — Supabase schema
-- Paste this into the Supabase SQL Editor for the Day14 OS project.
-- Safe to re-run: every CREATE uses IF NOT EXISTS.

-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- customers — one row per customer build
-- ============================================================
create table if not exists customers (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  company_name    text not null,
  email           text not null,
  phone           text,
  sku             text not null check (sku in ('site','portal','platform')),
  vertical        text check (vertical in ('mobile-service','membership','food','custom')),
  status          text not null default 'awaiting-intake'
                  check (status in (
                    'awaiting-intake','building','preview-sent',
                    'iterating','launched','refunded','archived'
                  )),
  deposit_paid_at   timestamptz,
  intake_done_at    timestamptz,
  preview_url       text,
  production_url    text,
  github_repo       text,
  vercel_project    text,
  intake_json       jsonb,
  brand_json        jsonb,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists customers_status_idx on customers(status);
create index if not exists customers_created_idx on customers(created_at desc);

-- ============================================================
-- approvals — every approval card lives here
-- ============================================================
create table if not exists approvals (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid references customers(id) on delete cascade,
  title           text not null,
  agent_proposal  text not null,
  diff            text,
  preview_url     text,
  short_code      text unique,
  status          text not null default 'pending'
                  check (status in ('pending','approved','rejected','expired')),
  decided_at      timestamptz,
  decided_via     text check (decided_via in ('phone-tap','sms','voice','auto','web')),
  expires_at      timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists approvals_status_idx on approvals(status);
create index if not exists approvals_customer_idx on approvals(customer_id);
create index if not exists approvals_short_code_idx on approvals(short_code);

-- ============================================================
-- events — append-only log of everything that happens
-- The single source of truth for agent replay / debugging
-- ============================================================
create table if not exists events (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid references customers(id) on delete cascade,
  agent         text,
  kind          text not null,
  payload       jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists events_customer_idx on events(customer_id, created_at desc);
create index if not exists events_kind_idx on events(kind);
create index if not exists events_agent_idx on events(agent);

-- ============================================================
-- council_log — every LLM Council decision logged
-- ============================================================
create table if not exists council_log (
  id              uuid primary key default gen_random_uuid(),
  sequence_no     integer unique not null,
  short_name      text not null,
  question        text not null,
  decision_class  text,
  advisor_a       text,
  advisor_b       text,
  advisor_c       text,
  advisor_d       text,
  advisor_e       text,
  mapping_json    jsonb,
  peer_review     text,
  chairman_call   text,
  chairman_action text,
  outcome_review  text,
  outcome_at      timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists council_log_seq_idx on council_log(sequence_no);

-- ============================================================
-- skills_invoked — track which skills fire and how often
-- ============================================================
create table if not exists skills_invoked (
  id            uuid primary key default gen_random_uuid(),
  skill_name    text not null,
  agent         text,
  customer_id   uuid references customers(id) on delete set null,
  context       text,
  outcome       text,
  created_at    timestamptz not null default now()
);

create index if not exists skills_invoked_name_idx on skills_invoked(skill_name);
create index if not exists skills_invoked_created_idx on skills_invoked(created_at desc);

-- ============================================================
-- updated_at triggers
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists customers_set_updated_at on customers;
create trigger customers_set_updated_at
  before update on customers
  for each row execute function set_updated_at();

-- ============================================================
-- helpful views
-- ============================================================
create or replace view pending_approvals as
  select a.*, c.company_name, c.slug
  from approvals a
  join customers c on c.id = a.customer_id
  where a.status = 'pending'
  order by a.created_at desc;

create or replace view active_builds as
  select id, slug, company_name, sku, status, preview_url, created_at
  from customers
  where status in ('building','preview-sent','iterating')
  order by created_at desc;
