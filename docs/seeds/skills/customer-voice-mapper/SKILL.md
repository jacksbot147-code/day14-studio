---
name: customer-voice-mapper
description: Each Day14 customer has their own voice (formal vs casual, "we" vs "I", emoji-yes or emoji-no). This skill captures that voice in 01-brand.json so customer-facing writing matches THEIR voice, not Day14's. Supporting skill for day14-voice — overrides for customer outputs.
triggers:
  - "customer's voice"
  - "their tone"
  - "brand voice for customer"
  - "match their voice"
---

# customer-voice-mapper

> day14-voice is Jack's voice. Splash Jacks's voice is different.
> Casamoré's voice is different. Each Day14 customer's voice will
> be different. This skill encodes the difference.

## Where customer voice lives

In `01-brand.json` under `voice` section (extend existing schema):

```json
{
  "voice": {
    "pronoun": "we" | "I",
    "tone": "formal" | "warm-casual" | "casual" | "playful",
    "emoji_use": "never" | "sparingly" | "frequent",
    "exclamation_use": "never" | "sparingly" | "expected",
    "industry_terms": ["..."],
    "avoid_phrases": ["..."],
    "signature_lines": ["..."],
    "examples": {
      "email_greeting": "Hi {name},",
      "email_closer": "Talk soon, {owner_first_name}",
      "social_post_style": "..."
    }
  }
}
```

## How the mapping is built

Phase 1 (intake): Jack asks 3 questions on kickoff call:
1. "How would you describe how you talk to your customers? One word."
2. "If your business were a person, would they be more formal or more casual?"
3. "Are there phrases you use that sound like 'you' to your customers? Examples?"

Fill `voice.tone` + `voice.signature_lines` from these.

Phase 2 (brand-extractor pass): The skill `brand-extractor` scrapes:
- Customer's existing Instagram captions
- Existing Facebook About section
- Existing site copy

Extracts:
- Average sentence length
- Pronoun preference (we vs I)
- Emoji frequency
- Common phrases (3-5 most distinctive)

Fills `voice.pronoun`, `voice.emoji_use`, `voice.industry_terms`.

Phase 3 (continuous learning): When Jack edits an agent-drafted reply, log the edit. After 10 edits per customer, look for patterns:
- "Jack consistently replaces 'service' with 'visit'"
- "Jack adds emoji to drafts targeting this customer's customers"
- "Jack rewrites all sentences to first-person plural"

Update `voice.*` from learned patterns. Surface to Jack as approval card: "Voice update for {customer}: I noticed {pattern}. Apply going forward?"

## How the mapping is used

Any time an agent drafts customer-facing text for one of THIS customer's customers, it:

1. Reads `01-brand.json` → `voice` section
2. Overrides Day14-voice rules with the customer's voice rules:
   - If customer's voice.pronoun is "we", use "we" not "I"
   - If voice.tone is "playful", emoji and exclamations are ON
   - If voice.industry_terms has entries, prefer those terms over generic
   - If voice.examples.email_closer is "Talk soon, {first_name}", use that signature

3. Day14-voice rules that are NEVER overridden:
   - No buzzwords (synergy, leverage as verb, etc.)
   - No "in today's fast-paced world" openers
   - Specific over vague

These are universal voice quality, not Day14-specific.

## Hard rules

1. **Never blend Day14's voice with customer's voice** in customer-facing text. One or the other; pick based on audience.
2. **Never auto-update `voice.*` based on a single edit.** Pattern over time.
3. **Never assume voice from one channel transfers to another.** Customer's Instagram voice may differ from their email voice.
4. **Never override customer-explicit voice rules.** If they said "we never use exclamation points," respect it.

## Failure modes

- **Customer's voice rules contradict day14-voice quality rules**: customer wins on style (tone, pronoun, emoji); Day14 wins on quality (no buzzwords ever).
- **Customer hasn't given enough signal yet** (intake just done, no edit history): use a sensible default from their vertical (membership = warm; mobile-service = direct; food = enthusiastic).
- **Customer's tone shifts post-launch** (e.g., gets more formal after a complaint): update voice notes; surface the shift to Jack.

## Logging

`[YYYY-MM-DD HH:MM ET] customer-voice-mapper → customer: {slug}, voice_fields_filled: N, learning_pattern_detected: {none|yes-{what}}`

## When invoked
- During customer onboarding (Phase 1 — kickoff call)
- During `brand-extractor` (Phase 2)
- After every customer-facing send that Jack edited (Phase 3 — learning)
- Before any agent drafts text for the customer's customers (read-only lookup)
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('customer-voice-mapper', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'customer-voice-mapper', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
