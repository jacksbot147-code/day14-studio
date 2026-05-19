---
name: template-vs-product-decision
description: When a feature is built for one customer, decide whether to push it into the template repo (every future customer inherits) or keep it as a one-off in the customer fork. The rule-of-three pattern that prevents the templates from accumulating cruft.
triggers:
  - "should this go in the template"
  - "promote to template"
  - "push to template repo"
  - "every customer needs this"
  - "is this template-worthy"
---

# template-vs-product-decision

> Premature template promotion fills the templates with one-off
> features. Premature template avoidance forces every customer
> build to start from scratch. This skill is the threshold rule.

## The rule of three

A feature gets promoted to the template repo (studio-template-{sku})
when AND ONLY WHEN:

1. It's been built for at least **3 customers** that asked for it
2. The implementation is roughly identical across those 3
3. Removing it from a future customer's fork would be easy (feature flag, not hardcoded)

If only 1 customer has needed it → keep in their fork.
If 2 customers asked but the implementations diverged significantly → keep in both forks; don't promote until convergence.

## The promotion checklist

When the rule-of-three is met, before promoting:

- [ ] Feature works in all 3 customer forks today
- [ ] No customer-specific names / hex colors / phone numbers hardcoded — all references go through brand.json
- [ ] Documented with a 1-paragraph README addition in the template
- [ ] Tested by running `brand-swap.mjs --rename` on a fresh fork of the template — the feature must survive the brand-swap cleanly
- [ ] Removed from 3 existing forks via a one-time migration commit (so all 4 codebases stay in sync)

If any box is unchecked → not ready. Keep iterating in the customer fork.

## The reverse — pull-back from template

If a feature was promoted but turns out to be customer-specific
after the fact:

1. Don't immediately revert (breaks existing forks)
2. Mark with a feature flag default = false in template
3. Each existing customer's brand.json keeps `feature_flags.{name}: true` if they use it
4. New customers default to false
5. After 90 days, if no new customer enables the flag, the feature gets archived (not deleted) from template

## The "60% solution" template philosophy

Templates are scaffolds, not finished products. A customer fork
should be ~40% custom build effort, ~60% template inheritance. If
templates accumulate too much:

- Every customer takes longer to set up (more cruft to disable)
- Templates become harder to maintain
- New verticals are blocked by old vertical's cruft

Keep templates lean. Promote only what's truly shared.

## What ALWAYS belongs in templates

These are template-level by default, never customer-fork:

- App router structure / tsconfig / package.json basics
- Tailwind config + brand palette tokens (paper/ink/ember/shipped)
- Motion components (`src/components/motion/`)
- The brand-swap.mjs script + brand.json schema
- README that explains the template
- ESLint / Prettier config
- GitHub Actions for CI
- The reusable `Stat`, `StatePill`, `card-pop` design primitives

## What ALMOST NEVER belongs in templates

These start in customer fork; only promote after rule-of-three:

- Specific copy ("we serve Cape Coral and...") — copy is per-customer
- Specific photos / logos — definitely per-customer
- Vertical-specific business logic (chemistry readings, class scheduling)
- Customer-only forms / fields
- Anything legal / regulatory (each customer's situation differs)
- Marketing pages (about, FAQ, case-studies) — content is per-customer

## What goes in `_shared/` instead

When something is reusable across BUSINESSES (not just customer
forks within the day14 tenant), it goes in
`~/Documents/businesses/_shared/`:

- Skills (this directory)
- Agent system prompts
- Customer dossier template
- SQL schema
- Council-log

This is a separate decision from template-vs-fork — it's about
cross-tenant reuse. Templates are within Day14 tenant; _shared is
across all Jack's businesses.

## The naming test

If you can describe the feature WITHOUT using the customer's name,
it's a template candidate. If the description requires "for {customer}",
it's a fork-only feature.

Examples:
- "Storm-mode banner toggle" → template-worthy (feature flag, vertical-agnostic)
- "Splash Jacks' green-pool recovery flow" → fork-only (Splash Jacks-specific)
- "Lighthouse pre-launch checklist enforcement" → template-worthy
- "Customer's preferred color scheme" → belongs in brand.json, not template

## When to invoke this skill

- An agent is about to commit a feature and asks "where does this go?"
- Jack manually promotes something and wants a sanity check
- Quarterly template audit (review what's accumulated; archive bloat)

## Logging

Append to MASTER_LOG when this skill is invoked:
`[YYYY-MM-DD HH:MM ET] template-vs-product-decision → feature: {name}, decision: {fork|template|shared}, rationale: {one-line}`

Track the decision log over time. If a "fork-only" decision later
flips to "template" after a 3rd customer, that's data on which
feature classes consistently mature into shared.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('template-vs-product-decision', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'template-vs-product-decision', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
