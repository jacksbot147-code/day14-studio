# Creative Direction — day14

> Pre-filled from current production state by the overnight innovation queue
> (innovation-t6, 2026-06-08). Decisions marked **[known]** reflect what is
> already shipped; **[fill]** sections need a human/brand-animator pass.
> Source of truth for the seven decisions below: `docs/agents/brand-animator/SKILL.md`
> and `NEW-TENANT-PLAYBOOK.md`.

Tenant slug: day14
Tenant name: Day14 OS
Date started: [fill — original build predates this doc]
Owner / point of contact: Jack
Vertical (one sentence): Productized 14-day build studio running a multi-tenant operating system that ships and hosts client sites/apps.
Buyer profile: [fill — founders and local operators who want a real site/app built fast, not a template; confirm the precise market wording]
Price tier on Day14 (Spark / Studio / Platform / Custom): [fill]
Production deadline: Production-shipped (live).

**STATUS: PRODUCTION-SHIPPED.**

---

## Decision 1 — Aesthetic axis  **[known]**

- [x] Terminal / code-OS
- [ ] Apple clean
- [ ] Editorial magazine
- [ ] Cinematic dark
- [ ] Warm photo-D2C
- [ ] Clinical calm
- [ ] Playful local

Chosen axis: **Terminal / code-OS**
Why this fits the buyer (one sentence): The operator IS the buyer-facing proof — the OS that runs the studio is itself the pitch, so a code-OS surface reads as authentic rather than decorative.

---

## Decision 2 — Palette  **[known]**

Primary brand color (hex): **ember `#ef6c33`**
Why this color: cream + ink + ember is the house signature; ember is the Day14 OS accent across the empire.

Confirm the defaults you're keeping:
- [x] Cream paper `#fafaf7` as dominant surface
- [x] Ink `#0a0a0a` for type
- [x] Warm-gray scale for hairlines (not cool gray)
- [x] Single accent — ember only

---

## Decision 3 — Hero pattern  **[known]**

- [x] Full-viewport terminal — `FullTerminalHero` **(kept as REFERENCE)**
- [ ] Massive type + single CTA (`ProfessionalHero`)
- [ ] Split: type-left, signature-right
- [ ] Full-bleed cinematic backdrop
- [ ] Interactive demo IS the hero

Chosen pattern: **FullTerminalHero pattern (kept as reference).**
Note: per MISTAKES-AVOIDED #5, full-terminal-as-hero gates the pitch behind ~8s of typing and confuses non-tech buyers. `FullTerminalHero` is retained as the terminal-axis reference component; the shipped marketing hero leans on `ProfessionalHero` + `DecryptText` so the message is readable in under 2 seconds.

Hero copy:
- Eyebrow (≤7 words): [fill]
- Headline (≤12 words, plain English): [fill — must pass the 12-year-old reading-age test; no "productized build studio" / "multi-tenant operating system" jargon per MISTAKES-AVOIDED #4]
- Sub (1–2 sentences, names buyer + price floor): [fill]
- Primary CTA (verb + object): [fill — one ember pill only, per MISTAKES-AVOIDED #9]
- Secondary CTA (or none): [fill]

---

## Decision 4 — Signature move  **[known]**

- [x] DecryptText on headlines
- [ ] TypeIn with cursor
- [ ] Scroll-driven fade-up reveals
- [ ] Cursor-following spotlight
- [ ] Magnetic CTA
- [ ] Scramble-on-hover numbers
- [ ] Live data ticker

Chosen signature move(s): **DecryptText** on anchor headlines (short strings, fast cps, ≤2s — anchor text only, never body copy).

---

## Decision 5 — Personality moves  **[known]**

- [x] Cmd+K palette (`CmdKPalette`)
- [x] Vim-style status line (`StatusLine`)
- [x] Path crumbs above sections (`PathCrumb`)
- [ ] Drag-select highlight in brand color
- [ ] Ember-comet section dividers
- [ ] Custom 404 with personality
- [ ] Custom cursor on interactive zones

Chosen personality move(s): **CmdKPalette + StatusLine + PathCrumbs** — the full terminal-axis personality kit. All three are terminal-axis-appropriate (buyer is technical / operator-aware).

---

## Decision 6 — Comprehension test plan  **[fill]**

Who will you show the draft to (a real person, not "someone"): [fill]
What will you ask them: "What does this business do?"
Pass criteria: correct answer in under 5 seconds.

---

## Decision 7 — Iteration cadence  **[fill / partially known]**

Ship the draft when:
- [x] Typecheck and lint pass
- [ ] Mobile viewport renders cleanly (375px, 768px, 1280px) — [verify]
- [ ] Comprehension test passes with at least one real person from the buyer market — [fill]
- [ ] All CTAs route to real destinations (no #TODO links) — [verify]

Then don't touch the design for at least one week (MISTAKES-AVOIDED #1: no hero rebuild without 100+ visitor sessions). Measure: conversion rate, time on page, scroll depth, CTA click rate. Iterate copy first, design second.

---

## Sign-off

Decisions reviewed by Jack: ☐  Date: ____________
Built by: ____________  Shipped on: ____________
First-week conversion: ____________
First iteration shipped: ____________

---

## Anti-patterns to refuse even if asked

See `MISTAKES-AVOIDED.md` for the full 12. Day14-specific watch-items:
1. **No admin chrome on the marketing hero** (#2 — `LivingOsHero` was rejected: "why is my admin page on my homepage").
2. **No jargon headline** (#4 — "productized build studio" / "multi-tenant OS" fail the reading-age test).
3. **No typing animation gating the pitch >2s** (#5 — FullTerminalHero's 8s gate is why it stays a reference, not the live hero).
