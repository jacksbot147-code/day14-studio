---
name: lead-source-tracker
description: Tag every Day14 inbound lead with its source (cold DM, warm DM, Splash Jacks case study video, organic search, referral) and track conversion by source. Tells Jack which channels actually produce paying customers. Supporting skill for outreach-trigger.
triggers:
  - "lead source"
  - "where did they come from"
  - "channel attribution"
  - "conversion by source"
---

# lead-source-tracker

> 5 channels in flight. Council 0001 said "double down on the one
> that produces customers." This skill is how we measure that.

## The source taxonomy

Every lead gets one source tag:

| Tag | What it means |
|---|---|
| `cold-dm` | Cold Instagram DM via `outreach-trigger` |
| `warm-dm` | Warm Instagram DM via `warm-dm-personalizer` |
| `case-study-video` | Splash Jacks walkthrough or other public video |
| `organic-search` | Found day14.us via Google |
| `referral-existing-customer` | Existing customer sent them |
| `referral-non-customer` | Someone Jack knows referred them (friend, network) |
| `walk-in` | In-person meeting / event |
| `inbound-cold` | Lead form filled by someone Jack doesn't recognize, no UTM trace |
| `unknown` | Source couldn't be determined |

## How tagging happens

### Automatic (via UTM)
Day14's marketing site adds UTM parameters to every CTA link:
- Cal.com link: `?utm_source=day14-site&utm_medium=cta-{location}&utm_campaign=...`
- DM link: `?utm_source=ig-dm&utm_medium=direct&utm_content={short-id}`
- Video link: `?utm_source=video-{slug}&utm_medium=video&utm_content=...`

When a Stripe checkout completes, Stripe's metadata captures the UTM (via the success URL chain). `dossier-folder-initializer` writes it to `customers.lead_source`.

### Manual fallback
If UTM is missing (customer typed the URL directly, removed query string, etc.):
- Surface to Jack on kickoff call: "what made you reach out?"
- Jack tags the source manually in `02-build-log.md`
- Update `customers.lead_source`

## What this skill computes

### Per-channel conversion funnel
For each source tag, track:
1. **Sent / shown**: DMs sent, video posts, ad impressions (where measurable)
2. **Inbound leads**: lead form / Cal.com booking received
3. **Deposit paid**: deposit_paid_at set
4. **Launched**: status reached `launched`
5. **MRR retained @ 90 days**: still paying after 90 days

Output a table for `weekly-council-review`:

```
| Source | Sent | Replied | Booked | Deposited | Launched | MRR@90d |
|---|---|---|---|---|---|---|
| cold-dm | 80 | 12 | 4 | 2 | 1 | 1 |
| warm-dm | 5 | 5 | 5 | 3 | 3 | 3 |
| case-study-video | 3 posts (~5k views) | 8 inbound | 4 | 2 | 1 | 1 |
| referral-existing | 0 outbound | 2 inbound | 2 | 1 | 1 | 1 |
```

### Cost per acquired customer (CAC) per source
- Cold DM: Jack's time × hours per DM × N DMs / customers acquired
- Video: production time × hours / customers acquired
- Referral: $0 outbound

Convert to dollars at $80/hr Jack's time. Compare CACs.

## Output

Weekly report written to `~/Documents/studio/docs/marketing/source-performance.md` (overwritten weekly):

```
# Source performance — {date_range}

## Funnel
{table above}

## CAC per source (current week)
- cold-dm: ${amount} ({hours} hours / {N} customers)
- warm-dm: ${amount}
- video: ${amount}
- referral: $0

## Pattern observations (3 max)
- {e.g., "warm-dm has 100% deposit-rate; volume is the bottleneck"}
- ...

## Recommended actions for next week
- {e.g., "shift 30% of cold-dm time → 'find more warm targets' (sort phone contacts for SWFL service businesses)"}
```

## Hard rules

1. **Never claim a source attribution without evidence.** UTM or kickoff-call answer; not guesses.
2. **Never combine sources** when a customer touched multiple (e.g., saw a DM + later watched the video). Attribute to "last touch before booking" (the convention).
3. **Never present CAC without acknowledging Jack's time isn't free.** $80/hr is the floor — adjust if Jack's hourly self-rate changes.
4. **Always include "MRR @ 90 days"** — a customer who churns by day 60 isn't profitable; CAC alone is misleading.

## Failure modes

- **Stripe doesn't preserve UTMs through checkout**: explicitly add a hidden form field in `/thanks` page that captures pre-checkout UTM and POSTs to Day14 OS
- **Customer doesn't remember how they found you**: tag as `unknown`; don't force a guess
- **Source mid-cycle (e.g., new channel launched)**: track from day 1; first week's data is noise; full attribution needs 4 weeks

## Logging

`[YYYY-MM-DD HH:MM ET] lead-source-tracker → weekly report at marketing/source-performance.md, winner: {source}, runner-up: {source}`

## When invoked
- Inside `dossier-folder-initializer` to tag at creation
- During `kickoff-call-scheduler` as a fallback question
- Weekly via scheduled task to produce the funnel report
- Inside `weekly-council-review` to feed the meta-pattern observation
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('lead-source-tracker', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'lead-source-tracker', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
