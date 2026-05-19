---
name: post-storm-damage-assessor
description: 24-72h after a storm passes SWFL, this skill drafts the per-customer damage-assessment outreach. Asks what they need from Day14 (banner update, post-storm landing page, pause monthly fee). Supporting skill for storm-week-comms.
triggers:
  - "post-storm"
  - "after the hurricane"
  - "damage check"
  - "storm passed"
---

# post-storm-damage-assessor

> The storm is over. Customer's site might still show a "closed for
> storm" banner. Their business might be fine, or destroyed, or
> somewhere in between. This skill is the structured reach-out.

## Trigger

`hurricane-watch-poller` reports "storm passed" (no longer in active cone, dissipated, or moved on). 24h later, this skill activates.

## Per-customer outreach draft

For each customer with `customers.feature_flags.storm_mode = true`:

Draft an email (use `day14-voice` + `warmth-calibrator`):

```
Subject: After {storm_name} — what do you need?

{First name},

Glad to see SWFL on the other side of {storm_name}. Whenever you're
ready, three quick yes/no questions:

1. **Site banner**: still up. Reply "remove" and I&rsquo;ll flip it off
   today. Reply "keep" and we leave it until you say otherwise.

2. **Re-opening status**: are you back to normal hours? Reply with
   your current hours so I can update the site.

3. **Anything broken**: any feature on your site that&rsquo;s misbehaving
   post-storm? Sometimes power surges nudge things. Reply with what
   you noticed.

If your business took real damage and you need a pause on the
monthly fee, just say so — we&rsquo;ll figure it out.

— Jack
Day14
```

Save to dossier; file as approval card for Jack to review + send.

## Reply handling

When customer replies, parse for these signals:

| Signal | Action |
|---|---|
| "Remove" / "flip it off" / "back to normal" | Flip `feature_flags.storm_mode = false`, redeploy |
| "Keep" / "still recovering" | Leave banner; check back in 7 days |
| Specific hours mentioned | Update `01-brand.json.contact.hours` |
| Specific feature broken | File approval card "fix {feature} for {customer}" |
| "Need a pause" / "can't pay this month" | Surface to Jack as P1 — financial decision, his call |
| No reply within 7 days | Send one gentle follow-up; then stop |

## Aggregate dashboard

Post-storm, write a single rollup at `~/Documents/studio/docs/swfl/post-storm-{storm-slug}-{date}.md`:

```
# Post-storm assessment — {storm_name}

## Storm summary
- Passed: {date}
- Category at SWFL: {N}
- Customers in affected area: {N}

## Per-customer status (after outreach + replies)

| Customer | Outreach sent | Replied | Banner | Status |
|---|---|---|---|---|
| acme-pool | 2026-09-15 | yes (2026-09-16) | removed | normal |
| bonita-lawn | 2026-09-15 | no | up | awaiting reply |
| naples-spa | 2026-09-15 | yes (2026-09-17) | kept | recovery period; banner stays through Oct |

## Action items
- {N} customers need fee pause discussions
- {N} customers have outstanding "still recovering" status
- {N} customers fully normalized
```

## Hard rules

1. **Never auto-pause customer fees.** Money decisions are Jack's.
2. **Never assume "no reply" means OK.** Could mean customer is overwhelmed; surface as caring follow-up after 7 days.
3. **Never include sales pitches in post-storm comms.** Now is not the moment for upsells.
4. **Always offer the fee-pause option proactively.** Customers in distress shouldn't have to ask.
5. **Never bundle post-storm comms with regular EOD emails.** It's a distinct conversation.

## Failure modes

- **Customer replies with anger** ("you should've prevented this"): legitimately escalate to `complaint-escalation`. Storms aren't Day14's fault but customer might be displacing stress
- **Customer reports site is actually broken** (not just banner): triage like any P1 bug
- **Customer takes weeks to reply**: legitimate; pause the follow-up cadence, give them space

## When invoked
- 24h after `hurricane-watch-poller` reports "storm passed" for SWFL
- Manually when a customer mentions post-storm conditions in any context
- After every named-storm event, even minor ones (a tropical-storm reply rate of 30% is signal)

## Logging

`[YYYY-MM-DD HH:MM ET] post-storm-damage-assessor → storm: {name}, customers_contacted: N, replies_received: N, banners_removed: N, fee_pauses_requested: N`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('post-storm-damage-assessor', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'post-storm-damage-assessor', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
