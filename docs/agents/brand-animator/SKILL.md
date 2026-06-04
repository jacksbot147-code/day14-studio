---
name: brand-animator
description: Creative-direction skill for tenant brand UI on Day14 OS. Use when starting a new tenant build, redesigning an existing tenant, or auditing any tenant's marketing surface for brand-forward animation and workflow UI opportunities. Triggers include "new tenant", "brand animation", "make this pop", "redesign hero", "what should this site feel like", or any conversation about tenant-specific UI direction.
---

# Brand Animator — Day14 OS Creative Direction Skill

## What this skill is for

Every tenant on Day14 OS deserves a UI that **brings the business's signature
to the forefront** — not generic "we built it on Vercel" polish. This skill
captures the creative-direction process we've evolved building day14.us and
the six tenants we run on the OS, so any future tenant gets a first-pass
direction that's already informed by what we've learned.

This is the brain that should be loaded when starting *any* new tenant build,
redesigning an existing one, or asking "what would make this brand pop?".

## The core principle: clarity first, signature second

Every creative move is judged by two questions, in this order:

1. **Can a non-technical buyer from this tenant's market understand what the
   business does in 5 seconds?** If no, fix the copy / hierarchy / surface
   before adding any animation.
2. **Does the page have one signature move that makes it *this brand* and
   not a Webflow template?** If no, pick one — but only after clarity is
   locked.

If you reverse the order — pick the wow move first, then bolt copy on — the
page reads as "cool but confusing." We learned this the hard way on day14.us
(see MISTAKES-AVOIDED.md). Don't repeat it.

## Step 1 — Pick the aesthetic axis

Every tenant gets ONE primary axis. Mixing axes produces noise.

| Axis | When to use | Reference sites | Day14 components |
|---|---|---|---|
| **Apple clean** | SaaS, founder tools, anything where premium and clarity matter equally | Linear, Plain, Apple product pages | `ProfessionalHero`, `BuildReveal` (no blur), generous whitespace, single ember accent |
| **Editorial magazine** | Content brands, finance, lifestyle, premium publications | Lapham's Quarterly, Wallpaper, Substack premium | Serif display headlines, asymmetric spreads, pull-quotes, hairline rules |
| **Terminal / code-OS** | Developer tools, productized infra, anything where the *operator* is the buyer | Cursor, Bun, Plain, Stripe Sessions | `TypeIn`, `DecryptText`, `CmdKPalette`, `StatusLine`, `PathCrumb`, `TerminalSnippet`, monospace chrome |
| **Cinematic dark** | Multi-tenant platforms, "behind the scenes" pitches, B2B that wants to feel ambitious | Stripe, Vercel, The Browser Company | `CinematicImage` with dark scrim, dark sections sandwiched in cream, full-bleed photo |
| **Warm photo-D2C** | Consumer brands, wellness, lifestyle, anything where the product is the visual | Allbirds, Glossier, Hot Flash Co | Real photography (Gemini-gen OK for staging), golden-hour palettes, soft warm shadows |
| **Clinical calm** | Healthcare, legal, B2B where trust matters more than energy | AlignMD, Plain Medical, modern dental sites | Cool blue palette, hairline rules, sans-serif body, lots of negative space, no decoration |
| **Playful local** | Local businesses, services, tutors — Spark-tier work | Stripe Atlas onboarding, Square local-biz templates | Friendly sans, bright accent (not always ember), big CTA, real photos of the owner/space |

**For each tenant, name the axis explicitly before you build anything.** Write
it in the tenant's `docs/brand-direction.md` so future sessions and agents
don't drift.

## Step 2 — Pick the palette

Default: cream paper (`#fafaf7`) + ink (`#0a0a0a`) + the tenant's primary
brand color as the single accent. Max 2 ramps per page (Imagine module rule
— see anthropic-skills:diagram if needed).

**Anti-patterns we've burned on:**
- Three accents fighting for attention
- Pure white (`#ffffff`) — feels sterile; cream feels expensive
- Pure black (`#000`) — too brutal; ink (`#0a0a0a`) feels deliberate
- Cool grays — they fight the ember accent. Always use warm-gray.

Tenant color references (already in the codebase):
- day14 — ember `#ef6c33`
- alignmd — cool blue `#3b82f6`
- life-loophole — editorial gold `#ca8a04`
- day14-realty — coastal forest `#14805a`
- hot-flash-co — peach `#f472b6`
- kennum-lawn-care — lime `#65a30d`

For a NEW tenant: pick the color from the tenant's actual vertical, not
from "what color we don't have yet." A lawyer site shouldn't be ember just
because ember is on-brand for Day14.

## Step 3 — Pick the hero pattern

Pick exactly one. Don't combine.

| Pattern | When | Component |
|---|---|---|
| **Massive type, single CTA** | Most cases. Default. | `ProfessionalHero` |
| **Split: type-left, signature-right** | When the right column adds visceral proof (constellation, vignette reel, screenshot). Use sparingly — buyer often ignores the right column on first scroll. | Custom (see `VideoHero` for reference) |
| **Full-bleed cinematic backdrop** | Visual-first brands (D2C, hospitality, photography) | Custom with `CinematicImage` scrim treatment |
| **Interactive demo IS the hero** | When the product can be touched in 5 seconds (Cmd+K, palette, form) | Custom |
| **Full-viewport terminal** | Developer-tool tenants ONLY. Confuses non-tech buyers. | `FullTerminalHero` (kept as reference) |

**Rejected patterns from our experiments:**
- Admin chrome as hero (`LivingOsHero`) — confuses non-buyers, makes them think they need to log in
- Orbiting particles + headline (`VideoHero` v1) — "confetti" feel, not premium
- Constellation diagram as hero (`EmpireConstellation`) — too abstract to convert

