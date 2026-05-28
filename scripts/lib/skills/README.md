# `scripts/lib/skills/` — plugin bridges

Single source of truth for how autonomous `.mjs` daemons invoke the five
Claude-Code plugins installed at `~/.claude/skills/` and
`~/.claude/plugins/`. The plugins themselves only fire from inside an
interactive Claude Code chat; daemons can't talk to them. This directory
holds the Node-side bridge layer that papers over that gap.

The bridge has one entry point — `invokeSkill(name, input, opts?)` in
[`scripts/lib/skill-bridge.mjs`](../skill-bridge.mjs) — plus a handful of
direct exports for callers that want the typed contract instead of the
generic envelope (`generateBananaImage`, `invokeUxSkill`).

The bridge **never throws on a known-unavailable skill**. Every handler
returns one of:

```js
{ ok: true,  skill, output, meta? }   // success
{ ok: false, skill, reason, ... }     // degraded — caller decides
```

Daemons rely on this contract. If a handler can't run (no API key,
plugin not installed on disk, network failure), it returns
`{ ok: false }` with a `reason` string the caller can log and route on.
The only throws are for invalid usage (unknown skill name, wrong input
type for a strict handler).

---

## `stop-slop`

Pure-Node port of the deterministic phrase-stripping skill at
`~/.claude/skills/stop-slop`. The skill itself is a rule table — no LLM
call, no Anthropic key, no network — so we mirror it directly in
[`./stop-slop.mjs`](./stop-slop.mjs).

**Surface.**

```js
import { stripSlop } from "./skills/stop-slop.mjs";
const { cleaned, removed } = stripSlop(markdown);
// or via the bridge:
const result = await invokeSkill("stop-slop", markdown);
// result.output === cleaned
// result.meta.removed === removed
// result.meta.totalStripped, .uniquePhrases, .ruleCount
```

The rule table lives inline at the top of `stop-slop.mjs`
(`INLINE_RULES`), grouped by category: filler openers, empty hedges,
AI-tell adjectives, editorialising tails, empty transitions, "not just
X but Y" scaffolding, and flowery closers. Markdown code fences and
inline backticks are skipped — the splitter alternates prose/code
segments and only runs the rule table on prose, so code samples in
briefings survive intact.

If a `rules.json` ever lands at
`~/.claude/skills/stop-slop/rules.json` (or
`references/rules.json`), call `stripSlop(text, { rules })` with the
output of `loadRulesFromSkillDir()` to override the inline defaults.
Until then the inline table IS the source of truth.

**Where it's wired.** The list below tracks today's expansion plan
(WORKDAY-2026-05-28 T3–T6). Each gate is a pre-write or pre-publish
checkpoint; none of them block the daemon — they strip and log.

- **Morning briefing** —
  [`scripts/morning-briefing.mjs`](../../morning-briefing.mjs) runs the
  generated briefing markdown through `invokeSkill("stop-slop", …)`
  before write.
- **End-of-day digest** —
  [`scripts/end-of-day.mjs`](../../end-of-day.mjs) runs the assembled
  EOD markdown through the same gate before write.
- **Life Loophole article draft pipeline** — pre-write hook on every
  draft so slop never lands on disk.
- **Brand-site copy generators + Hot Flash listing drafter** —
  file-level only; no hot-flash publish actions (Jack-tap required for
  any publish to hot-flash-co).
- **`/admin/ship` pre-publish gate** — blocks publish if
  `stripSlop()` removes more than 5 phrases without an explicit
  override flag. Audit entry records the phrase counts.
- **CS reply templates + realty outreach drafter
  (`scripts/verticals/real-estate/outreach-drafter.mjs`)** — strip at
  draft time, before the draft lands in the inbox.

**When key is missing.** N/A. `stop-slop` is pure-Node — no API key,
no network. The handler always succeeds on a string input. The only
failure path is `{ ok: false, reason: "stop-slop expects a string
input" }` when the caller passes a non-string.

**How to add a new caller.** Three lines:

```js
import { invokeSkill } from "../lib/skill-bridge.mjs";

const result = await invokeSkill("stop-slop", draftMarkdown);
const cleaned = result.ok ? result.output : draftMarkdown;
// log result.meta.totalStripped to the relevant audit channel
```

If you want a hard pre-publish gate (like `/admin/ship`), branch on
`result.meta.totalStripped > THRESHOLD` and refuse to write unless
the caller passed an explicit `override: true` flag.

---

## `marketing-skills`

