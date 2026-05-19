---
name: seo-keyword-fetcher
description: When drafting a blog post, look up relevant SEO keywords without paying for a fancy tool. Uses Google's free autocomplete + free volume estimates. Returns 3-5 keywords with relative volume signal. Supporting skill for blog-draft-writer.
triggers:
  - "SEO keyword"
  - "search volume"
  - "what people search"
  - "keyword research"
---

# seo-keyword-fetcher

> $99/mo SEO tools are overkill for a 1-2 post/month publishing cadence.
> Free signal sources are enough for Day14's scale.

## Free signal sources (in order of useful)

### 1. Google Autocomplete
Fetch from `http://suggestqueries.google.com/complete/search?client=chrome&q={seed}` (returns JSON of autocompletes).

Each autocomplete reveals what people actually type. Example:
- Seed: "pool service cape coral"
- Returns: ["pool service cape coral cost", "pool service cape coral fl", "pool service cape coral reviews", ...]

Each suggestion is a real query — that's the "keyword" you want.

### 2. People Also Ask (PAA)
Visible in Google search results. Use a basic web fetch on the search results page; parse the PAA block.

PAA queries are golden — they're high-intent and have proven engagement (Google shows them).

### 3. Related Searches
At the bottom of Google search results. Same fetch / parse.

### 4. Reddit / forum mining
Search Reddit for `{vertical} {city}` posts. Real customer language. Don't copy verbatim, but extract patterns.

## Output for a topic

For a given topic seed (e.g., "pool service Cape Coral"):

```
# Keyword research — {topic seed}

## Primary candidates (use one per post)
| Keyword | Estimated intent | Notes |
|---|---|---|
| pool service cape coral cost | high — price-shopping | Best for pricing post |
| pool service cape coral reviews | high — comparison | Best for case-study post |
| weekly pool service cape coral | medium — recurring | Best for sustained-customer post |

## Secondary (sprinkle in body / H2s)
- {keyword}
- {keyword}

## Patterns from forums
- "How much does it cost to maintain a pool in SWFL?" — pricing curiosity
- "Should I do salt or chlorine?" — system-choice anxiety

## Recommendation
For this post, target: **{primary keyword}**
Reason: {one line — typically: highest intent + clearest content angle match}
```

## Hard rules

1. **Never stuff keywords.** Use the primary keyword in the title, ONE H2, and 2-4 times in body — naturally.
2. **Never invent search volume estimates** when no tool gives data. Use "high / medium / low intent" instead of fake numbers.
3. **Never copy autocomplete suggestions verbatim** as post titles. They're starting points, not final.
4. **Never target keywords above Day14's authority level.** "Pool service" (general) is too competitive; "pool service Cape Coral" (geo-specific) is winnable.

## Failure modes

- **Google rate-limits autocomplete**: backoff + retry; max 5 seeds per minute
- **Topic is too niche** (no autocompletes): trust the topic anyway; the niche is the opportunity
- **All keywords have low intent**: don't write the post; topic isn't search-friendly. Maybe it's a social/email-only piece.

## When invoked
- Inside `blog-draft-writer` before drafting (informs title + H2s)
- Inside `topic-idea-generator` to validate which topics have search demand
- Manually when Jack asks "what keyword should I target for {topic}"

## Logging

`[YYYY-MM-DD HH:MM ET] seo-keyword-fetcher → seed: {seed}, primary: {keyword}, secondary_count: N`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('seo-keyword-fetcher', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'seo-keyword-fetcher', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
