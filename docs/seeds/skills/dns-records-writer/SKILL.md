---
name: dns-records-writer
description: Generate the exact DNS records (A, CNAME, MX, TXT) needed for a customer's production domain cutover. Outputs a copy-paste-ready record list for Jack to add at the customer's DNS host (Cloudflare / Vercel Domains / Namecheap / GoDaddy). Supporting skill for launch-day-cutover.
triggers:
  - "DNS records"
  - "domain cutover"
  - "A record"
  - "CNAME"
  - "MX record"
  - "verify DNS"
---

# dns-records-writer

> DNS is the most error-prone step in launch day. One typo and the
> site is down for 24-48 hours. This skill outputs the exact records
> with no ambiguity.

## Inputs

- `customers.production_domain` — e.g., `acmepoolco.com`
- `customers.vercel_project` — for the CNAME target
- Email plan: Resend domain at the customer's domain? Or just transactional from `hello@day14.us`?
- Reverse DNS / SPF preferences

## Outputs

A markdown file at `~/Documents/businesses/day14/customers/{slug}/dns-records.md`:

```
# DNS records — {customer_domain}

Add these at your DNS host (Cloudflare / Vercel Domains / etc.) in this
order. After adding, wait up to 60 min for propagation.

## Apex domain (acmepoolco.com)

| Type | Name | Value | TTL |
|---|---|---|---|
| A | @ | 76.76.21.21 | Auto |

(Vercel's apex-domain redirect target)

## www subdomain

| Type | Name | Value | TTL |
|---|---|---|---|
| CNAME | www | cname.vercel-dns.com | Auto |

## Email — if using Resend at customer's domain

| Type | Name | Value | Notes |
|---|---|---|---|
| MX | send | feedback-smtp.us-east-1.amazonses.com | Priority 10 |
| TXT | send | "v=spf1 include:amazonses.com ~all" | SPF |
| TXT | resend._domainkey | (long DKIM string — Resend provides per-domain) | DKIM |
| TXT | _dmarc | "v=DMARC1; p=none;" | DMARC, permissive to start |

## Verification

After adding, run from your laptop:
```bash
dig +short {customer_domain}
dig +short www.{customer_domain}
dig +short -t MX send.{customer_domain}
dig +short -t TXT send.{customer_domain}
```

All four should return non-empty within 60 minutes.
```

## Per-host instructions

The skill should know the gotchas per common DNS host:

### Cloudflare
- "Proxy status" toggle: keep OFF for the initial cutover. Enable later only after testing.
- Cloudflare strips some headers — verify Resend deliverability post-launch
- Auto TTL is fine

### Vercel Domains
- Cleanest UX — most records auto-suggested
- Apex domain is set via "Set as production" toggle, not an A record
- Resend integration not auto-suggested; add manually

### Namecheap / GoDaddy / Hover
- TTL default is often 30 min — change to 5 min for the cutover, then back to default
- Apex domain (`@`) syntax varies; Namecheap uses `@`, GoDaddy uses empty string
- DKIM records often hit length limits — split if needed

## Hard rules

1. **Never auto-modify customer's DNS.** Jack pastes the records into the host manually. We don't have API tokens for customer DNS hosts.
2. **Never delete existing DNS records** unless explicitly listed. Customer may have other services (email forwarding, calendar, etc.) using existing records.
3. **Never recommend lowering TTL to <300s for permanent records.** Only use low TTL during cutover window; raise it back after stable.
4. **Never include placeholder DKIM strings.** Get the actual string from Resend's dashboard before generating the doc.
5. **Never skip MX records** if customer wants email at their domain. Forwarding-only setups break Resend.

## Failure modes

- **Customer doesn't know DNS host**: surface to kickoff call. WHOIS lookup gives a hint via the registrar.
- **Customer's domain has DNSSEC enabled**: warn — propagation will be slower and any error harder to roll back. Recommend disabling DNSSEC pre-cutover, re-enabling 48h post.
- **Apex A record can't be set (some hosts forbid it)**: use Vercel's auto-detect; offer "alias" or "ANAME" instead.
- **Resend DKIM record exceeds 255 chars**: split into multiple quoted strings — DNS handles this but customer's host UI may not.

## Logging

`[YYYY-MM-DD HH:MM ET] dns-records-writer → customer: {slug}, records_generated: N, file: docs/.../dns-records.md`

After Jack adds records and dig verification passes:
`[YYYY-MM-DD HH:MM ET] dns-records-writer VERIFIED → customer: {slug}, propagation_time_min: N`

## When invoked

- Step in `launch-day-cutover` before the production domain swap
- When a customer adds a new email service that needs DNS
- When a Lighthouse audit reveals missing CAA records
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('dns-records-writer', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'dns-records-writer', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
