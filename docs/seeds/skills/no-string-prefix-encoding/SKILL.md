---
name: no-string-prefix-encoding
description: Anti-pattern guardrail. Don't encode metadata in string prefixes like "REF:" or "Q1-". Stores brittle, untyped data that breaks on the first format change. Found in Splash Jacks referrals/code.ts production code; codified here so future Day14 code avoids it.
triggers:
  - "string prefix"
  - "encode in string"
  - "REF:"
  - "data encoding"
---

# no-string-prefix-encoding

> Splash Jacks' `referrals/code.ts` encodes referral metadata via a
> "REF-" prefix in a string column. Worked for 6 months. Broke when
> a new use case needed a different prefix. The lesson: use real
> columns/fields, not string prefixes.

## The anti-pattern

```ts
// ❌ Anti-pattern (found in production)
const referralCode = `REF-${customerId}-${promoCode}`;
const isReferral = code.startsWith('REF-');
const customerId = code.split('-')[1];
```

Brittle because:
1. Format changes break the parser silently
2. Customer IDs change format (UUID → ulid?) → all old codes break
3. Can't filter / index efficiently — full-table scan via LIKE
4. Two systems using "REF-" prefix collide unintentionally

## The right way

Use real columns:

```sql
CREATE TABLE referrals (
  id          uuid PRIMARY KEY,
  code        text UNIQUE NOT NULL,        -- just the random code, no prefix
  customer_id uuid REFERENCES customers(id),
  promo_code  text,
  source      text,
  created_at  timestamptz DEFAULT now()
);
```

Code becomes pure random; metadata lives in its own columns. Easy to query, easy to migrate, hard to mess up.

## Hard rule

**Never encode multiple fields into a single string column.** Even when it seems clever. The "we'll just parse it" reasoning is the trap.

## Exceptions

OK to use string prefixes for:
- **External identifiers** that you don't control (Stripe IDs `cus_...`, `pi_...`)
- **URL slugs** that humans read directly (e.g., `customer-acme-pool`)
- **Display-only short codes** that aren't parsed for data (e.g., approval card 6-char codes)

NOT OK for:
- Internal data you'll later filter / aggregate
- Anything that has 2+ distinct meanings (a referral code that's also a customer ID)
- Anything that might evolve in format

## Detection

When reviewing Day14 code, flag any of these patterns as candidates:
```regex
\.startsWith\('[A-Z]+-'\)
\.match\(/^[A-Z]+-/\)
`[A-Z]+-\${\w+}`
String(\w+) + '-' + String(\w+)  // multi-field concatenation
```

## Refactor path

When you find string-prefix encoding in production:
1. Add proper columns to the schema
2. Backfill data from the old format
3. Update reads to use new columns
4. Once all reads use new path: drop the old encoding

Don't try to refactor all in one PR. Multi-stage.

## When invoked
- Code review of any new file that does string prefix work
- During `template-vs-product-decision` evaluation
- Quarterly Day14 code audit

## Logging

`[YYYY-MM-DD HH:MM ET] no-string-prefix-encoding → file: {path}, finding: {brief}, severity: {low|medium|high}`

Quarterly: count occurrences. After 30 days post-skill-introduction, occurrences should trend toward zero.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('no-string-prefix-encoding', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'no-string-prefix-encoding', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
