# Overnight 01 — studio-template-site fill

**Run:** automated overnight task #1 of 4
**Date:** 2026-05-15
**Template:** `~/Documents/studio-templates/studio-template-site/`

## Status: complete

Every file in the task brief was created, the `swap.mjs` script was
smoke-tested end-to-end against the existing `brand.json`, and the
substitution produced clean output across all pages with no unresolved
`{{...}}` markers leaking into the rendered HTML/CSS/JS.

## Files created

| File                         | Lines | Purpose                                                                 |
| ---------------------------- | ----: | ----------------------------------------------------------------------- |
| `index.html`                 |   159 | Homepage — hero, services strip, about preview, testimonial, CTA, footer |
| `services.html`              |   143 | Services + pricing cards (each-block over `brand.services`) + 3-step "how it works" + CTA |
| `about.html`                 |   157 | About hero, story body, "how we work" split, photo grid, CTA            |
| `contact.html`               |   138 | Contact form (posts to `/api/subscribe`) + phone / email / service-area / hours panel |
| `faq.html`                   |   121 | Accordion (each-block over `brand.faqs`) + CTA                          |
| `assets/style.css`           |   587 | Brand-token CSS vars, mobile-first responsive, nav, hero, cards, pricing, forms, FAQ, chat widget, a11y helpers |
| `assets/main.js`             |   219 | Mobile nav toggle, FAQ accordion, contact form submit, chat widget (open/close, send, typing indicator, error states) |
| `scripts/swap.mjs`           |   261 | Node ESM brand-swap script — dotted paths, array indices, `{{#each}}` (nested), `{{@index}}`, writes `dist/`, prints summary |
| `_redirects`                 |    18 | Cloudflare Pages clean-URL rewrites + `/api/*` mappings + trailing-slash canonicalization |
| `.gitignore`                 |    16 | Keeps `dist/`, `.env`, `node_modules`, `.wrangler` etc. out of the fork |
| `assets/photos/` (dir)       |     — | Empty directory, ready for customer photo drop-in                       |

`README.md` was also updated: the scaffold TODO list (8 items, all of
which are now done) was replaced with a marker reference table and a
shorter remaining-TODO list scoped to things that genuinely can't be
done without a real customer (logo.svg, og.png, throwaway-domain
smoke test).

## Smoke test

```
$ node scripts/swap.mjs
brand-swap complete
  files transformed : 9
  files copied      : 3
  total             : 12
```

Spot-checks on the rendered `dist/`:

- `index.html` — services strip rendered two `<article class="card">` blocks
  with the names "Service One" / "Service Two", prices `$99/mo` / `$249/mo`,
  and the descriptions from `brand.services`. No leftover `{{...}}`.
- `assets/style.css` — `:root { --primary: #FF5C28; --accent: #10B981; ... }`
  populated from brand tokens.
- `faq.html` — single accordion entry "What do you do?" from `brand.faqs`.
- `grep -rn '{{' dist/` — only matches were in `README.md` documentation
  blocks describing the marker syntax (intentional, expected).

