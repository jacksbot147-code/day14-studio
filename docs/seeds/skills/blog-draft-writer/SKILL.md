---
name: blog-draft-writer
description: Write a blog draft for the Day14 marketing site (or for a Day14 customer's site). Draft is shipped on day 1 — no editorial perfectionism. Topic + angle + outline in, full draft out, ready for Jack's voice-check pass.
triggers:
  - "write a blog post"
  - "blog draft"
  - "long-form content"
  - "article"
  - "case study writeup"
---

# blog-draft-writer

> Day14 doesn't need a blog. Day14's CUSTOMERS need blogs.
> Their service-business sites rank when Google sees fresh,
> specific, locally-relevant content. This skill drafts that
> content fast enough to actually ship.

## Input

```yaml
audience: <day14 prospects | customer's customers (homeowners, members, diners)>
tenant: <day14 | splash-jacks-pools | casamore | buildbridge | other>
topic: <one-line headline-style topic>
angle: <what's the specific take or hook>
target_length: <short (300-500w) | medium (700-1000w) | long (1500-2500w)>
keyword: <optional SEO target>
publish_date: <ideally same day; never more than 1 week out>
```

## Output structure

Save to:
- Day14 blog: `~/Documents/studio/docs/blog-drafts/YYYY-MM-DD-{slug}.md`
- Customer blog: `~/Documents/businesses/day14/customers/{slug}/blog-drafts/...`

```
---
title: {Headline — sentence case, < 60 chars}
slug: {kebab-case}
date: YYYY-MM-DD
author: Jack (or customer's owner name)
tenant: {tenant}
keyword: {primary keyword}
audience: {who this is for}
length: {actual_word_count}
status: draft
---

# {Title}

{Lead — 1 paragraph that makes the reader care. Specific number,
event, or moment in the first sentence. NO "in today's fast-paced
world" openers.}

## {Section heading 1 — concrete, not abstract}

{2-4 short paragraphs. One idea per paragraph. Numbers > adjectives.}

## {Section heading 2}

{Same.}

## {Section heading 3 — optional}

{Same.}

## {Closing — 1 paragraph}

{A specific call to action: text the business, book a visit, get
a quote. Match the audience.}
```

## Voice rules

Use the relevant voice skill:
- Day14 blog → `day14-voice`
- Customer site blog → that customer's brand.json voice notes
- SWFL-specific topics → also pull `swfl-context`

Universal:
- Sentence-case headings only
- One idea per sentence
- Active voice
- Specific examples, not "many", "various", "a lot of"
- No "in conclusion" sign-offs
- No "did you know"-style openers
- No "research shows" without citing the research

## Topic types & their templates

### How-to / educational
- For: homeowners reading customer's site
- Structure: problem → 3-5 step solution → when to call a pro
- Length: medium (700-1000w)
- Example: "What to do when your pool turns green"

### Local + seasonal
- For: SWFL audience (homeowners, business owners)
- Structure: seasonal context → what changes → what to watch for
- Length: short to medium (500-800w)
- Example: "Pool care during hurricane season — what to do before / during / after"

### Comparison
- For: prospects deciding between options
- Structure: criteria → option A → option B → recommendation by use case
- Length: medium (700-1000w)
- Example: "Salt vs chlorine pool — which works better in SWFL water"

### Customer story / case study
- For: prospects evaluating the business
- Structure: customer's problem → what we did → result (with metric if possible)
- Length: medium (700-1000w)
- Example: "How we recovered a 6-week-neglected pool in Cape Coral"

### Day14-specific
- For: SWFL service business owners evaluating Day14
- Structure: business pain → why typical web vendors don't fix it → Day14 approach → invite
- Length: medium (700-1000w)
- Example: "Why your service business doesn't need a website redesign — it needs a working stack"

## SEO basics (without being SEO-spammy)

- Primary keyword in the title (once)
- Primary keyword in H2 (once)
- Primary keyword in body (2-4 times, naturally)
- Internal link to 1 other post (when applicable)
- External link to 1 authoritative source (NHC, EPA, manufacturer doc)
- One image — generated via og-image-generator pattern

NO keyword stuffing. Google penalizes; humans cringe.

## Hard rules

1. **Never publish without Jack's approval** (Day14 blog) or customer's approval (their blog). Drafts only.
2. **Never use AI-detection-bait phrasing** ("in conclusion", "diving deep", "navigating the landscape of"). Triggers Google's spam filters AND signals "not written by a person."
3. **Never include unverified specifics.** If a stat needs a source, say "industry data suggests..." not "12.3% of pools...".
4. **Never copy from existing customer sites** to a new draft. Each one is from scratch.
5. **Never write a blog post >2000 words.** Length doesn't equal value. Most SWFL homeowners scan, not read.

## Cadence target

- Day14 blog: 1 post/week initially; 1 post/2 weeks long-term
- Customer site: 1-2 posts/month, tied to seasonal moments

Each post should be shippable within 30 min of agent work. If
the draft takes longer, the topic is too broad — narrow it.

## Logging

Append to MASTER_LOG:
`[YYYY-MM-DD HH:MM ET] blog-draft-writer → tenant: {tenant}, slug: {slug}, words: N, voice: {used}`

After Jack publishes, log to `~/Documents/studio/docs/blog-drafts/published.md`
so the skill can track which topics actually got shipped vs. abandoned.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('blog-draft-writer', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'blog-draft-writer', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
