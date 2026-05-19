---
name: read-aloud-checker
description: The "would Jack say this out loud to a friend who runs a pool company" filter. Runs after voice-drift-detector to catch the final mile of writing that's technically rule-compliant but still sounds wrong. Supporting skill for day14-voice.
triggers:
  - "would Jack say"
  - "sounds right"
  - "voice gut-check"
  - "read aloud"
---

# read-aloud-checker

> Voice-drift-detector catches mechanical violations. This skill
> catches what's harder to encode: text that's grammatically correct
> and rule-compliant but sounds like a script. The bar is "would a
> human say this out loud over a beer?"

## The 5 read-aloud tests

For any draft, ask:

### 1. Could a human say this aloud in one breath?
Read each sentence out loud (mentally). If you run out of breath, the sentence is too long for spoken English.

Fix: split, simplify, cut.

### 2. Does any sentence contain a word people say only in writing?
Examples:
- "utilize" (people say "use")
- "endeavor" (people say "try")
- "commence" (people say "start")
- "purchase" (people say "buy")
- "facilitate" (people say "help")
- "regarding" (people say "about")

Fix: replace with the spoken equivalent.

### 3. Does the opener sound like Jack saying it?
Day14 voice opens mid-thought. Test:

Bad opens:
- "I hope this finds you well"
- "Per our conversation"
- "Just touching base"
- "I wanted to reach out about"

Good opens:
- "Got your message — preview's up at..."
- "Quick update on the build..."
- "Saw your truck on Pine Island Rd..."
- "Two things from today..."

### 4. Does the closer match the relationship stage?
- New lead → "Want a preview before you decide?"
- Mid-build customer → "Anything looks off, text me."
- Post-launch → "Anything breaks in the first 30 days, I fix it free."

Mismatched stage = wrong voice. The closer carries the relationship status.

### 5. Could you swap "I" for "Day14" without it sounding weird?
Day14 is a single operator. If the sentence implies multiple people ("our team", "we"), it's drifted into agency-speak.

Test sentence: "We'll review your feedback and get back to you."
After swap: "Day14 will review your feedback and get back to you."

Sounds robotic = drift. Fix:
"I'll read your feedback today and reply by 5pm."

## The output

For each issue found, return:

```
Read-aloud issues: {N}

Test 1 (in-one-breath): Line 3 — "...{too-long-sentence}..." (38 words). Split.
Test 2 (spoken English): Line 5 — "facilitate" → "help"
Test 3 (Jack-style opener): Line 1 — "I hope this finds you well" → drop; open mid-thought
Test 5 (singular "I"): Line 7 — "our team" → "I'm" (Day14 is Jack)

Recommended rewrite:
{2-3 lines of how the draft should read after fixes}
```

## Hard rules

1. **Never run this on customer-side voice** — each customer has their own brand.json voice. This skill is Day14's voice only.
2. **Never block on test 4 (closer mismatch)** without surfacing the right closer for the relationship stage. Be helpful, not just judgmental.
3. **Never re-write entire emails.** Surface line-level fixes; let the writer choose.

## When this skill fires that voice-drift-detector didn't

Examples of text that passes voice-drift-detector but fails read-aloud:

Bad: "I will personally ensure that your concerns are addressed in a timely manner."
- No forbidden phrases, no "!", first-person, short-ish
- But: nobody talks like that. Sounds like a customer-service script.

Good: "I'll look at this tonight. Will text you tomorrow morning."

Bad: "Please do not hesitate to contact me with any further questions."
- No forbidden phrases
- But: it's a stock phrase. Sounds boilerplate.

Good: "Questions? Text me — 239-555-0123."

## Logging

`[YYYY-MM-DD HH:MM ET] read-aloud-checker → draft: {slug}, issues_found: N, biggest: {one-line}`

## When invoked
- After `voice-drift-detector` passes
- Before any customer-facing send
- Manually on Day14 blog posts (these need extra polish — they're permanent)
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('read-aloud-checker', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'read-aloud-checker', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
