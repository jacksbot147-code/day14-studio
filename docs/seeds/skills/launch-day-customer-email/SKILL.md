---
name: launch-day-customer-email
description: Drafts the "you're live" email to a customer on launch day. Higher-stakes than a regular EOD update — sets the tone for the post-launch relationship. Supporting skill for launch-day-cutover. Distinct from eod-update-writer because the structure is launch-specific.
triggers:
  - "launch email"
  - "you're live email"
  - "production launched"
  - "customer launch announcement"
---

# launch-day-customer-email

> The first email from Day14 after a customer's site goes live.
> This sets the tone for whether the customer becomes a referrer or
> a regretter. ~120 words. Specific. No champagne emoji.

## Inputs

- `customers.company_name`
- `customers.production_url`
- `customers.sku`
- 02-build-log.md — what was actually shipped (read for the "what I built" section)
- Customer's intake answers — for the "what you can do now" section, tuned to their actual workflows

## Output structure

Save draft to `~/Documents/businesses/day14/customers/{slug}/02-build-log.md`
under section: `## Launch email — DRAFT (for Jack to send)`

### Subject line
**"You&rsquo;re live."**

Three-word subject. Concrete. Doesn't ask. Doesn't beg.

Alternative: **"{Company name} is live at {short_domain}."** — slightly more discoverable in inbox; pick based on customer's preferred concrete-vs-personal mix.

### Body (4 paragraphs, ~120 words total)

```
{Customer first name},

Your site is live at {production_url}. {One sentence noting any time-sensitive
thing they should know — e.g., "DNS finished propagating this morning" or
"Stripe webhook tested with $1 test transaction."}

What I built: {one-sentence summary pulled from 02-build-log.md, in Day14 voice.
Operator language. No "leveraged" or "synergized."}

What you can do now: {3 specific actions, formatted as a single sentence
each — not bullets in the email body}. {Tuned to their intake — e.g.
"share the site URL in your truck wrap photos, swap your Google Business
website URL to this one, add the URL to your Instagram bio."}

Anything that breaks in the first 30 days, I fix it free. Just text me.

— Jack
Day14
```

## Voice rules

Follow `day14-voice` plus these launch-specific tweaks:

- **First-name signature** — humanize the relationship now that the work is done
- **30-day warranty mention** — sets the support expectation explicitly
- **Direct phone option** — never "submit a ticket"; always "text me"
- **No "thank you for your business"** — sounds vendor-y. Use "Glad we shipped on time" instead if warranted
- **No exclamation points** — even on launch day. Confidence > enthusiasm
- **No emoji** unless customer's own brand uses them consistently

## Per-SKU tuning

### Site (marketing-only)
- "What you can do now" focuses on: sharing the URL, updating Google Business, social media bios
- Mention the chatbot if it was wired

### Portal (Site + customer login + billing)
- Adds: "Your first customer can register at {production_url}/login. I&rsquo;ll send their welcome email automatically when they sign up."
- Note the Stripe live-mode flip is on Jack — customer doesn't have to think about it

### Platform (Portal + operator admin app)
- Adds the admin URL + login credentials reminder (sent separately via password manager, not in this email)
- "Your dashboard at {production_url}/admin shows today's bookings, this month's MRR, and any pending customer messages."

## Hard rules

1. **Never auto-send.** Draft into the dossier; Jack reviews + sends from his own inbox.
2. **Never include secret URLs** (admin panel passwords, Stripe dashboard, etc.) in the email body. Send those separately via password manager or SMS.
3. **Never promise functionality not yet built.** If something on the SOW wasn't shipped, name it in the email and propose a date.
4. **Never use the customer's testimonial back at them.** They haven't given one yet; don't put words in their mouth.
5. **Never send on a Friday afternoon.** Customer hits a bug, can't reach Jack over the weekend. Schedule for Monday-Thursday 9am-2pm window.

## Failure modes

- **Customer's email bounces**: SSL check + Resend domain check; if both green, customer's mail provider rejected — try alternate email from intake
- **Customer hasn't logged in 7 days post-launch**: surface to Jack as a warm-check; might need a personal call rather than another email
- **30-day warranty period and customer complains**: log issue, schedule a fix; this email's promise is the contract

## Logging

`[YYYY-MM-DD HH:MM ET] launch-day-customer-email → customer: {slug}, draft_chars: N, awaiting: Jack approval`

After Jack sends:
`[YYYY-MM-DD HH:MM ET] launch-day-customer-email SENT → customer: {slug}, sent_at: {timestamp}`

## When invoked

- Step in `launch-day-cutover` after ssl-provisioning-verifier passes
- Manual invocation when customer's launch was delayed and needs a re-email
- NEVER for non-launch milestones (use `eod-update-writer` for those)
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('launch-day-customer-email', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'launch-day-customer-email', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