Note: the smoke-test `dist/` is on disk but the sandbox couldn't `rm` it
back out (file perms differ between bash and the Edit/Write tools). The
new `.gitignore` excludes `dist/` so it won't pollute a future `git
status`. You can safely `rm -rf dist` from the macOS Finder or your
terminal.

## Decisions worth surfacing

1. **`{{#each}}` semantics.** I picked the minimal Handlebars-like contract:
   - `{{#each brand.services}}` over a top-level array
   - inside the block, bare keys like `{{name}}`, `{{price}}`, `{{description}}` resolve against the current item
   - `{{@index}}` gives the 0-based index
   - outer `{{brand.*}}` references still resolve inside an each-block
   - nested each-blocks work (counted with a depth scanner)
   - if the path doesn't resolve to an array, the block renders empty rather than throwing — so a fork that hasn't filled in FAQs yet just gets no FAQ items, not a build error

2. **No external font / no CDN.** System font stack only, per the brief
   ("keep it fast"). All styling lives in `assets/style.css`.

3. **CSS uses `color-mix(in srgb, ...)`** to derive soft / faint variants
   from the brand `--ink`. Supported in all evergreen browsers from 2023+.
   Falls back gracefully (rules just don't apply, base ink still readable).

4. **Chat widget passes brand name via `data-brand-name` on `<html>`**
   so `main.js` can greet with the customer's name without any extra
   marker-substitution path inside the JS file.

5. **Contact form posts `message` to `/api/subscribe` as a `fields.message`-style
   extra**. The existing Worker only forwards `email`, `name`, `source` — the
   message field is currently dropped on the floor. See "Punted" #1 below.

6. **`_redirects` includes both clean-URL rewrites and `/api/*`
   passthroughs.** The Workers are mounted on dedicated routes via
   `wrangler.toml`, but listing them in `_redirects` keeps local-dev
   preview parity and documents the routing intent in one place.

7. **`favicon` points at `/assets/logo.svg`.** That file doesn't exist
   yet in the template — placing it is part of the fork workflow ("step 4"
   in the README). Until a real logo lands, the favicon will 404.

## Punted to follow-up

1. **Contact form `message` field plumbing.** The form sends a `message`
   field to `/api/subscribe`, but `workers/subscribe.js` only extracts
   `email`, `name`, `source`. Either (a) extend the Worker to forward
   `message` into a MailerLite custom field, or (b) drop the textarea
   from the contact form. Recommend (a) — it's a 5-line change and the
   message is the most useful part of the lead.

2. **`brand.chatbot_system_prompt` is not yet auto-propagated** into the
   chat Worker. Right now the operator has to `wrangler secret put
   SYSTEM_PROMPT` manually. `swap.mjs` could emit a `wrangler.toml`
   `[vars]` block or a `.dev.vars` file to automate this — flagged in
   the README's remaining-TODO list.

3. **OG / Twitter card image.** All pages reference
   `https://{{brand.domain}}/assets/og.png` but no default exists.
   Generate one (or fall back to logo.svg) before first deploy.

4. **No smoke test against a fully-fleshed `brand.json`** (with multiple
   FAQs, social links populated, etc.). The current `brand.json` has 2
   services and 1 FAQ. Worth doing a one-time test with 5-6 of each to
   make sure visual rhythm holds.

5. **`assets/photos/` is empty.** The split/grid sections currently
   render gradient-filled photo placeholders. Forks need to drop real
   `.jpg` files in and update the `src` attrs — or we add `data-photo`
   attributes that `swap.mjs` resolves from a `brand.photos` array.
   Leaving as a v2 enhancement.

## What to review first when you wake up

In rough priority order:

1. **`scripts/swap.mjs`** — the marker contract. If anything about
   `{{#each}}` semantics, dotted paths, or the array-not-found =
   render-empty behavior doesn't match what you want, this is the file
   to push back on. Lines 30-120 hold the resolution logic.
2. **`index.html` lines 60-95** — services strip render. Confirm the
   each-block + card layout reads like the Casamoré pattern you want.
3. **`assets/style.css` lines 1-30** — brand-token vars and the
   `color-mix` derivations. Confirm the tone of the auto-derived
   `--ink-soft` / `--ink-faint` feels right vs. a one-customer
   hand-tweak.
4. **`contact.html` form vs. `workers/subscribe.js`** — decide on the
   `message` field plumbing (see Punted #1).
5. **`README.md` marker reference table** — re-read for accuracy
   before forking against a real customer.

## What I did *not* do

Per the brief: did not deploy, did not push to GitHub, did not run
`npm install`, did not touch `~/Documents/splash-jacks-pools/`, did
not touch `~/Documents/studio/` (the marketing site) except to write
this report into `docs/overnight/`.
