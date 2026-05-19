---
name: seo-city-page-builder
description: Generate per-city SEO landing pages for a service-business customer (e.g., "Pool service in Cape Coral", "...in Fort Myers", "...in Bonita Springs"). Each page is unique enough for Google + specific enough to convert. Production-proven in Splash Jacks.
triggers:
  - "city page"
  - "local SEO"
  - "service area pages"
  - "geo landing"
---

# seo-city-page-builder

> Local service businesses rank by having a real page per city they
> serve. Generic "we serve SWFL" doesn't rank. Per-city pages with
> specific local content do.

## Inputs
- `customer_slug`
- `cities` — array of cities the customer serves
- `service_type` — singular noun ("pool service", "lawn care", "AC repair")
- `01-brand.json` for voice + content rules

## Output per city

A page at `src/app/{customer-site}/{service-type-kebab}/{city-kebab}/page.tsx`:

```tsx
import { Metadata } from 'next';
import { SITE } from '@/lib/site';

const CITY = "Cape Coral";
const SERVICE_TYPE = "Pool Service";
const SLUG_CITY = "cape-coral";
const NEIGHBORING_CITIES = ["Fort Myers", "Lehigh Acres", "Bonita Springs"];

export const metadata: Metadata = {
  title: `${SERVICE_TYPE} in ${CITY}, FL | ${SITE.name}`,
  description: `Professional ${SERVICE_TYPE.toLowerCase()} for ${CITY} residents. Weekly visits, transparent pricing, local crew.`,
  alternates: {
    canonical: `/${SLUG_CITY}-${SERVICE_TYPE.toLowerCase().replace(' ', '-')}`,
  },
};

export default function Page() {
  return (
    <main>
      {/* H1: target keyword */}
      <h1>{SERVICE_TYPE} in {CITY}, Florida</h1>

      {/* Specific local proof */}
      <p>We serve {CITY} weekly with {N} active customers across {NEIGHBORHOODS}.</p>

      {/* City-specific FAQ — 3-5 entries with city in the question */}
      {/* Service area map / neighboring cities */}
      {/* Customer testimonial from this city if available */}
      {/* CTA: book in {CITY} */}
    </main>
  );
}
```

## Per-city content rules

Each page MUST have:
1. **H1 with city + service-type** (e.g., "Pool Service in Cape Coral, Florida")
2. **First paragraph** mentions the city + a specific local fact (lanai prevalence, salt-water pools common, etc.)
3. **3-5 city-specific FAQ entries** with the city in the question
4. **Neighborhood / area list** for that city (the specific zip codes or named areas served)
5. **Testimonial** from a customer in that city (if available) — first name + last initial only
6. **Internal links** to 2-3 other city pages (neighboring cities)
7. **Schema.org LocalBusiness** structured data with the city in the address

## Hard rules

1. **Never use the same paragraph across cities.** Each page must have city-unique content.
2. **Never make up testimonials.** If no customer testimonial from that city, omit the section.
3. **Always include the canonical URL** in metadata.
4. **Always mention neighboring cities** to build internal link equity.
5. **Cap at 8-12 cities per customer** — more dilutes rank.

## Generation strategy

For a service business serving SWFL, recommended cities:
- Cape Coral
- Fort Myers
- Bonita Springs
- Naples
- Estero
- Lehigh Acres
- Pine Island
- Sanibel/Captiva (if applicable)

For each, the skill generates:
1. The route file
2. Adds entry to `sitemap.xml` config
3. Cross-references the other city pages for internal linking

## Failure modes

- **Customer wants 30 cities**: refuse the request; explain SEO dilution; cap at 8-12
- **Two cities have identical content** (Bonita Springs vs Estero very close): rewrite with specific differentiators
- **Customer's brand voice doesn't fit local SEO copy** (e.g., too formal for casual SWFL audience): adapt the template

## When invoked
- During Site / Portal / Platform build when intake mentions multiple service cities
- Manually when Jack wants to add a new city page for an existing customer
- After customer expands service area

## Logging
`[YYYY-MM-DD HH:MM ET] seo-city-page-builder → customer: {slug}, cities: N, pages_generated: N, sitemap_updated: yes`

Lifted from production in `~/Documents/splash-jacks-pools/src/app/cape-coral-pool-service/page.tsx`.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('seo-city-page-builder', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'seo-city-page-builder', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
