# Stripe webhook — local test guide

> 20 min to validate the webhook works end-to-end in test mode.
> After this passes, customer #1 can pay a real deposit and Day14 OS
> kicks off autonomously.

---

## Step 1 — Install new dependencies (1 min)

```bash
cd ~/Documents/studio
npm install
```

Should add: `stripe`, `@supabase/supabase-js`. Run `npm install` (NOT `npm install <pkg>`) because we updated package.json already.

---

## Step 2 — Verify env vars (1 min)

Check `~/Documents/studio/.env.local` has all of these (real values, not placeholders):

```
NEXT_PUBLIC_SUPABASE_URL=https://grpfffwzzwxhivjpokev.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...      ← MUST BE PRESENT
STRIPE_SECRET_KEY=sk_test_...                ← test mode key
STRIPE_WEBHOOK_SECRET=whsec_...              ← from Stripe CLI listen output
```

The two NEW required ones are `STRIPE_SECRET_KEY` (test mode) and `STRIPE_WEBHOOK_SECRET` (we'll generate in step 4).

You'll need to grab test-mode `STRIPE_SECRET_KEY` from:
- Stripe Dashboard → top-right toggle to TEST MODE → Developers → API keys → "Secret key" (sk_test_...)

---

## Step 3 — Install Stripe CLI for local testing (3 min)

```bash
brew install stripe/stripe-cli/stripe
```

Then log in:
```bash
stripe login
```

This opens a browser. Confirm your Stripe account.

---

## Step 4 — Start local dev server + forward webhooks (2 min)

In Terminal window 1:
```bash
cd ~/Documents/studio
npm run dev
```
Wait for "Ready in Xms". Your site is at `http://localhost:3000`.

In Terminal window 2:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Stripe CLI prints a webhook signing secret like:
```
Ready! Your webhook signing secret is whsec_abc123def456... (^C to quit)
```

**Copy that `whsec_...` value** into `~/Documents/studio/.env.local` as `STRIPE_WEBHOOK_SECRET`. Save.

Now restart `npm run dev` (Ctrl+C in window 1, then `npm run dev` again) so it picks up the new env var.

---

## Step 5 — Trigger a test checkout (2 min)

In Terminal window 3, fire a test event:

```bash
stripe trigger checkout.session.completed
```

Stripe CLI sends a synthetic `checkout.session.completed` event to your local webhook.

**Watch window 1** (your dev server output). You should see:
```
[stripe-webhook] Deposit processed: <name> (<slug>) for site at $...
```

**Watch window 2** (stripe listen output). You should see:
```
checkout.session.completed [evt_...] → 200 OK
```

---

## Step 6 — Verify the side effects (3 min)

Check the dossier was created:
```bash
ls -la ~/Documents/businesses/day14/customers/
```
You should see a new folder for the test customer (slug derived from the synthetic name Stripe generated).

Look inside:
```bash
ls -la ~/Documents/businesses/day14/customers/<the-new-slug>/
```
Should contain: README.md, 00-intake.md, 01-brand.json, 02-build-log.md, 03-approvals.md, 04-feedback.md, 05-launch.md.

Check Supabase:
- Open Supabase dashboard → day14-studio project → Table editor → `customers` table
- You should see a new row with the test customer's data
- Open the `events` table — you should see TWO rows: `stripe-checkout.session.completed` (top-level event) and `customer-deposit-paid` (downstream event)

---

## Step 7 — Test idempotency (1 min)

Fire the same event AGAIN:
```bash
stripe trigger checkout.session.completed
```

This creates a NEW synthetic event ID, so a NEW customer row + dossier folder is created (Stripe makes each trigger unique).

To test true idempotency, in Stripe CLI window, find an event from window-2 output (something like `evt_1AbCdEf...`) and resend it:
```bash
stripe events resend evt_1AbCdEf...
```

Watch dev server output:
```
[stripe-webhook] Duplicate event evt_1AbCdEf..., skipping
```

That's the idempotency check working — same event = no duplicate work.

---

## Step 8 — Cleanup (2 min)

Test customers + dossiers should be archived after testing. Mark them:

```sql
-- In Supabase SQL editor
UPDATE customers
SET status = 'archived', notes = COALESCE(notes, '') || ' [e2e-test ' || NOW()::text || ']'
WHERE company_name LIKE '%test%' OR email LIKE '%@example.com%';
```

Then move the test dossier folders:
```bash
mkdir -p ~/Documents/businesses/day14/customers/archived
mv ~/Documents/businesses/day14/customers/<test-slug-1> ~/Documents/businesses/day14/customers/archived/
mv ~/Documents/businesses/day14/customers/<test-slug-2> ~/Documents/businesses/day14/customers/archived/
```

---

## What this proved

If all 8 steps passed:
- ✓ Stripe signature verification works
- ✓ Idempotency works (no double-processing)
- ✓ Supabase write works with service-role key
- ✓ Dossier folder creation works
- ✓ Event chain works (`stripe-event → customer-deposit-paid`)
- ✓ The autonomous pipeline's FIRST link is operational

Next link: when `customer-deposit-paid` event fires, the `supabase-event-listener` should kick off `kickoff-call-scheduler` + `telegram-status-pusher`. Those are next-implementation work.

---

## Troubleshooting

### "Cannot find module 'stripe'"
Run `npm install`. Make sure you're in `~/Documents/studio`.

### "STRIPE_WEBHOOK_SECRET not configured"
Check `.env.local` has the value from `stripe listen` output. Restart `npm run dev` after adding it.

### "Webhook signature error"
The secret in `.env.local` doesn't match what Stripe CLI is signing with. Run `stripe listen` fresh; the secret rotates each time you start it. Update `.env.local` with the new secret.

### Dossier folder didn't get created
Check `~/Documents/businesses/_shared/templates/customer-dossier/` exists. If not, run `bash ~/Documents/studio/scripts/bootstrap-day14-os.sh` first.

### Supabase says "violates foreign key constraint" or similar
The schema may not be deployed. Open Supabase SQL editor and paste `~/Documents/businesses/_shared/sql/day14-os-schema.sql` to (re-)create tables.

### Dev server crashes on startup with type errors
Run `npm run typecheck` and fix any errors. The webhook handler should typecheck cleanly.

---

## Production deploy

After local test passes:

1. Add `STRIPE_SECRET_KEY` (test mode initially) to Vercel env vars
2. Add `STRIPE_WEBHOOK_SECRET` (Vercel uses a DIFFERENT secret per webhook endpoint — see next step)
3. Create a Stripe webhook endpoint in test mode:
   - Stripe Dashboard → Developers → Webhooks → "Add endpoint"
   - URL: `https://day14-studio.vercel.app/api/webhooks/stripe`
   - Events to send: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `customer.subscription.deleted`
   - Save → reveal the signing secret → copy to Vercel env vars as `STRIPE_WEBHOOK_SECRET`
4. Push to GitHub → Vercel auto-deploys
5. Trigger a Stripe event in test mode → verify Vercel logs show it landing

Live mode flip comes LATER (after the `stripe-test-mode-validator` skill's 5 checks all pass).
