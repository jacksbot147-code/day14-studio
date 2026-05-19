---
name: etsy-tag-researcher
description: Web-grounded Etsy SEO research. Finds 8-12 long-tail tags with low competition and high buyer intent. Cites sources. Real data, not guesses.
triggers:
  - "etsy-tag-researcher"
  - "etsy tag researcher"
pack: etsy-execution
---

# etsy-tag-researcher

Web-grounded Etsy SEO research. Finds 8-12 long-tail tags with low competition and high buyer intent. Cites sources. Real data, not guesses.

See implementation: `src/lib/skills/etsy-tag-researcher.ts`.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('etsy-tag-researcher', context, customer_slug)` from `@/lib/work-register`.
- **When it almost fires:** call `logAdHoc('describe what you did instead', context)`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'etsy-tag-researcher', notes: 'failure_mode' })`.

Triggered by → `growth-always-on` skill.
