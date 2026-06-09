# Angela's site — what to send Jack to take it live

_Generated 2026-06-09. Branch: redesign/apple-base44-2026-06-03._

Three things are required before the page feels finished. Everything else is optional but makes it stronger. A short list of claims is off-limits until Angela confirms them.

> Note on line numbers: the task brief referenced theme.ts lines 65–69 and page.tsx ~165, but the live files have shifted. The real locations are theme.ts lines 101–105 (contact block) and page.tsx ~158–172 (photo placeholder). Use the find/replace anchors below — they're robust to line drift.

## Required (page won't feel right without these)

1. **Bio photo** — head + shoulders, natural light, a phone photo is fine. Drop it into the repo at `public/brands/angela-music/portrait.jpg`. Then edit `src/app/brands/angela-music/page.tsx` (around line 158–172) and swap the "Photo coming" placeholder `<div>` for an `<img>` pointing at `/brands/angela-music/portrait.jpg`. Easiest anchor: find the text `Photo coming`.

2. **Phone number** — edit `theme.ts` lines 101–105:
   - `phone: "(239) XXX-XXXX"`
   - `phoneHref: "tel:+1239XXXXXXX"`
   - `sms: "sms:+1239XXXXXXX"`

3. **Business email** — edit `theme.ts` lines 103–104:
   - `email: "..."`
   - `emailHref: "mailto:..."`

   (Current placeholders are `angela@curriermusic.com` — confirm that's the real address or replace it.)

## Optional (page works without, stronger with)

4. **Pricing per lesson length** — replace the `blurb` field in the lessons array with a price line, e.g. `"$55 for 30 min · pay cash or credit"`.

5. **One real parent quote** — 1–2 sentences. Need the quote + parent first name + child first name + instrument.

6. **One real client neighborhood** — even one is powerful local proof, e.g. "Currently teaching 2 students in Pelican Bay."

## Strict NO (until Angela confirms)

- Years-experience claims beyond "13 years certified, 16 years private lessons"
- Student counts beyond "around 30 active"
- Recital cadence, sibling discount %, snowbird policies (none confirmed)
- Instruments beyond Piano / Guitar / Voice / Theory until she confirms

## Update flow when inputs arrive

1. Drop photo into `public/brands/angela-music/portrait.jpg`
2. Edit `theme.ts` — swap phone, email, sms (lines 101–105)
3. Find/replace `Photo coming` in `page.tsx` with the `<img>` tag
4. typecheck + lint + commit + push
5. Site fully live within 60s of push

## Constraints

Never push to main. Never delete files. No new dependencies.
