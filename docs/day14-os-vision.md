# Day14 OS — Vision + Architecture

> The operating system that runs the productized agency. Lives on an
> always-on Mac mini, runs Cowork agents 24/7, lets Jack approve work
> from his phone between coffee shop stops.
>
> Written 2026-05-15 evening, before the Mac mini arrives.

---

## The one-sentence vision

> Customer pays the deposit → 90 seconds later an agent has forked the
> template, run the brand-swap, pushed a preview URL to their inbox.
> Customer replies "make the hero bigger" → an agent drafts the diff,
> Jack approves it with one phone tap, it ships in 5 minutes. Jack
> never types a command. He approves things and runs intro calls.

---

## Architecture — 5 components

### 1. Intake → Build pipeline

**Inputs:**
- Stripe Payment Link webhook (deposit paid)
- Typeform / Notion webhook (intake form submitted)
- Resend inbound (customer reply emails)

**Storage:** Supabase table `customers` — one row per customer build:

```sql
create table customers (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,           -- e.g. "acme-pool-co"
  company_name  text not null,
  email         text not null,
  sku           text not null,                  -- "site" | "portal" | "platform"
  vertical      text,                           -- "mobile-service" | "membership" | "food" | "custom"
  status        text default 'awaiting-intake', -- awaiting-intake | building | preview-sent | iterating | launched | refunded
  deposit_paid_at  timestamptz,
  intake_done_at   timestamptz,
  preview_url      text,
  production_url   text,
  github_repo      text,
  vercel_project   text,
  intake_json      jsonb,
  brand_json       jsonb,
  created_at       timestamptz default now()
);

create table approvals (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid references customers(id),
  agent_proposal text not null,         -- markdown explaining what + why
  diff         text,                    -- the proposed patch
  preview_url  text,                    -- screenshot or staging URL
  status       text default 'pending',  -- pending | approved | rejected | expired
  decided_at   timestamptz,
  decided_via  text,                    -- "phone-tap" | "sms" | "voice" | "auto"
  created_at   timestamptz default now()
);

create table events (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid references customers(id),
  kind         text not null,           -- 'intake-received' | 'build-started' | 'commit-pushed' | 'feedback' | 'launched' | etc.
  payload      jsonb,
  created_at   timestamptz default now()
);
```

**Triggering:** Vercel API routes at `day14.us/api/webhooks/{stripe,intake,inbound}` handle the three sources, write to Supabase, then fire a scheduled-task webhook on the Mac mini ("new build ready to start").

### 2. Mac mini runtime

The always-on machine that hosts the Cowork agent fleet. Specifics in `day14-mac-mini-runbook.md`. Key contract:

- Claude desktop stays open 24/7
- Scheduled tasks fire on cron
- Wake-on-LAN + UPS power so Florida thunderstorms don't kill it
- Headless via Screen Sharing — no monitor needed after setup
- Logs every agent run to a local SQLite for replay/debugging

### 3. Daily ops loop

Five scheduled tasks per customer build, running daily:

| Time (ET) | Task | What it does |
|---|---|---|
| 09:00 | Morning briefing | Reviews overnight customer replies, drafts today's work, sends one-paragraph SMS to Jack |
| 12:00 | Mid-day pulse | Spot-checks active build for blockers, surfaces if needed |
| 17:00 | EOD customer update | Generates the daily one-paragraph status email to customer, commits day's work, updates public build-log |
| 22:00 | Nightly polish | Runs link health, screenshot diff, lighthouse audit, security scan across every live customer site. Queues findings as approvals. |
| 02:00 | Deep audit | Weekly only — dependency updates, security advisories, backup verification |

### 4. Customer feedback loop

The hard one. Customer email lands in `hello@day14.us` → Resend forwards to a webhook → agent classifies the message:

- **Scope question** → drafts a reply for Jack's approval
- **Change request** → drafts a code patch, posts an approval card with a preview URL screenshot
- **Complaint** → flags as P0, sends Jack an SMS, drafts an apology + proposed fix
- **General chatter** → drafts a friendly reply, queues for approval

Every approval has a 6-character short link Jack taps from his phone. One tap ships it. Tap → done in 5 minutes.

### 5. Sales agent (later — month 3+)

