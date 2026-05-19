---
name: chatbot-prompt-builder
description: Generate the per-customer chatbot system prompt from their brand.json + services list. Implemented and battle-tested in Splash Jacks production. Promised in day14-os-skills-and-empire.md but missing from the empire library — now built. Lifts the production pattern into _shared.
triggers:
  - "chatbot system prompt"
  - "AI assistant for customer"
  - "customer chat widget"
---

# chatbot-prompt-builder

> The system prompt that powers the floating chat widget on every
> Day14 customer site. Reads brand.json + services + FAQ; emits a
> system prompt that gives the chatbot enough context to answer 80%
> of inbound questions without escalation.

## Inputs

- `01-brand.json` (the customer's brand record)
- `02-build-log.md` — for any service-specific context
- `services_list` — array of services + pricing (from brand.json or customer intake)
- `faq` — optional FAQ entries the customer wants answered consistently

## Output

A single string formatted as a Claude / OpenAI system prompt. Saved to:
`~/Documents/businesses/day14/customers/{slug}/chatbot-system-prompt.md`

## Template

```
You are the AI assistant for {{company_name}}, a {{vertical_descriptor}}
business in {{city_or_service_area}}, Florida.

## Your role
- Answer customer questions about services, pricing, and availability
- Book consultations or service appointments via the booking link
- Connect customers to the owner ({{owner_first_name}}) for anything
  outside these areas

## Services and pricing
{services_list rendered as bullet points with prices}

## Hours and contact
- Phone: {{phone}}
- Hours: {{hours_summary}}
- Booking: {{booking_url}}

## FAQ
{faq entries rendered}

## Tone
- Match the customer's tone (formal if they're formal; casual if casual)
- First-person plural ("we") when describing the business
- Never make up information — if you don't know, say "let me check with
  {{owner_first_name}} — leave your name and number"
- Never quote prices not explicitly listed above
- Never make scheduling commitments — direct to the booking link

## Boundaries
- Never share customer data with other customers
- Never discuss internal {{company_name}} operations / staff names
- Never engage with abusive or off-topic queries — redirect politely
- Never recommend competitors

## Escalation triggers
If the customer mentions any of these, say "I'll have {{owner_first_name}}
reach out within 4 hours" and capture their contact info:
- Complaints about prior service
- Custom or unusual requests not on the services list
- Negotiation / pricing pushback
- Requests to speak directly to the owner
```

## Per-vertical adjustments

The template above is vertical-agnostic. Per-vertical, append additional context:

### Pool service
- Include chemistry parameters they should target if asked
- Note: never give chlorine ppm targets that exceed safety limits
- Reference SWFL water source (well vs city) where relevant

### Lawn / landscape
- Note grass types common in service area
- Reference seasonal scheduling (March-October peak)

### Membership / studio
- Class types + schedule reference
- Trial pricing if offered

### Food / restaurant
- Menu link
- Reservation policy
- Dietary accommodations capability

## Hard rules

1. **Never embed credentials in the system prompt.** Even read-only API keys.
2. **Always test against 5 common questions** before deploying to a customer's site.
3. **Always include the "escalation triggers" section** so the bot knows when to defer.
4. **Always update the FAQ from real conversations** every 30 days — the bot learns from production data.
5. **Never include real customer names** in the system prompt's examples (privacy).

## Failure modes

- **Customer has no FAQ section in brand.json**: skip it; the bot will be more conservative
- **Pricing list is missing**: bot directs all pricing questions to the booking link
- **Hours not specified**: bot says "I'll check with {owner} on hours"

## When invoked
- During `customer-build-day-1-bootstrap` step 1.5 (after brand-swap)
- When customer updates services / pricing (regenerate)
- Manually via Cowork to refresh

## Logging
`[YYYY-MM-DD HH:MM ET] chatbot-prompt-builder → customer: {slug}, prompt_chars: {N}, faq_count: {N}`

Lifted from production in `~/Documents/splash-jacks-pools/src/lib/chatbot/system-prompt.ts`.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('chatbot-prompt-builder', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'chatbot-prompt-builder', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
