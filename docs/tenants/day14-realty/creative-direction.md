# Creative Direction — day14-realty

> Pre-filled from current state by the overnight innovation queue
> (innovation-t6, 2026-06-08). **[known]** = decided; **[fill]** = needs a
> human/brand-animator pass. Source of truth: `docs/agents/brand-animator/SKILL.md`.

Tenant slug: day14-realty
Tenant name: Day14 Realty
Date started: [fill]
Owner / point of contact: Jack
Vertical (one sentence): Real-estate brokerage / listings brand on Day14 OS.
Buyer profile: [fill — confirm: home buyers/sellers in the target coastal market]
Price tier on Day14 (Spark / Studio / Platform / Custom): [fill]
Production deadline: **Production PAUSED — broker-of-record paperwork.**

**STATUS: PAUSED — defer launch until broker-of-record paperwork clears.**
Creative direction below is decided; build is held, not cancelled. Do not
ship to production until the paperwork blocker is resolved.

---

## Decision 1 — Aesthetic axis  **[known]**

- [x] Warm photo-D2C
- [ ] Apple clean
- [ ] Editorial magazine
- [ ] Terminal / code-OS
- [ ] Cinematic dark
- [ ] Clinical calm
- [ ] Playful local

Chosen axis: **Warm photo-D2C**
Why this fits the buyer (one sentence): Real estate is sold on the feeling of the place — golden-hour photography and warm shadows make a listing feel like a home, not a spreadsheet.

---

## Decision 2 — Palette  **[known]**

Primary brand color (hex): **coastal forest `#14805a`**
Why this color: coastal-forest green reads as the natural/coastal setting of the listings — drawn from the locale, not from the house ember.

Confirm the defaults you're keeping:
- [x] Cream paper `#fafaf7` as dominant surface
- [x] Ink `#0a0a0a` for type
- [x] Warm-gray scale for hairlines (not cool gray)
- [x] Single accent — coastal forest only

---

## Decision 3 — Hero pattern  **[known]**

- [x] Full-bleed cinematic backdrop (D2C / photo-first)
- [ ] Massive type + single CTA (`ProfessionalHero`)
- [ ] Split: type-left, signature-right
- [ ] Interactive demo IS the hero
- [ ] Full-viewport terminal

Chosen pattern: **Full-bleed cinematic backdrop** — `CinematicImage` scrim treatment over a golden-hour property shot, headline + single CTA on the scrim.

Hero copy:
- Eyebrow (≤7 words): [fill]
- Headline (≤12 words, plain English): [fill]
- Sub (1–2 sentences, names buyer + price floor): [fill]
- Primary CTA (verb + object): [fill]
- Secondary CTA (or none): [fill]

---

## Decision 4 — Signature move  **[known]**

- [x] Real photography as the signature
- [ ] DecryptText on headlines
- [ ] TypeIn with cursor
- [ ] Scroll-driven fade-up reveals
- [ ] Cursor-following spotlight
- [ ] Magnetic CTA
- [ ] Scramble-on-hover numbers
- [ ] Live data ticker

Chosen signature move(s): **Full-bleed cinematic real photography** — the imagery itself is the signature. No hacker/decrypt move; the photo carries the brand. (Clean fade-up reveals on lower sections are acceptable as quiet support, no blur.)

---

## Decision 5 — Personality moves  **[fill]**

- [ ] Cmd+K palette
- [ ] Vim-style status line
- [ ] Path crumbs above sections
- [ ] Drag-select highlight in brand color
- [ ] Ember-comet section dividers
- [ ] Custom 404 with personality
- [ ] Custom cursor on interactive zones

Chosen personality move(s): [fill — drag-select highlight in coastal-forest and a custom 404 are the safe, on-axis options; confirm at build time]

---

## Decision 6 — Comprehension test plan  **[fill]**

Who will you show the draft to: [fill — a real home buyer/seller in the target market]
What will you ask them: "What does this business do?"
Pass criteria: correct answer in under 5 seconds.

---

## Decision 7 — Iteration cadence  **[fill — blocked]**

Do NOT ship until broker-of-record paperwork clears. When unblocked, ship when:
- [ ] Typecheck and lint pass
- [ ] Mobile viewport renders cleanly (375px, 768px, 1280px)
- [ ] Comprehension test passes with a real person from the buyer market
- [ ] All CTAs route to real destinations
- [ ] Broker-of-record paperwork resolved

Then leave it one week and measure. Iterate copy first, design second.

---

## Sign-off

Decisions reviewed by Jack: ☐  Date: ____________
Built by: ____________  Shipped on: ____________ (BLOCKED on paperwork)
First-week conversion: ____________
First iteration shipped: ____________

---

## Anti-patterns to refuse even if asked

See `MISTAKES-AVOIDED.md`. Realty-specific watch-items:
1. **No developer-facing strings in empty states** (#8 — listing placeholders are buyer-facing; write them for the buyer).
2. **No blur on reveals** (#6 — photography should look crisp; haze kills the "this is a real place" feel).
3. **One CTA per fold** (#9 — "Book a viewing" or "See listings", not both competing).