Cold outreach scraper that runs every Monday at 7 AM: SWFL Google Maps for service businesses in the active vertical, ranks them by signal (no website, has Yelp 4+ stars, name suggests recurring service), generates 40 personalized DM drafts. Jack reviews + sends through his own Instagram during morning coffee.

---

## The "amazing to work with" experience (operator UX)

The 10 design moves that separate a working system from a delightful one:

1. **Phone-first, not dashboard-first.** SMS / Apple Push / iMessage. Never opens a laptop to operate.
2. **Agents propose before they're asked.** Nightly polish surfaces 5-10 improvements per active build — operator ships them with single taps.
3. **One single-page operator console.** Bookmarked URL on phone shows everything at once: active builds, pending approvals, today's calls, MRR ticker.
4. **Voice interface for the car.** Twilio number. "Approve the Casamoré deploy. Reject the lawn-co color change. Tell Acme Pool I'll answer by 4."
5. **Every action has one-tap undo.** Approval emails carry an "Revert this" link valid for 72h.
6. **The "why?" affordance.** Every agent decision can be expanded for a one-paragraph rationale. Builds trust over time.
7. **Cross-customer learning.** When one customer asks for X, agent proactively offers X to other similar customers as an upsell.
8. **Anticipatory routines.** Agent knows the calendar — doesn't fire heavy work during intro calls, doesn't ping during sleep hours.
9. **Pre-built failure recovery.** Agent tries 3 reasonable fixes on a failed build before paging the operator. Sends a "for-the-record" note, not an alarm.
10. **The trust loop is the real product.** Every approve teaches the agent its judgment was good. By customer 20 it feels like a 5-year employee. That history is uncopyable.

---

## Build order — what to wire in what week

| Week | Build | Why |
|---|---|---|
| 1 | Mac mini runtime + Supabase schema + Stripe webhook handler | Foundation; can't do anything without these three |
| 2 | Build-agent Cowork prompt + customer dossier convention + first end-to-end test on a fake customer | Validates the autonomous build pipeline |
| 3 | Approval-by-URL UI + SMS notifications via Twilio | Shifts operator from desktop to phone |
| 4 | Daily ops loop scheduled tasks (morning briefing, EOD update, nightly polish) | Removes the daily-driver toil |
| 5 | Customer feedback inbound (Resend webhook) + classifier | The hardest, most-valuable piece |
| 6 | Voice interface, cross-customer learning, polish layer | Makes it "amazing" instead of just functional |

5 customers should be running through the pipeline by end of week 6.

---

## What NOT to build until customer #3

Pre-mature automation kills productized agencies. Designjoy didn't automate intake until customer 50.

- Sales agent (cold outreach)
- Stripe Connect provisioning
- Multi-vertical templates beyond the existing three
- Customer-facing dashboard
- Stripe live-mode auto-flipping (you want to be in the loop when $5k changes hands)

---

## Cost of running Day14 OS

| Item | Monthly |
|---|---|
| Mac mini electricity (~10W avg) | $1 |
| Vercel (Day14 site + per-customer projects) | $20/mo flat (Pro plan; covers up to 100 deploys) |
| Supabase (Day14 OS DB + per-customer DBs) | $25/mo flat (Pro tier) |
| Twilio (SMS to operator + customer notifications) | $10/mo + usage |
| Anthropic API (chatbot + agent work) | ~$50/mo at 5 customers |
| Resend transactional email | $20/mo |
| Domain registrar (day14.us + customer domains) | $1/mo per domain |
| **Total at 5 active customers** | **~$135/mo** |

Customer monthly fees ($99–$399 × 5 = $500-$2,000) cover infrastructure 4×–15× over.

---

## Risks + watchlist

- **Agent makes a confidently wrong change.** Mitigation: every change is a preview deploy first, no commit to main without approval. Auto-revert on customer complaint.
- **Mac mini dies during a hurricane.** UPS + nightly cloud backup of every customer dossier. Restore on a new Mac in <2 hours.
- **Customer doesn't reply for days.** Agent flags after 48h, sends gentle nudge after 96h, pauses build clock until they respond (deposit-back guarantee clock pauses too, per SOW).
- **Anthropic API outage.** Agents queue + retry. SMS Jack if outage > 30 min during a build window.

---

*This is the actual product. Day14's marketing site is the showroom; Day14 OS is the factory.*
