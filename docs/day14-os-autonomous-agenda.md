# Day14 OS — full autonomous + Telegram agenda

> Target end-state: Jack operates Day14 from his phone via Telegram.
> Agents run customer pipeline, content, polish, comms, council
> decisions, postmortems autonomously. Jack approves/rejects/messages
> from anywhere. The empire fires whether or not he's at the laptop.
>
> Reference vibe: the indie founder building in public who runs the
> entire business from one chat window on their phone.

---

## Where we are today (May 16, 2026)

✅ **Have:**
- 99 skills installed in `~/Documents/businesses/_shared/skills/`
- 9 scheduled tasks queued in Cowork (daily kickoff, EOD, nightly polish, weekly council/harvest, 4 one-shot overnight tasks)
- Supabase day14-studio project live (5 tables + 2 views + RLS)
- Studio repo deployed to day14-studio.vercel.app
- Empire pattern at `~/Documents/businesses/` with `_shared/` git-tracked
- Mac mini on order (Jun 10-17 delivery)

🟡 **Have-but-not-wired:**
- Stripe Payment Links (not yet created)
- Resend domain (not yet verified)
- Cal.com booking (not yet configured)
- Twilio account (not yet provisioned)
- day14.us domain (not yet pointed)

❌ **Don't have:**
- Telegram bridge (the centerpiece of the new agenda)
- Always-on poller daemon
- Vercel webhook handlers wired to real flows
- Auto-approval for low-risk decisions
- Voice / TTS layer
- Health monitoring
- True end-to-end customer pipeline (no real customer yet)

---

## The end-state user experience

### Jack's morning (target)
- **8:00 AM** — Telegram notification: "Daily kickoff. Today's 3 priorities + 2 pending approvals." Tap-through to a clean digest message.
- **8:15 AM** — Coffee. Tap "Approve" on 2 cards. Tap "Snooze 1d" on a council question that can wait.
- **Anywhere during the day** — Jack types `mrr` into Telegram → Day14 replies with current MRR + 30-day delta. Jack types `customer acme-pool` → status, last activity, next action.
- **Any time** — A customer pays a deposit → Jack gets a Telegram push: "New customer: Acme Pool ($2,500 deposit). Build agent kicked off. First preview in ~2h. Tap to see dossier."

### Jack's evening (target)
- **5:00 PM** — EOD message: "Today shipped X. Pending: Y. Tomorrow's first action: Z."
- **9:00 PM** — Optional check-in. Jack ignores or sends a free-form note ("remind me Monday to call the Cape Coral lawn guy").
- **11:00 PM** — Nightly polish silent unless something broke. If broken: P1 message with diagnostic + recommended fix.

### Jack while driving / on a call (target)
- Voice memo to Telegram: "Approve Acme deploy. Reject the hero photo change. Tell Naples Spa I'll answer by 4."
- Day14 transcribes, parses 3 commands, files 3 approvals, drafts the customer message for one-tap send.

---

## The 6-phase build plan

### Phase 1 — Telegram bridge core (Week 1)

The minimum viable bridge: Jack can send/receive text with Day14 OS.

**Skills to build:**
- `telegram-bridge` (anchor) — the protocol contract
- `telegram-inbound-parser` — parse incoming Telegram messages (text, photos, voice, commands)
- `telegram-outbound-formatter` — format outgoing messages (markdown, inline buttons, attachments)
- `telegram-command-router` — map free-text commands to skill invocations

**Infrastructure to build:**
- Node poller script at `~/Documents/studio/scripts/telegram-poller.mjs`
- macOS LaunchAgent plist to keep poller alive at login
- Message queue at `~/Documents/businesses/_shared/telegram/{inbox,outbox}/`

**Jack's setup steps:**
- Create Telegram bot via @BotFather (~3 min)
- Add TELEGRAM_BOT_TOKEN to .env.local
- Run `bash ~/Documents/studio/scripts/install-telegram-poller.sh`
- Send "hi" to the bot → verify reply

### Phase 2 — Approval cards through Telegram (Week 2)

Existing `approval-card-builder` outputs to dossier files. Phase 2 also pushes to Telegram with inline buttons.

**Skills to build:**
- `telegram-approval-card` — wraps approval-card-builder for Telegram delivery
- `telegram-conversation-state` — multi-turn conversation memory (e.g., "yes" reply remembers which card was just shown)
- `urgency-classifier` — P0/P1/P2/P3 rating on every notification
- `jack-asleep-detector` — Jack's local time + active hours; don't ping at 3 AM unless P0
- `batching-quiet-hours` — queue non-P0 between 10 PM - 8 AM, deliver as morning digest

**Outcomes:**
- Approval cards arrive as Telegram messages with inline ✅/❌/💬 buttons
- Quiet hours respected
- Urgency dictates whether a card buzzes Jack's phone or batches

### Phase 3 — Proactive status pushes (Week 3)

Day14 OS proactively pushes status changes to Jack — he doesn't have to ask.

**Skills to build:**
- `telegram-status-pusher` — orchestrates proactive messages
- `event-to-telegram-mapper` — which events table entries deserve a push (vs. silent log)
- `daily-kickoff-telegram-formatter` — beautify the kickoff for Telegram (collapsible sections, deep-links to dossiers)
- `eod-telegram-formatter` — same for EOD
- `nightly-polish-alert` — silent unless red; if red, P1 Telegram

**Outcomes:**
- Stripe deposit cleared → instant Telegram push
- New approval card filed → push with buttons
- Lighthouse drops below 80 → P1 push
- Daily kickoff at 8 AM → Telegram message
- EOD at 5 PM → Telegram message

### Phase 4 — Wire the real customer pipeline (Week 4)

