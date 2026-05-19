---
name: ssl-provisioning-verifier
description: After DNS propagates and Vercel attempts to provision the SSL cert, this skill verifies the cert is valid, served correctly, and not expiring within 30 days. Supporting skill for launch-day-cutover; runs immediately before flipping the "launched" flag.
triggers:
  - "SSL cert"
  - "HTTPS check"
  - "certificate provisioning"
  - "Let's Encrypt"
  - "cert expired"
---

# ssl-provisioning-verifier

> Launching a customer site without verifying SSL is asking for the
> browser to show "Your connection is not private" on launch day.
> This skill is the gate before we declare "launched."

## Inputs

- `customers.production_domain`
- Optional: expected issuer (Vercel typically uses Let's Encrypt)

## The checks (~30 sec total)

### 1. HTTPS reachability
```bash
curl -I -s -o /dev/null -w "%{http_code}\n" https://{domain}/
```
Expect `200` (not 301 to http, not 502, not 503).

### 2. Cert validity period
```bash
openssl s_client -connect {domain}:443 -servername {domain} </dev/null 2>/dev/null \
  | openssl x509 -noout -dates
```
Parse `notBefore=` and `notAfter=`. Cert must be:
- `notBefore` ≤ now
- `notAfter` ≥ now + 30 days

If `notAfter` < 30 days, the cert is about to expire. Probably Vercel hasn't auto-renewed yet — refresh and re-check.

### 3. Issuer
Confirm the cert is issued by a trusted CA (Let's Encrypt for Vercel, or DigiCert/Sectigo for paid).

```bash
openssl s_client -connect {domain}:443 -servername {domain} </dev/null 2>/dev/null \
  | openssl x509 -noout -issuer
```

Reject self-signed certs (issuer matches subject).

### 4. SAN coverage
Cert's Subject Alternative Names must include both apex and `www.`:
```bash
openssl s_client -connect {domain}:443 -servername {domain} </dev/null 2>/dev/null \
  | openssl x509 -noout -ext subjectAltName
```

If `www.{domain}` is missing from the cert but the site advertises a www version, that's a launch blocker.

### 5. Mixed-content audit
Fetch the homepage HTML and grep for any `http://` URLs in `<img>`, `<script>`, `<link>`, `<iframe>` tags. If found, browser will show "not fully secure" warning.

```bash
curl -s https://{domain}/ | grep -oP 'http://[^"\s]+' | head -5
```

Should return empty.

## Output

Write to `~/Documents/businesses/day14/customers/{slug}/ssl-check.md`:

```
# SSL verification — {domain}

| Check | Status | Detail |
|---|---|---|
| HTTPS reachable | ✓ | 200 OK |
| Cert valid until | ✓ | YYYY-MM-DD (N days) |
| Issuer | ✓ | Let's Encrypt |
| SAN coverage | ✓ | {domain}, www.{domain} |
| No mixed content | ✓ | 0 http:// URLs found |

**Overall: PASS** (or FAIL with the failing check named)
```

## Hard rules

1. **Never declare launched** if any check is RED. Surface to Jack via approval card.
2. **Never proceed on a self-signed cert.** That's a misconfiguration somewhere; investigate.
3. **Never accept a cert expiring in <14 days** — even though Vercel auto-renews, the renewal might fail. Force renewal first.
4. **Never skip the mixed-content check.** It's the most common "launched but browser warns" failure.
5. **Never claim a check passed without running it.** This skill is enforcement, not theater.

## Failure modes

- **Cert not yet provisioned**: Vercel needs ~60s after DNS propagation. Wait + retry (max 5 retries at 60s intervals).
- **Cert provisioning stuck**: Vercel sometimes fails to detect propagation. Manual nudge: remove + re-add the domain in Vercel.
- **Mixed content from a CDN image**: rewrite the template to use protocol-relative or HTTPS URLs.
- **DNS lookup timing out from sandbox**: try via the user's machine instead (this skill can run anywhere).

## Logging

`[YYYY-MM-DD HH:MM ET] ssl-provisioning-verifier → customer: {slug}, result: {PASS|FAIL}, cert_expires: {date}, days_remaining: N`

If failed, also append:
`[YYYY-MM-DD HH:MM ET] ssl-provisioning-verifier ⚠️ {customer_slug} — {failing_check}, action: {what-to-do}`

## When invoked

- Step in `launch-day-cutover` after DNS verification passes, before declaring launched
- Daily via `nightly-polish` for every launched customer site (catches near-expiry)
- After any DNS change at a customer domain
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('ssl-provisioning-verifier', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'ssl-provisioning-verifier', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