Node-side wrapper around the Claude marketplace plugin installed at
`~/.claude/plugins/marketing-skills` (the marketplace.json sometimes
lives under `marketingskills/` without the hyphen; we accept either).
The plugin ships a fleet of sub-skills as separate `SKILL.md` files;
[`./marketing-skills.mjs`](./marketing-skills.mjs) walks the tree,
parses each frontmatter block, picks the best sub-skill for the
caller's task via a lexical-overlap scorer, then calls Anthropic
(`claude-haiku-4-5-20251001`) with the SKILL body as the system prompt.

**Sub-skill list.** Discovered dynamically at invocation time — the
plugin ships ~42 SKILL.md files covering headline variants, subject
lines, social variants, landing-page copy, CTA copy, email body
generation, and similar marketing primitives. Run
`loadMarketingSkills()` to see the current list:

```js
import { loadMarketingSkills } from "./skills/marketing-skills.mjs";
const { ok, skills } = await loadMarketingSkills();
// skills: [{ name, description, body, path }, …]
```

The picker (`pickSubSkill(task, skills)`) is exported separately so
tests and callers that want to short-circuit can choose deterministically.

**Surface.**

```js
const result = await invokeSkill("marketing-skills", {
  task: "Generate 3 headline variants for this Life Loophole article draft",
  context: { draft: "…", audience: "…" },
});
// result.output: model text
// result.meta.subSkill / .subSkillScore / .availableSubSkills / .model
```

A bare string is also accepted — it's treated as `{ task: string }`.

**Cache convention.** None at the bridge layer (every invocation
hits Anthropic). Callers that batch — T8 (`drafts/<id>.variants.json`),
T9 (landing variants to the approval inbox), T10 (subject variants for
the queued newsletter + 6 CS templates) — persist outputs to their own
on-disk JSON drop and dedupe by `(sub-skill, task hash)` themselves.

**Where invoked.** Per WORKDAY-2026-05-28 T8–T10:

