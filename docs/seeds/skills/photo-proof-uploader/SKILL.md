---
name: photo-proof-uploader
description: Tech uploads before/after photos from mobile after each service. Auto-tags with customer + appointment + GPS + timestamp. The trust layer for service work.
triggers:
  - "upload photos"
  - "before after"
  - "job photo"
pack: photo-proof-pipeline
---

# photo-proof-uploader

## What it does

1. Tech opens mobile app (or just emails to dedicated address with subject = appointment ID)
2. Photos auto-tag: customer_slug, appointment_id, GPS, timestamp, before|after
3. Stored at `~/Documents/businesses/{tenant}/customers/{slug}/photos/{date}-{appt_id}/`
4. Pushed to customer-facing portal
5. Logged to audit trail

## Hard rules

1. **Always preserve EXIF for timestamps** (proof of work).
2. **Always strip GPS before customer view** (privacy).
3. **Always require both before AND after** — single-photo work feels incomplete.
4. **Resize for web** (compress before storage to save disk).

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('photo-proof-uploader', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'photo-proof-uploader', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
