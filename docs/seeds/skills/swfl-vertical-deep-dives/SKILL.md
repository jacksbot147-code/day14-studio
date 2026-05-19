---
name: swfl-vertical-deep-dives
description: Vertical-specific operational context for SWFL service businesses. Pool guy knowledge differs from lawn knowledge differs from AC knowledge. Per-vertical fact pack the agent reads when writing copy / responding to customer questions. Supporting skill for swfl-context.
triggers:
  - "pool service knowledge"
  - "lawn knowledge"
  - "HVAC knowledge"
  - "pest control knowledge"
  - "vertical expertise"
---

# swfl-vertical-deep-dives

> swfl-context handles the broad strokes (cities, climate, demographics).
> This skill handles the per-vertical facts that prevent embarrassing
> mistakes when an agent writes copy or replies to customer questions.

## How to use this skill

When an agent is about to write or respond about a specific Day14
customer's vertical, read the relevant section below. Treat it as
fact-checking ammunition, not gospel — confirm specifics with the
customer if stakes are high.

## Pool service

### Chemistry basics
- **Free chlorine target**: 1-3 ppm (residential), 3-5 ppm (commercial)
- **pH target**: 7.2-7.6
- **Total alkalinity**: 80-120 ppm
- **Cyanuric acid (CYA, "stabilizer")**: 30-50 ppm (salt pools higher: 70-80)
- **Salt** (in salt pools): 2700-3400 ppm
- **Calcium hardness**: 200-400 ppm

### SWFL-specific
- **Water source**: most pools fill from city water (Cape Coral, Fort Myers) OR well (rural). Affects calcium hardness baseline.
- **"Lanai"**: screened pool cage. ~80% of SWFL homes with pools have one. Affects debris load + algae growth (lower).
- **"Green pool" recovery**: a pool that's gone fully algae-bloomed. Specific procedure: shock + brush + filter run 24/7. 3-5 day recovery typical.
- **Heat pump vs solar**: SWFL pools often use heat pumps for cool months. Heat pump = $40-60/mo electric in winter.

### Typical pricing (for context, never quote a customer's competitor)
- Weekly service: $120-180/mo (chemistry + brush + skim + equipment check)
- Bi-weekly: $80-120/mo
- One-time green-pool recovery: $200-400 depending on severity

### Common customer questions
- "Is my pool safe to swim in?" → if FC > 1 and pH 7.2-7.8, yes
- "Why does it smell like chlorine?" → that's chloramines (used chlorine); means needs shock, not less chlorine
- "Can I use bleach instead of pool chlorine?" → yes (same active ingredient) but cheaper per gallon usually

## Lawn / landscape

### Grass types in SWFL
- **St. Augustine** (most common): low cut height (3.5-4"), needs water more than fertilizer
- **Bahia**: rural / cheap; doesn't take traffic well
- **Zoysia**: rare, high maintenance, premium look
- **Bermuda**: not common in SWFL (too hot/humid for it)

### Schedule
- **Growing season**: April-October (mow weekly)
- **Slow season**: November-March (mow bi-weekly or 3-weeks)
- **Fertilize**: 4× / year — Feb, May, Aug, Nov (Florida rule)

### Common pests
- **Chinch bugs**: St. Augustine killer; sweep with insecticide
- **Mole crickets**: Bahia trouble; soap-flush test
- **Sod webworms**: nighttime moths; affects all grasses

### Typical pricing
- Weekly mow: $30-60 per visit residential
- Monthly recurring: $120-240
- Fertilization round: $50-100

## HVAC (heating ventilation air-conditioning)

### SWFL realities
- **Year-round AC**: most homes run AC every day; system runs 80-90% of the year
- **Heating**: typically heat pump or strip heat; rare to need furnace
- **Humidity**: 70-95% — bigger driver than temperature

### Service cadence
- **Annual maintenance**: spring (before heavy summer use)
- **Filter changes**: every 1-3 months depending on filter quality
- **Coil cleaning**: yearly (saltwater air corrodes)

### Common issues
- **Frozen coils**: usually low refrigerant or dirty filter
- **AC won't turn on**: capacitor failure (Florida heat kills them)
- **Drain line clog**: causes leak; clear with shop-vac quarterly

### Typical pricing
- Service call: $80-150
- Annual maintenance plan: $150-300/yr
- Capacitor replacement: $150-350
- Compressor replacement: $1,500-3,500

## Pest control

### Common SWFL pests
- **Ghost ants**: tiny, fast, kitchen invaders
- **Carpenter ants**: structural damage
- **Termites**: subterranean (mostly), some drywood
- **Roaches**: American (palmetto bug) common
- **Mosquitoes**: year-round; peak Jun-Sep

### Treatment cadence
- **Quarterly general pest**: most common contract
- **Monthly mosquito**: spring/summer add-on
- **Annual termite**: bait stations OR liquid barrier

### Typical pricing
- Quarterly general: $80-120/quarter
- Annual termite: $300-600/yr
- One-time bed bug treatment: $500-1500

## Membership (gym / yoga / studio)

### SWFL realities
- Members peak Nov-Apr (snowbirds)
- Many members are 55+; pace + tone matters
- "Class pass" model vs unlimited membership

### Typical pricing
- Yoga unlimited: $99-179/month
- CrossFit: $150-225/month
- Pickleball club: $50-100/month
- Premium gym: $40-80/month

## Food (restaurant / food truck)

### SWFL realities
- **Tip culture**: high (snowbird tippers; 20-25% common)
- **Reservations**: dinner-only typically; lunch is walk-in
- **Seasonal menus**: spring break + summer = lighter; winter = heartier
- **Hurricane prep**: shutters / freezer-management; weekly during season

### Average ticket prices
- Fast-casual: $12-18 per person
- Casual sit-down: $22-35 per person
- Fine-dining: $50-80+ per person

## How this skill compounds

- `copy-writer` reads this when drafting per-vertical landing pages
- `inbound-classifier` uses this to triage technical questions ("is this a chemistry question?")
- `customer-visit-note-writer` references typical readings + pricing
- `review-response` uses it for "we measured X and Y" specifics

## Hard rules

1. **Never quote a competitor's prices verbatim** — use ranges only.
2. **Never give medical / safety advice** beyond "if FC > 1 and pH normal, swimming is safe" — anything more = "ask your service provider."
3. **Never make up vertical-specific facts** that aren't here. Surface "I don't know" rather than fabricate.
4. **Always update this skill** when a customer corrects an entry. The skill compounds when wrong → right.

## Logging

`[YYYY-MM-DD HH:MM ET] swfl-vertical-deep-dives READ → vertical: {name}, context: {what for}`

When skill content is updated:
`[YYYY-MM-DD HH:MM ET] swfl-vertical-deep-dives UPDATED → vertical: {name}, change: {one-line}, evidence: {customer/source}`

## When invoked

Before writing or responding about anything vertical-specific:
- Customer's landing page copy
- Reply to a customer's customer's technical question
- Visit notes
- Review responses
- Blog posts
- DM templates
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('swfl-vertical-deep-dives', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'swfl-vertical-deep-dives', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
