---
name: pricing-decision-helper
description: Day14's pricing brain. Invoke whenever a customer (or prospect, or Jack himself) raises money — a custom build that doesn't fit a SKU, a deposit-terms tweak, a discount ask, a refund ask, an upsell idea, or a "can you do this in scope" change-request. Returns: which SKU bucket this lives in, what to quote, what's the floor, what's the ceiling, when to walk. Source of truth is SKUS in ~/Documents/studio/src/lib/site.ts and the day14-sow-template.md. Logs every non-trivial call to ~/Documents/businesses/_shared/council-log/ via council-decision when above the threshold.
triggers:
  - "discount"
  - "can you do"
  - "how much"
  - "quote"
  - "refund"
  - "deposit"
  - "scope creep"
  - "out of scope"
  - "upsell"
  - "custom build"
  - "can we"
  - "what would it cost"
---

# pricing-decision-helper

> Day14 has three numbers and a guarantee. This skill keeps Jack from
> negotiating against himself at 9pm on a Friday.

## The three SKUs (source of truth)

From `~/Documents/studio/src/lib/site.ts → SKUS`:

| SKU | Total | Deposit (50%) | Monthly | Ships |
|---|---|---|---|---|
| Site | $2,500 | **$1,250** | $99/mo | 7 days |
| Portal | $5,000 | **$2,500** | $199/mo | 14 days |
| Platform | $10,000 | **$5,000** | $399/mo | 21 days |

Out-of-scope hourly: **$200/hr, 4-hour minimum, paid in advance.**
(From day14-sow-template.md, "What is explicitly NOT included.")

The guarantee — live by day 14 or deposit back in full, customer keeps
everything shipped — is part of the price. It is not negotiable, in
either direction. Don't promise a shorter window. Don't waive the
guarantee.

## Decision tree

Before quoting anything, walk the tree top-down. Stop at the first
match.

### 1. Does the ask fit an existing SKU as-shipped?

Yes → quote that SKU's published price. Do not unbundle.

> "That's a Portal build. $5,000 total, $2,500 deposit to start, $199/mo
> after launch. Live in 14 days or your deposit refunds."

### 2. Is the ask one SKU plus a small named feature?

Yes → quote SKU + hourly add-on, capped.

> "Site is $2,500. The custom inventory page is roughly 4 hours at
> $200 = $800 add-on. Total $3,300. Add-on billed up front with the
> deposit."

If the named feature would exceed 8 hours (~$1,600), bump them to the
next SKU and explain why. Don't sell a Site for $4,500 — sell a Portal
for $5,000.

### 3. Is the ask "everything you sell, but cheaper"?

No. Walk away politely. Day14 doesn't discount the SKU. Reason:
the price IS the positioning. A discounted Portal is a Squarespace
template with a worse delivery story.

> "Pricing's the same for everyone — $5,000 flat for Portal. The
> reason the number doesn't move is the day-14 guarantee. If it's
> not in budget right now, the Site at $2,500 might be the right
> entry point, and you can upgrade later for the difference."

### 4. Is the ask "can you build me something custom that isn't a SKU"?

Maybe — but only if it's adjacent to mobile-service / membership / food
and would take fewer than 30 hours. Quote as: equivalent SKU + hourly
delta, rounded UP, deposit at 50% of the all-in.

If it would take more than 30 hours, escalate to `council-decision`
before quoting. Custom builds are how productized agencies die.

### 5. Is this a refund ask?

Walk the SOW guarantee, in order:
- **Not yet day 14, build is on track:** no refund. Offer a clarification
  call. Do not concede.
- **Day 14, not live, no extension elected:** refund the deposit in full
  per SOW §"Day-14-or-deposit-back guarantee." Customer keeps shipped code.
- **Post-launch, customer just changed mind:** monthly cancels with 30-day
  notice per SOW §"Cancellation + offboarding." Deposit is non-refundable
  once site is live.
