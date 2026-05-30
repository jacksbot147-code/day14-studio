/**
 * lib/cs-template-writer.mjs
 *
 * Single chokepoint for writing CS reply-template JSON files to
 * `public/data/cs-templates/<id>.subjects.json`. Every template is run
 * through `stripSlop()` from `scripts/lib/skills/stop-slop.mjs` *before*
 * the JSON is written, so the on-disk file is the stripped version.
 *
 * Mirrors the design rules of `lib/draft-writer.mjs` (the Life Loophole
 * draft chokepoint) so the slop gate is the same one in both pipelines.
 *
 * Public surface:
 *   materializeCsTemplate(template, opts?) -> Promise<{
 *     ok, path, id, removed: [{phrase, count}], removedCount,
 *     fieldsTouched: string[]
 *   }>
 *   stripSlopFromTemplate(template) -> { cleaned, removed, removedCount, fieldsTouched }
 *   csTemplatePath(id, opts?) -> absolute path under
 *     `public/data/cs-templates/<id>.subjects.json`
 *   readCsTemplate(id, opts?) -> Promise<object>
 *
 * Design rules:
 *   - Pure Node. No network. No model calls.
 *   - Strips slop from the user-visible prose fields:
 *       `current_subject`
 *       each `variants[].subject`
 *       each `variants[].rationale`
 *       each `constraints[]`
 *   - Leaves identifiers, schema, tenant, dates, source_refs, skill
 *     metadata, and approval state untouched.
 *   - Idempotent — re-running on an already-clean template yields the
 *     same file and reports `removedCount: 0`.
 *   - Never deletes. Mkdir -p the directory if missing.
 *   - Hot-flash + kennum CS templates are excluded by convention (the
 *     directory only contains day14 templates today; callers should not
 *     route those tenants through this writer).
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { stripSlop } from "./skills/stop-slop.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// scripts/lib/<this> -> studio root is two dirs up.
const DEFAULT_STUDIO_ROOT = path.resolve(HERE, "..", "..");
const CS_TEMPLATES_SUBDIR = path.join("public", "data", "cs-templates");

/** Resolve absolute path for a CS template id. */
export function csTemplatePath(id, opts = {}) {
  const root = opts.studioRoot || DEFAULT_STUDIO_ROOT;
  return path.join(root, CS_TEMPLATES_SUBDIR, `${id}.subjects.json`);
}

/** Read a CS template JSON by id. Throws if missing or malformed. */
export async function readCsTemplate(id, opts = {}) {
  const p = csTemplatePath(id, opts);
  const raw = await fs.readFile(p, "utf8");
  return JSON.parse(raw);
}

function stripField(value, counts, fieldsTouched, fieldName) {
  if (typeof value !== "string" || value.length === 0) return value;
  const { cleaned, removed } = stripSlop(value);
  if (removed.length > 0) {
    fieldsTouched.push(fieldName);
    for (const { phrase, count } of removed) {
      counts.set(phrase, (counts.get(phrase) ?? 0) + count);
    }
  }
  return cleaned;
}

/**
 * Strip slop from the prose fields of a CS template object. Returns a
 * shallow clone with cleaned values plus the removal report.
 */
export function stripSlopFromTemplate(template) {
  if (!template || typeof template !== "object") {
    return {
      cleaned: template,
      removed: [],
      removedCount: 0,
      fieldsTouched: [],
    };
  }
  const counts = new Map();
  const fieldsTouched = [];
  const cleaned = { ...template };

  if (typeof cleaned.current_subject === "string") {
    cleaned.current_subject = stripField(
      cleaned.current_subject,
      counts,
      fieldsTouched,
      "current_subject",
    );
  }

  if (Array.isArray(cleaned.variants)) {
    cleaned.variants = cleaned.variants.map((variant, idx) => {
      if (!variant || typeof variant !== "object") return variant;
      const next = { ...variant };
      if (typeof next.subject === "string") {
        next.subject = stripField(
          next.subject,
          counts,
          fieldsTouched,
          `variants[${idx}].subject`,
        );
      }
      if (typeof next.rationale === "string") {
        next.rationale = stripField(
          next.rationale,
          counts,
          fieldsTouched,
          `variants[${idx}].rationale`,
        );
      }
      return next;
    });
  }

  if (Array.isArray(cleaned.constraints)) {
    cleaned.constraints = cleaned.constraints.map((c, idx) => {
      if (typeof c !== "string") return c;
      return stripField(c, counts, fieldsTouched, `constraints[${idx}]`);
    });
  }

  const removed = [...counts.entries()]
    .map(([phrase, count]) => ({ phrase, count }))
    .sort((a, b) => b.count - a.count);
  const removedCount = removed.reduce((sum, r) => sum + r.count, 0);

  return { cleaned, removed, removedCount, fieldsTouched };
}

/**
 * Materialize a CS template to disk. Runs stripSlop on the prose fields
 * first, then writes pretty-printed JSON.
 *
 * @param {Object} template — must have at least `id`
 * @param {Object} [opts]
 * @param {string} [opts.studioRoot]
 * @param {boolean} [opts.dryRun] — if true, do everything except write
 * @returns Promise<Result>
 */
export async function materializeCsTemplate(template, opts = {}) {
  if (!template || !template.id) {
    return {
      ok: false,
      reason: "materializeCsTemplate requires `id` at minimum",
    };
  }
  const id = template.id;
  const outPath = csTemplatePath(id, opts);

  const { cleaned, removed, removedCount, fieldsTouched } =
    stripSlopFromTemplate(template);

  if (!opts.dryRun) {
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, JSON.stringify(cleaned, null, 2) + "\n", "utf8");
  }

  return {
    ok: true,
    path: outPath,
    id,
    removed,
    removedCount,
    fieldsTouched,
  };
}
