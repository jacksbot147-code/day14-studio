# Lawn-Care Platform — Build Roadmap (beyond Jobber)

Owned and driven by the Lawn-Care GM agent. Jobber is a generic field-service
tool with manual forms. This platform is AI-native, SWFL-specialized, and runs
itself. The agent cluster builds and operates each phase.

## Phase 1 — The operating spine  *(agents shipped)*
- **Pipeline agent** — lead → quote → job → invoice, fully self-advancing.
  Quotes draft + price themselves the moment a lead lands (lot size ×
  difficulty). No manual quote form.
- **Scheduling agent** — density-scored route board. Routes packed by day +
  zone; each day scored on billable-vs-drive time. Rain-hit jobs auto-roll.

## Phase 2 — The intelligence layer  *(agents shipped)*
- **CRM agent** — every customer carries a live churn-risk score and a
  next-best-action. Upsell openings detected from job history (overgrown
  beds → mulch quote, brown patches → irrigation check, season → projects).
- **Portal agent** — per-customer portal feeds: upcoming visits, photo-backed
  history, invoices, one-tap extras. Proactive, not a passive invoice list.

## Phase 3 — Surfaces + money  *(next to build)*
- **Ops console** — `day14.us/admin/tenants/kennum-lawn-care` extended into a
  full ops console reading the live stores: pipeline kanban, route week-view,
  customer list sorted by churn risk + lifetime value.
- **Customer portal UI** — `day14.us/brands/<slug>/portal` with magic-link
  login over the portal-agent feeds.
- **Payments** — recurring monthly billing + one-tap invoice pay via Stripe.

## Phase 4 — The autonomous edge
- Weather-reactive rescheduling wired to a live SWFL forecast.
- Proactive customer updates: after each visit, an auto-drafted "here's what we
  did / noticed" message with photos.
- Dynamic pricing tuned on win/loss data.
- Crew time + efficiency per property; route profitability ranking.

## Why this beats Jobber
Jobber stores your business. This platform *runs* it — quoting, scheduling,
follow-up, and churn-saves happen without anyone opening an app. Every rule is
SWFL-aware (seasonal cadence, fertilizer-ordinance compliance, storm surges)
and every loop is rules-based, so it works with zero API cost.

## Reuse
The whole pack is tenant-agnostic. The `vertical-pack.json` manifest lets the
recursive-expansion engine clone this cluster for the next service business —
point the GM at a new slug and the spine is live.
