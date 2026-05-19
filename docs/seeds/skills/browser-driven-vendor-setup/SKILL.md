---
name: browser-driven-vendor-setup
description: The protocol for an agent taking over Jack's Chrome browser to complete a vendor setup flow — Supabase, Stripe, Resend, Twilio, Cal.com, Vercel, GitHub, etc. Encodes the exact safety boundaries (no payment, no password entry, no key reading) and the handoff points where Jack must intervene. Use whenever Jack says "take over the chrome" or "drive the browser" or asks an agent to complete a vendor onboarding.
triggers:
  - "take over chrome"
  - "drive the browser"
  - "log in to"
  - "set up Stripe"
  - "set up Resend"
  - "set up Twilio"
  - "create the supabase project"
  - "wire up the vendor"
  - "configure"
---

# browser-driven-vendor-setup

> Jack hates clicking through 20-step onboarding forms. The agent does
> 90% of the clicking. Jack does the 10% the agent can't safely do.
> That boundary is the whole skill.

## The 90/10 split

**Agent does (90%):**
- Navigate to the right pages
- Fill in form fields (project name, region, integration settings, webhook URLs, etc.)
- Select dropdowns
- Verify state via screenshots
- Save query / paste schema / paste config
- Click safe-to-click buttons (Save, Next, Continue, Cancel, Generate, Test)
- Read back what shipped (count of tables, URL of preview, status of build)

**Jack does (10%):**
- Enter passwords (login, database password, encryption keys)
- Enter credit card info
- Click "Subscribe" / "Confirm payment" / "Pay now"
- Click "Delete" / "Drop database" / any irreversible destructive action
- Copy and store API keys / secrets / tokens in his password manager
- Approve OAuth scope grants
- Solve CAPTCHAs / human verification challenges

The 10% is the part where mistakes cost real money or real data. Jack
owns that boundary. Agent owns the rest.

## Standard flow

For any vendor setup, the agent follows this sequence:

### 1. Pre-flight (before opening browser)
- Read this skill
- Confirm what vendor + what outcome (Supabase Pro upgrade? Stripe webhook? Resend domain?)
- If the outcome involves money or destructive actions, ask Jack once: "I'll drive the {vendor} flow. I'll stop at {payment / password / delete}. You finish those parts. OK?"
- Wait for explicit OK before opening the browser

### 2. Connect
- `mcp__Claude_in_Chrome__list_connected_browsers` to confirm extension is connected
- `select_browser` with the device ID
- `tabs_context_mcp` with `createIfEmpty: true` to get a workspace tab
- Navigate to the vendor dashboard

### 3. Snapshot state
- Take a screenshot first — never act blind
- Confirm Jack is logged in. If not, stop and ask him to log in.
- Identify the current state vs. the target state

### 4. Drive
- Use `browser_batch` to chain navigations, clicks, types in single round-trips (faster, fewer screenshots)
- Use `find` to locate elements by purpose (e.g., "Run query button") — DOM-aware, doesn't break on layout shifts
- Use `form_input` with element refs for typing into form fields
- Use `javascript_tool` to set Monaco/CodeMirror editor values directly (much faster than typing 500-line schemas)
- Screenshot after every state-changing action to verify

### 5. Stop at the boundary
- Hard stops: payment, password, OAuth scope grant, copy-keys-to-clipboard
- When you hit one, output a numbered list of what Jack must do, in order
- Don't read out keys/secrets/passwords even if visible on screen — that creates a trail

### 6. Resume after Jack's part
- Take a fresh screenshot to confirm Jack completed the step
- Continue driving until done OR until the next boundary

### 7. Verify
- Run a sanity check that proves the setup worked (e.g., SELECT to confirm tables exist; preview deploy returns 200; Stripe test webhook fires)
- Log result to MASTER_LOG.md

## Per-vendor playbooks

### Supabase (project create + schema deploy)
- Org: confirm Pro plan via the PRO badge in top breadcrumb. If not Pro, stop and ask Jack to upgrade.
- Project name: kebab-case, scoped (e.g., `day14-studio`, `customer-acme-pool`)
- Region: us-east-1 unless Jack overrides — matches Vercel default + closest to SWFL
- Compute: MICRO is fine for any pre-customer-#1 work
- Database password: **boundary — Jack types this and saves to password manager**
- Wait for provisioning (~2 min)
- SQL Editor: paste schema via `monaco.editor.getEditors()[0].setValue(...)` — 1000× faster than typing
- RLS prompt: "Run and enable RLS" is the right call for Day14 tables (server-only access via service_role)
- Verify with `select table_name from information_schema.tables where table_schema = 'public'`
- API Keys page: **boundary — Jack copies publishable + secret keys to password manager AND .env.local AND Vercel env vars**