Vercel routes that wire all the inbound webhooks into the empire.

**Skills to build:**
- `vercel-route-stripe-webhook` — implementation of `/api/webhooks/stripe`
- `vercel-route-intake-webhook` — `/api/webhooks/intake`
- `vercel-route-resend-inbound` — `/api/webhooks/inbound`
- `vercel-route-cal-com-webhook` — `/api/webhooks/cal`
- `supabase-event-listener` — Supabase realtime → downstream agents
- `pipeline-end-to-end-test` — simulate a fake customer through the pipeline

**Outcomes:**
- Real customer #1 can pay a deposit and trigger the full chain autonomously
- Every step generates a Telegram update for Jack

### Phase 5 — Auto-approval for low-risk decisions (Week 5)

Don't ping Jack for trivia. Only the decisions that matter.

**Skills to build:**
- `auto-approve-low-risk` — define and enforce risk thresholds
- `auto-approval-audit` — periodic review: did auto-approvals make the right call?
- `escalation-pattern-detector` — if a class of cards keeps getting auto-approved without issues, codify
- `risk-scoring` — score every approval card by reversibility × magnitude × urgency

**Outcomes:**
- 70% of approval cards auto-approve silently
- Jack sees only the 30% that need real judgment
- Quarterly tune the thresholds based on aged outcomes

### Phase 6 — Voice + advanced (Week 6+)

The phone-only operator UX.

**Skills to build:**
- `voice-message-transcriber` — Telegram voice notes → text → command-router
- `voice-tts-out` — Day14 responds with synthesized voice (for driving / Apple AirPods)
- `multi-command-parser` — "approve A, reject B, draft C" → 3 actions in one voice memo
- `shortcuts-bridge` — iOS Shortcuts integration (Siri shortcuts → Day14)
- `apple-watch-complication` — pending approval count on the watch face
- `email-fallback-channel` — when Telegram is down, route to email

**Outcomes:**
- Jack can operate Day14 from the car
- Apple Watch shows pending approval count
- Siri shortcut: "Hey Siri, Day14 status" → spoken summary

---

## The skill gap to fill (38 new skills total)

By layer:

### Layer 1 — Telegram bridge (Phase 1): 4 skills
- telegram-bridge
- telegram-inbound-parser
- telegram-outbound-formatter
- telegram-command-router

### Layer 2 — Approval through Telegram (Phase 2): 5 skills
- telegram-approval-card
- telegram-conversation-state
- urgency-classifier
- jack-asleep-detector
- batching-quiet-hours

### Layer 3 — Proactive push (Phase 3): 5 skills
- telegram-status-pusher
- event-to-telegram-mapper
- daily-kickoff-telegram-formatter
- eod-telegram-formatter
- nightly-polish-alert

### Layer 4 — Webhook automation (Phase 4): 6 skills
- vercel-route-stripe-webhook
- vercel-route-intake-webhook
- vercel-route-resend-inbound
- vercel-route-cal-com-webhook
- supabase-event-listener
- pipeline-end-to-end-test

### Layer 5 — Auto-approval (Phase 5): 4 skills
- auto-approve-low-risk
- auto-approval-audit
- escalation-pattern-detector
- risk-scoring

### Layer 6 — Voice + advanced (Phase 6): 6 skills
- voice-message-transcriber
- voice-tts-out
- multi-command-parser
- shortcuts-bridge
- apple-watch-complication
- email-fallback-channel

### Layer 7 — Infrastructure (cross-phase): 4 skills
- always-on-poller
- launch-agent-setup
- watchdog-self-restarter
- pipeline-stuckness-detector

### Layer 8 — Self-monitoring (cross-phase): 4 skills
- autonomous-health-check
- mrr-calculator
- skill-invocation-monitor
- pipeline-stuckness-detector (overlap with L7)

**Total: ~38 new skills + the Node poller + LaunchAgent**

Brings empire to ~137 skills + actual infrastructure.

---

## What Jack does in the meantime

While the agent builds:
1. **Create Telegram bot** (3 min)
   - Open Telegram → search @BotFather → /newbot → name it "Day14 OS" → save bot token
2. **Add token to .env.local** (1 min)
   - `TELEGRAM_BOT_TOKEN=<your_token>`
3. **Send /start to your bot** to get the chat_id (1 min)
   - Tells Day14 OS where to push messages
4. **Otherwise: business as usual** — record the case study video, fire the skill harvest, drive customer #1 acquisition

The autonomous infrastructure builds in parallel. Doesn't block customer #1.

---

## Cutover plan: laptop → Mac mini (Jun 10-17)

The autonomous layer goes ON the mini when it arrives. Until then:
- Laptop runs the Node poller (kept alive via launchctl)
- Lid open, plugged in, never sleeps (already configured)
- When mini arrives: rsync `~/Documents/businesses/` → mini, install poller on mini, point Telegram webhook (or polling target) to mini's IP via Tailscale

---

## Risks

1. **Telegram rate limits** — bot API has limits. Mitigation: batch messages, use queue.
2. **Always-on poller dies silently** — Mitigation: watchdog skill periodically pings; restarts if dead.
3. **Jack's phone breaks** — Mitigation: email-fallback-channel (Phase 6).
4. **Approval flood during a busy day** — Mitigation: auto-approve + batching.
5. **Telegram message containing secret keys** — Mitigation: `voice-drift-detector`-like check on outbound; reject if secret detected.

---

## First-week deliverable (this week, May 16-22)

Phase 1 ships. By end of week:
- Telegram bot exists, paired with Day14 OS
- Jack can send a message + get a reply
- Daily kickoff at 9 AM lands in Telegram
- The Node poller stays alive
- One scheduled task fires a "test push" to verify
