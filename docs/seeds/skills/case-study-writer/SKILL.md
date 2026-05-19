---
name: case-study-writer
description: Generate a case study page for a launched Day14 customer. Pulls structured facts (build duration, features shipped, customer quote) into a clean narrative. Production-proven format in Day14 marketing site's /case-studies/ pages.
triggers:
  - "case study"
  - "customer story"
  - "launch writeup"
  - "/case-studies"
---

# case-study-writer

> Each launched customer earns a case study on day14.us. Three so far:
> Splash Jacks, Casamoré, Buildbridge. This skill builds the next ones
> from the dossier + 02-build-log.

## Inputs
- `customer_slug` — must be `status = launched`
- `customer_quote` — short testimonial (optional but strongly recommended)
- `metrics` — measurable outcomes (e.g., "from no booking system to 12 weekly bookings in 60 days")

## Structure

A page at `~/Documents/studio/src/app/case-studies/{slug}/page.tsx` following the existing pattern from splash-jacks-pools, casamore, buildbridge case studies.

Sections:

### Hero
- Customer name + tagline ("Splash Jacks Pools — pool service in Naples")
- Build metadata: SKU, build duration, launch date
- Hero image (customer's actual site screenshot)

### The problem
- What was broken before Day14
- Specific pain points from intake
- 2-3 sentences max

### What we built
- The SKU's deliverables, summarized
- 3-5 bullet specific features
- Tech stack (without going overboard — operators care, not customers)

### The outcome
- Specific metric if available
- Customer quote (use day14-voice quote style)
- "Time saved" / "Revenue gained" framing

### Process gallery
- 4-8 screenshots: intake → preview → iteration → launch
- Each captioned in plain English

### Final result
- Live URL link
- Screenshot of homepage

### Pull quote at bottom
- Customer's full quote, large type

### CTA
- "Want yours in 14 days?" + Cal.com link

## Hard rules

1. **Always use the customer's actual words.** Even if rough; rewriting their quote = lying about who you served.
2. **Always link to their live site.** If the site is down or has changed, surface it; don't fake a live link.
3. **Never claim metrics you didn't verify.** "We doubled their bookings" → must have evidence.
4. **Always include the build duration.** It's the headline number for Day14's "14 days" pitch.
5. **Never use stock photos.** The customer's actual site + their actual photos only.

## Voice rules

Use `day14-voice` with these case-study adjustments:
- Past tense for the build phase ("We shipped the booking flow on day 5")
- Present tense for the outcome ("Their site handles 12 bookings/week")
- First-person plural ("we shipped") since this is Day14 talking, not the customer

## Customer permission

Before publishing, the customer must explicitly approve:
- The quote (verbatim or edited)
- Their company name use
- The screenshots
- Linking to their site

Save approval in `~/Documents/businesses/day14/customers/{slug}/05-launch.md` under "Case study approval" section.

## Failure modes

- **Customer declines case-study publication**: respect; don't publish; offer "anonymous customer story" without name/logo
- **Customer's site goes down after launch**: pause the case study page until they recover; surface to operator
- **No customer quote available**: omit the quote section; lean on metrics + screenshots instead

## When invoked
- Within 14 days post-launch for every customer
- When customer's testimonial arrives via email
- Manually when Jack wants to fast-track a great customer's story

## Logging
`[YYYY-MM-DD HH:MM ET] case-study-writer → customer: {slug}, page_at: {path}, quote: {yes|no}, screenshots: N`

Lifted from production patterns in `~/Documents/studio/src/app/case-studies/{splash-jacks-pools,casamore,buildbridge}/page.tsx`.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('case-study-writer', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'case-study-writer', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
