---
name: dns-drift-watcher
description: Daily check that every customer's DNS records still match what we expect (A → Vercel, CNAME → app, MX → Resend, etc.). Catches accidental customer DNS changes that silently break the site.
triggers:
  - "dns drift"
  - "dns broken"
  - "site dns"
  - "/dns"
---

# dns-drift-watcher

> Customers change their DNS sometimes (intentionally, or via well-meaning
> domain-registrar "suggestions"). This skill catches it within 24h
> instead of when the customer notices the site is broken.

## What this skill does

1. Reads expected DNS records from each customer's dossier:
   `~/Documents/businesses/_shared/customers/{slug}/01-dns-expected.json`
2. Queries actual DNS for the customer's domain:
   ```
   dig {customer.com} A          → expect Vercel IP
   dig www.{customer.com} CNAME  → expect day14-vercel.app
   dig {customer.com} MX         → expect mx1.resend.com, mx2.resend.com
   dig {customer.com} TXT        → expect SPF + DKIM
   ```
3. Compares actual vs expected
4. Flags drift

## Expected record file format

```json
{
  "customer_slug": "splash-jacks-pools",
  "domain": "splashjackspools.com",
  "expected": {
    "A": "76.76.21.21",
    "CNAME": "cname.vercel-dns.com",
    "MX": ["mx1.resend.com", "mx2.resend.com"],
    "TXT.spf": "v=spf1 include:resend.com -all",
    "TXT.dkim": "..."
  },
  "last_verified": "2026-05-17",
  "drift_history": []
}
```

## Hard rules

1. **Never auto-fix.** Customer DNS is customer property; we alert + advise.
2. **Always include the diff** in the alert (expected vs actual, both shown).
3. **Always check from 2+ DNS resolvers** (1.1.1.1, 8.8.8.8, customer's registrar's NS).
4. **Never alert on TTL-window changes** — DNS propagation is normal.
5. **Always notify customer + Jack** when MX records change — email delivery at stake.
6. **Always escalate to P0** when A record points away from us — site is effectively dead.

## Output

```
🌐 DNS drift scan: 2026-05-17

splashjackspools.com         ✓ all records match expected
buildbridge.com              ⚠ DRIFT — A record changed
                              expected: 76.76.21.21 (Vercel)
                              actual:   45.32.121.18 (?)
                              First seen: ~12h ago
                              Action: P0 → notify customer + Jack
casamore.net                 ✓ all records match
real-estate-co.io            ⚠ MX records changed
                              expected: mx1.resend.com, mx2.resend.com
                              actual:   mail.google.com (Google Workspace?)
                              Action: P1 → may be intentional; ask customer

Scan time: 12s
```

## Inputs

- `customer_slug` (optional, single-domain mode)
- `record_types` (default: A, CNAME, MX, TXT)

## When invoked

- Daily 05:00 ET via scheduled task
- After any customer-reported "site down" → check DNS first
- After `launch-day-cutover` completes → verify DNS settled
- `/dns {slug}` Telegram command

## Failure modes

- **DNS query times out**: retry from secondary resolver
- **Customer using cloud DNS we don't expect**: update expected.json
- **Records match but site still broken**: route to `uptime-monitor` (it's not DNS, it's higher up)

## Logging

`[YYYY-MM-DD HH:MM ET] dns-drift-watcher → customers: {N}, drift: {N}, p0: {N}, p1: {N}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('dns-drift-watcher', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'dns-drift-watcher', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
