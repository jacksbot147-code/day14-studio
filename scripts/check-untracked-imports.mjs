#!/usr/bin/env node
/**
 * check-untracked-imports.mjs — catch "works on my machine" before Vercel does.
 *
 * Day14 production failed to deploy for twenty consecutive builds because
 * src/lib/insights.ts existed on the operator's disk, was not in .gitignore, and
 * had simply never been `git add`ed. Four tracked files imported it. Every local
 * build passed — the file was right there — and every clean-checkout build died
 * with "Module not found: Can't resolve '@/lib/insights'".
 *
 * A local build cannot catch this by construction: it builds the working tree,
 * and the working tree is exactly where the missing file is. The only reliable
 * test is to ask git what it actually has.
 *
 * Run before pushing, or in CI:
 *     node scripts/check-untracked-imports.mjs
 *
 * Exits non-zero listing every tracked file that imports something git does not
 * have. Ignores node_modules and bare package names — only project-relative and
 * "@/"-aliased imports are resolvable from the repo.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC_EXT = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
// An import with no extension may resolve to any of these on disk.
const RESOLVE_AS = [...SRC_EXT, ...SRC_EXT.map((e) => `/index${e}`)];

function git(cmd) {
  return execSync(`git ${cmd}`, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

let tracked;
try {
  tracked = new Set(git("ls-files").split("\n").filter(Boolean));
} catch {
  console.error("not a git repository — nothing to check");
  process.exit(0);
}

const sourceFiles = [...tracked].filter(
  (f) => (f.startsWith("src/") || f.startsWith("scripts/")) && SRC_EXT.includes(path.extname(f)),
);

// import x from "..."  |  export … from "..."  |  await import("...")
const IMPORT_RE = /(?:from\s+|import\s*\(\s*)["']([^"']+)["']/g;

const problems = [];

for (const file of sourceFiles) {
  let text;
  try {
    text = fs.readFileSync(path.join(ROOT, file), "utf8");
  } catch {
    continue;
  }

  for (const m of text.matchAll(IMPORT_RE)) {
    const spec = m[1];

    // Only specifiers that point INTO this repo can be untracked.
    let base;
    if (spec.startsWith("@/")) base = path.join("src", spec.slice(2));
    else if (spec.startsWith("./") || spec.startsWith("../")) {
      base = path.normalize(path.join(path.dirname(file), spec));
    } else continue; // bare package — npm's problem, not git's

    // Already tracked exactly (e.g. an explicit .css or .json import)?
    if (tracked.has(base)) continue;

    const candidates = RESOLVE_AS.map((e) => base + e);
    if (candidates.some((c) => tracked.has(c))) continue;

    // Does it exist on disk but not in git? That is the failure we care about.
    const onDisk = [base, ...candidates].find((c) => fs.existsSync(path.join(ROOT, c)));
    if (onDisk) {
      problems.push({ file, spec, resolved: onDisk, kind: "untracked" });
    } else if (!spec.includes("*") && !spec.includes("<")) {
      // Nowhere on disk. Reported, but NEVER a failure: this repo contains
      // generators that emit import strings into files they write ("./theme"),
      // and template placeholders, so the false-positive rate here is high. A
      // guard that cries wolf gets ignored, and then the one real failure gets
      // ignored with it. Untracked-but-present is the unambiguous bug; that is
      // what this exits non-zero on.
      problems.push({ file, spec, resolved: null, kind: "missing" });
    }
  }
}

const untracked = problems.filter((p) => p.kind === "untracked");
const missing = problems.filter((p) => p.kind === "missing");

if (untracked.length === 0) {
  console.log(`ok — ${sourceFiles.length} tracked source files, every local import is in git`);
  if (missing.length) {
    console.log(`\n(${missing.length} import(s) resolve to nothing on disk — advisory only, these are`);
    console.log("usually generator templates. Not a build blocker, not a failure.)");
  }
  process.exit(0);
}

console.error("\nBuild will fail from a clean checkout.\n" + "=".repeat(68));

if (untracked.length) {
  console.error("\nIMPORTED BUT NOT IN GIT — exists on this machine only:");
  const byResolved = new Map();
  for (const p of untracked) {
    if (!byResolved.has(p.resolved)) byResolved.set(p.resolved, []);
    byResolved.get(p.resolved).push(p.file);
  }
  for (const [resolved, importers] of byResolved) {
    console.error(`\n  ${resolved}`);
    console.error(`    imported by ${importers.length} file(s): ${importers.slice(0, 4).join(", ")}${importers.length > 4 ? ", …" : ""}`);
    console.error(`    fix: git add ${resolved}`);
  }
}

if (missing.length) {
  console.error(`\nadvisory — ${missing.length} import(s) resolve to nothing on disk (often generator`);
  console.error("templates; not counted as failures).");
}

console.error("\n" + "=".repeat(68));
console.error(`${untracked.length} blocking problem(s). A local build cannot catch these —`);
console.error("it builds your working tree, which is where the missing files are.\n");
process.exit(1);
