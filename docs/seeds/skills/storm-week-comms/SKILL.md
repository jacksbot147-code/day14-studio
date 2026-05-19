---
name: storm-week-comms
description: SWFL hurricane-week customer communications protocol. Active June 1 to November 30 with elevated alert during named-storm warnings. Drafts pre-storm, mid-storm, and post-storm comms for both Day14 itself and live customer sites. The local moat skill that out-of-state agencies can't replicate.
triggers:
  - "hurricane"
  - "tropical storm"
  - "evacuation"
  - "storm warning"
  - "category 1"
  - "category 2"
  - "category 3"
  - "category 4"
  - "category 5"
  - "weather alert"
  - "june 1"
  - "november 30"
---

# storm-week-comms

> Florida service businesses lose 2-4 weeks of revenue per year to
> storms. Day14 customers shouldn't lose another week to broken
> infrastructure or radio silence. This skill is the playbook for
> how to communicate during storm windows.

## When this skill is active

**Always-on (background context, June 1 – November 30):**
- Don't schedule launches during named-storm windows
- Reference "hurricane-tested hosting" only when warranted
- Be aware of customers' service interruptions

**Elevated (when named storm in NHC forecast cone for SWFL):**
- T-7 days: pre-storm comms drafted
- T-3 days: emergency contact info pushed to customer sites
- T-1 day: final go/no-go on planned operations
- T+1 to T+7: post-storm comms + service interruption mode

## The four customer-comm moments

### 1. T-3 to T-7 — Pre-storm prep email
Draft for each active customer. Use `eod-update-writer` in
"storm-prep" mode.

Body template (day14-voice):

> Watching {storm_name}. Forecast track: {brief}.
>
> Your site at {production_url} is hosted on Vercel and stays up
> as long as their data centers do. I'm monitoring.
>
> Two things to do on your end:
> 1. {Vertical-specific prep — e.g., for pool service: "pull cushions and umbrellas off the deck"}
> 2. {Site-specific prep — e.g., "the booking form might pause if you have power out. I can flip a 'closed' banner remotely if you text me."}
>
> Anything you need from me, text {phone}.
>
> — Jack
> Day14

### 2. T-1 to T+0 — Emergency banner deploy
If customer requests, deploy a homepage banner:

> ⚠️ Closed for {storm_name}. Will reopen as soon as we can.
> Emergencies: text {emergency_contact} 24/7.

Deploy via a feature flag in their `brand.json` (`feature_flags.storm_mode: true`).
Removing the banner = flip flag back to false + redeploy.

### 3. T+1 to T+3 — Damage check + reopen comms
Once storm passes:

1. Email customer: "Storm passed. Site still up. When you're ready to reopen, text me — I'll flip the banner off."
2. Wait for customer's go-ahead.
3. Flip the banner off, redeploy.
4. Send "you're live again" email.

### 4. T+7 to T+14 — Recovery offer
If customer's business was significantly affected:

- Draft a "recovery promotion" landing page (free)
- Optional: post-storm social posts on customer's behalf, drafted for their approval
- Pause the monthly invoice if customer's business was closed >2 weeks (Jack's call, not auto)

## Day14 itself

During storm windows:

- **Pause customer acquisition.** Don't post the case study video / send DMs the week of a named storm. SWFL recipients are not in buying mode.
- **Day14 site banner:** at T-1, add a top banner: "Open during {storm_name} — emergency support: text {phone}."
- **Mac mini runtime:** if Jack's laptop is the runtime (May 16 – Jun 9 window), assume power outages. Move runtime to phone hotspot if available.

## SWFL-specific knowledge

- **Hurricane season:** June 1 – November 30. Peak: August – October.
- **Names mattering:** SWFL care about Category 2+ (Cat 1 is "just rain"). Don't over-alarm for tropical storms.
- **Evacuation zones:** A (mandatory), B, C, D. Most Day14 customers in Cape Coral are in B or C.
- **Power outage averages:** 1-3 days for Cat 2; 7-14 days for Cat 4+.
- **Post-storm spike:** roofing, tree service, restoration call volumes spike 10× — those customers should have working sites + clear "we're booking 2 weeks out" messaging.

## Hard rules

1. **Never auto-deploy a storm banner.** Customer must request it. Drafts are fine.
2. **Never post "thoughts and prayers" social content** on customer's behalf. Sounds hollow. Customer's voice, customer's call.
3. **Never claim "we're hurricane-proof"** — nobody is. "Vercel-hosted, stays up as long as their DCs do" is honest.
4. **Never pause monthly invoices without Jack's explicit call.** Money flows are Jack-only decisions.
5. **Never miss a pre-storm check.** If a storm enters the cone, customer comms happen even if Jack is unreachable.

## Failure modes

- **NHC forecast changes mid-week:** re-run pre-storm drafts; don't trust stale forecasts.
- **Vercel outage during storm:** customer's site goes down too. Surface immediately. Cloudflare backup not in scope.
- **Customer doesn't respond to "ready to reopen?":** banner stays. Wait. Don't assume.
- **Customer's email host (their personal domain) is down post-storm:** SMS via Twilio is the fallback channel.

## Logging

Append to MASTER_LOG:
`[YYYY-MM-DD HH:MM ET] storm-week-comms ACTIVATED → storm: {name}, customers_affected: {list}, drafts: {paths}`

During season but no active storm:
`[YYYY-MM-DD HH:MM ET] storm-week-comms IDLE → season active, no named storm in cone`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('storm-week-comms', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'storm-week-comms', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
