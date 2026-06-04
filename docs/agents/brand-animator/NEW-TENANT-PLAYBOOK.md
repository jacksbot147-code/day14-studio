# New Tenant Creative Playbook
# Copy this file into `docs/tenants/<slug>/creative-direction.md` and fill it in
# BEFORE writing any tenant UI code.

Tenant slug:
Tenant name:
Date started:
Owner / point of contact:
Vertical (one sentence):
Buyer profile (who is the page actually for? be specific — "yoga teachers in coastal Florida", not "wellness people"):
Price tier on Day14 (Spark / Studio / Platform / Custom):
Production deadline:

---

## Decision 1 — Aesthetic axis

Pick exactly ONE primary axis from `SKILL.md`:

- [ ] Apple clean
- [ ] Editorial magazine
- [ ] Terminal / code-OS
- [ ] Cinematic dark
- [ ] Warm photo-D2C
- [ ] Clinical calm
- [ ] Playful local

Chosen axis: _______________
Why this fits the buyer (one sentence): _______________

---

## Decision 2 — Palette

Primary brand color (hex): _______________
Why this color (drawn from vertical, not from "what we don't have"): _______________

Confirm the defaults you're keeping:
- [ ] Cream paper `#fafaf7` as dominant surface
- [ ] Ink `#0a0a0a` for type
- [ ] Warm-gray scale for hairlines (not cool gray)
- [ ] Single accent — no second accent unless brand requires (max 2 ramps total)

---

## Decision 3 — Hero pattern

Pick exactly ONE:

- [ ] Massive type + single CTA (default — `ProfessionalHero`)
- [ ] Split: type-left, signature-right (use sparingly)
- [ ] Full-bleed cinematic backdrop (D2C, hospitality, photo-first)
- [ ] Interactive demo IS the hero (product touchable in 5 sec)
- [ ] Full-viewport terminal (developer-tool tenants only)

Chosen pattern: _______________

Hero copy (write it in plain English BEFORE you build):
- Eyebrow (≤7 words): _______________
- Headline (≤12 words, plain English, no jargon): _______________
- Sub (1–2 sentences, names the buyer + price floor): _______________
- Primary CTA (verb + object): _______________
- Secondary CTA (or none): _______________

---

## Decision 4 — Signature move

Pick ONE (max two):

- [ ] DecryptText on headlines
- [ ] TypeIn with cursor
- [ ] Scroll-driven fade-up reveals
- [ ] Cursor-following spotlight
- [ ] Magnetic CTA
- [ ] Scramble-on-hover numbers
- [ ] Live data ticker

Chosen signature move(s): _______________

---

## Decision 5 — Personality moves

Pick up to TWO:

- [ ] Cmd+K palette
- [ ] Vim-style status line (terminal-axis only)
- [ ] Path crumbs above sections (terminal-axis only)
- [ ] Drag-select highlight in brand color (always)
- [ ] Ember-comet section dividers
- [ ] Custom 404 with personality
- [ ] Custom cursor on interactive zones

Chosen personality move(s): _______________

---

## Decision 6 — Comprehension test plan

Who will you show the draft to (name a real person, not "someone"):
What will you ask them: "What does this business do?"
Pass criteria: correct answer in under 5 seconds.

---

## Decision 7 — Iteration cadence

Ship the draft when:
- [ ] Typecheck and lint pass
- [ ] Mobile viewport renders cleanly (375px, 768px, 1280px)
- [ ] Comprehension test passes with at least one real person from the buyer market
- [ ] All CTAs route to real destinations (no #TODO links)

Then DON'T touch the design for at least one week. Measure:
- Conversion rate
- Time on page
- Scroll depth
- CTA click rate

Then iterate on copy first, design second.

---

## Sign-off

Decisions reviewed by Jack: ☐  Date: ____________
Built by: ____________  Shipped on: ____________
First-week conversion: ____________
First iteration shipped: ____________

---

## Anti-patterns to refuse even if asked

Refer to MISTAKES-AVOIDED.md for the full list. Top 3:

1. **No admin chrome on marketing pages.** Visitors think they need to log in.
2. **No blur on section reveals.** Makes the page feel hazy. Use clean fade-up.
3. **No typing animations on body paragraphs.** Anchor text only (eyebrows, headlines, key labels). Long copy decrypting is exhausting.
