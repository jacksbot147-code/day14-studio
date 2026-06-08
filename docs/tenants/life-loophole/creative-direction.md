# Creative Direction — life-loophole

> Pre-filled from current production state by the overnight innovation queue
> (innovation-t6, 2026-06-08). **[known]** = shipped; **[fill]** = needs a
> human/brand-animator pass. Source of truth: `docs/agents/brand-animator/SKILL.md`.

Tenant slug: life-loophole
Tenant name: Life Loophole
Date started: [fill]
Owner / point of contact: Jack
Vertical (one sentence): Editorial finance brand — essays drafted nightly in brand voice by a background agent, reviewed and published from the inbox.
Buyer profile: [fill — readers/subscribers of an editorial-finance publication; specify the actual reader market]
Price tier on Day14 (Spark / Studio / Platform / Custom): [fill]
Production deadline: Production-shipped (live).

**STATUS: PRODUCTION-SHIPPED.**

---

## Decision 1 — Aesthetic axis  **[known]**

- [x] Editorial magazine
- [ ] Apple clean
- [ ] Terminal / code-OS
- [ ] Cinematic dark
- [ ] Warm photo-D2C
- [ ] Clinical calm
- [ ] Playful local

Chosen axis: **Editorial magazine**
Why this fits the buyer (one sentence): A finance-essay brand lives or dies on feeling like a premium publication — serif display, asymmetric spreads, and pull-quotes signal "read me" the way a SaaS grid never could.

---

## Decision 2 — Palette  **[known]**

Primary brand color (hex): **editorial gold `#ca8a04`**
Why this color: gold on warm paper reads as premium print / old-money finance, drawn from the editorial-finance vertical.

Confirm the defaults you're keeping:
- [x] Warm paper as dominant surface (warm-paper variant of the cream default)
- [x] Ink `#0a0a0a` for type
- [x] Warm-gray scale for hairlines (not cool gray)
- [x] Single accent — gold only

---

## Decision 3 — Hero pattern  **[fill / partially known]**

- [ ] Massive type + single CTA (`ProfessionalHero`)
- [ ] Split: type-left, signature-right
- [ ] Full-bleed cinematic backdrop
- [ ] Interactive demo IS the hero
- [ ] Full-viewport terminal

Chosen pattern: [fill — editorial-magazine axis typically wants massive serif type + single CTA or an asymmetric editorial spread; confirm which shipped]

Hero copy:
- Eyebrow (≤7 words): [fill]
- Headline (≤12 words, plain English): [fill]
- Sub (1–2 sentences, names buyer + price floor): [fill]
- Primary CTA (verb + object): [fill]
- Secondary CTA (or none): [fill]

---

## Decision 4 — Signature move  **[known]**

- [x] Scroll-driven fade-up reveals (`BuildReveal`, no blur)
- [ ] DecryptText on headlines
- [ ] TypeIn with cursor
- [ ] Cursor-following spotlight
- [ ] Magnetic CTA
- [ ] Scramble-on-hover numbers
- [ ] Live data ticker

Chosen signature move(s): **Scroll-driven fade-up reveals** — clean opacity + y-translate on section entry (no blur, per MISTAKES-AVOIDED #6). Fits the editorial "unfolding article" read.

---

## Decision 5 — Personality moves  **[known]**

- [x] Custom 404 with personality
- [ ] Cmd+K palette
- [ ] Vim-style status line
- [ ] Path crumbs above sections
- [ ] Drag-select highlight in brand color
- [ ] Ember-comet section dividers
- [ ] Custom cursor on interactive zones

Chosen personality move(s): **Custom 404 with personality** — the brand's editorial voice shows up even in the failure state.

---

## Decision 6 — Comprehension test plan  **[fill]**

Who will you show the draft to: [fill — a real reader from the finance-essay market]
What will you ask them: "What does this business do?"
Pass criteria: correct answer in under 5 seconds.

---

## Decision 7 — Iteration cadence  **[fill / partially known]**

Ship the draft when:
- [x] Typecheck and lint pass
- [ ] Mobile viewport renders cleanly (375px, 768px, 1280px) — [verify]
- [ ] Comprehension test passes — [fill]
- [ ] All CTAs route to real destinations — [verify]

Then leave it one week and measure conversion / time on page / scroll depth / CTA click rate. Iterate copy first, design second.

---

## Sign-off

Decisions reviewed by Jack: ☐  Date: ____________
Built by: ____________  Shipped on: ____________
First-week conversion: ____________
First iteration shipped: ____________

---

## Anti-patterns to refuse even if asked

See `MISTAKES-AVOIDED.md`. Life-Loophole-specific watch-items:
1. **No blur on the scroll reveals** (#6 — editorial pages must read crisp, not hazy).
2. **No decrypt/typing animation on body essay copy** (#5 — anchor text only; a decrypting paragraph is exhausting to read).
3. **One thing sold prominently** (#10 — don't let a subscribe CTA fight a "read the essays" CTA in the same fold).
