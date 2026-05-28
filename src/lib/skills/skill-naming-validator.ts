/**
 * skill-naming-validator — hand-coded impl.
 *
 * Enforces Day14's skill-naming conventions:
 *   - kebab-case (lowercase a-z, 0-9, hyphens; no spaces/underscores)
 *   - 3-50 characters
 *   - no leading/trailing hyphens, no double-hyphens
 *   - no collision with existing seeded skills or installed shared skills
 *   - flags near-misses (Levenshtein ≤ 2)
 *
 * Pure validation: no side-effects beyond reading the skill index.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { SKILL_NAMES } from "../skill-registry.generated";

const HOME = homedir();
const SHARED_SKILLS = path.join(HOME, "Documents/businesses/_shared/skills");

const VALID_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ANTI_PATTERNS: RegExp[] = [
  /^helper$/,
  /^manage[-]?things?$/,
  /^utility[-]?\d+$/,
  /^do[-]?stuff$/,
  /[_]/, // snake_case
  /[A-Z]/, // camelCase / PascalCase
];

export interface ValidationResult {
  ok: boolean;
  name: string;
  errors: string[];
  warnings: string[];
  near_misses: string[];
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        (curr[j - 1] ?? 0) + 1,
        (prev[j] ?? 0) + 1,
        (prev[j - 1] ?? 0) + cost
      );
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j] ?? 0;
  }
  return prev[n] ?? 0;
}

async function listSharedSkills(): Promise<string[]> {
  if (!existsSync(SHARED_SKILLS)) return [];
  try {
    const entries = await fs.readdir(SHARED_SKILLS, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

export async function validateSkillName(name: string): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const nearMisses: string[] = [];

  // Format check
  if (name.length < 3 || name.length > 50) {
    errors.push(`length must be 3-50 chars (got ${name.length})`);
  }
  if (!VALID_NAME.test(name)) {
    errors.push("must be kebab-case: lowercase a-z, digits, single hyphens between segments");
  }
  if (/^-|-$/.test(name)) errors.push("no leading/trailing hyphens");
  if (/--/.test(name)) errors.push("no double hyphens");

  for (const ap of ANTI_PATTERNS) {
    if (ap.test(name)) {
      errors.push(`matches anti-pattern ${ap}`);
      break;
    }
  }

  // Collision checks
  const seedSet = new Set(SKILL_NAMES);
  if (seedSet.has(name)) {
    errors.push(`collision: '${name}' already exists in seeds/skills`);
  }
  const sharedList = await listSharedSkills();
  if (sharedList.includes(name)) {
    errors.push(`collision: '${name}' already exists in businesses/_shared/skills`);
  }

  // Near-miss warnings
  const allKnown = Array.from(new Set([...SKILL_NAMES, ...sharedList]));
  for (const known of allKnown) {
    if (known === name) continue;
    const dist = levenshtein(known, name);
    if (dist > 0 && dist <= 2) nearMisses.push(`${known} (dist=${dist})`);
  }
  if (nearMisses.length > 5) {
    warnings.push(`${nearMisses.length} near-misses — name may be too similar to existing skills`);
  }

  // Soft warning: -er ending overload heuristic
  if (name.endsWith("-er")) {
    warnings.push("name ends in '-er' — Day14 advises ≤60% of skills end in -er");
  }

  return { ok: errors.length === 0, name, errors, warnings, near_misses: nearMisses.slice(0, 10) };
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const candidate = (ctx.inputs?.name as string | undefined) ?? "";
  if (!candidate) {
    return {
      ok: false,
      skill: "skill-naming-validator",
      path: "hand-coded",
      error: "missing required input: name",
    };
  }
  const result = await validateSkillName(candidate);
  return {
    ok: result.ok,
    skill: "skill-naming-validator",
    path: "hand-coded",
    result,
  };
}
