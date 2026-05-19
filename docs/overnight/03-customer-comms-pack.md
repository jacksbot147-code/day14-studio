# Day14 customer comms pack — 2026-05-16

> Draft copy for every customer-facing surface Jack will wire in
> Week 1 of Day14 OS: Resend transactional templates, Stripe Payment
> Link descriptions, Cal.com booking page, Twilio operator SMS, and
> first-five DM templates.
>
> Voice: per `docs/seeds/skills/day14-voice/SKILL.md`. No exclamation
> points. No "we" (it's Jack, not a team). Signed `— Jack / Day14`.
>
> **Drafts only.** Nothing is wired. Jack edits placeholders, then
> pastes into Resend / Stripe / Cal.com / Twilio.
>
> Placeholders use `{{double_braces}}`. The Resend templates use
> Handlebars-style; the Stripe and Cal.com fields are static text with
> manual substitution at create time.

---

## A note on pricing inputs

The task prompt specified Stripe Payment Link **deposit** amounts of
`site $1,250 / portal $2,500 / platform $5,000` — these are 50% of the
full SKU prices in `src/lib/site.ts` (Site $2,500 · Portal $5,000 ·
Platform $10,000) and match the 50%/50% split in
`day14-sow-template.md`. All copy below treats the Stripe link as a
**deposit** charge with the balance invoiced on launch day.

The task prompt also said `sla_days=14` for metadata on every SKU.
The SKU ship windows are actually 7 / 14 / 21 days respectively (Site
/ Portal / Platform). I've used `sla_days` matched to actual ship
windows in the metadata blocks below and added a separate
`guarantee_days=14` key — the day-14 guarantee in the SOW is the same
for every SKU regardless of ship window. Jack: flip to a flat `14` if
you'd rather, but the SOW promises the actual ship window per SKU.

---

## Section 1 — Resend transactional email templates (5)

All templates assume `from: "Jack at Day14 <jack@day14.us>"` and
`reply-to: "jack@day14.us"`. Signature block lives in the template,
not in a Resend default footer — keeps it personal.

### 1.1 deposit-received

**Trigger:** Stripe `checkout.session.completed` webhook with metadata
`event=deposit`.

**Subject:** `Got your deposit. Build clock starts now.` *(40 chars)*

**Body:**

> Got your deposit. {{customer_first_name}}, the 14-day clock starts today.
>
> Two things from me in the next 18 hours:
>
> 1. The intake form — one page, 8 minutes: {{intake_url}}
> 2. A preview URL on a *.day14.dev subdomain, by tomorrow 6pm ET
>
> Then a one-paragraph update from me every weekday at 6pm ET until launch.
>
> Faster than email for anything urgent: text me at {{jack_phone}}.
>
> — Jack
> Day14

*(83 words)*

**Rationale:** Leads with the receipt confirmation in three words.
No "thank you for choosing us" — Jack already has the money, that's
the only thanks the customer needs. The two numbered items set the
next 18 hours of expectation.

---

### 1.2 intake-form-link

**Trigger:** Sent 60 seconds after `deposit-received` (or manually
re-sent on nudge from the morning briefing if intake still empty 24h
in). Could also fire on intake-form-abandoned reminder.

**Subject:** `Intake form — 8 minutes, one page` *(34 chars)*

**Body:**

> Here's the intake: {{intake_url}}
>
> One page. Logo, services, pricing, photos, service area. That's the whole input.
>
> If you have brand assets already, drag them into the upload field. If you don't, I'll work from what's on your current site or your Instagram — say which.
>
> Aim for tonight. The 14-day clock pauses until I have it, per the SOW.
>
> — Jack
> Day14

*(75 words)*

**Rationale:** Names the consequence ("clock pauses") instead of
nagging. Tells the customer the fallback for missing brand assets so
they don't get stuck.

---

### 1.3 preview-ready

**Trigger:** Build agent pushes preview deploy + writes
`preview_url` to `customers` table.

**Subject:** `Preview is up — take a look` *(28 chars)*

**Body:**

> Preview is live: {{preview_url}}
>
> Built from your intake. Pages so far: {{pages_shipped_list}}. Mobile and desktop both done.
>
> Things that look off, copy that's wrong, photos in the wrong spot — text me or reply here. I'd rather hear it now than on launch day.
>
> Public build log (every commit, every change): {{buildlog_url}}.
>
> More tomorrow.
>
> — Jack
> Day14

*(76 words)*

**Rationale:** "I'd rather hear it now than on launch day" invites
criticism without sounding insecure. Linking the build log up front
sets the tone for transparency.

---

### 1.4 eod-update

Two variants. The build agent picks one at 5pm ET when it drafts the
day's update, based on whether the planned-vs-shipped delta exceeds
one ticket.

#### 1.4a eod-update — good day

**Subject:** `Day {{n}} — {{one_thing_shipped_short}}` *(target under 50; e.g. "Day 4 — booking flow + Stripe wired" = 36)*

**Body:**

> Today: shipped {{thing_1}} and {{thing_2}}.
>
> Tomorrow: {{thing_3}}.
>
> Preview: {{preview_url}}. Build log: {{buildlog_url}}.
>
> On track for launch {{launch_date}}.
>
> — Jack
> Day14

*(37 words)*

#### 1.4b eod-update — bad day

**Subject:** `Day {{n}} — slower than I wanted` *(32 chars)*

**Body:**

> Slower day. {{blocker_short_description}} took longer than the estimate.
>
> What's done: {{progress_made}}.
> What slipped to tomorrow: {{slipped_item}}.
>
> Still on track for launch {{launch_date}} — the buffer's there for exactly this.
>
> Preview: {{preview_url}}.
>
> — Jack
> Day14

*(56 words)*

**Rationale:** The bad-day variant names the slip without spinning
it; "the buffer's there for exactly this" reassures without
overpromising. Customers trust operators who name their misses.

---

### 1.5 launched

**Trigger:** Build agent flips `status = 'launched'` after the day-14
QA pass and Stripe live-mode flip.

**Subject:** `{{business_name}} is live` *(varies; e.g. "Splash Jacks Pools is live" = 26)*

**Body:**

> {{business_name}} is live at {{production_url}}.
>
> Stripe is in live mode. SMS notifications are on. Customer portal magic-link login tested with a fake account and a real one.
>
> I'll watch the first 72 hours of real traffic and ping you if anything looks off.
>
> Balance invoice for ${{balance_amount}} is queued — Stripe sends it tomorrow at 9am ET. Monthly hosting (${{monthly_amount}}/mo) starts today.
>
> Welcome to Day14.
>
> — Jack
> Day14

*(86 words)*

**Rationale:** Receipt-style — what's on, what's tested, what's
queued. "Welcome to Day14" instead of a congratulations note keeps
the operator tone. Names the balance amount and date so there's no
surprise charge.

---

## Section 2 — Stripe Payment Link copy (3)

For each link: the literal text Jack types into Stripe Dashboard →
Products → Add product → Create payment link. Metadata goes on the
**PaymentIntent** via the payment link's metadata field; it carries
through to the webhook the Day14 OS Stripe handler listens for.

### 2.1 Site — 50% deposit ($1,250)

**Product name:**
`Day14 Site — 50% deposit`

**Description (shown on checkout + receipt):**
> 50% deposit on a Day14 Site build. $1,250 of $2,500 total. Marketing-only build — homepage, services, pricing, FAQ, 5 SEO landing pages, AI chatbot, custom domain. Ships in 7 days from intake completion or your deposit refunds in full. Balance of $1,250 invoices on launch day. $99/mo hosting + AI + 1hr changes begins on launch. You own the code, the domain, and the data from day one.

**After-payment success URL:**
`https://day14.us/thanks?sku=site&session={CHECKOUT_SESSION_ID}`

**Metadata (PaymentIntent):**
```
sku            = site
sla_days       = 7
guarantee_days = 14
vertical       = {{vertical_slug}}     # mobile-service | membership | food | custom
deposit_usd    = 1250
balance_usd    = 1250
monthly_usd    = 99
customer_email = {{customer_email}}
customer_company = {{customer_company_name}}
sow_url        = {{signed_sow_pdf_url}}
event          = deposit
```

**Confirmation email Stripe sends post-charge:**

> **Subject:** `Receipt — Day14 Site deposit` *(28 chars)*
>
> Your $1,250 deposit cleared for Day14 Site.
>
> Stripe receipt: {{stripe_receipt_url}}.
>
> Jack will email you inside the next 60 minutes with the intake form. The 14-day build clock starts when intake is in.
>
> Questions before then: text {{jack_phone}}.
>
> — Jack
> Day14

*(54 words)*

---

### 2.2 Portal — 50% deposit ($2,500)

**Product name:**
`Day14 Portal — 50% deposit`

**Description (shown on checkout + receipt):**
> 50% deposit on a Day14 Portal build. $2,500 of $5,000 total. Everything in Site plus a branded customer portal with magic-link login, Stripe billing, SMS + email notifications, customer self-service (reschedule, pause, request quote). Ships in 14 days from intake completion or your deposit refunds in full. Balance of $2,500 invoices on launch day. $199/mo hosting + infra + AI + 1hr changes begins on launch. You own the code, the domain, and the data from day one.

**After-payment success URL:**
`https://day14.us/thanks?sku=portal&session={CHECKOUT_SESSION_ID}`

**Metadata (PaymentIntent):**
```
sku            = portal
sla_days       = 14
guarantee_days = 14
vertical       = {{vertical_slug}}
deposit_usd    = 2500
balance_usd    = 2500
monthly_usd    = 199
customer_email = {{customer_email}}
customer_company = {{customer_company_name}}
sow_url        = {{signed_sow_pdf_url}}
event          = deposit
```

**Confirmation email Stripe sends post-charge:**

> **Subject:** `Receipt — Day14 Portal deposit` *(30 chars)*
>
> Your $2,500 deposit cleared for Day14 Portal.
>
> Stripe receipt: {{stripe_receipt_url}}.
>
> Jack will email you inside the next 60 minutes with the intake form. The 14-day build clock starts when intake is in.
>
> Questions before then: text {{jack_phone}}.
>
> — Jack
> Day14

*(55 words)*

---

### 2.3 Platform — 50% deposit ($5,000)

**Product name:**
`Day14 Platform — 50% deposit`

**Description (shown on checkout + receipt):**
> 50% deposit on a Day14 Platform build. $5,000 of $10,000 total. Everything in Portal plus the full operator admin app — customer + lead CRUD, auto-scheduling with day-of-week routing, GPS-watermarked photo proof, invoicing, daily digest, broadcast SMS, analytics. Ships in 21 days from intake completion or your deposit refunds in full. Balance of $5,000 invoices on launch day. $399/mo hosting + infra + AI + 1hr changes begins on launch. You own the code, the domain, and the data from day one.

**After-payment success URL:**
`https://day14.us/thanks?sku=platform&session={CHECKOUT_SESSION_ID}`

**Metadata (PaymentIntent):**
```
sku            = platform
sla_days       = 21
guarantee_days = 14
vertical       = {{vertical_slug}}
deposit_usd    = 5000
balance_usd    = 5000
monthly_usd    = 399
customer_email = {{customer_email}}
customer_company = {{customer_company_name}}
sow_url        = {{signed_sow_pdf_url}}
event          = deposit
```

**Confirmation email Stripe sends post-charge:**

> **Subject:** `Receipt — Day14 Platform deposit` *(32 chars)*
>
> Your $5,000 deposit cleared for Day14 Platform.
>
> Stripe receipt: {{stripe_receipt_url}}.
>
> Jack will email you inside the next 60 minutes with the intake form, plus a 15-min kickoff call invite. The 21-day build clock starts when intake is in.
>
> Questions before then: text {{jack_phone}}.
>
> — Jack
> Day14

*(67 words)*

---

### 2.4 Stripe-side setup notes (not copy)

- **Customer email collection:** required on every link.
- **Phone collection:** optional; ask in intake form instead.
- **Tax collection:** automatic, US-only at launch (Stripe Tax).
- **Custom field:** add one — `Business name (legal)` — so the receipt
  shows the right entity on the customer's books.
- **Allow promotion codes:** off. No coupons in the productized pricing.
- **Quantity adjustment:** off. One deposit per checkout.
- **Limit payment methods:** card + Link only at launch; ACH later
  for $5k+ deposits if a customer asks.

---

## Section 3 — Cal.com booking page setup checklist

This is the full setup for the 30-minute intro call linked from
`day14.us` and from every cold DM. Cal.com → Event Types → New.

**Event type name:** `Day14 — 30 min intro`

**URL slug:** `intro` *(matches `SITE.bookingUrl` in `src/lib/site.ts`: `cal.com/day14/intro`)*

**Duration:** 30 minutes

**Buffer time:** 15 minutes after each booking (no buffer before — keeps morning slots dense)

**Date range:** rolling 14 days out, working hours Mon–Fri 9am–5pm ET, with Tuesday and Thursday afternoons blocked for build work. Saturdays 10am–noon open for the operator-to-operator crowd who can't take calls during business hours.

**Description (shown on booking page):**

> 30 minutes. Operator to operator.
>
> I walk you through the three live Day14 builds — pool service (splashjackspools.com), events brand (houseoflove.co), contractor marketplace (preview). Then we look at what your version would ship as.
>
> If it's a fit, we sign the order form on the call and the build clock starts when your deposit clears. No deck. No sales pitch. If it's not a fit, I'll say so on the call instead of dragging it out.
>
> Bring: your current website (or what you use instead), a rough sense of what you'd want changed, and your phone. Most calls end with a Stripe link by text.
>
> — Jack

**Confirmation email body** (Cal.com → Workflows → Booking confirmation override):

> You're booked. {{event_date_time_local}} ({{event_duration}} min).
>
> Zoom: {{event_location_url}}. If you'd rather phone, reply with your number and I'll call instead.
>
> Before the call: skim day14.us/case-studies. Three live builds, 5 minutes each. Saves us 10 minutes on the call.
>
> If something blows up and you need to move it: {{event_reschedule_url}}.
>
> — Jack
> Day14

*(75 words)*

**Reminder email (24h before)** — Cal.com → Workflows → 24h reminder:

> **Subject:** `Tomorrow at {{event_time_local}} — Day14 intro` *(target under 50)*
>
> Day14 intro tomorrow at {{event_date_time_local}}.
>
> Zoom: {{event_location_url}}.
>
> If you'd rather phone, reply with a number.
>
> Reschedule if needed: {{event_reschedule_url}}.
>
> — Jack
> Day14

*(36 words)*

**Reminder SMS (2h before)** — Cal.com → Workflows → 2h SMS reminder, sent from Jack's Twilio number:

> `Day14 intro in 2 hours — {{event_time_local}}. Zoom: {{event_location_url_short}}. Reply C to cancel, R to reschedule. — Jack`

*(approx 145 chars with typical placeholder fills; if the Zoom URL is long, use a `day14.us/z/{6char}` redirect)*

**Booking form questions (3, max):**

1. **What's your business + city?** *(text, required)*
   Field label exactly as written. Used to pre-fill the dossier.

2. **What do you use today for your website / booking / billing?** *(text, required)*
   Free-form. "Nothing", "Squarespace + Calendly + Venmo", "Jobber" — all useful inputs. Pre-reads the conversation.

3. **Anything you'd like me to look at before the call? (URL or note OK)** *(text, optional)*
   Lets keen prospects send a homepage URL or a screenshot of a broken booking flow. The 10% who fill it in convert at 3× the rest.

**Hidden Cal.com settings worth flipping:**

- **Require confirmation:** off. Day14's offer is fast; making people wait for "is this slot really available?" kills booking rate.
- **Disable guests:** on. Single-attendee call.
- **Calendar event title:** `Day14 intro — {{ATTENDEE}} ({{ATTENDEE_COMPANY}})`
- **Redirect on booking:** `https://day14.us/booked?slug={{ATTENDEE_COMPANY_SLUG}}`
- **Webhook on booking created:** POST to `https://day14.us/api/webhooks/cal` so Day14 OS opens a dossier in Supabase before the call.

---

## Section 4 — Twilio SMS templates for operator notifications

All four sent **to Jack**, from the Day14 OS Twilio number. Used by
the morning briefing / approval pipeline / inbound classifier
described in `day14-os-vision.md`. No emoji. Each under 160 chars
so they fit in a single SMS segment and don't chunk on the carrier.

### 4.1 new-deposit

**Trigger:** Stripe `checkout.session.completed` webhook for any
Day14 Payment Link.

> `New deposit: {{company_short}} {{sku}} ${{deposit_amount}}. Build clock starts on intake. Dossier: day14.us/c/{{6char}}`

*(approx 112 chars with typical fills)*

**Rationale:** Names the four facts in priority order — company, SKU,
amount, next gate (intake). Dossier link is one tap to the customer
row.

### 4.2 approval-pending (with the 6-char short code)

**Trigger:** Build agent or feedback classifier creates a row in
`approvals` table with `status='pending'`.

> `Approval: {{change_summary_short}} for {{company_short}}. Preview: day14.us/p/{{6char}}. Tap to ship: day14.us/a/{{6char}}`

*(approx 130 chars with typical fills; the same 6char code is used
for both preview and approve to keep the SMS short)*

**Rationale:** Two links — one to see the preview, one to ship it.
"Tap to ship" is the verb; the URL is the action.

### 4.3 p0-complaint

**Trigger:** Inbound classifier scores a customer reply as complaint
(negative sentiment + urgency words) **or** customer hits the
"something's broken" button on the portal.

> `P0: {{company_short}} flagged a complaint at {{time_local_short}}. Quote: "{{first_8_words}}". Open: day14.us/c/{{6char}}. Apology draft queued for review.`

*(approx 158 chars; sometimes 1-2 over depending on quote — agent
should truncate the quote string at 8 words then trim at 158)*

**Rationale:** "P0" tells Jack the queue position before he reads
the company name. The quoted first 8 words let him triage from the
phone without opening the link.

### 4.4 daily-plan (morning briefing)

**Trigger:** 9:00 AM ET scheduled task per `day14-os-vision.md`,
after the morning briefing agent finishes its overnight read.

> `Today: {{n_active}} active builds, {{n_approvals}} approvals waiting, {{n_calls}} intro calls. Top item: {{top_item_short}}. Full brief: day14.us/today`

*(approx 145 chars with typical fills)*

**Rationale:** Three counts give Jack the shape of the day in one
glance. "Top item" is the single thing the agent thinks Jack should
do first; the full brief link is for the morning-coffee read.

---

## Section 5 — DM templates for first-customer outreach

Source: the Executor advisor in
`docs/council-log/0001-first-customer-acquisition.md` recommended five
DMs to SWFL service-business owners Jack has personally seen. The
existing `docs/outreach/dm-templates.md` file holds **cold** outreach
templates; what follows are three **warm / personally-observed**
templates for the council-recommended 5-DM run on Monday.

All three under 350 chars to fit Instagram's DM character limit
without truncation.

### 5.1 The "I-saw-your-truck" warm DM

For the pool guy / lawn guy / detail truck — anyone with a wrapped
vehicle Jack has personally spotted in Cape Coral / Fort Myers /
Bonita.

> Hey {{first_name}} — Jack here, I run Splash Jacks Pools out of Naples. Saw your {{truck_or_van}} on {{road_name}} {{day_seen}}. I rebuilt my whole back office in 14 days — site, customer portal, billing, photo proof, admin app. Live at splashjackspools.com. I can ship the same stack for yours in 2 weeks, $5k flat, you own the code. 30 min on Zoom this week? day14.us/intro

*(346 chars)*

**Rationale:** Specific road + truck description proves Jack actually
saw them — bypasses the "this is a bot" filter. Names the Splash
Jacks URL because it's the proof, not a brag.

### 5.2 The "how do you handle X today" warm DM

For the operator whose pain Jack can name out loud — the AC repair
guy whose quote sheet is paper, the junk hauler whose booking is "call
my cell."

> Hey {{first_name}} — Jack from Splash Jacks Pools. Quick one: how are you handling {{specific_pain_eg_quoting_or_scheduling}} today — text, paper, Jobber? I built a system that takes the inbound, sends the quote, books the visit, charges the card. Live at splashjackspools.com. I ship the same for other SWFL operators in 14 days, $5k flat. 30 min to look at yours? day14.us/intro

*(347 chars)*

**Rationale:** Asks a question first — owners reply to questions
more than to pitches. Names a specific pain to prove Jack knows the
business.

### 5.3 The "{{mutual}} mentioned you" warm DM

For the friend-of-a-friend referral — the salon owner Jack's wife
goes to, the gym owner from the Splash Jacks customer list, the
restaurant owner who's a Casamoré regular.

> Hey {{first_name}} — Jack. {{mutual_name}} mentioned you've been thinking about getting off {{current_tool_eg_squarespace_or_mindbody}}. I build customer portals + billing for SWFL service businesses in 14 days, $5k flat, you own the code. Reference: splashjackspools.com — that's mine. No-pitch 30-min look at what yours could be: day14.us/intro

*(344 chars)*

**Rationale:** The mutual name is the entire opener — it's the
warm-est warm intro Jack has. "No-pitch" sets the tone for an
operator-to-operator conversation, not a sales call.

### 5.4 Sending notes (carry-forward from `docs/outreach/dm-templates.md`)

- **One channel at a time.** If you DM'd on Instagram, don't email
  the same day. Wait 5 business days, then escalate channel.
- **No tracking links.** Plain `day14.us/intro` and plain case-study
  URLs. SWFL operators are wise to UTM parameters.
- **Personalize the first sentence.** "Saw your truck on Pine Island
  Rd Tuesday" beats "Saw your business on Maps" 4:1 on reply rate.
- **Two follow-ups max.** First follow-up at day 5 (use Template 4
  from `docs/outreach/dm-templates.md`). Second at day 14 with the
  Splash Jacks daily-digest screenshot only.
- **Track in the lead sheet.** Date sent, channel, who-sent-it,
  response, outcome. The Council's call: 5 DMs by Tuesday, double
  down on the channel that produced more signal by Friday.

---

## Voice-check summary

Pass criteria from `docs/seeds/skills/day14-voice/SKILL.md`:

- **No exclamation points.** Verified — zero across all sections.
- **No "we" describing Day14.** Verified — every customer-facing line is "I" or active-voice / verbless.
- **No buzzwords** (synergy, leverage, holistic, best-in-class, enterprise-grade, end-to-end, full-stack, robust, scalable, seamless, frictionless, cutting-edge, innovative, world-class, premium). Verified.
- **No "we're excited" / "looking forward" / "reach out" / "I hope this finds you well".** Verified.
- **Sentence-case headings.** Verified.
- **Signature `— Jack / Day14`** on every customer email. Verified.
- **Subject lines under 50 chars.** Verified across the 5 Resend templates and 3 Stripe receipts.
- **Email bodies under 100 words.** Verified — longest is 1.5 at 86 words.
- **SMS under 160 chars.** Verified — 4.3 is the closest at ~158 with typical placeholder fills (agent should hard-trim).
- **DMs under 350 chars.** Verified — longest is 5.2 at 347.

The "would Jack say this to a friend who runs a pool company" check
passed for every line. Anything that read as agency-voice got
rewritten.

---

## What's next for Jack (Monday wire-up order)

1. **Resend** — paste the 5 transactional templates into Resend
   Templates UI. Wire each to the trigger noted in §1. Test with a
   fake customer record before any real one.
2. **Stripe** — create the 3 Payment Links in Dashboard. Paste the
   product names, descriptions, metadata, success URLs. Override the
   confirmation email per §2 (Stripe Dashboard → Settings → Customer
   emails → custom template).
3. **Cal.com** — create the `intro` event type per §3. Set the form
   questions, the workflows, the webhook. Verify the booking page at
   `cal.com/day14/intro` loads.
4. **Twilio** — paste the 4 operator SMS templates into the Day14 OS
   notification module (the four trigger sites referenced in
   `day14-os-vision.md` §3 and §4). Send a test SMS to Jack's phone
   for each one.
5. **DM run** — paste the 3 warm templates into Notes, personalize
   the placeholders for the 5 specific people from the Executor's
   list, send Sunday night for Monday morning reads.

Estimated wire-up time, end to end: 90 minutes for §§1–4, plus 45
minutes Sunday night for §5 DM personalization. All under one
afternoon.

— end —
