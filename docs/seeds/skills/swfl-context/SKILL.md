---
name: swfl-context
description: Southwest Florida operating context — geography, climate, customer behavior, vertical density, language demographics, business norms. Use whenever an agent writes copy, picks examples, targets outreach, schedules work, or makes a "what would resonate locally" call. The local-knowledge skill that prevents generic-sounding output.
triggers:
  - "SWFL"
  - "Southwest Florida"
  - "Cape Coral"
  - "Fort Myers"
  - "Naples"
  - "Bonita"
  - "Estero"
  - "local"
  - "near me"
  - "hurricane"
  - "season"
---

# swfl-context

> The local-knowledge skill. Day14 is built in Southwest Florida and
> the first 20 customers will be in or near it. Everything from copy
> examples to ad targeting to scheduling needs to know what SWFL is.

## Geography

**Cities/areas Day14 cares about (in rough order of density of target
service businesses):**

1. Cape Coral — biggest, fastest-growing, lots of pools, lots of
   mobile-service trucks. Most likely customer #1 lives here.
2. Fort Myers — older money, denser commercial corridors, more
   established service businesses with worse websites.
3. Bonita Springs — between Fort Myers and Naples, mid-range.
4. Estero — newer master-planned communities, lots of recurring
   service (pool, lawn, pest).
5. Naples — wealthier, higher-end service businesses, can support
   higher pricing tiers.
6. Marco Island — small, seasonal, vacation rental ecosystem.
7. Pine Island / Sanibel / Captiva — small but pool-dense.
8. Lehigh Acres — sprawling, working-class, lots of independent
   service businesses without websites.
9. Punta Gorda (technically SW Florida edge) — same patterns as
   Cape Coral.

**Distance reality:** Cape Coral to Naples is ~45 minutes. Most service
businesses operate within one or two of these areas, not all of them.
A "SWFL service business" is realistically a Cape Coral business, a
Naples business, or somewhere in between — not all of them at once.

## Climate / season

- **Hurricane season:** June 1 to November 30. Peak risk: August–October.
  Anything that depends on power or internet uptime is at risk during
  these months. Customers care about this. Mention "hurricane-tested"
  for hosting/uptime only when warranted (Vercel + Supabase = fine).
- **High season:** January–April. Snowbirds in. Service business
  revenue spikes. Booking demand spikes. Customers will care MOST
  about their website working flawlessly during these months. Don't
  schedule major launches in February.
- **Slow season:** June–August. Locals only. Many service businesses
  reduce hours or staff. Good time to build/redesign (which is when
  Day14 should pitch).
- **Year-round:** Pool service, pest control, AC repair never slow
  down. Lawn care peaks April–October.

## Vertical density (Day14's three SKUs in SWFL context)

### Mobile-service vertical
Most common SWFL businesses in this vertical:
- Pool service (highest density — every neighborhood has 5+)
- Lawn care / landscaping
- Pest control
- Pressure washing
- Mobile auto detailing
- AC / HVAC repair
- Junk hauling
- Tree service
- Pool screen repair (very SWFL-specific — lanai cages)
- Mobile mechanic
- Boat detailing (Cape Coral has the most canals in the world)

### Membership vertical
- Yoga / pilates studios
- CrossFit / functional fitness gyms
- Tennis / pickleball clubs
- Country clubs (Naples has the most golf courses per capita in US)
- Spas

### Food vertical
- Independent restaurants (Cape Coral + Fort Myers + Bonita have
  hundreds, very few have working online ordering)
- Food trucks (active food truck scene)
- Catering companies (busy with seasonal events)
- Ghost kitchens (limited but growing)

## Customer behavior

- **Mobile-first internet usage.** Most SWFL service business owners
  manage their business from their phone, not a desktop. Sites must
  work in one thumb on a 5" screen first, desktop second.
- **Google Maps reigns.** SWFL customers find service businesses by
  searching "pool service near me" or "AC repair Cape Coral." Google
  Business Profile + reviews matter more than the website's design.
  Day14 sites should be wired to push the customer to call/text
  directly from the Google result.
- **Phone calls still dominate.** Older SWFL homeowners (huge segment)
  call rather than fill out a form. "Call us" button > "Get a quote"
  form for this audience. Newer residents (Cape Coral expats) prefer
  text/online booking. Build both, surface phone above form.
- **Spanish-speaking customer share is significant** in Fort Myers,
  Lehigh Acres, Bonita Springs (especially among lawn / construction /
  cleaning customers). Customer-facing pages should have a Spanish
  toggle when relevant to the vertical. Internal admin can stay English.

## Business norms

- **Word-of-mouth dominates.** A Day14 customer who's happy will tell
  their neighbor. The single biggest growth lever is the existing
  customer base, not new ads. Build referral mechanisms in.
- **Owner is often the operator.** Most SWFL service businesses are
  owner-operated, often with one helper. The owner is in the truck
  some days. They check their phone between jobs.
- **Most service businesses don't have a real website.** They have a
  Facebook page, a Google Business Profile, and maybe a Wix site from
  2018 that the owner's cousin built. The bar is low. A working,
  fast, branded Day14 site is a category leap.
- **Owners are skeptical of "agencies."** They've been burned. Use
  the day14-voice rule: operator, not agency.

## When the agent should pull in this skill

- Writing copy that says "near you" or "in your area"
- Picking example city names for sample text
- Scheduling launches (avoid Feb / hurricane peak)
- Vertical-specific landing pages
- Sales DM personalization
- Local language/phrasing ("lanai," "screened cage," "season")
- Reasoning about customer hours / availability

## Things NOT to assume

- That SWFL is one homogenous market. Cape Coral and Naples are very
  different. Customer profile, price tolerance, design preference,
  language preference — all differ.
- That every customer wants a "modern" minimal design. Some verticals
  (older membership clubs, Naples country clubs) want their site to
  look slightly traditional. Match the customer.
- That the agent knows the latest local events / news. Always confirm
  current SWFL conditions (hurricane warnings, road closures, season
  status) with a quick fact-check before sending anything time-sensitive.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('swfl-context', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'swfl-context', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
