---
name: customer-visit-note-writer
description: Write a customer-facing visit note after a service is performed. Portable across SWFL service verticals (pool, lawn, pest, HVAC, detailing). Lifted from Splash Jacks where it ran for 6 months — the pattern was vertical-portable enough to belong in _shared/.
triggers:
  - "visit note"
  - "service note"
  - "after service"
  - "customer report"
  - "left a note"
  - "today's visit"
---

# customer-visit-note-writer

> The note left after a service call. The customer sees this. The
> next tech may also read it. Both audiences matter.

## Inputs

For each visit:

```yaml
date: 2026-05-16
customer_name: First Last (or company name)
service_address: 123 Main St
service_type: <pool | lawn | pest | HVAC | detail | other>
work_performed: <list of what was done — chemistry readings, parts replaced, time on site>
issues_found: <optional — anything that needs follow-up>
next_visit_date: <when scheduled>
tech_first_name: <who did the work>
```

## Output structure

Per visit, generate two outputs:

### A) Customer-facing note (left at door, emailed, or SMS'd)

Short, specific, no jargon. ~80-120 words:

```
{Customer first name},

{One sentence summary of what was done today.}

{Specific readings or measurements if applicable, in plain English.}

{Anything they should know — heads up about a brewing issue, what
to expect next week, etc. ONE thing max.}

Next visit: {date}.

Anything looks off, text me: {tech_phone_or_business_phone}.

— {tech_first_name}
{business_name}
```

### B) Internal note (logged to admin panel, agent-readable)

Compressed, all the signal:

```
{date} — {address}
Tech: {tech_first_name}
Service: {service_type}
Done: {comma-separated list}
Issues: {comma-separated list or "none"}
Followup: {action + when}
Next: {next_visit_date}
```

## Per-vertical tuning

### Pool service
- Always include chemistry readings (FC, pH, TA, CYA, salt)
- Reference the lanai if customer has one
- Note water clarity (clear / slightly green / green)
- Note: "called HOA about pool pump replacement permit if needed"

### Lawn
- Note mow height + bag/mulch
- Note any pest pressure observed
- Mention specific shrubs / trees pruned

### Pest
- Note treatment type + active ingredient
- Reentry time (when pet/kids can come back inside)
- Specific pest pressure observed (ants in kitchen, etc.)

### HVAC
- Filter replaced (size + date for next replacement)
- Thermostat reading
- Any odd sounds / smells
- Refrigerant charge if checked

### Detail
- Interior + exterior breakdown
- Stains attempted (treated / removed / persistent)
- Wax / sealant applied (yes/no + brand)

## Voice rules

Use `day14-voice` plus these vertical-specific tweaks:

- **First-name basis** with the customer (only if they've been a customer >1 visit)
- **Tech first-name signature** — humanizes the relationship
- **No marketing language.** "Treated lawn" beats "Applied premium turf solution."
- **Specific over general.** "Chlorine 3.2 ppm, pH 7.6" beats "chemistry looked good."
- **One concern flag at most.** Customer can handle one issue; three reads as alarming.

## Hard rules

1. **Never use technical jargon** unless the customer is in the trade. "Chlorine residual 3.2 ppm" → "Chlorine: 3.2 (target 2-4)".
2. **Never list every reading in the customer-facing note.** Two relevant ones max. The full panel goes to the internal note.
3. **Never blame the customer** for poor pool/lawn/equipment conditions. "Needs attention" not "you let it go too long."
4. **Never promise warranty / no-charge follow-ups** without explicit business policy. Defer to owner.
5. **Never write the visit note BEFORE the visit.** Real notes only. Forge = legal trouble.

## When the visit found a problem

If `issues_found` is non-empty, customer note structure changes:

```
{Customer first name},

{Brief summary.}

Heads up: {one specific issue}. {What it means + what to do about it.}

If you want me to handle the {fix}, text me back: {phone}.
Otherwise we&rsquo;ll watch it next visit on {date}.

— {tech_first_name}
{business_name}
```

The "if you want me to handle it" gives the customer agency. Doesn't
auto-upsell.

## Logging

Append to MASTER_LOG (when ops admin uses this through Day14 customer's portal):
`[YYYY-MM-DD HH:MM ET] customer-visit-note-writer → tenant: {slug}, visit: {visit_id}, customer-note: {chars}, internal-note: {chars}`

## When to invoke

- After every service visit logged in the customer's admin panel (Splash Jacks pattern; future Day14 customers in mobile-service vertical)
- When a tech submits a visit form with `notes` field empty (auto-suggest a draft)
- Never for first-visit / consultation calls — those have their own template
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('customer-visit-note-writer', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'customer-visit-note-writer', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