- **Anything fuzzy:** invoke `council-decision`. Never refund on the spot.

## The floors and ceilings

### Floor (the "would walk away" line)

- **Site:** $2,500. Below this, Day14 loses money on Anthropic tokens,
  Vercel, Resend, Twilio, and Jack's hours combined.
- **Portal:** $5,000. The Stripe + Supabase setup alone is ~6 hours.
- **Platform:** $10,000. The admin app is the cost-heavy piece.
- **Hourly add-ons:** $200/hr, 4-hour min. Never bill 1 hour, never bill 2.
  If it's truly 1-hour work and the customer is in-monthly, eat it
  under the "1 hour/mo of small changes" allowance in the SOW.

### Ceiling (the "we're not that kind of shop" line)

- **Site:** $4,500. If a Site quote crosses this, you're really selling
  a Portal. Move them up.
- **Portal:** $7,500. Above this, Platform.
- **Platform:** $15,000. Above this, it's a real custom engagement —
  invoke `council-decision`, write a proper SOW, charge accordingly,
  and consider whether Day14 should be the shop that does it.

## When to discount

Almost never. The four legitimate cases:

1. **Friends-and-family case study** — first three customers per vertical
   get the published price. After three, full price for everyone. Never
   advertise a "case study discount" — it just becomes the price.
2. **Multi-tenant deal from one operator** — same customer signing two
   builds at once gets the second at -10%. Hard cap, no stacking.
3. **Cash up front, no monthly for 12 months** — only on the Site SKU,
   only as $2,500 one-time with no monthly (skips the $99/mo for 12
   months). Saves you the recurring billing reconciliation. Don't offer
   this on Portal or Platform — the monthly is hosting + actual ops cost.
4. **Demonstrated hardship + obvious mission fit** — at Jack's
   discretion, council-logged. Nonprofits, weather-flood relief,
   things like that. Document the exception in the council log so it
   doesn't become a pattern.

## When to never discount

- "I got a quote from someone else for less." Day14's competition is
  agencies that ship in 9 months. The price is the speed.
- "We're a startup." Everyone is.
- "Can you do payment plans?" Yes — 50/50 split is already a payment
  plan. The deposit is the plan.
- "Friend of a friend asked me to ask you." No.

## When to walk away

Walk if any of these:

- Customer wants the price changed AND the guarantee waived. That's a
  custom dev shop request. Refer out.
- Customer wants exclusivity (no other customers in their vertical/zip).
  Day14 doesn't do exclusivity. Pool service Cape Coral isn't a moat.
- Customer wants to dictate the stack (Wix, Squarespace, WordPress).
  Day14 ships its template stack only.
- Customer's vertical is outside mobile-service / membership / food and
  isn't adjacent enough that the templates port. Refer out.
- Gut says no. Trust it. Bad customers cost more than they pay.

## Escalation to council-decision

Invoke `council-decision` whenever:
- Quote would exceed $10k
- Customer is asking for a guarantee modification
- Custom-build estimate exceeds 30 hours
- Pricing precedent could affect future deals (e.g., a discount that
  might get repeated)

Don't invoke for:
- A clean SKU-match quote
- Standard hourly add-on under 8 hours
- A refund that the SOW already answers

## Output format

When Jack hands you a pricing situation, return three things:

1. **Recommendation** — one sentence. "Quote Portal at $5,000."
2. **Why** — one sentence citing the SKU bucket or the SOW clause.
3. **Reply draft** — one paragraph, in `day14-voice`, signed `— Jack`.

## Why this skill exists

The hardest pricing calls happen tired. The temptation is always to
discount — money in the pipe today feels better than discipline today.
But the price is the product positioning, and one discount becomes the
ask for the next ten customers. This skill is Jack's pre-committed
spine. When in doubt, hold the line, send the reply draft, and sleep.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('pricing-decision-helper', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'pricing-decision-helper', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
