---
name: next-app-router-conventions
description: Day14's Next.js 14 conventions every customer build follows. TypeScript strict + noUncheckedIndexedAccess, JSX entity escaping, src/lib/site.ts pattern, motion components SSR-safe by default. Invoked whenever an agent writes or modifies code in a Day14 customer build.
triggers:
  - "create component"
  - "edit JSX"
  - "Next.js"
  - "tsx file"
  - "app router"
  - "build customer code"
---

# next-app-router-conventions

> The codebase rules every Day14 customer build follows. Encoded
> here so the Build Agent doesn't have to re-derive them from
> staring at studio/src/.

## TypeScript

### `noUncheckedIndexedAccess: true` is on
Array indexing returns `T | undefined`. Never write `arr[0]` and use
it directly. Use one of:
```ts
const first = arr.at(0); // T | undefined — must guard
const [first] = arr;     // T | undefined — destructuring with default
const first = arr.find(x => x.id === id); // T | undefined
```
Always guard with `if (!first) return;` or provide a default.

### Strict mode
- No `any`. Use `unknown` and narrow.
- No `// @ts-ignore`. Fix the type or use `// @ts-expect-error` with a comment.
- `noImplicitAny: true` — every function param has a type.

## JSX entity escaping

Next.js ESLint blocks raw apostrophes and quotes in JSX text.
Always escape:

| Raw | Escape |
|---|---|
| `'` | `&rsquo;` (right single quote) |
| `"` | `&ldquo;` / `&rdquo;` (left/right double) |
| `--` | `&mdash;` (em-dash) |

Examples:
- `<p>Jack&rsquo;s pool</p>` not `<p>Jack's pool</p>`
- `<p>&ldquo;Built in 14 days.&rdquo;</p>` not `<p>"Built in 14 days."</p>`

In string literals (not JSX text), raw is fine.

## File layout

```
src/
├── app/                    ← App Router pages only
│   ├── layout.tsx          ← root layout, fonts, metadata
│   ├── page.tsx            ← homepage
│   ├── about/page.tsx
│   ├── api/                ← route handlers
│   └── (sub-routes)/
├── components/             ← reusable React components
│   ├── site-header.tsx
│   ├── site-footer.tsx
│   └── motion/             ← scroll/hover/animation primitives
├── lib/                    ← data + utilities
│   ├── site.ts             ← ALL marketing copy + SKUs + FAQ + constants
│   └── cn.ts               ← clsx + twMerge helper
└── styles/                 ← global CSS only
```

## src/lib/site.ts pattern

ALL marketing copy, SKU data, FAQ entries, case studies, verticals,
nav items live in `src/lib/site.ts`. Pages import from there.

Why:
- Single source of truth for content
- Easy to grep for any phrase
- Type-safe (every export is typed)
- Can be regenerated from `brand.json` programmatically

Never:
- Inline copy strings in JSX (use `SITE.tagline` not `"Built in 14 days"`)
- Duplicate content across pages
- Put data in components/

## Motion components — SSR-safe by default

Every component in `src/components/motion/` follows this contract:

1. **Default state = final state.** On SSR, the component renders as if
   the animation already completed.
2. **JS hydration + intersection** triggers the animation.
3. **Reduced-motion check** — `prefers-reduced-motion: reduce` skips
   the animation entirely (stays at final state).
4. **Above-the-fold elements** stay at final state on first paint —
   animating something already visible feels jumpy.

Reference: `src/components/motion/count-up.tsx` — this pattern lives
here in canonical form.

Anti-pattern: any motion component that renders empty/zero on SSR
and only fills in via JS. That's an SEO/no-JS hole.

## Tailwind palette tokens

Use only the brand palette tokens, never raw hex:

```ts
className="bg-paper text-ink"           // ✅
className="bg-[#F8F6F1] text-[#0B0B0A]" // ❌ except inside brand.json
```

Tokens defined in `tailwind.config.ts`:
- `paper` — warm off-white (#F8F6F1) — body background
- `ink` — near-black (#0B0B0A) — text + structural
- `ember` — vivid orange-red (#FF5C28) — single hot accent
- `shipped` — clean green (#10B981) — only for "live / done" indicators

Customer builds may override these in their brand.json. Tokens
themselves never change.

## Typography

- Display + body: Inter (loaded via `next/font/google`)
- Mono (labels, timestamps): JetBrains Mono
- Sentence case for all headings. Never Title Case.
- Lowercase eyebrow labels: `<span className="eyebrow">recent builds</span>`

## API routes

Route handlers in `src/app/api/*/route.ts`. One file per endpoint.

```ts
// src/app/api/webhooks/stripe/route.ts
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  // verify signature first, ALWAYS
  // ...
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'content-type': 'application/json' },
  });
}
```

- Always verify webhook signatures.
- Always use `NextRequest` / `NextResponse` types.
- Return JSON via `new Response(...)` not `Response.json(...)` — the latter has compatibility quirks on Edge.

## When to invoke this skill

Before writing or editing any `.tsx`, `.ts`, or `tailwind.config.*`
file in a Day14 customer build. Read this skill once per session;
the contents are cheap to keep in working memory.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('next-app-router-conventions', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'next-app-router-conventions', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
