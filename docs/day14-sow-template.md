# Day14 — Build Agreement

> One-page order form. Plain English. Same-day signature.
> Replace placeholders in `{{ }}` before sending.

---

**Between:** Day14 ({{owner_name}}, sole proprietor, Southwest Florida) — "**Day14**"

**And:** {{customer_business_name}}, {{customer_address}} — "**Customer**"

**Date:** {{date}}
**SKU:** {{site | portal | platform}}
**Fixed price:** ${{one_time_total}} one-time + ${{monthly_total}}/mo recurring
**Build window:** 14 calendar days from deposit clearance (Site: 7 days · Platform: 21 days)
**Live by:** {{day_14_date}}

---

## What Day14 is shipping

A complete {{sku_name}} build per the Day14 product spec, including:

{{paste the SKU feature bullets from day14.us/#sku here, verbatim}}

The Customer's brand, copy, and data populate the build. The technical scope is fixed.

## What is explicitly NOT included

- Logo or full brand-identity design from scratch (Day14 uses Customer's existing assets)
- Native iOS or Android app store submissions (PWA is included; native wrappers are Platform-only and add to scope on quote)
- Search-engine optimization beyond the launch city/landing pages described in the SKU
- Paid advertising, ad creative, or media buying
- Long-form content writing beyond the homepage and the launch pages described in the SKU
- Third-party integrations not named in the SKU (e.g. QuickBooks, Salesforce, custom POS systems — these are billed separately at $200/hr after written approval)
- Ongoing operations of the Customer's business (Day14 does not answer customer support tickets, run marketing, or manage the Customer's books)

## Day-14-or-deposit-back guarantee

If the Customer's build is not **live on its production domain and capable of accepting real customer payments** by 11:59pm ET on day 14 of the build window, the Customer may elect within 7 days to:

- (a) accept a one-week extension at Day14's expense, or
- (b) terminate this agreement, receive a full refund of the ${{deposit_amount}} deposit, and keep all code, designs, and integrations shipped to date.

The guarantee does not apply if the Customer has not delivered intake materials, signoffs, or written responses within the timelines specified in the Day14 intake form.

## Payment terms

- **50% deposit** of ${{deposit_amount}} due on signature, via Stripe Payment Link
- **50% balance** of ${{balance_amount}} due on launch day (day 14)
- **Monthly fee** of ${{monthly_total}}/mo begins on launch day, billed monthly via Stripe
- Out-of-SKU work is billed at $200/hr with a 4-hour minimum, paid in advance

## Ownership

- The Customer owns the source code, the domain, the database contents, and the customer data from day one. The GitHub repository is transferred to the Customer's account or kept under the Day14 organization at the Customer's preference.
- Day14 retains the right to reference the build publicly as a case study, including taking screenshots and quoting non-confidential information, unless the Customer requests a confidentiality carve-out in writing.
- All third-party vendor accounts (Stripe, Supabase, Vercel, Resend, Twilio) are created in the Customer's name with Customer's billing details. Day14 holds operator access only, revocable at any time.

## Hosting + maintenance (the monthly)

The monthly fee covers:

- Vercel hosting and Supabase database infrastructure
- Resend email and Twilio SMS up to standard usage tiers (overages billed at cost)
- Up to 1 hour/month of small changes (copy edits, new images, minor tweaks)
- AI chatbot inference (Anthropic SDK) up to standard usage tiers
- Quarterly stack updates and dependency patches
- Monitoring and uptime alerts

Excluded from the monthly: new features, scope additions, third-party integration buildouts. These are quoted separately.

## Cancellation + offboarding

The Customer may cancel the monthly subscription at any time with 30 days written notice. On cancellation:

- The Customer keeps the code, the domain, and all customer data.
- Day14 hands over a tarball of the repository, all Supabase credentials, and a migration runbook.
- Day14 unwires its operator access from the Customer's Stripe / Supabase / Vercel accounts.
- No further charges accrue after the 30-day notice period.

## Confidentiality

Day14 will not share Customer's customer lists, financial data, or operational specifics. Day14 may reference the existence of the engagement, the SKU tier, and the public-facing build in marketing.

## Limitations

Day14's total liability under this agreement is limited to the fees paid by the Customer in the 12 months preceding any claim. Day14 is not responsible for losses caused by third-party vendors (Stripe, Supabase, Vercel, etc.), customer errors, or events outside Day14's reasonable control.

## Governing law

This agreement is governed by the laws of the State of Florida. Disputes are resolved by binding arbitration in Lee or Collier County, FL.

---

## Signatures

**Day14**
Signed: ___________________________________
Name: {{owner_name}}
Date: ___________

**Customer**
Signed: ___________________________________
Name: {{customer_signer_name}}
Title: {{customer_signer_title}}
Date: ___________

---

*One page. One price. One signature. Welcome to Day14.*
