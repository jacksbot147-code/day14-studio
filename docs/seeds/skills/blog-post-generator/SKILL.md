---
name: blog-post-generator
description: Generate a publishable 800-1200 word blog post from a topic + customer-context. Includes outline, hook, sections, internal links, CTA. Voice matched to day14-voice. Outputs publishable Markdown.
triggers:
  - "blog post"
  - "write a post"
  - "blog draft"
  - "/blog"
---

# blog-post-generator

> Blogs that generate organic traffic are written for the search intent.
> This skill produces drafts targeting a specific intent — not a topic.

## What this skill does

1. Takes input: topic OR seed-keyword OR customer-context
2. Calls `seo-keyword-cluster-builder` to find related search terms
3. Generates outline: hook + 4-6 sections + CTA + meta description
4. Writes 800-1200 words in `day14-voice` style
5. Inserts internal links via `internal-link-suggester`
6. Writes to `~/Documents/businesses/{tenant}/content/drafts/{slug}.md`
7. Queues Telegram approval (P3) with preview link

## Inputs

- `topic` (required) — the intent angle, e.g. "how to pick a pool service in SW Florida"
- `customer_slug` (optional) — for customer-specific case studies
- `target_length` (default 1000 words)
- `vertical` (pool, real-estate, etc.)

## Outline template

```
1. Hook (50-100 words): personal observation or surprising stat
2. Why this matters (100-150 words): set the stakes
3. The 3-5 things to know (400-600 words): meat
4. Common mistake / counterintuitive bit (100-150 words): differentiation
5. What to do next (100-150 words): clear action
6. CTA (50 words): book a call, read related post, get the email
```

## Hard rules

1. **Never publish auto.** Always Jack-tap. Voice drift hurts brand for years.
2. **Always include 2-3 internal links.** Boosts SEO + reduces bounce.
3. **Always check `voice-drift-detector` before saving.** Catch off-voice prose early.
4. **Never use AI-tell phrases** ("in today's fast-paced world", "in conclusion", "let's dive in").
5. **Always cite a real source** if claiming a stat.
6. **Match vertical's reading level.** Pool customers ≠ real-estate buyers.

## Output

```
✓ Draft blog post: choosing-pool-service-swfl.md
  Word count: 1,047
  Sections: 6
  Internal links: 3 (→ swfl-context, → splash-jacks-pools case study, → pricing)
  Reading level: grade 8.4
  Voice-drift score: 0.08 (good)
  Draft path: ~/Documents/businesses/day14/content/drafts/choosing-pool-service-swfl.md
```

## When invoked

- `/blog {topic}` Telegram command
- Inside `content-calendar-orchestrator` (weekly automation)
- After `topic-idea-generator` produces a winning topic
- Manual via Cowork ask

## Failure modes

- **Topic too narrow** (no keyword volume): suggest broader angle
- **Topic too broad** (high competition): suggest niching down
- **Voice drift > 0.3**: regenerate with style examples

## Logging

`[YYYY-MM-DD HH:MM ET] blog-post-generator → topic: "{8 words}", words: {N}, voice_drift: {0.0-1.0}, draft_path: {path}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('blog-post-generator', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'blog-post-generator', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
