---
name: visit-photo-attacher
description: When a tech uploads photos from a service visit, watermark + resize + attach them to the visit log (internal) and optionally to the customer's note (external). Supporting skill for customer-visit-note-writer. Handles the photo pipeline from camera to customer.
triggers:
  - "visit photo"
  - "before/after"
  - "service photo"
  - "tech upload"
---

# visit-photo-attacher

> A picture of the just-serviced pool / lawn / system is the #1
> proof artifact for service businesses. Customers trust photos
> over text every time.

## Input
- Photo file(s) — typically JPEG from phone camera
- Visit context (customer slug, service date, tech name)

## The pipeline

### 1. Strip EXIF (privacy)
Remove GPS coordinates, device serial, timestamp metadata. Keep only orientation tag.

### 2. Resize for web
- Originals: archive in `~/Documents/businesses/day14/customers/{slug}/visit-photos/{date}/originals/`
- Web-optimized: max 2000px on longest side, JPEG quality 85, save to `.../web/`
- Thumbnail: 400x400 center-cropped, save to `.../thumb/`

### 3. Watermark
Use `sharp` library + customer's brand mark from `01-brand.json.logo`:
- Bottom-right corner
- 10% opacity
- Padding 24px from edges

### 4. Attach to visit log

Internal note (`02-build-log.md` for the visit):
```
## Visit {date} — {service_type}
- Tech: {name}
- Photos: {N}
  - {thumbnail_path}
  - {thumbnail_path}
  - {thumbnail_path}
```

External note (customer-facing, in 04-feedback.md → outgoing draft):
```
Hi {first_name},

{Service summary in day14-voice}

Photos from today:
{customer-portal URL with photos embedded}

— {tech_first_name}
```

## Photo storage

Each customer's visit photos live in their dossier folder, NOT in the studio repo:
`~/Documents/businesses/day14/customers/{slug}/visit-photos/{YYYY-MM-DD}/`

For customer portal display (when they log in to see their history), photos get uploaded to Supabase Storage with bucket `customer-visit-photos`, key `{customer_slug}/{date}/{filename}`.

## Hard rules

1. **Never include identifying info in watermarks** beyond the customer's own brand mark.
2. **Never upload photos to ANY public bucket** — customer photos are private.
3. **Never compress to <85 JPEG quality** — visible artifacts make photos look unprofessional.
4. **Always strip EXIF GPS.** Even on customer's own property, customer's location data shouldn't leak.
5. **Never delete original photos.** Archive them with the visit; legal protection for both sides.

## Failure modes

- **Photo upload fails mid-batch**: retain originals; surface incomplete count to tech
- **Customer's brand mark missing**: use Day14 mark as watermark fallback (with note that brand mark should be added)
- **Tech uploads non-photo file** (.heic, .raw, video): convert HEIC→JPEG; skip video for now; surface "video uploaded but not yet processed"
- **Disk full during processing**: archive only originals; skip resized/thumbnails; surface to Jack

## When invoked
- Tech submits a visit form with photo uploads
- Manually when Jack wants to add a photo to a past visit
- During customer onboarding (the kickoff call photos for brand-extractor)

## Logging

`[YYYY-MM-DD HH:MM ET] visit-photo-attacher → customer: {slug}, visit: {date}, photos_processed: N, total_bytes: {N}`

If errors:
`[YYYY-MM-DD HH:MM ET] visit-photo-attacher → failed: {photo_filename}, reason: {one-line}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('visit-photo-attacher', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'visit-photo-attacher', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
