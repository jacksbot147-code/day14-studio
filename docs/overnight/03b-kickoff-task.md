# Day14 — Kickoff Task 03b status report

**Task:** Daytime #0 of 5 for Friday 2026-05-15. 45-minute budget. Ran
autonomously before the 11:30 ET Portal template fork.

**Outcome:** All three deliverables landed. Nothing punted.

---

## 1. `/compare` page

**File:** `src/app/compare/page.tsx` — **642 lines.**

Page composition (`<ComparePage>` body):

1. `<Hero>` — eyebrow "Day14 vs the alternatives", aurora-gradient headline
   "Stop renting. Own your platform.", `PITCH.vsSaaS` subhead, primary CTA to
   `SITE.bookingUrl` and ghost link to `/about`.
2. `<ComparisonTable>` — six rows × nine columns. Desktop renders as a real
   `<table>` with sticky platform-name column; under 640px the same data
   reflows into a stacked `<dl>` card per platform. Day14 row is highlighted
   with an ember inset stripe (desktop) / full ember border (mobile) and an
   ember "Us" pill. Footnote credits May 2026 sourcing and flags the 16:00
   fact-check task.
3. `<CantDoThis>` — three `card-pop` call-outs (Ownership, Customization,
   Branding) corresponding to the three things the table competitors can't
   match: own repo+domain+data, vertical-specific workflows, fully white-
   labeled customer portal.
4. `<FiveYearMath>` — two side-by-side cards with the tabular math.
   Jobber: `$169/mo × 60 + $0 upfront = $10,140`, end state "Nothing."
   Day14 Portal: `$5,000 + $199/mo × 60 = $16,940`, end state "The platform."
   Delta callout: `$6,800` is what you pay for ownership. Footer note: Site
   and Platform SKUs flank Portal at $2,500/$99 and $10,000/$399.
5. `<FaqSubset>` — three `<details>` accordions pulled from `FAQ` in
   `src/lib/site.ts` by keyword match: "why not just use Jobber", "do I own
   the code", "what if I cancel".
6. `<FinalCta>` — ink-on-paper inverted CTA block reusing the homepage
   pattern. Booking link + secondary link to `/about`.

**Quality bars hit:**

- All raw `'` / `"` inside JSX text are escaped (`&rsquo;`, `&ldquo;`,
  `&rdquo;`) per Next.js ESLint. Curly quotes inside JS string literals
  (callout titles/bodies) use real U+2019 / U+201C / U+201D characters,
  which is fine — the lint rule only fires on JSX text children.
- No raw array index access. `FAQ.find(...)` returns `T | undefined` and is
  guarded with a type-narrowing `.filter()`. The `noUncheckedIndexedAccess`
  flag should be satisfied.
- Uses existing utilities: `card-pop`, `eyebrow`, `marker` (implicit via
  `text-aurora`), `tnum`, `btn-ember`, `btn-ghost`, `btn-primary`, `rule`.
- Mobile-first: table reflows to per-platform cards under `sm:` (640px),
  not just horizontal scroll.

**Nav wiring:** `src/components/site-header.tsx` got a new
`<Link href="/compare">Compare</Link>` between Pricing and How it works, per
spec. Used `Link` to match the existing `/builds` and `/about` entries.

---

## 2. 5-year math used (for the 16:00 fact-check task)

Two scenarios written into `MATH_ROWS` in the page:

| Platform        | Upfront  | Monthly × 60 | 5-year total | Source                            |
| --------------- | -------- | ------------ | ------------ | --------------------------------- |
| Jobber Connect  | $0       | $169 × 60 = $10,140 | $10,140 | `02-owned-not-rented.md` §"Realistic five-year totals" |
| Day14 Portal    | $5,000   | $199 × 60 = $11,940 | $16,940 | SKUs (`SKUS[1]` in `src/lib/site.ts`) |

Delta highlighted on page: **$16,940 − $10,140 = $6,800**.

Footnote on the comparison table calls out that prices come from the
`02-owned-not-rented.md` essay and flags the 16:00 fact-check explicitly:
"A formal pricing fact-check is scheduled for the same day this page was
published. Vendor pricing changes frequently — confirm with the vendor
before signing."

If the 16:00 task finds that Jobber Connect has moved off $169 or Day14's
Portal pricing should shift, this is the only file that needs edits —
`MATH_ROWS` and the `COMPETITORS` array near the top of
`src/app/compare/page.tsx`.

---

## 3. `workers/subscribe.js` change summary

**File:** `studio-templates/studio-template-site/workers/subscribe.js`

**Lines added: ~28** (header comment block + four-line read + cap check + the
conditional `fields.message` attachment).

Concrete diffs:

