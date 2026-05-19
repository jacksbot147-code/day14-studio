---
name: payment-receipt-customizer
description: Customize the Stripe receipt email that goes to customers post-checkout. Adds Day14 branding, sets expectations for what happens next, includes Jack's direct contact. Supporting skill for stripe-payment-link-creator. Configures via Stripe Dashboard, not via API.
triggers:
  - "Stripe receipt"
  - "payment confirmation email"
  - "post-checkout email"
  - "customize receipt"
---

# payment-receipt-customizer

> Stripe sends a receipt by default. Default looks like a vendor.
> A customized receipt sets the tone for the relationship — Day14
> isn't a vendor, it's Jack.

## Where this gets configured

Stripe Dashboard → Settings → Branding → Public details:
- **Business name on receipts**: "Day14" (NOT "Day14 LLC" — too formal)
- **Support email**: `hello@day14.us`
- **Phone**: 239-XXX-XXXX
- **Address**: Day14 mailing address
- **Logo**: Day14 wordmark, transparent PNG

Stripe Dashboard → Settings → Email → Branding:
- **Statement descriptor**: "DAY14" (shows on credit card statement)
- **Email "from" name**: "Jack at Day14"
- **Email reply-to**: `hello@day14.us`

## Receipt body customization

Stripe lets you add a custom footer message. Set to:

```
Welcome to Day14. Next steps:

1. You'll get an intake form within 5 minutes — fill it whenever you can (~12 min total)
2. After intake, we'll book a 30-min kickoff call
3. 14-day build starts the moment kickoff wraps

Questions: text 239-XXX-XXXX or reply to this email.

— Jack
Day14
```

100% in `day14-voice`. No exclamation points. Numbered (only place numbered lists are OK in Day14 voice).

## Per-SKU receipt variations

Each Payment Link can override the default with a unique success URL message. Use this for per-SKU welcome:

### Site SKU welcome (in custom footer)
"Day14 Site build — 7 days. You'll have a real website by next Friday."

### Portal SKU welcome
"Day14 Portal build — 14 days. By two weeks from today, you'll have a working customer portal."

### Platform SKU welcome
"Day14 Platform build — 21 days. We're building you a full operator system. Strap in."

## Hard rules

1. **Never edit Stripe branding in live mode without testing in test mode first.** Receipts go to real customers; mistakes are visible.
2. **Never include URLs in the receipt footer** beyond Day14's main domain. Avoid spam-flag risk.
3. **Never use exclamation points.** day14-voice still applies even on a receipt.
4. **Never refer customers to "support".** Day14 doesn't have support — Jack is the support. Use "Jack" or first-person.
5. **Always test the receipt** by completing a $0.01 test transaction after any branding change.

## When invoked
- Once during initial Stripe setup (via `browser-driven-vendor-setup`)
- Whenever pricing tiers change (different success message per tier)
- Whenever Jack's phone number changes (rare)
- Whenever Day14 branding evolves (logo, name)

## Logging

`[YYYY-MM-DD HH:MM ET] payment-receipt-customizer → mode: {test|live}, scope: {global|per-sku}, branding_fields_set: N`

After test transaction verification:
`[YYYY-MM-DD HH:MM ET] payment-receipt-customizer VERIFIED → test_receipt_received_at: {email}, looks_correct: yes`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('payment-receipt-customizer', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'payment-receipt-customizer', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
