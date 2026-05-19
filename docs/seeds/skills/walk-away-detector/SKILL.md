---
name: walk-away-detector
description: When a prospect is unlikely to be a good customer for Day14, surface that BEFORE the deposit is collected. Catches red flags during intake / kickoff call: scope creep, pricing fights, treating Jack as an employee, multiple revisions of the same answer. Supporting skill for pricing-decision-helper.
triggers:
  - "should we take this customer"
  - "red flags"
  - "difficult customer"
  - "qualify lead"
---

# walk-away-detector

> Bad customers cost more than they pay. Day14's margin on a 14-day
> build assumes a customer who follows the SOW. A customer who
> rewrites the SOW every Tuesday turns a $2,500 build into 80 hours
> of work for $30/hr. This skill catches them early.

## The 7 red flags (any 3+ = walk away)

### 1. Pricing fight before signature
The prospect questioned price 3+ times before agreeing. Signal: they'll fight every invoice, scope change, monthly bill.

### 2. "I had a bad experience with my last agency"
Common — and sometimes legitimate. But probe: was the agency's fault, or the prospect's? If they describe the agency as "useless" / "scam" without owning their part, they'll say the same about Day14.

### 3. Multi-stakeholder confusion
Two+ people from the customer side, with disagreement among them about what they want. Day14's 14-day model needs ONE decision-maker. If there are two, identify which one signs the SOW.

### 4. Scope creep before deposit
During intake, prospect added 3+ features not in the original ask. "Can you also do social media for me?" "What about Google Ads?" Every "also" pre-deposit predicts 10 more post-deposit.

### 5. Treating Jack as an employee
Language signal: "I need you to..." vs "Can you help me with..."
The first treats Jack as a contractor with no autonomy. The second treats him as a partner.

### 6. Unrealistic timeline despite Day14's 14-day model
"I need it Monday" when today is Friday. Day14's whole pitch is 14 days — if the prospect can't accept that, they're not buying Day14.

### 7. Personal red flags
Rudeness to support staff, slurs, threats, "I know the owner of [X]" — these don't change with money. Walk away regardless of revenue.

## How the skill activates

During or after the kickoff call, Jack (or the agent) tallies the red flags observed. Output:

### 0-2 red flags
Proceed normally. Note any flags in the customer dossier `00-intake.md` under "Jack's notes" so future agents stay aware.

### 3-4 red flags
Surface as approval card: "Customer {name} showing {N} red flags. Recommend (a) decline with kind note, (b) accept with elevated SOW terms (e.g., 100% upfront not 50% deposit), or (c) accept with eyes wide open."

### 5+ red flags
Auto-recommend decline. Draft the decline message (use day14-voice):

```
{First name},

Day14 isn&rsquo;t the right fit for {business name} — your scope is wider
than our 14-day model can do well. You&rsquo;d be better served by
{specific recommendation: a full agency / a hire / waiting until ready}.

Happy to refer you to someone if useful.

— Jack
Day14
```

Jack still has final say. But the default is decline.

## What's NOT a red flag

These ARE NOT red flags, even though they might feel like them:

- **Many specific questions about the SOW** — that's a good customer
- **Asking for a discount once** — normal; we have `discount-floor-enforcer`
- **Wanting to see a portfolio** — reasonable
- **Initial slow response** — they're busy running a business
- **Disagreement about specific design choices** — they're engaged

## The cost of accepting a red-flagged customer

Day14's data (track via this skill over time):

- 0-2 flags: project margin ≈ list ($80-$120/hr equivalent)
- 3-4 flags: margin drops to ~$50/hr; 50% chance of complaint
- 5+ flags: NEGATIVE margin likely; 80% chance of refund-request

These numbers are stub estimates until Day14 has 10+ customers. After
that, this skill's recommendations should be calibrated from real data.

## Hard rules

1. **Never decline a prospect publicly** — Yelp / social can amplify a decline. Always private message.
2. **Never explain "you have red flags"** to the prospect. Frame as scope/fit, not character.
3. **Never accept a 5+ flag prospect** because the revenue is needed. The downstream cost > the revenue.
4. **Always log the decline reason** internally — the pattern accumulates value.
5. **Never re-engage a declined prospect later.** Once declined, they're out for at least 12 months.

## Logging

`[YYYY-MM-DD HH:MM ET] walk-away-detector → prospect: {name}, flags: {count, list}, recommendation: {accept|conditional|decline}`

If declined:
`[YYYY-MM-DD HH:MM ET] walk-away-detector DECLINED → prospect: {name}, draft: {path}`

Quarterly: count declined prospects who later became "I told you so" — review what they ended up doing and whether Day14's call aged well.

## When invoked
- During / after every kickoff call
- When intake form responses raise flags (e.g., "ASAP", "tight budget", "I need exactly this and nothing else")
- Manually when Jack feels "off" about a prospect — name the feeling via the checklist
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('walk-away-detector', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'walk-away-detector', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
