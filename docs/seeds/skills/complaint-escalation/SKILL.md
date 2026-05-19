---
name: complaint-escalation
description: When inbound-classifier tags a message as "complaint", this skill kicks in. Drafts the acknowledgment + proposed fix, surfaces the situation to Jack via SMS (if Twilio wired), logs the incident, and triggers a postmortem after resolution. Supporting skill for inbound-classifier.
triggers:
  - "customer complained"
  - "P0 issue"
  - "angry customer"
  - "refund request"
  - "unhappy"
---

# complaint-escalation

> A complaint is the most consequential inbound a customer sends.
> Mishandled = bad review + lost referral + lawyer. Handled right
> = stronger relationship than before the complaint.

## Trigger
inbound-classifier tags message as `complaint` (confidence > 0.7).

If confidence 0.5-0.7: surface to Jack as "possible complaint" — let him classify before this skill runs.

## The 4-step response (in order, all 4 happen)

### Step 1 — Immediate acknowledgment draft (~30 sec)
Draft a reply (use `eod-update-writer` in "complaint-ack" mode). Save to dossier 04-feedback.md under the inbound entry.

Reply structure (~80 words):
```
{Customer first name},

That&rsquo;s on me. {Specific acknowledgment of what went wrong, in their words.}

I&rsquo;m looking at {specific thing} right now. {What I&rsquo;m doing in the next
4 hours.} {When I&rsquo;ll have a fix or update.}

Text me direct: {Jack's phone}. I&rsquo;d rather talk than type.

— Jack
Day14
```

### Step 2 — Operator SMS to Jack (~10 sec)
If Twilio is wired, send Jack an SMS:

```
P0: {customer_name} complaint
Re: {one-line subject}
Draft reply in 04-feedback.md
Suggested fix: {one-line}
Open: {customer dossier URL}
```

If Twilio not wired: log P0 to MASTER_LOG with `⚠️` prefix so morning kickoff catches it.

### Step 3 — Pause the build clock (if mid-build)
If `customers.status` is `building` or `iterating`:
- Append event: `kind=clock-paused, payload={reason: complaint, paused_at}`
- The 14-day SLA clock pauses per SOW until the complaint resolves
- Update `customers.notes` with the pause reason

### Step 4 — Auto-schedule a postmortem
Once Jack marks the complaint resolved (via approval card flip), invoke `postmortem-writer` automatically. Output to `~/Documents/studio/docs/postmortems/{date}-{slug}.md`. The agent doesn't write the postmortem itself — it scaffolds the structure and waits for Jack's input on root cause.

## Severity sub-classification

Within "complaint", sub-tag for routing:

| Sub-tag | Signal | Action |
|---|---|---|
| **service-quality** | "the site is broken", "doesn't work" | Investigate + fix; postmortem |
| **scope-misunderstanding** | "I thought X was included" | Re-read SOW; check for ambiguity; postmortem if our doc was unclear |
| **timing** | "you said it would be done by X" | Verify SOW timing; pause clock if our fault; communicate new date |
| **billing** | "I was charged wrong" | Surface to Jack directly — no agent-drafted reply on money issues |
| **personal** | "you didn't listen to me" / "I felt dismissed" | Surface to Jack for a phone call, NOT an email reply |

## Hard rules

1. **Never auto-send a complaint reply.** Drafts only. Jack reviews + sends.
2. **Never offer refunds or compensation in a draft.** That's a money decision. Surface as a separate approval card.
3. **Never argue with the customer** in a draft, even if they're factually wrong. Tone: "let me look at this" not "well actually..."
4. **Never defer to "policy"** in a complaint reply. Day14 doesn't have policies — Jack has judgment.
5. **Never close a complaint** until customer explicitly confirms resolution. Don't assume silence = okay.

## Failure modes

- **Customer's message is hostile / threatening**: still draft an acknowledgment, but tag for "personal phone call only" — Jack calls, doesn't email.
- **Complaint cites a third-party issue** (Stripe billing, Vercel outage): explain in plain English, propose what Day14 can do, don't blame the third party.
- **Customer drops complaint mid-thread** (replies "nevermind"): don't auto-close. Surface to Jack — sometimes "nevermind" means "I'm giving up on you," not "I'm fine."

## Logging

`[YYYY-MM-DD HH:MM ET] complaint-escalation ACTIVATED → customer: {slug}, sub-tag: {tag}, sms_sent: {yes|no}, clock_paused: {yes|no}`

Resolution log:
`[YYYY-MM-DD HH:MM ET] complaint-escalation RESOLVED → customer: {slug}, days_to_resolve: N, postmortem: {path}`

Quarterly: re-read the complaint log. Look for patterns. If 3+ complaints share a sub-tag, that's a process/template fix priority.

## When invoked

- Automatically by `inbound-classifier` when tag = complaint
- Manually when Jack flags a customer interaction as needing escalation
- When a customer's review (Google/Yelp) is classified by `review-response` as negative-and-fair
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('complaint-escalation', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'complaint-escalation', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
