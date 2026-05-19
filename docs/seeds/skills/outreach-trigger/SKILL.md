---
name: outreach-trigger
description: Decide if a SWFL service business is a Day14 cold-outreach target and draft the personalized hook. Cold counterpart to warm-dm-personalizer — for people Jack doesn't already know. Pulls signal traits from Council 0001 Executor recommendation.
triggers:
  - "cold DM"
  - "outreach target"
  - "should I DM them"
  - "qualifying lead"
  - "found a business"
  - "saw a truck"
---

# outreach-trigger

> The qualifier + first-touch generator for cold outreach. The
> Executor advisor in Council 0001 outlined the criteria; this
> skill operationalizes them.

## The 5-signal qualifier

A SWFL service business qualifies for cold outreach if it scores
at least 3 of these 5 signals:

| Signal | Weight | What to check |
|---|---|---|
| **Visible on the road** | 1 | Truck wrap, vehicle signage, lawn sign, or business van Jack has physically seen |
| **Bad website** | 1 | Wix/Squarespace from 2018, no mobile version, broken contact form, or "page coming soon" |
| **Owner-operator name** | 1 | Owner is named in the business (e.g., "Mike's Pool Service" vs. franchise) |
| **Recurring service** | 1 | Subscription / repeating revenue (pool, lawn, pest, AC maintenance plan) — vs. one-shot |
| **Geo match** | 1 | Cape Coral, Fort Myers, Naples, Bonita Springs, Estero, Lehigh Acres |

Score 5/5 = top priority. 3-4 = qualified. <3 = pass.

## Auto-rejects (regardless of score)

Skip if ANY of these are true:

- **Chain franchise** — franchisee has no autonomy on web spend
- **Recently rebranded** — they just spent on it; defer 12 months
- **Yelp avg < 4 stars** — different problem than a website fix
- **Multi-location** — too big a build for the SKU pricing
- **In legal/regulated category** without proper licensing context (medical, legal, financial)
- **Active customer of a competitor agency** — they're locked in for the contract length

## The DM template (Instagram, 280-350 chars)

Structure:

1. **Place-specific reference** (where you saw their truck/sign)
2. **Website pain** (specific, not generic)
3. **Offer + deadline** (one sentence)
4. **Preview question** (yes/no answer)

Example:

> Saw your truck on {specific_road} yesterday. Your website looks
> like it&rsquo;s from 2018 — {one specific observable thing wrong with it}.
> I build SWFL service business sites in 14 days flat, $2,500.
> Want a quick preview for {their_business_name} before you decide?

Per-vertical tuning:

### Mobile-service (pool, lawn, AC)
- Reference: their truck/van
- Pain: probably "no online booking" or "phone-only contact"
- Offer: 14-day rebuild with booking

### Membership (gym, yoga, salon)
- Reference: their building signage
- Pain: probably "no class schedule online" or "broken Squarespace"
- Offer: site + customer portal with class booking

### Food (restaurant, food truck)
- Reference: their food, the truck, an event
- Pain: probably "no online ordering" or "menu is a JPEG"
- Offer: site + online ordering

## Follow-up cadence

If no reply within 3 days: skip. Don't follow up on cold.
If they reply but go cold mid-conversation: 1 follow-up after 5 days, then drop.
If they ask price and disappear: 1 follow-up after 1 week with a softer offer (e.g., "happy to send the 5-min walkthrough video"); then drop.

The 3-touch rule: don't exceed 3 total touches per cold lead ever.

## Output format

When given a target, save a draft to:
`~/Documents/studio/docs/outreach/cold-dms-YYYY-MM-DD.md`

Append entry:
```
## {business_name} — {one-line vertical} ({city})

**Score:** N/5
**Signals:** {checked list}
**Auto-rejects considered:** {none / list}

### Where I saw them
{specific location + date}

### Draft DM (280-350 chars)

> {full DM text}

### Follow-up template (5 days after, if conversation goes cold)

> {one-line follow-up}
```

## Hard rules

1. **Never DM more than 5 cold leads per day.** Instagram flags volume.
2. **Never use the same opener twice.** Re-randomize per contact.
3. **Never inflate signals** — if Jack hasn't physically seen the truck, don't claim he has.
4. **Never DM at obviously wrong times** — before 9am, after 8pm local time.
5. **Never include links in cold DMs.** Kills deliverability. They reply, then you exchange.
6. **Never auto-send.** Drafts only. Jack types each one manually.

## Failure modes

- **Target's IG is private** → unsendable. Skip.
- **Target's only contact is Facebook page** → defer to FB DM, different surface.
- **Target replies with hostility** → don't engage; mark as auto-reject and move on.
- **Target ghosts after asking price** → that's pricing-sensitivity feedback; log for `pricing-decision-helper`.

## Logging

Append to MASTER_LOG:
`[YYYY-MM-DD HH:MM ET] outreach-trigger COMPLETE → N drafts at cold-dms-YYYY-MM-DD.md, qualified: N, rejected: N`

Track reply rates in `~/Documents/studio/docs/outreach/dm-results.md`.
After 50 DMs sent, calculate per-signal weight (which signals best
predict reply). Re-tune the qualifier from data, not intuition.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('outreach-trigger', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'outreach-trigger', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
