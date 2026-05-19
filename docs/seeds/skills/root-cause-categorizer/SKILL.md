---
name: root-cause-categorizer
description: When postmortem-writer runs, this skill tags the root cause with a standardized category so pattern-recurrence-detector can spot trends. Supporting skill for postmortem-writer.
triggers:
  - "categorize root cause"
  - "tag postmortem"
  - "classification"
---

# root-cause-categorizer

> Free-text root causes are useful for the postmortem reader. Tagged
> root causes are useful for the long-term system. This skill bridges.

## The category taxonomy

Tier 1 categories (top-level):

| Category | Examples |
|---|---|
| `tooling` | Bash script bug, missing dependency, version mismatch |
| `process` | Step skipped, sequence wrong, doc out-of-date |
| `vendor` | Stripe API change, Supabase outage, Vercel build flake |
| `credentials` | Leaked key, rotated key not updated, wrong env var |
| `data` | Schema mismatch, missing field, corrupt state |
| `comms` | Customer email sent wrong, SMS to wrong number |
| `code` | Logic bug, type error, race condition |
| `infra` | DNS, SSL, network, hosting |
| `agent` | Agent made wrong call, agent misread state, agent hallucinated |
| `human` | Jack made an error (rare; usually we frame as "tooling didn't catch") |
| `environment` | Sandbox-specific issue, OS-specific issue, browser-specific issue |
| `unknown` | Genuinely unclear; data needed to re-classify |

Tier 2 subcategories (within Tier 1):

For `tooling`:
- `idempotency-bug`, `path-handling`, `flag-default-wrong`, `error-handling-missing`

For `credentials`:
- `leaked-in-chat`, `leaked-in-commit`, `not-rotated-after-leak`, `wrong-env-target`

For `agent`:
- `skill-not-invoked`, `boundary-violated`, `stale-context-read`, `hallucination`

(etc — extend as patterns emerge)

## How a postmortem gets tagged

Given the postmortem's "Root cause" section:

1. Parse for keywords matching each Tier 1 category
2. If multiple match, pick the strongest signal (the proximate cause, not the deepest cause)
3. Pick a Tier 2 subcategory based on Tier 1 + more specific signals
4. Surface to the postmortem-writer agent: "I'd tag this as `tooling/idempotency-bug`. Confirm?"

If the agent / Jack confirms, write the tags into the postmortem's frontmatter:

```yaml
---
tier1: tooling
tier2: idempotency-bug
date: 2026-05-16
severity: low
status: resolved
---
```

## Why tagging matters

- `pattern-recurrence-detector` clusters by tag
- `postmortem-writer` references prior similar tags
- Quarterly review of Day14 OS health = pivot table by Tier 1 category

## Examples from today's session

### Bootstrap dossier-files-missing bug
- Tier 1: `tooling`
- Tier 2: `idempotency-bug`
- Why: the script wasn't safe to re-run; second invocation missed files

### Supabase secret-key leaked in chat
- Tier 1: `credentials`
- Tier 2: `leaked-in-chat`
- Why: clear category match

### API error during sub-agent skill-harvest
- Tier 1: `vendor`
- Tier 2: `transient-api-error`
- Why: transient Anthropic-side issue, not Day14's code

## Hard rules

1. **Never tag without reading the full postmortem.** Skimming creates wrong tags.
2. **Never use `unknown` as a final tag.** If unknown, return for more investigation; only use as a temporary placeholder.
3. **Never invent a new category** without explicit operator approval. Categories are a controlled vocabulary.
4. **Always pick the most-specific Tier 2** subcategory. Tier 1 alone is less actionable.

## When invoked
- Inside `postmortem-writer` after the postmortem body is drafted
- Manually for retroactive tagging of old postmortems
- Inside `pattern-recurrence-detector` to verify clustering logic

## Logging

`[YYYY-MM-DD HH:MM ET] root-cause-categorizer → postmortem: {slug}, tier1: {cat}, tier2: {subcat}, confidence: <0.0-1.0>`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('root-cause-categorizer', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'root-cause-categorizer', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