### Stripe (webhook + Payment Link setup)
- TEST MODE ONLY. Confirm test-mode toggle is on before any action.
- Payment Links: name `Day14 — {SKU}`, success URL `https://day14.us/thanks?sku={tier}`, metadata keys: `sku`, `sla_days=14`, `vertical`
- Webhook: endpoint URL `https://day14.us/api/webhooks/stripe`, events: `payment_intent.succeeded`, `payment_intent.payment_failed`
- **boundary — Jack flips live mode and copies the live webhook signing secret to Vercel env vars when ready to take real money**

### Resend (transactional email + inbound)
- Domain: `day14.us`. Add DNS records (SPF, DKIM, DMARC) via the DNS host (Cloudflare or Vercel Domains)
- API key: **boundary — Jack copies to password manager + .env.local + Vercel env vars**
- Inbound webhook: `https://day14.us/api/webhooks/inbound` — only after the inbound-classifier skill is implemented

### Twilio (operator SMS)
- Buy a phone number with the day14 area code if available (239 for SWFL)
- Messaging service: name it `day14-operator`
- API SID + auth token: **boundary — Jack copies, never read back in chat**

### Cal.com (booking page)
- Event type: `Day14 — 30-min discovery`
- Duration: 30 min, buffer: 15 min
- Description: pull from `03-customer-comms-pack.md` if it exists
- Webhook: `https://day14.us/api/webhooks/intake` for "booking confirmed" events

### Vercel (deploy + env vars)
- Project: import from GitHub `jacksbot147-code/day14-studio`
- Env vars: paste all 12+ vars from `.env.local.example`
- Custom domain: `day14.us` — **boundary — DNS records need DNSimple/Cloudflare access; Jack adds the CNAME**

## Hard rules — never break these

1. **Never type a password.** Even if the form is in front of you and you "know" it. Even if Jack tells you to. Passwords go through Jack's fingers, period.
2. **Never click "Subscribe" / "Pay" / "Confirm purchase".** Even for $0 trials. Even for "free with credit card on file." Jack clicks the payment trigger.
3. **Never read API keys / secrets / tokens out in chat.** Even partially. Even masked. If a key is visible on the screen, navigate AWAY from that screen before continuing the conversation.
4. **Never delete data.** No "delete project", no "drop table", no "remove webhook" without an explicit numbered approval in chat. Even with approval, prefer "archive" or "disable" over "delete."
5. **Never solve CAPTCHAs.** Jack does the human-verification step.
6. **Never grant OAuth scopes.** Jack reviews and clicks.
7. **Never send email / SMS / Slack messages as Jack.** Drafts only — Jack hits send.

## Failure modes

- **Vendor's UI changes mid-flow:** Use the `find` tool to locate elements by purpose, not by coordinate. Coordinates break on layout shifts; semantic search doesn't.
- **A click triggered a modal you didn't expect:** Screenshot, read the modal, decide if it's safe to dismiss. If it's a destructive-action confirmation, surface to Jack.
- **Page loads forever:** Wait up to 30 seconds, then refresh. If still hung, surface to Jack — there may be a vendor outage.
- **Form submission silently fails:** Look for inline error messages near the submit button. Most vendors show them but they're easy to miss.
- **Modal blocks click target:** Press Escape, then re-attempt. If escape doesn't dismiss, look for an X button in the upper-right.

## Logging

After every browser-driven vendor setup, append to MASTER_LOG:
`[YYYY-MM-DD HH:MM ET] browser-driven-vendor-setup COMPLETE → {vendor}/{action}, what-shipped: {brief}, confidence: <0.0-1.0>`

Always note what's still Jack-side: e.g., "remaining: env vars to Vercel, $25/mo Pro confirmed on existing billing cycle."

## Why this skill matters

Setup tasks are death by a thousand clicks. They're high-context (you
need to know which dropdown means what), high-stakes (one wrong toggle
=  surprise $500/mo bill), and high-tedium (no agent should ever just
*do* one. They should *drive* a hundred and save Jack the hour each.

The skill compounds: each new vendor adds a playbook section. By the
time Day14 onboards customer #10, every common vendor flow has a
known-good pattern. The agent gets faster; Jack stays focused on the
20% that actually requires judgment.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('browser-driven-vendor-setup', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'browser-driven-vendor-setup', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
