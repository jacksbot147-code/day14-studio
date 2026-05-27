# Day14 UI primitives

A small, sharp set of building blocks for the admin and the brand sites.
Every component is token-driven (see `src/lib/design-tokens.ts`) and matches
the admin's line-driven, ember-accent look. All primitives are plain server
components — no client hooks unless a future variant needs one.

Import from the barrel:

```tsx
import { Button, Card, Kpi, StatusBanner, EmptyState } from "@/components/ui";
```

Each primitive embeds the shared stylesheet internally, so a page can drop
one in without any extra setup. The selectors are namespaced `d14-` and do
not collide with the admin shell classes.

## Button

Sharp, ember-fronted action button. Variants: `primary` (solid ember),
`secondary` (hairline outline), `ghost` (text-only on hover wash). Sizes:
`sm`, `md`.

```tsx
<Button variant="primary" size="md" onClick={save}>Save deal</Button>
```

## Card

White surface with a hairline border and editorial eyebrow header — the
admin's `.section` look as a reusable container. Optional `title` and
`aside` render the eyebrow row.

```tsx
<Card title="Recent activity" aside="last 24h">…rows…</Card>
```

## Kpi

The editorial KPI tile from the admin strip: uppercase label, big tabular
number, optional muted sub-line.

```tsx
<Kpi label="MRR" value="$4,210" sub="+12% MoM" />
```

## StatusBanner

Mission-control banner with a colored left rule + dot. Tones: `ok`, `warn`,
`bad`.

```tsx
<StatusBanner tone="ok" headline="All systems normal" detail="14/14 healthy" />
```

## EmptyState

A friendly dashed-border placeholder for empty lists or panels. Accepts an
optional icon/emoji, a headline, hint text, and an optional CTA node.

```tsx
<EmptyState icon="📭" headline="No leads yet" hint="They will show up here once intake fires." cta={<Button>Add one</Button>} />
```
