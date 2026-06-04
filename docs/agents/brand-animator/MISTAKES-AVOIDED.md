# Mistakes Avoided
# Eight hero rebuilds in 24 hours on day14.us. Every one of them taught
# something. Read this before doing creative work on any tenant.

## 1. Aesthetic ping-pong without data

**What happened:** The day14.us hero went through 8 distinct designs in
~24 hours — EmpireConstellation → LivingOsHero → AppleHero → VideoHero v1 →
VideoHero v2 → FullTerminalHero → ProfessionalHero + DecryptText. None
shipped to main long enough to test conversion.

**The lesson:** Pick a direction, ship to production, leave it alone for
ONE WEEK minimum. Iterate based on real-visitor data, not gut.

**The rule:** No hero rebuild without 100+ visitor sessions of data on the
previous version.

---

## 2. Admin chrome on the marketing page

**What happened:** Built `LivingOsHero` — a faked-live admin window with
inbox + tenant rail + activity log as the hero. Jack reacted: "I don't
understand why my admin page is on my homepage."

**The lesson:** The visitor is not the operator. Marketing pages show what
the buyer GETS, not what the operator USES. Save admin chrome for the
operator-facing surface.

**The rule:** No admin/inbox/dashboard UI in any tenant's marketing hero.

---

## 3. Particles, confetti, and orbital decoration

**What happened:** VideoHero v1 had 14 ember particles drifting around
the headline. Jack reacted: "the confetti floating around is trash."

**The lesson:** Decorative particles read as 2015 SaaS noise, not 2026
premium. If a visual element doesn't carry information, kill it.

**The rule:** No background particles. No floaters. No orbiting decoration.

---

## 4. Jargon in the headline

**What happened:** Live hero said "productized build studio" and
"multi-tenant operating system." A tutor who landed on the page wouldn't
know what either phrase means. Jack: "I almost don't want it to seem too
confusing — I need people to understand what we do."

**The lesson:** Industry jargon in the headline kills conversion from any
buyer outside that industry. The headline must work for the dumbest possible
buyer in the target market.

**The rule:** Headline reading-age test — a 12-year-old should understand
what the business does from the headline alone. No exceptions.

---

## 5. Typing animation as a comprehension gate

**What happened:** FullTerminalHero gated the entire pitch behind ~8 seconds
of shell-command typing. Visitor had to wait through the animation to learn
what Day14 does.

**The lesson:** Animation that DELAYS the message is a comprehension tax.
Visitors don't wait — they bounce.

**The rule:** No typing/decrypt animation on the primary message can exceed
2 seconds before the buyer can read the full pitch. Anchor text only,
short strings only, fast cps.

---

## 6. Blur as a "build itself" effect

**What happened:** BuildReveal initially used `filter: blur(8px) → 0` on
section enter. Jack: "I don't like the blur — I want it to look like the
code is spawning."

**The lesson:** Blur effects read as "loading" or "hazy" — not premium.
For section-entry reveals, prefer opacity + translate, not blur.

**The rule:** No blur on content reveals. Fade-up with a small y-translate
is the default. Save blur for backdrop layers only (mesh gradients, ambient
photos).

---

## 7. Internal-ops language in buyer-facing copy

**What happened:** HowItWorks section used "Add a tenant / Schedule the
agents / Live in the inbox" — operator-internal jargon. A buyer doesn't
add tenants; the studio does that *for* them. The buyer's experience is
"Scope / Build / Launch."

**The lesson:** Marketing copy describes the BUYER's experience, not the
operator's workflow. Translate every operator term to a buyer term.

**The rule:** Audit every "we" / "you" pronoun. If the page describes what
Jack does at the keyboard, rewrite it to describe what the client receives.

---

## 8. Developer-facing strings visible to buyers

**What happened:** The Loom-embed placeholder said "Paste the Loom share
URL into LOOM_EMBED_URL in page.tsx" — visible to any non-tech buyer.

**The lesson:** Empty states are buyer-facing. They get the same care as
the populated state.

**The rule:** Audit every conditional render's empty-state branch. Write
the empty state for the BUYER, never as a TODO note to yourself.

---

## 9. Two CTAs competing in the hero fold

**What happened:** Header had "Book intro call" as the primary CTA. Hero
had "Join the waitlist" as the primary CTA. Both visible above the fold.
Buyer confusion.

**The lesson:** One primary CTA per fold. Anything else is a secondary text
link, demoted visually.

**The rule:** Pick the ONE conversion you want measured. Make it the only
ember-pill button visible. Everything else is ghost / link / smaller.

---

## 10. Pricing that fights the pitch

**What happened:** Page sold "Day14 OS" as a SaaS subscription ($79/$299/$999/mo)
while the footer pitched "the 14-day build studio." Two businesses, one
homepage, both half-explained.

**The lesson:** One homepage sells one product. If the operator has multiple
revenue streams, give each its own page or its own clearly demoted secondary
section.

**The rule:** A page sells exactly one thing prominently. Secondary offerings
get a smaller, lower-priority footer block — never co-equal billing.

---

## 11. Setting safety nets and not using them

**What happened:** Built an overnight scheduled-task system that pushed
redesign work to a preview branch. Then didn't actually open the Vercel
preview the next morning — looked at production day14.us instead, thought
nothing had shipped.

**The lesson:** Process is only useful if it's actually used. Build the
habit alongside the tooling.

**The rule:** Every redesign session ends with a written one-liner
("merge this if you love it / discard this if you don't") so the operator
doesn't have to remember.

---

## 12. Empire-state cron polluting the commit log

**What happened:** Empire-state sync committed every 15 min. Mixed with
real product commits in the git history. Made it hard to scan what actually
shipped vs. what was just state-snapshot noise.

**The lesson:** Internal-state syncs go on their own branch or get
squashed into daily summaries. They don't share the same `git log` as
product work.

**The rule:** Consider routing empire-state syncs to a `state/auto` branch
or batching to once-daily so the main branch reads as "what humans shipped."

---

## How to use this file

When starting a new tenant build:
1. Read this file cold.
2. As you build, refer back to this list at each decision point.
3. If you're about to do one of the 12 things above, STOP. Pick a
   different move.

When reviewing finished work:
1. Walk the page with this list open.
2. For each item, ask: "did we do this?"
3. If yes, fix before shipping.

When debriefing after a tenant launch:
1. Add the new mistakes we learned to this file.
2. Add the new rules to the SKILL.md.
3. This document compounds. Every tenant we build makes the next tenant
   start from a stronger position.
