---
name: launch-day-cutover
description: The day-14 (or earlier) production-domain cutover protocol. Runs the pre-launch checklist, files the cutover approval card, and after Jack approves, swaps Vercel's production domain. Counterpart to customer-build-day-1-bootstrap.
triggers:
  - "ready to launch"
  - "go live"
  - "production cutover"
  - "day 14"
  - "domain swap"
  - "launch day"
---

# launch-day-cutover

> The shipping moment. The skill that turns a preview URL into a real
> customer-facing site. Higher stakes than any other build step —
> every check must pass before the domain swaps.

## Pre-launch checklist (every box must be green)

Run these checks against the customer's preview URL. Use existing
skills where applicable.

### Technical (delegate to nightly-polish)
- [ ] Lighthouse mobile ≥ 90
- [ ] Lighthouse desktop ≥ 95
- [ ] All pages return 200 (no 404s, no 500s)
- [ ] All forms submit successfully end-to-end
- [ ] `tel:` and `mailto:` links work
- [ ] SSL valid (auto via Vercel)
- [ ] No `console.error` in any page

### Content (read 00-intake.md + 01-brand.json)
- [ ] No "lorem ipsum" / placeholder text
- [ ] No template phone numbers (e.g., 555-...)
- [ ] Owner's actual phone matches `01-brand.json`
- [ ] Customer's actual photos used (not stock from template)
- [ ] Business address matches truck/sign
- [ ] Hours match `01-brand.json`

### Legal
- [ ] Privacy policy page exists
- [ ] Terms of service page exists
- [ ] Contact page lists business address

### Integration health
- [ ] Stripe webhook signature verification passes (test event)
- [ ] Resend domain verified (SPF + DKIM + DMARC green)
- [ ] Google Business Profile link works
- [ ] AI chatbot returns sensible answers to 3 sample questions

### Customer sign-off
- [ ] Customer has previewed the live preview URL within last 48h
- [ ] Customer has approved by email/SMS — quote their words verbatim
- [ ] Customer knows the launch time (timezone-explicit)
- [ ] Customer knows their admin login (if Portal/Platform tier)

## File the cutover approval card

Use the `approval-card-builder` skill. Title:
`Production cutover — {company_name} ({SKU})`

Card body must include:
- "What this is": "Switching {company_name} from preview URL to {production_domain}."
- "What changes": list — Vercel production domain swap; DNS records; SSL provisioning
- "Why now": "Day {N} of 14. All checklist items green. Customer signed off {date}."
- "Preview / evidence": link to the preview URL + the customer's approval quote
- "What happens if approved": exact commands to be run
- "What happens if rejected": Build Agent waits, customer remains on preview
- "What happens if no decision in 72h": auto-rejected, surface to next morning's kickoff

## After Jack approves

### Step 1 — Vercel domain swap
- Vercel dashboard → customer's project → Settings → Domains → Add `{production_domain}`
- Verify DNS records propagated (use `dig` or browser-based check; 5-min budget)
- Once verified, set as Production domain (removes from preview slot)

### Step 2 — DNS health verification
- Wait for SSL provisioning (usually <60s after DNS verification)
- Curl the production URL — expect 200
- Repeat for all key pages

### Step 3 — Update dossier + Supabase
- Set `customers.production_url`
- Set `customers.status = 'launched'`
- Append event: `kind=launched, payload={production_url, launched_at}`
- Update `05-launch.md` with cutover timestamp

### Step 4 — Customer launch email
Draft (do NOT send) the launch email using `eod-update-writer` in
"launched" mode. Subject: "You're live."

Body template (day14-voice):

> Your site is live at {production_url}.
>
> What I built: {one paragraph}
>
> What you can do now: {3-5 bullets}
>
> Anything that breaks in the first 30 days, I fix it free. Just text me.
>
> — Jack
> Day14

Land it in `02-build-log.md` "Drafts for Jack" section. Jack sends.

## Hard rules

1. **Never swap domains without an approved card.** Even if all checklist items are green.
2. **Never approve your own card.** The card requires Jack's `decided_by = jack` flip.
3. **Never delete the preview URL.** Leave it as a fallback for 30 days post-launch.
4. **Never auto-send the launch email.** Drafts only.
5. **Never swap on a Friday afternoon.** Customer can't reach Jack over the weekend if something breaks. Wait for Monday.

## Failure modes

- **DNS records not yet propagated:** wait up to 1 hour. If still not green, surface to Jack — likely the customer's DNS host needs nudging.
- **SSL provisioning hangs >5 min:** check Vercel status page. If outage, surface; otherwise retry.
- **Customer didn't sign off:** do NOT proceed. Draft an "approval needed before launch" email for Jack to send.
- **Lighthouse score dropped below threshold:** surface as P1 approval card. Often a last-minute image change broke it.

## Logging

Append to MASTER_LOG:
`[YYYY-MM-DD HH:MM ET] launch-day-cutover {customer-slug} → status: launched, url: {prod_url}, confidence: <0.0-1.0>`

This is the highest-celebration log line. Also write a one-line entry
to the public Day14 build log if applicable (the `builds/` page).
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('launch-day-cutover', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'launch-day-cutover', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
