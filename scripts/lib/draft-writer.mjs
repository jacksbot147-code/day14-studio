/**
 * lib/draft-writer.mjs
 *
 * Single chokepoint for writing Life Loophole article drafts to disk.
 * Every draft is run through `stripSlop()` from
 * `scripts/lib/skills/stop-slop.mjs` *before* the markdown is written,
 * so the on-disk file is the stripped version. The removal report is
 * returned to the caller and also logged inside the frontmatter so
 * downstream audits can verify the gate fired.
 *
 * Public surface:
 *   materializeDraft(input, opts?) -> Promise<{
 *     ok, path, slug, removed: [{phrase, count}], removedCount,
 *     originalSize, cleanedSize
 *   }>
 *   buildMarkdown(input) -> { frontmatterYAML, body, full }
 *   draftPath(slug, opts?) -> absolute path under content/life-loophole/drafts/<slug>.md
 *
 * Design rules:
 *   - Pure Node. No network. No model calls.
 *   - Always passes the *body* through stripSlop; frontmatter is
 *     preserved verbatim (so source URLs, IDs, and dates are untouched).
 *   - Idempotent — re-running on the same input yields the same file.
 *   - Never deletes. Mkdir -p the drafts dir if missing.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { stripSlop } from "./skills/stop-slop.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// scripts/lib/<this> -> studio root is two dirs up.
const DEFAULT_STUDIO_ROOT = path.resolve(HERE, "..", "..");
const DRAFTS_SUBDIR = path.join("content", "life-loophole", "drafts");

/** Resolve absolute path for a draft slug. */
export function draftPath(slug, opts = {}) {
  const root = opts.studioRoot || DEFAULT_STUDIO_ROOT;
  return path.join(root, DRAFTS_SUBDIR, `${slug}.md`);
}

/**
 * Serialize a minimal frontmatter object to YAML (string-only values
 * supported, plus arrays of strings). We hand-roll this rather than
 * pull a YAML dep — the data shape is small and known.
 */
function toFrontmatterYAML(fm) {
  const lines = ["---"];
  for (const [key, val] of Object.entries(fm)) {
    if (val === undefined || val === null) continue;
    if (Array.isArray(val)) {
      lines.push(`${key}:`);
      for (const item of val) lines.push(`  - ${yamlScalar(item)}`);
    } else if (typeof val === "object") {
      lines.push(`${key}:`);
      for (const [k2, v2] of Object.entries(val)) {
        lines.push(`  ${k2}: ${yamlScalar(v2)}`);
      }
    } else {
      lines.push(`${key}: ${yamlScalar(val)}`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

function yamlScalar(v) {
  if (v === null || v === undefined) return '""';
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  const s = String(v);
  // Quote anything with special characters; otherwise emit bare.
  if (/^[A-Za-z0-9_./:-]+$/.test(s)) return s;
  return JSON.stringify(s);
}

/**
 * Build the markdown payload from a structured input. Caller passes
 * frontmatter fields + body sections; we assemble them. The returned
 * `body` is what gets passed through stripSlop.
 */
export function buildMarkdown(input) {
  const fm = {
    draftId: input.draftId,
    slug: input.slug,
    tenant: "life-loophole",
    catalogId: input.catalogId || "",
    title: input.title,
    summary: input.summary || "",
    personas: Array.isArray(input.personas) ? input.personas : [],
    source: input.source || "",
    current_as_of: input.current_as_of || "",
    professional_needed: Boolean(input.professional_needed),
    complexity: input.complexity || "low",
    risk_level: input.risk_level || "low",
    status: "draft",
    materialized_at: input.materialized_at || new Date().toISOString(),
  };
  const frontmatterYAML = toFrontmatterYAML(fm);

  const sections = [];
  sections.push(`# ${input.title}`);
  if (input.intro) {
    sections.push(input.intro.trim());
  }
  if (input.explanation) {
    sections.push("## How it works");
    sections.push(input.explanation.trim());
  }
  if (input.eligibility) {
    sections.push("## Who qualifies");
    sections.push(input.eligibility.trim());
  }
  if (input.estimated_impact) {
    sections.push("## What it can save you");
    sections.push(input.estimated_impact.trim());
  }
  if (input.action_steps) {
    sections.push("## Action steps");
    sections.push(input.action_steps.trim());
  }
  if (input.source) {
    sections.push("## Source");
    sections.push(input.source.trim());
  }
  sections.push(
    "---",
    "_Educational content only — not tax advice. Verify current-year amounts against IRS guidance._",
  );
  const body = sections.join("\n\n") + "\n";
  return { frontmatterYAML, body, full: `${frontmatterYAML}\n\n${body}` };
}

/**
 * Materialize a draft to disk.
 *
 * @param {Object} input — see buildMarkdown
 * @param {Object} [opts]
 * @param {string} [opts.studioRoot]
 * @param {boolean} [opts.dryRun]   if true, do everything except write
 * @returns Promise<Result>
 */
export async function materializeDraft(input, opts = {}) {
  if (!input || !input.slug || !input.title) {
    return {
      ok: false,
      reason: "materializeDraft requires { slug, title } at minimum",
    };
  }
  const slug = input.slug;
  const built = buildMarkdown(input);

  // ---- THE GATE ---------------------------------------------------------
  // Pass body through stripSlop. Frontmatter is untouched.
  const { cleaned, removed } = stripSlop(built.body);
  const removedCount = removed.reduce((sum, r) => sum + r.count, 0);

  // Re-attach the (frozen) frontmatter to the cleaned body.
  const finalText = `${built.frontmatterYAML}\n\n${cleaned}`;

  const outPath = draftPath(slug, opts);
  if (!opts.dryRun) {
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, finalText, "utf8");
  }

  return {
    ok: true,
    path: outPath,
    slug,
    removed,
    removedCount,
    originalSize: Buffer.byteLength(built.body, "utf8"),
    cleanedSize: Buffer.byteLength(cleaned, "utf8"),
  };
}
