# Creative Direction — alignmd

> Pre-filled from current production state by the overnight innovation queue
> (innovation-t6, 2026-06-08). **[known]** = shipped; **[fill]** = needs a
> human/brand-animator pass. Source of truth: `docs/agents/brand-animator/SKILL.md`.

Tenant slug: alignmd
Tenant name: AlignMD
Date started: [fill]
Owner / point of contact: Jack
Vertical (one sentence): Credential-aware clinician staffing — intake and licensing end to end.
Buyer profile: [fill — clinical/healthcare staffing buyers; be specific, e.g. "practice managers and credentialing leads at mid-size clinics", confirm wording]
Price tier on Day14 (Spark / Studio / Platform / Custom): [fill]
Production deadline: Production-shipped (live).

**STATUS: PRODUCTION-SHIPPED.**

---

## Decision 1 — Aesthetic axis  **[known]**

- [x] Clinical calm
- [ ] Apple clean
- [ ] Editorial magazine
- [ ] Terminal / code-OS
- [ ] Cinematic dark
- [ ] Warm photo-D2C
- [ ] Playful local

Chosen axis: **Clinical calm**
Why this fits the buyer (one sentence): Clinical/healthcare buyers value trust and calm over energy — negative space and restraint read as competence, decoration reads as risk.

---

## Decision 2 — Palette  **[known]**

Primary brand color (hex): **cool blue `#3b82f6`**
Why this color: cool blue is the established clinical-trust signal for healthcare; drawn from the vertical, not from "what color we don't have."

Confirm the defaults you're keeping:
- [x] Cream paper `#fafaf7` as dominant surface
- [x] Ink `#0a0a0a` for type
- [x] Warm-gray scale for hairlines (not cool gray)
- [x] Single accent — cool blue only

---

## Decision 3 — Hero pattern  **[known]**

- [x] Massive type + single CTA — **`ProfessionalHero` (clean Apple-style)**
- [ ] Split: type-left, signature-right
- [ ] Full-bleed cinematic backdrop
- [ ] Interactive demo IS the hero
- [ ] Full-viewport terminal

Chosen pattern: **ProfessionalHero — clean, Apple-style.** Massive type, single CTA, generous whitespace. No terminal chrome, no cinematic backdrop — clinical buyers want a page that feels like a hospital intranet's calmer cousin.

Hero copy:
- Eyebrow (≤7 words): [fill]
- Headline (≤12 words, plain English): [fill — e.g. plain-English version of "Credential-aware staffing, end to end"; pass the reading-age test]
- Sub (1–2 sentences, names buyer + price floor): [fill]
- Primary CTA (verb + object): [fill — one button only]
- Secondary CTA (or none): [fill]

---

## Decision 4 — Signature move  **[known]**

- [x] **None — no decorative signature move.** Trust > signature for clinical.
- [ ] DecryptText on headlines
- [ ] TypeIn with cursor
- [ ] Scroll-driven fade-up reveals
- [ ] Cursor-following spotlight
- [ ] Magnetic CTA
- [ ] Scramble-on-hover numbers
- [ ] Live data ticker

Chosen signature move(s): **None (deliberate).** A decrypt/scramble/spotlight move would undercut the clinical-calm read. If any motion is added, it must be the quietest possible clean fade-up — never a "screenshot-worthy" hacker move.

---

## Decision 5 — Personality moves  **[known]**

- [x] **None — no personality decoration.** Clinical buyers want calm.
- [ ] Cmd+K palette
- [ ] Vim-style status line
- [ ] Path crumbs above sections
- [ ] Drag-select highlight in brand color
- [ ] Ember-comet section dividers
- [ ] Custom 404 with personality
- [ ] Custom cursor on interactive zones

Chosen personality move(s): **None (deliberate).** Drag-select highlight in cool blue is the only "free polish" that could be added without breaking calm — leave even that off unless reviewed.

---

## Decision 6 — Comprehension test plan  **[fill]**

Who will you show the draft to: [fill — ideally a real clinic-side credentialing/admin person]
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

See `MISTAKES-AVOIDED.md`. AlignMD-specific watch-items:
1. **No internal-ops language in buyer copy** (#7 — describe what the clinic GETS, not what the operator does).
2. **No competing CTAs in the fold** (#9 — one trust-forward CTA only).
3. **Resist adding a signature move** "to make it pop" — for this tenant, restraint IS the brand. Energy reads as risk to clinical buyers.
