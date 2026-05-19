---
name: evacuation-zone-mapper
description: Given a customer's address, return the SWFL evacuation zone (A/B/C/D/E) and whether they're under mandatory or voluntary evac during an active storm. Supporting skill for storm-week-comms.
triggers:
  - "evacuation zone"
  - "mandatory evac"
  - "what zone"
  - "shelter in place"
---

# evacuation-zone-mapper

> Zone A = mandatory evac on Cat 1+. Zone D = safe through Cat 4.
> Knowing a customer's zone determines whether storm comms are
> "shutter the windows" or "you need to leave."

## SWFL evacuation zones (Lee + Collier + Charlotte counties)

| Zone | What it means | Triggers mandatory evac at |
|---|---|---|
| **A** | Barrier islands, low-lying coastal | Tropical storm warning OR Cat 1+ |
| **B** | Coastal mainland | Cat 2+ |
| **C** | Inland mainland (low elevation) | Cat 3+ |
| **D** | Inland (mid elevation) | Cat 4+ |
| **E** | High ground / inland | Cat 5 only (rare in SWFL) |

Zone A includes:
- Sanibel Island, Captiva, North Captiva
- Fort Myers Beach
- Marco Island
- Pine Island (most of it)
- Cape Coral's barrier areas

Zone B includes:
- Cape Coral (most of the city)
- Bonita Beach
- Naples coastal
- Punta Gorda waterfront

Zone C includes:
- Fort Myers (central)
- Bonita Springs (central)
- Naples (central)
- Lehigh Acres (low areas)

Zone D includes:
- Lehigh Acres (high)
- Estero (most)
- North Naples (inland)

## Lookup mechanism

Given `01-brand.json.contact.address`:

1. Parse street + city + zip
2. Query Lee County / Collier County / Charlotte County evac-zone GIS
3. Fallback: cross-reference with the zone-by-zip table (cached)

For speed (and offline access), maintain a static lookup:
`~/Documents/businesses/_shared/swfl/evac-zones.json`:

```json
{
  "by_zip": {
    "33904": {"primary_zone": "B", "county": "Lee", "notes": "Cape Coral central"},
    "33914": {"primary_zone": "A", "county": "Lee", "notes": "Cape Coral barrier"},
    "33908": {"primary_zone": "A", "county": "Lee", "notes": "Fort Myers Beach"},
    "33957": {"primary_zone": "A", "county": "Lee", "notes": "Sanibel"},
    "33990": {"primary_zone": "B", "county": "Lee", "notes": "Cape Coral SE"},
    "33991": {"primary_zone": "B", "county": "Lee", "notes": "Cape Coral SW"},
    "33993": {"primary_zone": "B", "county": "Lee", "notes": "Cape Coral N"},
    ...
  }
}
```

ZIP is approximate — a single ZIP can span multiple zones, especially in Cape Coral. For high-stakes decisions, defer to the live county GIS.

## Output

For a given customer:
```
Customer: {company_name} ({slug})
Address: {street, city, zip}
County: {Lee | Collier | Charlotte}
Evac zone: {A | B | C | D | E}
Notes: {anything zone-specific — e.g. "barrier island; mandatory at TS"}

Current threat (if storm active):
- Storm: {name}, Category {N}
- Their zone's status: {safe | voluntary | mandatory}
- Action: {what to do given their zone + the storm}
```

## How storm-week-comms uses this

Different draft templates per zone:

### Zone A customer + hurricane warning
> "{First_name}, {Storm name} is forecast Cat {N}. Your address is in evac Zone A — mandatory evacuation in effect. Leave today. Your site at {URL} will stay up; I've added a 'closed for storm' banner. Call me when you're safe."

### Zone C customer + hurricane warning
> "{First_name}, {Storm name} is Cat {N}. Your zone (C) isn't under mandatory evac yet but watch the next NHC update. Shutter early, fuel up. Site banner is ready when you want me to flip it."

## Hard rules

1. **Never assume zone from city alone.** Cape Coral has Zone A AND Zone B addresses. Use ZIP minimum, street address ideally.
2. **Never give safety advice beyond zone-level facts.** "Mandatory evac for your zone" is fact. "You should leave at exactly 4 PM" is advice — that's the customer's call.
3. **Always cite the source** (Lee County GIS, Collier County GIS) in the output. Customers (or their insurance) may need to verify.
4. **Always defer to official orders.** If county hasn't issued an order yet for the customer's zone, frame as "your zone typically gets called at Cat {N}" not "you must evacuate."

## Failure modes

- **Customer address can't be parsed**: fallback to ZIP-only lookup; note lower confidence
- **Multiple zones for one ZIP**: surface both, default to higher-risk (Zone A trumps Zone B)
- **Customer is outside Lee/Collier/Charlotte**: defer to FL state evac map; or flag as "out of standard SWFL coverage"

## When invoked
- Inside `storm-week-comms` for every active-storm customer comm draft
- Inside `customer-readiness-check` once at intake (logs zone for future use)
- Manually when Jack wants a quick zone lookup
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('evacuation-zone-mapper', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'evacuation-zone-mapper', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
