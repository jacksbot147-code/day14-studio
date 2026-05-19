---
name: ssl-expiry-watcher
description: Proactive cert expiry monitoring across every launched Day14 customer site. Catches Let's Encrypt auto-renewal failures BEFORE certs expire. Surfaces approval card 14 days before expiry, P0 alert 3 days before. Supporting skill for nightly-polish.
triggers:
  - "ssl expiry"
  - "cert expires"
  - "let's encrypt renewal"
  - "certificate watch"
---

# ssl-expiry-watcher

> Vercel auto-renews Let's Encrypt certs. Usually. When it doesn't,
> the customer's site shows "Your connection is not private" and a
> bad day ensues. This skill watches for that.

## Input
- List of `customers.production_url` where `status = 'launched'`

## Per-cert check

For each launched site:

```bash
openssl s_client -connect {domain}:443 -servername {domain} </dev/null 2>/dev/null \
  | openssl x509 -noout -enddate
```

Parse `notAfter=`. Calculate days_remaining.

## Alert thresholds

| Days remaining | Action |
|---|---|
| > 30 | ✓ healthy; no action |
| 14-30 | yellow; log in polish report, no alert |
| 7-14 | file approval card "{customer} SSL expires in N days — renewal not yet triggered" |
| 3-7 | P0 — SMS Jack if Twilio wired + escalate via `approval-card-builder` urgent flag |
| < 3 | DEFCON; force-renewal attempt + escalate |

## Force-renewal attempt

If days_remaining < 7 AND no automatic renewal in last 24h:

1. Trigger Vercel API to re-issue cert:
   `POST /v9/projects/{id}/domains/{domain}/certs/renew`
2. Wait 60s
3. Re-check expiry
4. If still <7 days: human intervention required — escalate hard

## Output

Append to `~/Documents/studio/docs/overnight/polish-YYYY-MM-DD.md`
under section "## SSL expiry watch":

```
| Domain | Days remaining | Status |
|---|---|---|
| acmepoolco.com | 87 | ✓ |
| {next-customer}.com | 9 | ⚠️ approval-card-filed |
```

## Hard rules

1. **Never delete or replace certs.** Renewal is additive — old cert stays valid until new one is in place.
2. **Never disable auto-renewal** via the API. Force-renewal is an intervention, not a config change.
3. **Always re-verify after a force-renewal.** Don't claim success without a fresh `openssl` check showing the new expiry.
4. **Never skip days_remaining > 30 sites.** They might be silently broken — verify weekly even when not at risk.

## Failure modes

- **OpenSSL connection times out:** DNS issue OR Vercel routing issue — surface as separate P1 (broken site, not just cert)
- **Cert exists but doesn't cover www subdomain:** check SANs; force-renewal often fixes
- **Vercel API rate-limit during force-renewal:** back off + retry once; second failure = escalate

## Logging

`[YYYY-MM-DD HH:MM ET] ssl-expiry-watcher → domains_checked: N, healthy: N, at_risk: N, force_renewals: N`

If any P0:
`[YYYY-MM-DD HH:MM ET] 🚨 ssl-expiry-watcher P0 — {domain} expires in {N} days`

## When invoked
- Daily by `nightly-polish`
- Manually when investigating a customer's "site is broken" report
- Weekly batch check during quiet hours
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('ssl-expiry-watcher', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'ssl-expiry-watcher', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
