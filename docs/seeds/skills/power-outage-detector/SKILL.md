---
name: power-outage-detector
description: Poll FPL + LCEC outage maps to detect when a Day14 customer's address is in an active outage zone. Supporting skill for storm-week-comms. Drives storm-mode banner activation + customer comms.
triggers:
  - "power outage"
  - "FPL outage"
  - "LCEC outage"
  - "lost power"
---

# power-outage-detector

> When power goes out at a customer's address, their business
> operations pause. Day14 should know within 30 minutes and flip
> their site's storm-mode banner automatically.

## Data sources

| Provider | Coverage | Polling method |
|---|---|---|
| **FPL** | Lee County, Naples, Bonita Springs, most of Fort Myers | HTML scrape of fplmaps.com/outage |
| **LCEC** | Cape Coral (most), Pine Island, parts of Lehigh | HTML scrape of lcec.net/outage-map |

Both publish public outage maps. No API; scraping required.

## Per-customer check

For each launched customer in `customers` table:

1. Parse `01-brand.json.contact.address` → ZIP + lat/lng
2. Query FPL OR LCEC depending on coverage (overlap rare)
3. Outage zones are typically circles around affected substations
4. If customer's lat/lng falls inside an outage zone → customer is "likely without power"

## Confidence levels

- **High** (>85%): customer's exact street is in the outage layer
- **Medium** (50-85%): customer's ZIP is partially affected
- **Low** (<50%): nearby outages but customer's area not specifically named

Only act on High confidence. Medium gets logged but no auto-action. Low ignored.

## Output

Per outage event:
```
# Outage detected
- Customer: {company_name} ({slug})
- Detected at: {timestamp}
- Provider: {FPL | LCEC}
- Confidence: high
- Estimated restoration: {if FPL/LCEC provides; usually "by 6PM" or "by midnight"}
- Action: storm-mode banner flipped to {true | false}
```

## Auto-actions on high-confidence outage

1. Set `customers.feature_flags.storm_mode = true` (banner shows on customer's site)
2. Append event: `kind=outage-detected, payload={provider, confidence, estimated_restoration}`
3. Draft email to customer (if their backup contact is reachable): "We see your area in {FPL/LCEC}'s outage map. Storm banner is up on your site. Text me when you're back online and I'll flip it off."
4. SMS Jack if Twilio wired: "P1: {customer} likely without power. Banner on. Outage map: {url}"

## Restoration detection

When the outage layer no longer includes the customer's address:
1. Wait 30 min (sometimes maps lag)
2. Re-verify by checking 2 consecutive polls show customer NOT in outage zone
3. Do NOT auto-flip the banner off — surface to Jack:
   "{Customer} appears restored at {time}. Flip banner off? (y/n)"

Reason: customer's business operations may take longer than power restoration. Let them tell you they're back.

## Hard rules

1. **Never auto-flip banners off.** Only on. Restoration requires human confirmation.
2. **Never claim certainty from medium-confidence outage data.** "Likely without power" not "is without power."
3. **Never poll faster than provider's update cadence** (FPL refreshes every 5 min; LCEC every 10 min). Rate limit accordingly.
4. **Never act on a single poll showing outage.** Require 2 consecutive polls (10-min apart) before flipping the banner.

## Failure modes

- **Provider's outage map is down**: skip the poll; log "provider map unavailable"
- **Customer is outside both FPL and LCEC coverage**: rare in SWFL; skip
- **Customer's address has changed**: re-resolve geocoding; surface if confidence drops

## Cadence

- **Hurricane season + named storm in cone**: every 10 min
- **Hurricane season normal**: every 30 min
- **Off-season**: skill is dormant; outages happen but don't trigger storm-mode

## Logging

`[YYYY-MM-DD HH:MM ET] power-outage-detector → polled: {providers}, outages_found: N, customers_affected_high: N, customers_affected_medium: N`

When high-confidence:
`[YYYY-MM-DD HH:MM ET] ⚠️ outage-detected high — customer: {slug}, banner_flipped: yes`

## When invoked
- Scheduled task (variable cadence based on season + storm activity)
- Inside `storm-week-comms` during active-storm cycles
- Manually when customer says "we lost power; what does my site show?"
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('power-outage-detector', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'power-outage-detector', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
