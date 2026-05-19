---
name: ecom-stripe-payment-link-setup
description: Generate Stripe Payment Links for ecom catalog. One link per product OR a checkout flow link. Wires success/cancel URLs to tenant's /thanks and /cart pages.
triggers:
  - "stripe link"
  - "payment link"
  - "checkout link"
  - "setup stripe"
pack: ecom-ops
---

# ecom-stripe-payment-link-setup

> First-customer fastest path: a payment link, not a full cart UI.

## What this skill does

1. Reads catalog/products.json
2. For each active product without `stripe_price_id`:
   - Creates Stripe Product
   - Creates Stripe Price
   - Creates Payment Link with:
     - Success URL: `https://{tenant.domain}/thanks?sku={sku}`
     - Cancel URL: `https://{tenant.domain}/cart`
     - Customer info collection: email + name + shipping address
   - Saves IDs back to products.json
3. For brands with full cart: generate Stripe Checkout Session links via API
4. Verifies links work by hitting the URL

## Hard rules

1. **Always TEST first** (Stripe test mode). Live mode requires Jack-tap.
2. **Always use canonical `?sku=` query param** on success URL — drives /thanks page personalization.
3. **Never skip address collection** for physical goods (no shipping = lost order).
4. **Always set tax behavior** appropriately (Stripe Tax recommended).
5. **Always queue Telegram with the live links** so Jack can copy + share.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('ecom-stripe-payment-link-setup', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'ecom-stripe-payment-link-setup', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