- Header block updated with a `message?: string` field in the body shape
  and a 20-line comment block explaining the addition, the MailerLite
  setup requirement (account-side "message" Text field), and why the cap
  exists.
- New constant `MAX_MESSAGE_LENGTH = 4000` at module scope.
- `body?.message ?? ""` read alongside `email`/`name`/`source`.
- Length validation: `if (message.length > MAX_MESSAGE_LENGTH) return json({
  error: "message_too_long" }, 400);`
- Build the fields object dynamically — only attach `fields.message` when
  the trimmed message is non-empty, so plain newsletter signups don't
  pollute MailerLite with empty custom fields. Comment block in code
  explains this choice.

No change to error semantics for existing callers — `email` / `name` /
`source` paths are byte-identical to before.

---

## 4. `scripts/swap.mjs` + README change summary

**File:** `studio-templates/studio-template-site/scripts/swap.mjs`

**Lines added: ~65.**

- New `escapeTomlBasicString(s)` helper — escapes `\\`, `"`, and the
  CR/LF/TAB control chars per the TOML basic-string grammar. Apostrophes
  don't need escaping inside `"..."` so we leave them.
- New `writeWranglerGenerated(brand)` function — reads the existing
  `wrangler.toml` at the template root, prepends a "GENERATED, do not
  edit" header with a timestamp, and appends a `[vars]` block with
  `SYSTEM_PROMPT = "..."` populated from `brand.chatbot_system_prompt`.
  Output goes to `wrangler.generated.toml` at SRC root. Emits a warning
  and skips if `chatbot_system_prompt` is missing/empty.
- `main()` now calls `writeWranglerGenerated()` after the file loop and
  logs the resulting path in the summary.
- `main()` also explicitly skips `wrangler.generated.toml` during the
  file walk, so the generated file doesn't accidentally get copied into
  `dist/` on subsequent runs.

**Smoke test (run in sandbox against the demo brand.json):**

```
brand-swap complete
  ...
  files transformed : 7
  files copied      : 5
  total             : 12
  wrangler config   : .../wrangler.generated.toml
```

Generated TOML verified by hand — valid syntax, `[vars]` block at the
bottom with the demo system prompt properly escaped. The demo
`chatbot_system_prompt` contains both `'` and `{{brand.name}}` (which is
expected to remain literal in the generated file, since it's a prompt
sent to Claude at runtime, not a template marker for swap.mjs to resolve
— `swap.mjs` doesn't resolve markers inside `brand.json` itself).

**Files touched alongside:**

- `studio-template-site/wrangler.toml` — comment block at the bottom no
  longer lists `wrangler secret put SYSTEM_PROMPT`. Now points the
  operator at the generated-config flow.
- `studio-template-site/README.md` — TODO entry for this work removed.
  Fork-steps snippet now has a step 8 (`wrangler deploy --config
  wrangler.generated.toml`). New "Generated wrangler config" section
  documents the flow, the regeneration behavior, and the missing-prompt
  fallback.

---

## Punted to the 16:00 polish task

**Nothing punted from the explicit deliverables.** All three landed inside
the 45-minute window.

Things the 16:00 task should consider picking up (out of scope for 03b but
adjacent):

- **Pricing fact-check** — the explicit reason 16:00 exists. The four
  competitor prices on `/compare` are: Jobber Connect $169, Housecall Pro
  Pro $129, GoHighLevel Agency $97, Squarespace Commerce $36+. All sourced
  from `docs/blog-drafts/02-owned-not-rented.md`. If any of these have
  shifted, edit `COMPETITORS` and `MATH_ROWS` at the top of
  `src/app/compare/page.tsx`.
- **Per-row footnotes** — if a SaaS now offers a feature we marked "no"
  (e.g. GHL has shipped a real AI chatbot in the meantime), we may want
  a small superscript-style footnote affordance. Current page has a
  single bottom-of-table footnote; the `<Cell>` component would be the
  natural place to extend.
- **Wider table on small-laptop** — at exactly `sm` (640–820px) the
  desktop table is `min-w-[820px]` and gets a horizontal scrollbar. If
  Jack wants no horizontal scroll at any width, the stacked-cards
  breakpoint should bump from `sm:` to `md:`.
- **`wrangler.generated.toml` to `.gitignore`** — the new README says it
  "should be gitignored" but `studio-template-site/.gitignore` was not
  edited (sandbox writes feel safer than git-state edits for an
  autonomous run, and the generated file isn't harmful to commit at
  this stage — it would just be noisy on fork-update PRs).

---

## What I deliberately did NOT touch

- Portal template fork (11:30 task's job)
- `npm install` / `npm run build` / any deploy
- `~/Documents/splash-jacks-pools/` (read-only reference)
- `day14-agenda.md` — phase status unchanged by this task

— end of 03b kickoff status —
