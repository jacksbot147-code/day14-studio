---
name: auto-archive-spam
description: When inbound-classifier tags a message as "spam" (or related: bot, off-topic, scam), this skill auto-archives without drafting a reply, logs the pattern, and proactively tightens the spam filter. Supporting skill for inbound-classifier; keeps Jack's inbox clean.
triggers:
  - "spam message"
  - "bot inbound"
  - "scam attempt"
  - "auto-archive"
  - "phishing"
---

# auto-archive-spam

> Every spam reply costs Jack 15 seconds of attention. After 100
> spam messages, that's 25 minutes of pure waste. This skill is
> the dam.

## Trigger

`inbound-classifier` tags message with `general` AND confidence < 0.5
AND signals match the spam patterns below. Or tag = `spam` directly.

## Spam pattern signals

A message qualifies for auto-archive if it has 2+ of these:

| Signal | What to check |
|---|---|
| **No specific business reference** | Message doesn't mention Day14, the SKU, the customer's company name, or a specific service |
| **Generic boilerplate opener** | "Hi there", "Dear sir/madam", "Hope this email finds you well" |
| **Suspicious sender domain** | Free domains used for outbound (mail.ru, protonmail with random local-part, etc.) OR domain looks lookalike (e.g., day14-studios.com) |
| **Off-topic pitch** | "SEO services", "We can boost your rankings", "Add your business to our directory" |
| **All caps or excessive punctuation** | "URGENT!!!", "ATTENTION", "AMAZING OPPORTUNITY!!!" |
| **Crypto / financial scam** | Mentions of crypto, NFT, "investment opportunity", "Nigerian prince" variants |
| **Phishing patterns** | Asks for credentials, requests confirmation of bank/card details, "verify your account" |
| **Mass-mailer markers** | List-unsubscribe header that doesn't match a known service, oversized image-to-text ratio |

## What "auto-archive" does

1. **Move the message** to dossier 04-feedback.md under section `## Spam — auto-archived YYYY-MM-DD` (we keep a record, just out of the active queue)
2. **No draft reply** generated — silence is the correct response
3. **Append event:** `kind=spam-archived, payload={sender, signals_matched, confidence}`
4. **Block sender** at Resend if appearing 2+ times from same sender (delegate to Resend's blocked-list)
5. **No SMS to Jack** — spam doesn't deserve attention

## What auto-archive does NOT do

- **Never deletes the message.** Archive ≠ delete. Customer might be filing a real-but-poorly-written complaint that got misclassified.
- **Never marks as spam in Gmail/Resend WITHOUT verifying** — only blocks sender if 2+ matches.
- **Never trains a spam filter on private customer data.** Pattern matching only.

## False positive rescue

If Jack manually un-archives a message:
1. Log the un-archive event with reason (Jack's note)
2. Lower confidence on the matched signals in the rule set
3. Add the sender's domain to an allow-list to prevent re-archive
4. Postmortem if the false positive cost a real lead

If Jack confirms an archive was correct:
1. Optionally tighten the signal weights
2. Add the sender to the block list at Resend

## Adversarial considerations

Spammers adapt. Periodically (monthly):

- Review the spam-archived list for any false positives Jack flagged
- Update the signal patterns based on new patterns observed
- Don't auto-tune from <100 samples — small-sample tuning overfits

## Hard rules

1. **Never archive a message from a known customer.** Even if it looks like spam — they paid; their words matter. Surface to Jack.
2. **Never auto-archive a message that mentions money / refund / lawyer.** Even if it's a scam, false-archiving a real legal threat is a disaster. Surface to Jack.
3. **Never reply to spam** — replies confirm the address is live, generates more spam.
4. **Never share the spam archive publicly.** It contains scam patterns; sharing helps spammers iterate.
5. **Never use this skill for off-topic but legitimate messages.** A vendor pitching a related service is annoying, not spam. Tag as `general` low-confidence, let Jack triage.

## Failure modes

- **Customer legitimately writes a one-line "hi"**: low confidence, no spam signals matched, classified `general` → Jack sees it; no auto-archive.
- **Customer's legit message hits a spam signal by coincidence** (e.g., they typo CAPS LOCK on one word): if only 1 signal matched, not auto-archived; Jack sees it.
- **Sophisticated spear-phishing impersonating a customer**: this skill won't catch — surface anomalies (sudden out-of-character requests, urgency, secrecy) to Jack via SMS even on existing customer.

## Logging

`[YYYY-MM-DD HH:MM ET] auto-archive-spam → tenant: {tenant}, sender: {sender}, signals: {list}, confidence: <0.0-1.0>`

Weekly:
`[YYYY-MM-DD HH:MM ET] auto-archive-spam WEEKLY → archived: N, false_positives: N (rescued by Jack), new_signals_added: N`

## When invoked

- Automatically by `inbound-classifier` when tag = `spam` OR (tag = `general` + confidence < 0.5 + ≥2 spam signals)
- Manually when Jack flags a sender as spam ("block this sender")
- Weekly via a scheduled job to re-check archived messages for false positives
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('auto-archive-spam', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'auto-archive-spam', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