- Headline variants for the top 6 Life Loophole article drafts →
  `drafts/<id>.variants.json` (don't publish).
- Landing-headline variants for Day14 core + Realty + AlignMD brand
  sites → written to the approval inbox.
- Subject-line variants for the queued newsletter + the 6 CS reply
  templates → also written to the inbox.

**CLI vs SDK fallback.** SDK only. The bridge dynamically imports
`@anthropic-ai/sdk` inside `callAnthropic()`; if the package isn't
installed the call returns `{ ok: false, reason: "@anthropic-ai/sdk
not installed" }`. There is no CLI fallback — the plugin's
`SKILL.md` bodies are too long to plumb through a CLI prompt
reliably, and we already need the SDK elsewhere in the studio.

**When key is missing.** Returns:

```js
{
  ok: false,
  skill: "marketing-skills",
  reason: "no Anthropic key",
  meta: {
    picked: { name, score },
    availableSubSkills: <int>,
  },
}
```

The caller still gets the sub-skill the picker would have chosen plus
the total count of available sub-skills, so logs stay useful even on
key-less runs (e.g. dev laptops). Other expected failure modes:
`marketing-skills plugin not found on disk`, `no SKILL.md files
found`, `anthropic call failed` (with `detail`).

**How to add a new caller.**

```js
import { invokeSkill } from "../lib/skill-bridge.mjs";

const result = await invokeSkill("marketing-skills", {
  task: "Write a 3-variant subject line set for this newsletter",
  context: { body: newsletterMarkdown, tone: "warm-direct" },
});
if (!result.ok) {
  // Log result.reason; degrade by reusing the existing copy.
  return;
}
// result.output is the model response — parse it per your sub-skill's
// expected output format (the SKILL.md body documents that contract).
```

---

## `ui-ux-pro-max`

Node-side wrapper around the Claude plugin installed at
`~/.claude/plugins/ui-ux-pro-max`. Same shape as `marketing-skills`:
walk the plugin tree, score sub-skills against the caller's
intent, call Anthropic with the SKILL.md body as system prompt.

Lives in [`./ui-ux-pro-max.mjs`](./ui-ux-pro-max.mjs). Two public
entries cover two distinct caller styles:

**Sub-skill list.** Discovered dynamically. The plugin's domain hints
(in `DOMAIN_HINTS` at the top of the file) cover four big buckets the
picker biases towards:

- **color** — palette, hue, swatch, contrast, accent, shade, tone
- **typography** — type, font, kerning, leading, weight, headline,
  body
- **components** — button, input, form, card, modal, dialog, menu,
  nav
- **layout** — grid, spacing, padding, margin, section, hero, page,
  responsive

The hint scorer (`pickByHint`) layered on top of the generic picker
gives the audit pipeline a way to ask for a specific sub-skill by
folder name (e.g. `"ui-styling"`, `"design-system"`, `"audit"`) and
fall back gracefully if it doesn't exist.

**Audit mode (T11–T14 entry).** The autonomous `/admin/*` audit
pipeline calls:

```js
import { invokeUxSkill } from "../lib/skill-bridge.mjs";

const result = await invokeUxSkill("audit", {
  filePaths: ["src/app/admin/page.tsx", "src/components/MissionControl.tsx"],
  viewportPx: 1280,            // or { width: 1280, height: 720 }
  viewport: "desktop",          // optional label override
  task: "Audit this admin page for UX issues. Return CRITICAL/HIGH/MED/LOW.",
  context: { …optional extra metadata },
});
```

`invokeUxSkill` reads the file payloads (capped at 60 KB per file and
220 KB total, with truncation markers) and folds them into the user
message. Returns the model output verbatim — the caller writes the
ranked findings to `UX-AUDIT-2026-05-28.md` (T11/T12).

**Responsive mode (T14).** Same `invokeUxSkill` entry; the caller
loops over `[375, 768, 1024]` (or whatever breakpoints it needs) and
passes each as `viewportPx`. `normaliseViewport()` snaps the label to
mobile/tablet/desktop automatically when only the pixel width is given.

**Generic mode (back-compat).**
`invokeUiUxProMax({ task, context })` — `task` is a string, `context`
is arbitrary JSON. The picker uses the generic lexical scorer. The
bridge routes `invokeSkill("ui-ux-pro-max", input)` to this entry.

**Where invoked.** Per WORKDAY-2026-05-28 T11–T14:

- **T11 — Admin audit.** Top 6 `/admin/*` pages, findings written to
  `UX-AUDIT-2026-05-28.md` severity-ranked.
- **T12 — Landing audit.** `/work-with-us` + the three live brand-site
  landings, findings appended to the same doc.
- **T13 — Mechanical fixes.** No model call — the apply step reads
  the audit doc and patches focus rings, contrast violations, alt
  text. No structural changes.
- **T14 — Mobile breakpoint sweep.** 375 / 768 / 1024 against the
  same set of pages; mobile-specific findings logged for the next
  workday.

**When key is missing.** Returns
`{ ok: false, reason: "no Anthropic key", meta: { picked, viewport,
files, attachedBytes, availableSubSkills } }`. The caller still gets
the file metadata (path / bytes / truncated) and the chosen sub-skill,
so the audit log can record what *would* have been audited. Other
failures: plugin missing, no SKILL.md found, no matching sub-skill
for the hint, anthropic call failed.

**How to add a new caller.**

```js
import { invokeUxSkill } from "../lib/skill-bridge.mjs";

const r = await invokeUxSkill("audit", {
  filePaths: ["src/app/<page>/page.tsx"],
  viewportPx: 375,
  task: "Mobile-first audit. Flag touch-target sizes and tap zones.",
});
if (!r.ok) { /* log r.reason; skip */ return; }
appendToAuditDoc(r.output, { page, viewport: r.meta.viewport });
```

For a generic design question (not file-anchored), use
`invokeSkill("ui-ux-pro-max", { task, context })`.

---

## `cc-nano-banana`

Real bridge for the Gemini-based image-gen plugin at
`~/.claude/plugins/cc-nano-banana` (model
`gemini-2.5-flash-image`). Lives in
[`./cc-nano-banana.mjs`](./cc-nano-banana.mjs).

**Image-gen contract (the runtime path daemons call).**

```js
import { generateImage } from "./skills/cc-nano-banana.mjs";
// or via the bridge re-export:
import { generateBananaImage } from "../lib/skill-bridge.mjs";

const { ok, cached, path, reason } = await generateImage({
  prompt: "warm, evening kitchen-table light, wide shot, no people",
  size: "1024x1024",        // "WxH" string; default 1024x1024
  style: "photo",           // "photo" | "illustration" | "abstract" | "minimal" | custom
  tenant: "life-loophole",  // audit-only; recorded in WORK-LOG.md
});
```

Returns the cache `path` whether or not the gen succeeded — callers
that paste the path into `<img src=…>` never 404, even on a key-less
run (placeholder is written instead, see below).

**Cache convention.** Disk-cache keyed on
`sha256(prompt + size + style)`:

- Cache dir: `<studio>/public/data/cache/banana/`
- Cache file: `<hash>.png`
- Cache hit → returns immediately with `{ ok: true, cached: true,
  path }` and a `cache-hit` line in `WORK-LOG.md`.

Cache is content-addressed, so two callers asking for the same
prompt + size + style share the same file. Bust the cache by tweaking
the prompt or style (don't delete cached files — Jack pushes; daemons
never delete).

**Key-aware placeholder behaviour.** When `GEMINI_API_KEY` is missing
(or the Gemini REST call fails for any reason), the bridge writes a
deterministic 400×400 PNG filled with brand teal `#0F766E` to the
cache path. The original prompt, size, style, tenant, and a
`Placeholder=no-GEMINI_API_KEY` marker are embedded as `tEXt`
chunks (visible via Preview's Inspector or `exiftool -tEXt:Prompt`).
The placeholder is a real PNG (zero-dep encoder + CRC32 + zlib
IDAT) — `<img>` tags, OG-card scrapers, and `pngcheck` all parse it
fine.

Return shape on the key-less path:

```js
{ ok: false, cached: false, path: "<cache-path>", reason: "no-key" }
```

Callers should treat `path` as valid (the placeholder exists on disk)
and `ok: false` as a flag for the inbox: "render the card, but don't
auto-publish without Jack-tap."

**Where invoked.** Per WORKDAY-2026-05-28 T15–T18:

- **T15 — Wire.** Bridge + cache convention live (this module).
- **T16 — Loophole hero images.** 6 Life Loophole article drafts
  ([`scripts/workday-t16-banana-loophole-heroes.mjs`](../../workday-t16-banana-loophole-heroes.mjs)).
  Cards only — don't insert into MDX without review.
- **T17 — Brand-site heroes.** Day14 core, Realty, AlignMD
  ([`scripts/workday/t17-brand-heroes.mjs`](../../workday/t17-brand-heroes.mjs)).
  Inbox for sign-off.
- **T18 — OG / social cards.** `/work-with-us` + the 6 Life Loophole
  drafts ([`scripts/workday-t18-banana-og-cards.mjs`](../../workday-t18-banana-og-cards.mjs)).

**Back-compat exports.** Older callers used a `{ prompt, images,
outDir }` shape that ran the `gemini` CLI directly. That path still
works via `invokeNanoBanana()`; the bridge detects it by the
presence of `images[]` / `outDir` and routes to the subprocess.
`findGeminiBinary()` is exported for callers that want to check
CLI availability before deciding. New code should use
`generateImage()` — the REST path is faster, cacheable, and degrades
to the placeholder when keys are missing (the CLI just errors).

**When key is missing.** See "key-aware placeholder behaviour" above
— the disk file always exists; only the `ok` flag and `reason`
distinguish a real gen from a placeholder. Other failure modes:
`bad-input`, `network-error`, `gemini-http-<status>`, `gemini-bad-json`,
`gemini-no-image`.

**How to add a new caller.**

```js
import { generateImage } from "../lib/skills/cc-nano-banana.mjs";

const r = await generateImage({
  prompt: "1980s minimalist composition, soft natural light, no text",
  size: "1200x630",     // OG dimensions
  style: "minimal",
  tenant: "day14-core",
});
// r.path is always usable in <img src=…> — even on r.ok === false
if (!r.ok) {
  // log r.reason; queue the asset for re-gen once Jack's key lands
}
```

If you're generating a batch (heroes for N drafts), loop over the
inputs sequentially and write a manifest beside each draft —
parallelising hits the Gemini rate limit quickly, and the cache
makes a serial pass fast on re-run.

---

## `claude-mem`

**Status: STUB — not wired.** Lives in
[`./claude-mem.mjs`](./claude-mem.mjs). Every export returns
`{ ok: false, reason: "not-wired", detail: "…see PLAN-CLAUDE-MEM.md…" }`
today. Day14 T21 is research + stub only; Jack steers before any HTTP
call lands here.

**Planned API (matches PLAN §6).** Three async functions plus a
sync gate:

```js
import { recall, remember, forget, isWired } from "./skills/claude-mem.mjs";

// Search prior observations.
const r = await recall(query, k = 10, {
  project: "studio",            // never omit — see "Open questions"
  type: "observations",         // "observations" | "sessions" | "prompts"
  dateStart, dateEnd, files, concepts,
  format: "index",              // "index" | "full"
});
// r.items: [{ id, title, summary, project, type, score?, created_at? }]

// Queue a synthetic observation (writes gated behind env flag).
await remember(
  { title, summary, facts?: [], concepts?: [], files?: [] },
  tags?: [],
);

// Delete an observation (likely stays not-supported upstream).
await forget(id);

// Sync gate — currently constant `false`. Flips to a runtime
// `GET /api/health` check once wired.
if (isWired()) { … }
```

**Planned wiring.** Per
[`~/Documents/PLAN-CLAUDE-MEM.md`](../../../../PLAN-CLAUDE-MEM.md):

- `recall()`  → `GET  http://localhost:<port>/api/search?…`
- `remember()` → `POST http://localhost:<port>/api/sessions/observations`
  (gated behind `CLAUDE_MEM_BRIDGE_WRITES=1`)
- `forget()`  → no upstream endpoint exists; expected to remain
  `{ ok:false, reason:"not-supported" }` until upstream PR or
  tombstone-observation convention.

Storage model: `~/.claude-mem/claude-mem.db` (SQLite + FTS5). The
bridge **never** opens that DB directly — HTTP only.

**Open questions (Jack's call).** Per PLAN §6:

1. **Writes on/off** — keep `remember()` permanently disabled, or
   gate behind `CLAUDE_MEM_BRIDGE_WRITES=1` env flag? Default after
   wiring is "off" — even a wired bridge rejects with
   `{ok:false, reason:"writes-disabled"}` unless the flag is set.
2. **Project scoping** — the bridge defaults to `project:"studio"`
   to keep hot-flash-co and kennum-lawn-care observations from
   leaking in. Is that the right default? Should callers ever be
   allowed to query across projects?
3. **Hard vs. soft degrade** — when the local claude-mem worker is
   down, do callers want a hard `{ok:false, reason:"worker-down"}`,
   or a soft `{ok:true, items:[], source:"empty"}`? PLAN currently
   leans hard-degrade so callers notice silently broken context.

**When key is missing.** Not applicable — claude-mem is local
(SQLite + a local worker on `http://localhost:<port>`). The
relevant "missing" state is "worker not running" / "DB not
initialised", which today returns `{ ok:false, reason:"not-wired" }`
and post-wire will return `{ ok:false, reason:"worker-down" }`
(pending open question #3).

**How to add a new caller.** Today: don't — the stub returns
`not-wired` and Jack hasn't signed off on writes. Once wired the
pattern is:

```js
import { recall, isWired } from "../lib/skills/claude-mem.mjs";

if (!isWired()) return;        // skip silently — bridge not running
const r = await recall("admin audit findings", 5, { project: "studio" });
if (!r.ok) {
  // log r.reason / r.detail; degrade by skipping the recall
  return;
}
for (const item of r.items) { /* … */ }
```

Constraints for any new caller (carry forward from the stub
docstring):

- Never throw on expected failure — always return `{ok:false, reason, detail?}`.
- Never start, restart, or health-poke the claude-mem worker process.
- Always pass an explicit `project` filter on reads.
- Never open `~/.claude-mem/claude-mem.db` directly. HTTP only.

---

## Skill registry

Every name registered in `skill-bridge.mjs`'s `SKILLS` table, in
declaration order, with the dispatch kind. `node` = routed to a
pure-Node handler in this directory; `stub` = handler returns an
explicit `ok: false` envelope (needs interactive Claude Code, a key,
the Gemini CLI, or some other unavailable dependency).

| Name | Kind | Handler module | Entry function |
| --- | --- | --- | --- |
| `stop-slop`        | `node` | [`./stop-slop.mjs`](./stop-slop.mjs) | `stripSlop()` |
| `marketing-skills` | `node` | [`./marketing-skills.mjs`](./marketing-skills.mjs) | `invokeMarketingSkill()` |
| `ui-ux-pro-max`    | `node` | [`./ui-ux-pro-max.mjs`](./ui-ux-pro-max.mjs) | `invokeUiUxProMax()` (generic) / `invokeUxSkill()` (audit) |
| `cc-nano-banana`   | `node` | [`./cc-nano-banana.mjs`](./cc-nano-banana.mjs) | `generateImage()` (REST) / `invokeNanoBanana()` (legacy CLI) |
| `framer-motion`    | `stub` | — | returns `{ ok:false, reason:"framer-motion is a code-gen skill; needs Anthropic key + interactive Claude Code" }` |

`claude-mem` is **not** registered in `SKILLS` — its public surface
(`recall` / `remember` / `forget`) doesn't fit the `invokeSkill(name,
input)` shape. Callers import it directly from
[`./claude-mem.mjs`](./claude-mem.mjs). When the bridge wires up, it
will likely stay a direct-import module rather than joining the
generic registry.

To enumerate at runtime:

```js
import { listSkills } from "../lib/skill-bridge.mjs";
for (const { name, kind, reason } of listSkills()) {
  console.log(name, kind, reason || "");
}
```

`listSkills()` is also what powers `/admin/health` and the
bridge self-test.
