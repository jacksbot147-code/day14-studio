---
name: stripe-payment-link-creator
description: Create the Stripe Payment Link for a Day14 SKU (Site / Portal / Platform) with the right product name, description, success URL, and metadata. Test mode first; flips to live mode only with explicit Jack approval. Vendor playbook lives inside browser-driven-vendor-setup; this skill is the per-action protocol.
triggers:
  - "Stripe Payment Link"
  - "create payment link"
  - "Day14 SKU deposit"
  - "deposit link"
  - "Stripe webhook"
---

# stripe-payment-link-creator

> Three Day14 Payment Links, one per SKU. Each one becomes the URL
> Jack drops into Cal.com confirmations, emails, and signed SOWs.
> The metadata they carry is what the build-agent reads to start work.

## The three links

| SKU | Total | Deposit (50%) | Stripe Product Name |
|---|---|---|---|
| Site | $2,500 | $1,250 | `Day14 — Site (deposit)` |
| Portal | $5,000 | $2,500 | `Day14 — Portal (deposit)` |
| Platform | $10,000 | $5,000 | `Day14 — Platform (deposit)` |

## Per-link config

For each SKU, configure in Stripe Dashboard:

### Product
- **Name:** `Day14 — {SKU} (deposit)`
- **Description:** "50% deposit for Day14 {SKU} build. Balance due on launch day per signed SOW. 14-day delivery."
- **Image:** Day14 logo (if uploaded)
- **Tax behavior:** exclusive (Jack adds tax at invoice level if needed)

### Price
- **Amount:** deposit value above, in cents
- **Currency:** USD
- **Billing:** one-time
- **Tax code:** "txcd_10000000" (general — Services)

### Payment Link settings
- **Type:** Default
- **After payment:** redirect to URL `https://day14.us/thanks?sku={tier}&intent={CHECKOUT_SESSION_ID}`
- **Confirmation page:** Custom message: "Got it. I&rsquo;ll email you the intake form within 5 minutes. — Jack"
- **Allow promotion codes:** No (no promo codes; pricing is the pricing)
- **Collect customer information:**
  - Email: required
  - Name: required
  - Phone: required
  - Address: not required
  - Tax ID: not required
- **Metadata** (this is what the webhook reads to start the build):
  - `sku`: `site` | `portal` | `platform`
  - `sla_days`: `14`
  - `vertical`: empty (filled by Jack during intake call)
  - `source`: empty (filled by Cal.com or campaign tag)
- **Limit:** unlimited

### Webhook
The Payment Link triggers `checkout.session.completed`. Wire it to
`https://day14.us/api/webhooks/stripe`:
- Events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`
- Signing secret: copy to Vercel env vars as `STRIPE_WEBHOOK_SECRET`

## Test mode first

ALWAYS create + test in TEST mode before flipping to live. Test mode:

1. Create the link in test mode
2. Use Stripe test card `4242 4242 4242 4242` to complete a fake checkout
3. Verify the webhook fires + the `customers` row gets created in Supabase
4. Verify `/thanks?sku=site` page loads and matches the intent

Only after all three pass: switch to live mode, recreate the link
in live, update Vercel env vars to live key.

## Customer-receipt email

Stripe sends a receipt automatically. Customize in
Stripe Dashboard → Settings → Branding:
- **Subject:** "Day14 — deposit received for {Product Name}"
- **From name:** "Jack at Day14"
- **From email:** `hello@day14.us` (requires domain verification in Stripe)
- **Footer message:** "Questions? Text me: 239-XXX-XXXX. — Jack"

Customer should receive both the Stripe receipt AND a Day14 reply
(drafted by `eod-update-writer` in "deposit-received" mode).

## Hard rules

1. **Never create Payment Links in live mode without Jack present.** Even with all tests passing — live = real money.
2. **Never share live Payment Link URLs in chat.** Live URLs in chat history = potential abuse vector if chat leaks. Share via email or SOW only.
3. **Never edit a Payment Link's price after first use.** Create a new link with the new price; archive the old one. (Pricing audit trail matters.)
4. **Never offer custom amounts.** $1,250 / $2,500 / $5,000 — no negotiation via link customization. Send a separate invoice for custom.
5. **Never wire Payment Links to a non-Day14 success URL.** Drives all traffic to `day14.us/thanks` for analytics + welcome flow.

## Failure modes

- **Webhook signature verification fails:** Stripe sent the event but our `STRIPE_WEBHOOK_SECRET` is stale or wrong. Re-copy from Stripe Dashboard.
- **Customer paid via test link in live mode:** they actually paid you $0; refund-via-test-mode = nothing to do; surface to Jack to clarify with customer.
- **Same customer paid twice (deposit + balance via wrong link):** they paid 50% + 100% instead of 50% + 50%. Refund the overage manually.
- **Payment Link is archived but still in customer's email:** old link continues to work. Archive in Stripe + add a redirect on `day14.us/checkout/{archived_slug}` to current link.

## Logging

Append to MASTER_LOG:
`[YYYY-MM-DD HH:MM ET] stripe-payment-link-creator → SKU: {sku}, mode: {test|live}, link: {url}, webhook_wired: {yes|no}`

When live mode flips:
`[YYYY-MM-DD HH:MM ET] ⚡ stripe LIVE mode active for {SKU} — real money is in scope`

## When to invoke this skill

- Week 1 of Day14 OS (Tue-Wed per laptop-interim plan)
- After domain ownership for `day14.us` is verified in Stripe
- When pricing tiers change (rare — defer to Council)
- When a Payment Link breaks (audit + recreate)
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('stripe-payment-link-creator', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'stripe-payment-link-creator', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
