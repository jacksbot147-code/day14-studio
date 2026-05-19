---
name: internal-link-suggester
description: For a new blog draft, find 1-3 prior posts on the same site to link to (and link FROM). Internal linking improves SEO and reader retention. Supporting skill for blog-draft-writer.
triggers:
  - "internal links"
  - "link to other posts"
  - "blog linking"
  - "related content"
---

# internal-link-suggester

> Every blog post on Day14 and on customer sites should link to 1-3
> other posts. Reader scrolls deeper, Google sees a connected site,
> conversions go up. This skill finds the right links.

## Input
- The draft (or topic + outline)
- The tenant (day14 or customer slug)
- Existing posts in `~/Documents/studio/docs/blog-drafts/` (for Day14) or customer's blog folder

## The matching

For the new draft, scan prior posts for:

1. **Same keyword overlap** — if both posts target "pool service", link them
2. **Vertical match** — pool post → other pool posts
3. **Audience match** — homeowner-targeted posts cross-link
4. **Conceptual prerequisite** — "advanced X" post should link to "basic X" post
5. **Conceptual follow-up** — "basic X" post should link to "advanced X" post

Score matches; pick top 3.

## What to link FROM (existing posts → new post)

After publishing the new post, edit 1-2 existing related posts to add a link TO the new one. Reciprocal linking compounds SEO value.

Output a list of edits needed:

```
# Suggested edits to existing posts for new post: {new_post_slug}

## existing-post-A.md
- Add to section "Further reading": "If you're dealing with {topic the new post covers}, see our deeper guide on that: [{new_post_title}]({new_post_url})."

## existing-post-B.md
- In paragraph 3, after "{specific phrase}": add link to {new_post_title}
```

## What to link TO (new post → existing posts)

Inside the new draft, suggest 1-3 inline links:

```
# Internal links to add to new draft

1. In the "What you can do" section: link "{anchor text}" → {existing-post-A url}
2. In the closing: link "{anchor text}" → {existing-post-B url}
```

## Anchor text rules

- Never "click here"
- Never the full title
- Always a 2-5 word descriptive phrase
- Should make grammatical sense if you read the sentence without the link

Bad: "Click [here](url) for more info on chemistry."
Good: "Our full [pool chemistry guide](url) covers the readings to watch."

## Hard rules

1. **Never link to external sites** in this skill — internal only. (External links are a separate decision.)
2. **Never link more than 3 times in a single post** — overlinks fatigue the reader.
3. **Never link a post to itself** (anchor-only references are fine).
4. **Always verify the existing post is still published** before suggesting the link — don't link to drafts.

## Failure modes

- **No prior posts on the tenant**: skip; just write the new post standalone
- **Only 1 prior post + it's not related**: still skip; forced links read worse than no links
- **Existing post is old (> 18 months)**: optional; link only if content is still accurate

## When invoked
- Inside `blog-draft-writer` after first-draft generation
- Manually after Jack publishes a new post (to update related ones)
- Inside `topic-idea-generator` to flag topics that would benefit from existing content cluster

## Logging

`[YYYY-MM-DD HH:MM ET] internal-link-suggester → new_post: {slug}, links_in: N, links_out: N, edits_needed: N`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('internal-link-suggester', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'internal-link-suggester', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
