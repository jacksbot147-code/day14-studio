---
name: chemistry-reading-parser
description: Parse pool chemistry readings from a tech's quick text/voice note ("FC 2.1 pH 7.4 TA 90 CYA 35") into structured fields for the visit log + customer note. Pool-vertical specific but the pattern is generalizable. Supporting skill for customer-visit-note-writer.
triggers:
  - "chemistry reading"
  - "pool chemistry"
  - "FC pH TA"
  - "test results"
---

# chemistry-reading-parser

> Tech in the field types "FC 2.1 pH 7.4 TA 90 CYA 35 salt 3200"
> on their phone after testing the pool. This skill turns it into
> structured data for the visit note + customer note.

## Input

Free-text chemistry readings, formats vary widely:

- `FC 2.1 pH 7.4 TA 90 CYA 35`
- `chlorine 2.1, ph 7.4, alk 90, stab 35`
- `2.1 / 7.4 / 90 / 35` (positional shorthand if tech is consistent)
- `green pool — FC 0.5, pH 7.8, scum visible` (mixed with observation)

## Parse rules

Extract these standard fields:

| Field | Aliases tech might use | Unit | Typical range |
|---|---|---|---|
| `fc` | FC, chlorine, Cl, free chlorine | ppm | 1-5 |
| `cc` | CC, combined chlorine | ppm | <0.5 |
| `ph` | pH | scale | 7.2-7.8 |
| `ta` | TA, alkalinity, alk | ppm | 80-120 |
| `cya` | CYA, stabilizer, stab, cyanuric | ppm | 30-50 (chlorine), 70-80 (salt) |
| `ch` | CH, calcium, hardness | ppm | 200-400 |
| `salt` | salt, NaCl | ppm | 2700-3400 (salt pools only) |
| `tds` | TDS | ppm | optional |
| `temp` | temp, temperature | F | optional |

Parse via:
1. Tokenize input on spaces, commas, slashes
2. For each token, try to match: `{alias}\s*[:=]?\s*{number}` regex
3. Map alias to canonical field name
4. Validate value is within plausible range (FC > 10 = typo or sample error)

If positional shorthand detected (consistent slash-separated numbers), use the tech's pre-saved order. Default order:
`FC / pH / TA / CYA / CH / salt`

## Output

Structured JSON for `events` table:

```json
{
  "kind": "chemistry-reading",
  "payload": {
    "fc": 2.1,
    "ph": 7.4,
    "ta": 90,
    "cya": 35,
    "raw_input": "FC 2.1 pH 7.4 TA 90 CYA 35",
    "tech_id": "...",
    "visit_id": "...",
    "warnings": []
  }
}
```

If a reading is out of range, populate `warnings`:
```json
"warnings": ["pH 7.9 above target; consider muriatic acid", "FC 0.8 below target; shock recommended"]
```

## Out-of-range alerts

| Field | Alert if | Recommendation |
|---|---|---|
| `fc` < 1 | low | shock |
| `fc` > 5 | high (residential) | wait + retest tomorrow |
| `ph` < 7.0 | acidic | sodium carbonate |
| `ph` > 7.8 | basic | muriatic acid |
| `ta` < 60 | low | sodium bicarbonate |
| `ta` > 140 | high | wait it out + lower pH |
| `cya` > 100 | over-stabilized | partial drain |
| `salt` < 2500 | low (salt pools) | add salt |

## How customer-visit-note-writer uses this

The visit note for customer gets a plain-English version of chemistry:

```
Today's chemistry:
- Chlorine: 2.1 (target 2-4) — perfect
- pH: 7.4 (target 7.2-7.6) — balanced
- Alkalinity: 90 (target 80-120) — good
- Stabilizer: 35 — fine
```

Translate "FC" → "chlorine", "TA" → "alkalinity", etc. Customer doesn't speak chemistry.

## Hard rules

1. **Never auto-add chemicals based on readings.** Tech adds; this skill just records.
2. **Never alert on a single reading.** A pH spike one week could be rain runoff. Alert on 2 consecutive readings.
3. **Never include CC (combined chlorine) in customer notes.** Confusing without chemistry context.
4. **Never claim "your pool is safe" from chemistry alone.** Safe is operator's call.

## Failure modes

- **Tech entered weird format**: parse what's possible; flag the rest as "raw text saved, not parsed"
- **Numbers wildly out of range** (e.g., pH 14): likely typo; surface to tech: "did you mean 7.4?"
- **Salt pool reading missing salt**: flag for tech to remeasure

## When invoked
- Inside `customer-visit-note-writer` for pool-vertical visits
- Manually when Jack uploads a chemistry photo / paste
- During admin panel visit form submission
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('chemistry-reading-parser', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'chemistry-reading-parser', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
