---
name: warm-dm-personalizer
description: Generate personalized Instagram DMs to people Jack already knows (existing network) for Day14 outreach. Different from cold outreach — leans on prior context Jack has with the person. Counterpart to outreach-trigger (cold). Per Council 0001 "Outsider" recommendation: warm before cold.
triggers:
  - "warm DM"
  - "people I know"
  - "Instagram DM"
  - "personal outreach"
  - "friend's business"
  - "existing network"
---

# warm-dm-personalizer

> Cold DMs are for when warm is exhausted. Warm DMs are higher
> response rate but limited supply. This skill writes one per
> contact, each one specific enough that a generic template
> would be obvious.

## Input

For each target person:

```yaml
name: First Last
relationship: <how Jack knows them — neighbor, ex-coworker, friend, family friend>
last_contact: <date or "months ago" or "not since X event">
business_name: <their business>
business_type: <pool service, lawn, AC, food truck, etc.>
current_state: <what their website / online presence looks like today>
specific_pain: <if Jack has heard them complain about something>
```

## Output structure

Single DM, 280-350 characters (Instagram limit), with these elements
in order:

1. **Specific opener referencing your prior context** (2 sentences)
2. **The offer in one sentence** (no preamble)
3. **The reason now** (one sentence — why this week, why for them)
4. **Soft CTA** (one question — can they reply with yes/no or a quick fact)

## Voice

Use `day14-voice` rules. Specifically for warm DMs:

- Drop "Hey {name}" — sounds salesy. Open mid-thought.
- No "Hope you're doing well" — Jack doesn't open texts that way
- First-person singular ("I", "I'm building")
- Reference a specific shared memory or context
- Never copy-paste between contacts — each one must read individually

## Example DM (template, not for sending verbatim)

> Saw {their_truck/sign} the other day on {specific_road}. Reminded
> me you mentioned at {event} that your old site was a mess.
> I'm building 14-day flat-fee websites for SWFL service businesses
> now ($2,500). Want a quick preview for {business_name} before
> you decide?

## What to avoid

**Don't include in warm DMs:**
- Links (gets flagged by Instagram, kills deliverability)
- Pricing comparisons ("cheaper than Jobber")
- Long social proof ("I've built 3 sites already")
- Asks for a call ("when can we hop on a call?")
- Multiple questions

**Do include:**
- One specific reference to your prior connection
- One concrete offer
- One specific question they can yes/no in 5 seconds

## The shortlist generator

When Jack says "find 5 people I know," scan these sources:

1. `~/Documents/businesses/day14/customers/*/00-intake.md` — anyone who almost became a customer
2. Manual list Jack maintains in `~/Documents/studio/docs/outreach/warm-shortlist.md` (create if missing)
3. Jack's recent messages — anyone who mentioned a business problem

Per-contact, draft ONE DM. Output all 5 in one file:
`~/Documents/studio/docs/outreach/warm-dms-YYYY-MM-DD.md`

Format:
```
## {Name} — {business_name}

**Relationship:** {how Jack knows them}
**Last contact:** {when}
**Why now:** {specific reason this week}

### Draft

> {280-350 char DM body}

### Backup angle (if no reply in 5 days)

> {one-line follow-up, not a different pitch}
```

## Hard rules

1. **Never send.** Drafts only. Jack types each one manually into Instagram, after eyeballing for the right tone.
2. **Never use the same opener for two contacts.** Re-randomize each time.
3. **Never claim shared context that doesn't exist.** If Jack hasn't actually talked to this person in 2 years, say "haven't crossed paths in a while" — don't pretend it was last month.
4. **Never recommend more than 5 DMs in a session.** Quality > quantity for warm channel.
5. **Never put names in chat output.** Draft the DMs in a file, reference by initials in chat.

## Failure modes

- **Jack has no prior context with target** → it's not warm, it's cold. Use `outreach-trigger` skill instead.
- **Target is a chain franchise** → reject; franchisees don't autonomy on web spend.
- **Target's site looks recently redesigned** → reject; they just spent on it.
- **Target is a competitor of Day14** → obviously skip; surface to Jack as a question.

## Logging

Append to MASTER_LOG:
`[YYYY-MM-DD HH:MM ET] warm-dm-personalizer COMPLETE → N drafts at warm-dms-YYYY-MM-DD.md, confidence: <0.0-1.0>`

After Jack sends, log replies (or non-replies) in
`~/Documents/studio/docs/outreach/dm-results.md` so the skill can
learn what works.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('warm-dm-personalizer', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'warm-dm-personalizer', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
