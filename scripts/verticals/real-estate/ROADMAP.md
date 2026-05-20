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
- **County-feed connectors** — per-county official data feeds so intake is
  automatic, not a manual CSV drop.
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

## Reuse
`vertical-pack.json` registers this as the second Day14 vertical pack (after
lawn-care). The recursive-expansion engine can clone the pattern for the next
data-evaluation segment.
