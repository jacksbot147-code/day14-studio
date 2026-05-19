---
name: brand-extractor
description: Pull brand assets (colors, fonts, logo, voice notes) from a customer's existing presence — their old website, Facebook page, Google Business, Instagram. Outputs partial 01-brand.json fields. Supporting skill for customer-build-day-1-bootstrap; runs after intake-parser, before template-forker.
triggers:
  - "extract brand"
  - "customer's current site"
  - "what colors do they use"
  - "their existing presence"
  - "brand discovery"
---

# brand-extractor

> Customers rarely give you their brand assets cleanly. They have a
> Facebook page from 2019, a Wix site from 2018, and a truck wrap
> from 2022 that all look slightly different. This skill triangulates.

## Inputs (any subset)

- URL of current website (if any)
- Facebook page URL
- Google Business Profile URL
- Instagram handle
- Uploaded logo file (PNG/SVG/JPG)
- Uploaded photos showing brand elements

## Outputs — populate 01-brand.json fields

### colors.*
1. If logo uploaded → extract dominant color(s) via color-thief or similar
2. If existing website → fetch + extract `<meta name="theme-color">` or dominant non-white pixel
3. If Facebook cover photo → extract dominant color
4. Confidence ranking: logo > website meta > Facebook cover > "ask customer"

Output: hex string for `colors.primary`. Leave `colors.accent` empty if no clear secondary.

### fonts.*
Default to Inter (display + body) + JetBrains Mono (mono) regardless of customer's current font. Reason: Day14 sites are consistent in typography across customers; customer-specific fonts are a Pack 2+ enhancement.

If customer EXPLICITLY says "I want my brand font" → flag for kickoff call discussion.

### logo.*
1. If they uploaded SVG → save as `logo.svg`, set `logo.svg_path`
2. If they uploaded PNG/JPG → save as `logo.png` (and convert to SVG if simple wordmark; skip for complex)
3. If they have a Facebook profile photo → that's the de-facto logo if no upload
4. If nothing usable → flag for kickoff call; Jack offers to generate a wordmark from company name

### social.*
- `instagram`, `facebook`, `tiktok`, `youtube` — direct from intake or scraped from existing site footer
- `google_business` — from existing site or "Find on Google" search by company name + city
- Always verify URLs return 200 before saving

### voice (if any signal exists)
Look at:
- Their About-us page if site exists
- Their Facebook About section
- Their Google Business description

Extract:
- 3-5 phrases they use to describe themselves
- Tone: formal / casual / aggressive / warm
- Whether they refer to themselves as "we" or "I"

Save to `01-brand.json._meta.voice_notes` for the copy-writer skill to use later.

## Confidence scoring

Every extracted field gets a confidence score:

- **0.9-1.0**: Multiple sources agree
- **0.7-0.89**: Single high-quality source (uploaded logo, current site meta)
- **0.5-0.69**: Inferred from low-quality source (extracted from JPG, scraped from social)
- **<0.5**: Don't auto-fill; flag for kickoff call

Write confidence scores to `01-brand.json._meta.field_confidence.{field}`.

## Hard rules

1. **Never use brand assets without permission.** If the customer's existing site is © someone else (a previous agency), don't copy assets verbatim. Re-derive (extract color, redraw logo).
2. **Never assume a logo is final.** Always confirm with customer on kickoff call.
3. **Never download images that look like stock photos** — they likely have licensing tied to the previous vendor.
4. **Never extract from password-protected pages.** Public surfaces only.
5. **Never lock in colors derived from low-quality JPEGs.** Color extraction from compressed JPGs is unreliable; round to nearest brand-safe palette.

## When invoked

- Right after `intake-parser` writes the initial `01-brand.json`
- When Jack uploads a logo file mid-build and wants colors re-derived
- When customer says "match my truck" — Jack uploads a truck photo, this skill extracts

## Failure modes

- **Existing website is broken / 404**: log "no usable website at {url}", continue with what you have
- **No social handles found**: not a blocker, leave blank, customer fills in on kickoff
- **Logo upload corrupted**: ask Jack to re-upload; don't guess

## Logging

`[YYYY-MM-DD HH:MM ET] brand-extractor → customer: {slug}, fields_filled: {N}, avg_confidence: {0.0-1.0}, flagged_for_kickoff: {field_list}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('brand-extractor', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'brand-extractor', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
