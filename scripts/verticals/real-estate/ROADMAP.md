# Real-Estate Segment — Build Roadmap

A new Day14 empire segment: source properties from public county records,
evaluate them as deals, and monitor the pipeline from one dashboard. Owned
and driven by the Real-Estate Deal Scout agent.

## Phase 1 — Source + score  *(agents shipped)*
- **Intake agent** — ingests county property-appraiser CSV exports (public
  records), normalizes and de-dupes them into the property store.
- **Evaluation agent** — scores every property for fix & flip, rental, and
  wholesale, plus a blended deal score (0-100) and an A/B/C tier.

## Phase 2 — Enrich + monitor  *(enrichment agent shipped; dashboard next)*
- **Enrichment agent** — adds AVM value + rent estimate from a licensed
  property API (RentCast). Degrades cleanly with no key.
- **Dashboard** — `day14.us/admin/realty`: a ranked deal board, filterable by
  tier and best play, with per-property evaluation detail. *(scheduled build)*

## Phase 3 — Scale the funnel
- **County watch list** *(shipped)* — Telegram the bot a county or a metro
  ("realty Lee County, FL" / "realty Tampa Bay area"); each becomes a standing
  target the scout sources, scores, and re-scans every run. Metros auto-expand
  to their counties.
- **County-data-fetcher** *(shipped)* — auto-sources any **Florida** county
  from the FDOR statewide cadastral ArcGIS API (all 67 counties, official
  public records — no scraping, no manual download). Add a FL county and its
  property roll loads itself. Non-FL states use the dashboard CSV upload until
  a connector for that state is added.
- **More state connectors** — extend the fetcher with per-state official data
  APIs (e.g. other open-data / ArcGIS parcel services) so coverage grows
  beyond Florida.
- **Owner-outreach drafting** — for A-tier wholesale leads, draft compliant
  outreach for Jack to review and send.

## Data sources — the honest, durable path
- **County records**: official property-appraiser data exports. Public
  records, properly accessed — no scraping of county web pages.
- **Valuation**: a licensed API (RentCast / ATTOM / Estated). Stable, cheap,
  ToS-clean. **Never Zillow/Redfin scraping** — prohibited by their terms and
  brittle by design.

## Why this works
Every evaluation formula is deterministic — flip (70% rule, ARV, repairs),
rental (cap rate, rent-to-value), wholesale (equity, distress signals). It
runs with zero API quota. The licensed API only sharpens the value estimate;
county data alone already scores tax-delinquent, absentee, and high-equity
deals — exactly the motivated-seller pipeline.

## Agent roster — the full realty cluster

Shipped: realty-scout (coordinator), county-data-fetcher (resumable paging —
sources large counties a slice per run), intake, county-feed, enrichment,
evaluation, distress-monitor, comp-analyst, deal-alerter, market-expander
(auto-grows the county watch list), freshness-monitor (tracks pipeline growth).

Planned:

Sourcing & lead-gen
- list-builder — assembles targeted property lists by criteria from the store.

Sharper evaluation
- rehab-estimator — line-item repair scope + cost.
- market-watch — neighborhood trend tracking (price, DOM, inventory).
- financing-modeler — per-deal funding scenarios -> real cash-on-cash.

Acting on deals
- offer-drafter — MAO-based offer terms + draft offer for review.
- outreach-drafter — compliant seller-outreach drafts (review-before-send;
  fair-housing + TCPA aware; owner contact from a licensed skip-trace service,
  never scraped).
- disposition-agent — buyer-list matching for fast flip/wholesale exits.

Portfolio & ops
- portfolio-agent — rent roll + performance for buy-and-hold.
- compliance-agent — keeps sourcing + outreach within site terms and law.
- deal-alerter — Telegram push when an A-tier deal scores.

## Reuse
`vertical-pack.json` registers this as the second Day14 vertical pack (after
lawn-care). The recursive-expansion engine can clone the pattern for the next
data-evaluation segment.