## Step 4 — Pick the signature move (one, maybe two)

The thing visitors screenshot and post. ONE per page. Adding more dilutes.

| Move | What it does | Component |
|---|---|---|
| **DecryptText** | Headlines start as scrambled glyphs, decrypt into real text. Mr. Robot / hacker feel. Layout-stable. | `DecryptText` |
| **TypeIn with cursor** | Text types in character-by-character with a blinking cursor. Slower, more deliberate than DecryptText. | `TypeIn` |
| **Scroll-driven cinematic reveal** | Sections fade up cleanly on viewport entry. No blur. | `BuildReveal` (with blur removed) |
| **Cursor-following spotlight** | Soft ember spotlight follows mouse position in hero. Linear pattern. | `CursorSpotlight` |
| **Magnetic CTA** | Primary button leans toward cursor on hover. Premium feel. | Custom — add `useMotionValue` + spring on the button |
| **Scramble-on-hover numbers** | Big numbers (prices, stats) cycle digits on hover before resolving. | `ScramblePrice`, `ScrambleNumber` |
| **Live data ticker** | Real shipping events scroll past at top or bottom. Use only when the data is genuinely live. | `DeployStrip` (currently hidden on day14.us — too noisy) |

## Step 5 — Pick the personality move (one, maybe two)

Quiet details that signal "we cared." Doesn't block the message.

| Move | Tenant fit | Component |
|---|---|---|
| **Cmd+K command palette** | Tenants where the buyer is technical, OR tenants where there are 3+ key actions worth indexing. | `CmdKPalette` |
| **Vim-style status line** | Developer-tool tenants only. Hide on non-tech tenants. | `StatusLine` |
| **Path-crumb above each section** | Adds IDE-feel. Use on terminal-axis tenants. | `PathCrumb` |
| **Drag-select highlight in brand color** | Always. One CSS rule (`::selection`). Free polish. | Add to tenant's `globals.css` |
| **Section dividers as ember comets** | Use on tenants where motion is part of the brand. | `SectionDivider` |
| **Custom 404 with personality** | Always. Show the brand's voice in failure states. | Custom per tenant |

## Step 6 — Run the comprehension test

Before you push to production:

1. Show the page to someone who is NOT in tech and IS in the tenant's market.
2. Ask: "What does this business do?" Time their answer.
3. If they answer correctly in under 5 seconds: ship.
4. If they hesitate, ask back, or get the wrong answer: trim something. Usually
   it's a piece of jargon, a competing CTA, or a signature move that's
   blocking the headline.

Repeat until the answer is instant.

## Step 7 — Ship, then iterate from data

The first creative pass is a draft, not the answer. After a week of real
visitor data:

- If conversion is soft, suspect the copy first, design second.
- If visitors land and leave quickly, suspect the headline.
- If visitors stay and don't convert, suspect the CTA hierarchy.
- If visitors convert but ghost, suspect the post-CTA flow (Cal.com page,
  form, follow-up email).

Don't redesign the hero before you have at least 100 real visitors of data.
We violated this rule eight times on day14.us in 24 hours.

## Quick-reference: the component vocabulary

All live in `src/components/landing/`:

| Component | Purpose |
|---|---|
| `decrypt-text.tsx` | Hacker-decrypt animation on anchor text |
| `type-in.tsx` | Character-by-character typing with cursor |
| `build-reveal.tsx` | Clean fade-up on viewport entry (no blur) |
| `cinematic-image.tsx` | Image wrapper with scrim/ambient/card/tile treatments |
| `cmd-k-palette.tsx` | ⌘K command palette with buyer + behind-the-scenes commands |
| `status-line.tsx` | Vim-style bottom status bar (hidden until 25% scrolled) |
| `path-crumb.tsx` | Faint monospace `~/empire/section` label |
| `professional-hero.tsx` | Default hero — massive type, single CTA, plain English |
| `section-divider.tsx` | Hairline rule with ember comet drawing across |
| `scramble-number.tsx` | Digit-scramble on viewport entry |
| `scramble-price.tsx` | Digit-scramble on hover (currently disabled on day14.us — annoying when reading prices) |
| `mesh-gradient.tsx` | 4-blob slow-drift mesh backdrop |
| `terminal-snippet.tsx` | Type-out terminal commands, light + dark variants |
| `orbit-diagram.tsx` | SVG orbital constellation (rejected as hero — fine as section centerpiece) |
| `empire-constellation.tsx` | Interactive constellation with hover tooltips (kept as reference, not used on day14.us) |
| `full-terminal-hero.tsx` | Full-viewport terminal hero (developer-tool tenants only) |
| `video-hero.tsx` | Split hero with vignette reel (kept as reference) |
| `living-os-hero.tsx` | Admin-chrome hero (rejected — confused buyers) |

When in doubt, READ the file's top JSDoc. Each component documents when it's
right and what it's been used for.

## How to invoke this skill on a new tenant build

1. Read this SKILL.md cold.
2. Read `NEW-TENANT-PLAYBOOK.md` for the step-by-step.
3. Read `MISTAKES-AVOIDED.md` so you don't repeat any of the eight hero
   rebuilds we did on day14.us in 24 hours.
4. Read the tenant's actual brand brief (if it exists at
   `docs/tenants/<slug>/brand.md`).
5. Make the seven decisions above in order. Write them to
   `docs/tenants/<slug>/creative-direction.md`.
6. Then build.

Constraints that always apply to tenant work:

- Never push without Jack's authorization
- Never delete files
- No new dependencies (use what's in `package.json`)
- Tenant brand work goes in its own route/component scope, doesn't pollute
  the day14 OS marketing
- Hot Flash Co and Kennum Lawn Care are excluded from active product work
  unless explicitly unparked
