# Day14 — Build Runbook

> Internal SOP. Read top to bottom before starting customer #1.
> Updated whenever a step bites us.
>
> Target: deposit-signed → first preview URL in under 4 hours.
> Target: deposit-signed → live launch in 14 days.

---

## Phase 0 — Pre-build (deposit cleared, intake form returned)

Trigger: Stripe deposit webhook fires AND intake form PDF/link arrives in inbox.

1. **Confirm receipt with the Customer within 4 hours.** Single short message: "Got both. Preview URL by EOD tomorrow. I'll send daily updates."
2. **Create the customer dossier.** New folder at `~/Documents/customers/{customer-slug}/`. Drop in: signed SOW PDF, intake form, all brand assets (logo, photos), notes from intro call.
3. **Open a Cowork session** with the customer slug as the session name. Mount `~/Documents/customers/{customer-slug}/` as the working folder.
4. **Verify the SKU.** Re-read the SOW. Confirm the scope matches what's about to be built. If there's any ambiguity, resolve it with the Customer before forking the template.

---

## Phase 1 — From fork to first preview URL (target: <4 hours)

### 1.1 — Repo provisioning (15 min)

```bash
# Pick the right template based on SKU
# - SITE      → studio-template-site (static + Cloudflare Workers + MailerLite)
# - PORTAL    → studio-template-portal (Next 14 + Supabase + Stripe + Resend)
# - PLATFORM  → studio-template-platform (Portal + admin app + Twilio + sharp)
# - PLATFORM with marketplace → studio-template-marketplace (escrow + roles)

gh repo create day14/{customer-slug} --private --template studio-template-{sku}
cd {customer-slug}
gh repo clone day14/{customer-slug} .
```

### 1.2 — Brand + content swap (45 min)

Edit `src/lib/site.ts` (or the equivalent in the chosen template):

- Replace `SITE.brand`, `SITE.tagline`, `SITE.domain`, `SITE.email`, `SITE.location`
- Replace `SKUS` / service list with intake form contents
- Replace `FAQ` with intake-derived FAQ items
- Drop customer's logo into `public/logo.svg` and reference from `<SiteHeader />`
- Update Tailwind config with customer's brand colors (only 2–3 swaps: primary, accent, paper bg)
- Drop the 5 intake photos into `public/photos/` and wire into hero + gallery

### 1.3 — Infrastructure provisioning (60 min, run in parallel)

While the brand swap is going on, set up the vendor accounts in parallel:

| Vendor | Action | Naming convention |
|---|---|---|
| Vercel | Create project, link the new repo | `{customer-slug}` |
| Supabase | New project (Portal/Platform only) | `{customer-slug}-prod` |
| Stripe | Create account in customer's name (if not bringing own) | `{customer-business-name}` |
| Resend | New domain or subdomain wired | `{customer-domain}` |
| Twilio | Provision a number (Platform only) | `{customer-area-code}` |
| MailerLite | New list if Site-tier with email funnel | `{customer-slug}-list` |
| Domain | Buy or transfer DNS to Cloudflare | `{customer-domain}` |

Save all credentials to a secure note in the customer dossier. **Never commit secrets.**

### 1.4 — Environment + secrets (15 min)

Populate Vercel env vars from the customer dossier. Use the template's `.env.example` as the checklist. Common ones:

- `NEXT_PUBLIC_SITE_URL`
- `DATABASE_URL` (Supabase pooler)
- `DIRECT_URL` (Supabase direct)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `TWILIO_*` (Platform only)
- `ANTHROPIC_API_KEY`

### 1.5 — First deploy (15 min)

```bash
git add -A
git commit -m "feat: customer-{slug} initial brand + content swap"
git push origin main
# Vercel auto-deploys. Preview URL drops into the Vercel dashboard.
```

### 1.6 — Send the preview URL to the Customer (5 min)

Email template:

> Subject: Your Day14 preview is live — day 1 update
>
> Preview URL: https://{customer-slug}.vercel.app
>
> Day 1 done: marketing site is live with your brand and copy.
> Tomorrow: portal scaffolding + magic-link auth.
> I'll send a one-paragraph update every weekday at EOD.
>
> Reply with any quick feedback — easier to fix on day 2 than day 13.

---

## Phase 2 — The daily build cadence (days 2–12)

**Each weekday:**

1. **Morning (30 min):** Pull yesterday's customer feedback, prioritize for the day. Update the public build-log at `day14.us/builds/{customer-slug}`.
2. **Build (4–6 hours):** Heads down, one Cowork session, one feature area per day. Stick to the runbook order below.
3. **EOD (15 min):** Commit + push. Smoke-test the preview URL. Send the customer the daily one-paragraph update.

### Suggested order for PORTAL tier

| Day | Feature area |
|---|---|
| 2 | Brand polish on the marketing site. SEO landing pages. AI chatbot wired with intake content. |
| 3 | Supabase auth (magic link). Customer signup + sign-in. Profile page scaffold. |
| 4 | Stripe Customer Portal embed. Subscription product setup. Webhook handlers. |
| 5 | Customer dashboard: account, billing, history (placeholder data). |
| 6 | Service-specific data model (visits/jobs/orders — depending on vertical). |
| 7 | Customer self-service: reschedule, pause, request quote, leave note. |
| 8 | Email notifications via Resend. Welcome flow + invoice receipts. |
| 9 | SMS notifications via Twilio (if applicable). |
| 10 | Migration of any existing customer data the intake form flagged. |
| 11 | Mobile audit. PWA install. iOS Safari quirks. Performance pass. |
| 12 | QA pass — click every link, fill every form, test every flow. |

