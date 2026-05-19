---
name: voice-drift-detector
description: Catches when a draft has drifted from day14-voice into agency-speak. Runs as a pre-send filter on customer emails, blog posts, and social drafts. Surfaces specific phrase-level corrections so the writer can fix without re-drafting. Supporting skill for day14-voice.
triggers:
  - "voice check"
  - "agency-speak"
  - "tone slipped"
  - "before I send"
  - "draft review"
---

# voice-drift-detector

> day14-voice has rules. Drafts violate them. This skill catches
> the violations before customer-facing text ships.

## Input
Any draft text (email, blog, SMS, social post).

## The pattern matchers (any 1+ flagged = drift detected)

### Forbidden phrases (hard rejection)
Word-for-word matches that day14-voice explicitly bans:
- "we're excited to"
- "we're thrilled"
- "in today's fast-paced"
- "leveraging" (as a verb)
- "synergy" / "synergize"
- "best-in-class"
- "world-class"
- "cutting-edge"
- "innovative"
- "premium"
- "robust"
- "seamless"
- "frictionless"
- "best regards"
- "I hope this email finds you well"
- "reach out" (use "email me" / "text me")
- "circle back"
- "low-hanging fruit"
- "moving the needle"

### Forbidden punctuation
- Any `!` (zero exclamation points, ever)
- Em-dashes used to soften ("I think — maybe — we should") — em-dashes for emphasis are fine
- Three-dot ellipsis as "thinking out loud" — replace with period

### Pronoun drift
day14-voice rule: first-person singular ("I") not royal-we when describing Day14's work.

Detect:
- "We're working on..." → should be "I'm working on..."
- "The team will..." → should be "I'll..." (or "Jack will" if signing as agent)
- "Our agency" → never appears in Day14 voice; "Day14" or "I"

### Vague-quantifier drift
day14-voice rule: numbers over adjectives.

Detect:
- "many", "various", "several", "a few", "a lot of" → flag for replacement
- "great", "amazing", "awesome", "incredible" → replace with specific
- "soon" → specify when

### Sentence-length drift
day14-voice rule: short sentences. Mostly one clause.

Detect:
- Any sentence over 30 words → flag for splitting
- 3+ consecutive sentences over 20 words → flag for compression

## Output

Inline annotations on the draft:

```
{Original draft text with each detected drift highlighted}

## Voice issues found: {N}

1. Line 3: "We're excited to announce" → "Day14 just shipped" (forbidden phrase)
2. Line 5: "many customers" → use specific count (vague quantifier)
3. Line 7: 42-word sentence → split into 2 (sentence-length drift)
4. Line 9: "!" → remove (forbidden punctuation)

Recommended rewrite (first attempt):
{auto-generated rewrite that fixes all detected issues}
```

## Severity tiers

- **High** (must fix before send): forbidden phrases, royal-we, exclamation points, any sensitive customer claim that can't be verified
- **Medium** (fix unless reason exists): vague quantifiers, sentence length, "reach out"
- **Low** (style note): minor polish, optional word swaps

A draft with ANY high-severity issue is BLOCKED from send until fixed. Medium/low get surfaced but don't block.

## Hard rules

1. **Never auto-rewrite a draft without showing the diff.** Writer must consent to the fix.
2. **Never apply this skill to internal text** (build logs, MASTER_LOG, postmortems). Voice rules are customer-facing only.
3. **Never block on style-only "low" issues.** They're suggestions, not gates.
4. **Never expand the forbidden-phrase list without operator review.** New entries change ship rate.

## When invoked

Before any of these:
- Sending a customer email (drafted by `eod-update-writer` or any other skill)
- Publishing a blog post (`blog-draft-writer`)
- Sending an outreach DM (`outreach-trigger` or `warm-dm-personalizer`)
- Posting a public reply to a review (`review-response`)
- Manually when Jack wants a sanity check on something he wrote

## Logging

`[YYYY-MM-DD HH:MM ET] voice-drift-detector → draft: {slug or path}, high: N, medium: N, low: N, blocked: {yes|no}`

After many runs, track the most-common drift patterns and surface to the writer / agent that's producing them:
`[YYYY-MM-DD HH:MM ET] voice-drift-detector PATTERN → agent: {name}, drift: {phrase}, count: {N in 30 days}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('voice-drift-detector', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'voice-drift-detector', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
