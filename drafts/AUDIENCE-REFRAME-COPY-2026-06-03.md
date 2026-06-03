# Audience Reframe — Landing Copy
# 2026-06-03

**The widening play:** Move from "one operator, six businesses" (which sells to ~12 people on Earth) to "the OS for solo operators who want to ship like a 20-person team" (which sells to ~10,000). Multi-tenant becomes a *feature*, not the headline.

**Old positioning to retire:**
- H1: "One operator. Six businesses. One operating system."
- Sub: "The multi-tenant studio I built to run every business I own from a single worktree…"
- Solo tier: "One operator, one business, wants the OS but only needs one slot."
- Portfolio: "One operator, two to five businesses. The shape this OS was built for."
- Founder: "Heavy users. Onboarding session, direct line, closes at 100 signups."

The new copy keeps Jack's operator credibility (he runs six things on this OS) but the headline talks to the customer Jack is actually selling to: the solo founder, the indie operator, the technical-but-stretched-thin builder who is one person and wants to ship like twenty.

---

## Headline candidates

Three swings. A is the safe favorite; B is the punchiest; C is the most Apple/Base44.

### A. Ship like a team of twenty.
**Eyebrow:** A pivot announcement
**H1:**

> Ship like a team of twenty.
> Stay a team of one.

Why it works: the promise is in the first four words. The second line undercuts and clarifies. Reads like an Apple product page headline and survives being cropped on a mobile share card.

### B. The operating system for one.
**Eyebrow:** Built for solo operators
**H1:**

> The operating system
> for solo operators.

Why it works: declarative, category-defining. "Operating system" stays as the load-bearing noun — the thing the product actually is. "Solo operators" replaces "one operator, six businesses" and widens the door. Confident enough to live on a t-shirt.

### C. One person. Twenty-person output.
**Eyebrow:** A pivot announcement
**H1:**

> One person.
> Twenty-person output.

Why it works: most Base44-flavored — short, declarative, two-clause rhythm. Keeps the "one" cadence Jack already likes from the old headline but flips what comes after it from a constraint (six businesses) to a promise (twenty-person output). Strongest on a hero with a real product screenshot beside it.

---

## Sub-paragraph candidates

Two passes. Both keep the multi-tenant detail but demote it from headline to feature.

### Sub 1 — promise-first, feature-second

> Day14 OS is the studio I built so one operator can ship like a twenty-person team. Marketing sites, customer portals, billing, an admin app, scheduled agents, an inbox that only surfaces what a human has to decide. Multi-tenant from day one — run a single business or six in the same worktree.

Why it works: leads with the customer outcome (ship like 20), lists the surface area in one breath, then puts multi-tenant at the end as a capability rather than the hook. The single business / six businesses line gives Jack his proof without leading with it.

### Sub 2 — shorter, sharper, more Apple

> The studio behind every business I run. Marketing sites, portals, billing, an admin app, scheduled agents — all in one worktree, all wired to an inbox that only pings you when a human has to decide. One tenant or many. Built for the operator who refuses to add headcount.

Why it works: shorter sentences, more declarative cadence, ends on the customer ("the operator who refuses to add headcount") rather than the product. The "one tenant or many" line does the multi-tenant work without making it the headline. Pairs well with headline B or C.

---

## Pricing tier rewrites — Solo / Portfolio / Founder

Same three-tier structure, same prices, same Founder-pricing closes-at-100 dynamic. Only the descriptions change. The tier *names* still describe shape-of-use, but the `bestFor` copy now describes the *operator*, not the topology.

### Solo — $79/mo · 1 tenant

> **bestFor:** For the founder shipping one thing well. Same OS, same admin, same scheduled-agent inbox the portfolio operators use — sized for one business and one website. Upgrade when you spin up the second.

What changed: was "one operator, one business, wants the OS but only needs one slot." Now framed as the starter tier for any solo founder, not a consolation for people who don't have six businesses.

### Portfolio — $299/mo · up to 5 tenants · (popular)

> **bestFor:** For operators running more than one thing. Marketing sites, portals, billing, admin — all in one place, none of them in your way. The shape this OS was built for, and the tier most teams of one settle into.

What changed: was "one operator, two to five businesses. The shape this OS was built for." Keeps the "shape this OS was built for" line because it's true and lands. Adds the implicit promise that even portfolio users are "teams of one" — reinforces the widening play instead of fighting it.

### Founder — $999/mo · unlimited tenants

> **bestFor:** For operators who want a direct line. Unlimited tenants, an onboarding session with me, and first dibs on every feature I ship from my own portfolio. Closes at 100 signups, then the Founder tier retires and Portfolio becomes the top public tier.

What changed: was "heavy users. Onboarding session, direct line, closes at 100 signups." Keeps the scarcity and the founder-perks, but reframes from "heavy users" (which implies the product is for someone else) to "operators who want a direct line" (which implies you, the reader, can be that operator).

---

## Pairing recommendation

If Jack picks **one** combination tonight without further input:

- **Headline:** B — "The operating system for solo operators."
- **Sub:** Sub 2 — "The studio behind every business I run…"
- **Pricing:** Use all three rewrites as-is.

Rationale: B + Sub 2 is the cleanest Apple/Base44 read, holds together on a 1440px hero with the empire constellation, and leaves "ship like a team of twenty" available for the Loom thumbnail, the X-thread hook, and the manifesto opener — so the same idea hits the visitor three times without the landing page having to do all the work.

If Jack wants the more provocative read, swap to **C + Sub 2**. Both Sub 1 and Sub 2 work under any of the three headlines.

---

## Notes for the implementer (next overnight task)

- Files to touch: `src/app/page.tsx` (Hero component, OS_TIERS array, metadata TITLE + DESCRIPTION).
- The `<span className="marker text-ink">operating system</span>` underline detail should carry into the new headline — preserve it on whichever phrase becomes load-bearing ("operating system" in B, "ship" or "team of twenty" in A/C).
- Update `metadata.title` and `metadata.description` to match the new positioning so the share card stops saying "one operator, six businesses." Suggested:
  - title: `"Day14 OS — The operating system for solo operators"`
  - description: `"The studio behind every business I run. Marketing sites, portals, billing, admin, scheduled agents — all in one worktree. One tenant or many. Built for the operator who refuses to add headcount."`
- Do NOT touch `/work-with-us`, `/case-studies`, or the existing CASE_STUDIES array — the reframe is the home page only.
- Eyebrow on the hero is currently "A pivot announcement." Keep it or swap to "Built for solo operators" depending on headline choice (B benefits from the latter).