### Suggested order for PLATFORM tier — add to the above

| Day | Feature area |
|---|---|
| 13 | Operator admin app: customer/lead/visit CRUD. Global search. |
| 14 | Auto-scheduling + day-of-week routing. Photo proof pipeline. |
| 15 | Daily admin digest email. Broadcast SMS. CSV exports. |
| 16 | Analytics dashboards. "Needs attention" widgets. |
| 17 | Storm Mode (if SWFL contractor vertical) + permit integrations. |
| 18 | Role-based access. Operator vs admin gates. |
| 19 | Mobile wrapper (Capacitor) if iOS/Android in scope. |
| 20 | Final QA + polish + Loom walkthrough recording. |

---

## Phase 3 — QA + walkthrough (day 13 for Portal, day 20 for Platform)

Run the **QA gate**:

- [ ] Every page loads on mobile Safari + Chrome
- [ ] All forms submit and route to the right email/SMS
- [ ] Stripe test mode end-to-end: signup → subscribe → invoice → portal access
- [ ] Magic-link auth works on a fresh email
- [ ] AI chatbot answers the top 10 intake questions accurately
- [ ] Photo upload (Platform): GPS + timestamp watermark applies correctly
- [ ] All env vars present in Vercel production
- [ ] No `console.log` or `debugger` in shipped code
- [ ] Robots tag flipped to `index: true, follow: true` in metadata
- [ ] Sitemap.xml generated and referenced
- [ ] OG images render correctly per route (test with opengraph.dev)
- [ ] Lighthouse score > 90 on home + key pages

Record a **5-minute Loom walkthrough** showing the Customer:
1. Their public site
2. Their customer portal (Portal/Platform)
3. Their admin app (Platform)
4. Their AI chatbot answering a real question
5. How to take an actual payment in test mode

Send to the Customer with: "Sign off, or send a list of changes. I'll knock them out tomorrow and we launch on day 14."

---

## Phase 4 — Launch day (day 14)

### 4.1 — Pre-launch (morning)

1. Final QA pass on the production deploy.
2. Confirm DNS propagation: `dig {customer-domain}` and `dig www.{customer-domain}`.
3. Flip Stripe from test mode to live mode. Update keys in Vercel env. Trigger a redeploy.
4. Send a final pre-launch test transaction in live mode (one cent, then refund).

### 4.2 — Launch (early afternoon)

1. Point the production domain at Vercel.
2. Force the SSL cert refresh in Vercel.
3. Smoke-test the live URL end-to-end.
4. Send the launch announcement email to the Customer.

### 4.3 — Customer training call (30 min, same day)

- Walk the Customer through their admin app live.
- Show them how to: add a customer, log a visit (Platform), send an invoice, view analytics.
- Hand off all credentials in a shared password vault.
- Confirm monthly subscription billing has started.

### 4.4 — Day-14 commitment check

Did launch happen by EOD day 14? If **no**:

- Send the deposit-back option email per the SOW
- Refund deposit if the Customer elects to terminate
- Document the failure in `~/Documents/customers/_postmortems/`

---

## Phase 5 — First 30 days (ongoing)

1. **Daily smoke test** on the live URL for the first week — automated via uptime monitor (Better Uptime or similar).
2. **Weekly check-in email** with the Customer for the first 4 weeks.
3. **Monthly review** at day 30: "Anything broken? Anything you want changed in the included monthly hour?"
4. **Quarterly stack update** — Next.js patches, Supabase migrations, Stripe API version bumps. Scheduled task fires the reminder.
5. **Add the build to the public Day14 case-studies page** within the first 30 days (with Customer's signoff on the writeup).

---

## When things go wrong

**Customer doesn't respond to intake form in 7 days.**
Send a polite reminder. After 14 days of silence, send a "we'll pause and resume when you're ready, but the timeline restarts when you respond" email. The 14-day guarantee clock does not run during Customer silence.

**Stripe rejects the new account.**
Common on day 1. Verify business is registered, EIN is real, no flags on the owner. Sometimes a phone call to Stripe support unblocks it. Plan B: use the Customer's existing Stripe if they have one.

**Domain DNS doesn't propagate.**
Usually a Cloudflare nameserver mistake or a registrar lock. Use `dnschecker.org` to see if propagation is happening. Worst case, soft-launch on `*.day14.dev` and point the real domain when DNS catches up.

**Customer demands a scope addition mid-build.**
Quote it. $200/hr, 4-hour minimum, paid in advance. Add the customer's signature to the SOW amendment. Don't start the new work until both are signed and paid. This is how productized agencies stay productized.

**Customer is unhappy on day 13.**
Surface the specific complaints. Most are fixable in a day. If they're not, offer the deposit-back option proactively per the SOW. Reputation > revenue for the first 5 customers.

---

*One operator + AI agents = the whole stack in 14 days. This runbook is the SOP that makes it repeatable.*
