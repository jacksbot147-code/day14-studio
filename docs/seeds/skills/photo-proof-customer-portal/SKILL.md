---
name: photo-proof-customer-portal
description: Customer-facing page where they see ALL service photos across time. Builds trust + drives upsells (look what we did, you could also do X).
triggers:
  - "customer photos"
  - "service history photos"
  - "photo portal"
pack: photo-proof-pipeline
---

# photo-proof-customer-portal

## The page

Per customer:
- Visit timeline (vertical scroll)
- For each visit: before + after side-by-side
- Notes from tech
- Service performed + price
- Easy 'rebook' button per visit

## Hard rules

1. **Mobile-first** — customers check from phone.
2. **Never show other customers' photos**.
3. **Allow customer to download their photos**.
4. **Watermark with subtle brand** for organic marketing if customer shares.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('photo-proof-customer-portal', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'photo-proof-customer-portal', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
