---
name: photo-watermarker
description: Apply the customer's brand watermark to photos uploaded from visits. Production-proven in Splash Jacks. Promised in design doc but missing from empire — now built. Uses sharp library + brand.json logo path.
triggers:
  - "watermark photo"
  - "brand mark on image"
  - "stamp customer logo"
---

# photo-watermarker

> Photos with the customer's brand mark in the corner look pro.
> Photos without look like they came from anyone. Watermarking is
> the cheap signal of legitimacy.

## Inputs
- `photo_path` — input photo (any format sharp supports)
- `customer_slug` — for reading brand.json
- `placement` — `bottom-right` (default) / `bottom-left` / `top-right` / `top-left`
- `opacity` — `0.0-1.0` (default 0.10)

## The mechanics

```ts
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

async function watermark(input: string, slug: string, opts: WatermarkOpts) {
  // Read brand mark
  const brandJson = JSON.parse(
    await fs.readFile(
      `~/Documents/businesses/day14/customers/${slug}/01-brand.json`,
      'utf8'
    )
  );
  const logoPath = brandJson.logo.png_path || brandJson.logo.svg_path;
  if (!logoPath) throw new Error('No logo in brand.json');

  // Compute placement
  const inputMeta = await sharp(input).metadata();
  const logoBuffer = await sharp(logoPath)
    .resize({ width: Math.floor(inputMeta.width! * 0.12) }) // 12% of photo width
    .ensureAlpha()
    .modulate({ brightness: 1, saturation: 1 })
    .composite([{ input: Buffer.from(`<svg><rect width="100%" height="100%" fill-opacity="${1 - opts.opacity}"/></svg>`), blend: 'dest-in' }])
    .toBuffer();

  const padding = 24;
  const positions = {
    'bottom-right': {
      left: inputMeta.width! - Math.floor(inputMeta.width! * 0.12) - padding,
      top: inputMeta.height! - Math.floor(inputMeta.width! * 0.12 * (await sharp(logoPath).metadata()).height! / (await sharp(logoPath).metadata()).width!) - padding,
    },
    // ... other positions
  };

  return sharp(input)
    .composite([{ input: logoBuffer, ...positions[opts.placement] }])
    .toBuffer();
}
```

## Output specs

- **Quality**: JPEG 85% (visible but compressed)
- **Format**: matches input (JPEG → JPEG; PNG → PNG)
- **Watermark size**: 10-12% of photo's longest dimension
- **Position**: defaults to bottom-right; per-customer override in brand.json
- **Opacity**: 10% default — visible but not distracting

## Where the file goes

For each visit photo:
- Original (raw upload): `~/Documents/businesses/day14/customers/{slug}/visit-photos/{date}/originals/{filename}`
- Watermarked (for sharing): `.../watermarked/{filename}`
- Thumbnail (web display): `.../thumb/{filename}`

`visit-photo-attacher` (existing skill) orchestrates the full pipeline; this skill handles just the watermark step.

## Hard rules

1. **Always work on a COPY, never mutate the original.** Originals are evidence.
2. **Always strip EXIF GPS before watermarking** — GPS leak through photos is a privacy gap.
3. **Never watermark photos that the customer hasn't given rights to.** Verify upload context.
4. **Default opacity stays low.** 10% is the calibrated good value — visible enough; not overpowering.
5. **Never auto-watermark logos that are huge.** Cap at 12% of photo width to prevent monster watermarks.

## Failure modes

- **Customer's brand mark is too low-contrast** (white logo on white photo): post-watermarking, surface "watermark may be invisible — preview before publishing"
- **Photo is too small** (<400px): skip watermark; not enough surface
- **Logo file is corrupt / wrong format**: fail clearly; surface to operator

## When invoked
- Inside `visit-photo-attacher` for every visit photo
- Manually when Jack adds a photo to a past visit
- During gallery page generation for customer sites

## Logging
`[YYYY-MM-DD HH:MM ET] photo-watermarker → customer: {slug}, photo: {filename}, placement: {pos}, opacity: {N}`

Lifted from production in `~/Documents/splash-jacks-pools/src/lib/photos/watermark.ts`.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('photo-watermarker', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'photo-watermarker', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
