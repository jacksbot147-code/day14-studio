---
name: topic-idea-generator
description: Generate publishable blog topic ideas for Day14 or for a Day14 customer's site. Pulls from local events, vertical knowledge, seasonal calendar, customer Q&A patterns. Each idea includes the audience + angle + length recommendation. Supporting skill for blog-draft-writer.
triggers:
  - "topic ideas"
  - "blog topics"
  - "what should I write about"
  - "content calendar"
---

# topic-idea-generator

> Writer's block is solved by reading the world differently. This
> skill generates 5-10 topics per session, each one specific enough
> to draft from immediately.

## Sources of topic ideas

### 1. Local + seasonal (via `swfl-context` and `local-event-detector`)
- Anything happening in SWFL this week
- Anything happening in 2-4 weeks (write ahead of season)
- Hurricane prep windows (1 week before season start)

### 2. Vertical pain points (via `swfl-vertical-deep-dives`)
- Common customer questions for the vertical (from FAQ files)
- Seasonal vertical issues (pool: chemistry in summer; lawn: chinch bugs in fall)

### 3. Customer-supplied (via `04-feedback.md` patterns)
- Questions the customer's customers keep asking
- Confusion points in the customer's existing site

### 4. Day14-specific
- Building-in-public stories (when something interesting happens in a build)
- Comparison posts (Day14 vs Jobber/HCP/Squarespace — already exists)
- Case studies (each customer launch deserves a post)

## Output format

Per ideation session, write a list to:
- Day14 blog: `~/Documents/studio/docs/blog-drafts/topic-ideas-{YYYY-MM}.md`
- Customer blog: `~/Documents/businesses/day14/customers/{slug}/blog-drafts/topic-ideas-{YYYY-MM}.md`

Each idea entry:

```
## {N}. {Working title}

**Audience:** {SWFL homeowners | service business owners | Day14 prospects}
**Tenant:** {day14 | customer-slug}
**Angle:** {one-line take or hook}
**Length:** {short 300-500w | medium 700-1000w | long 1500-2500w}
**Type:** {how-to | seasonal | comparison | case-study | story}
**Best time to publish:** {within N weeks of {trigger}}
**Primary keyword:** {if SEO-relevant}
**Why this matters:** {one-line — what makes it worth writing}
```

## Quality bar

Reject topic ideas if:
- Too broad ("Marketing tips for service businesses")
- Already written (check existing blog-drafts/ for overlap)
- Doesn't match the audience's likely searches
- Would require unethical claims (fake stats, comparison without research)

Aim for:
- Specific over general
- Local over global
- Practical over theoretical
- Honest over hype

## Examples (for Splash Jacks vertical)

✓ "What to do when your pool turns green (Cape Coral edition)" — specific, local, practical
✓ "Pool care before / during / after a hurricane" — seasonal, urgent
✓ "Why your salt pool tastes salty (and when that's a problem)" — addresses real Q
✗ "Pool service near you" — too SEO-spammy, no actual content angle
✗ "10 reasons to hire a pool service" — listicle, no story

## Per-vertical examples for Day14 customers

### Mobile-service (pool / lawn / pest / AC)
- "How to know if your lawn needs more water or more nutrients"
- "Why your AC is more expensive to run in SWFL than in Tampa"

### Membership (gym / yoga / studio)
- "What to expect at your first hot yoga class in 90% humidity"
- "Snowbird seasonal class pass vs annual — which makes sense for you"

### Food (restaurant / food truck)
- "Why we close early on Sundays (and other restaurant honesty)"
- "Our hurricane menu — what we serve when power's out"

## Hard rules

1. **Never generate more than 10 topic ideas per session.** Decision fatigue kills publishing rate.
2. **Never auto-draft from an idea.** The idea is the seed; `blog-draft-writer` does the writing — with Jack's pick.
3. **Never recycle a topic** that's been published in last 90 days.
4. **Always include "why this matters"** for each idea. If you can't articulate that, the topic isn't ready.

## Cadence

- Day14 blog: 1 topic-idea-generation session per month, generate 10 topics
- Customer blog: 1 session per quarter, generate 5-8 topics per customer

## Logging

`[YYYY-MM-DD HH:MM ET] topic-idea-generator → tenant: {tenant}, ideas_generated: N, output: {path}`

When Jack picks an idea + drafts it:
`[YYYY-MM-DD HH:MM ET] topic-idea-generator USED → tenant: {tenant}, idea: {N}, draft_at: {path}`

## When invoked
- Monthly scheduled task for Day14 blog
- Quarterly per customer
- Manually when Jack says "I don't know what to write about"
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('topic-idea-generator', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'topic-idea-generator', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
