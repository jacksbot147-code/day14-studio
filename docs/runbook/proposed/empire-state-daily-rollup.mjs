#!/usr/bin/env node
/**
 * empire-state-daily-rollup.mjs  — PROPOSED (innovation-t8)
 *
 * Once per day, fold the high-frequency `state/auto` sync branch into ONE
 * human-readable commit on main, so main's log reads as "what humans shipped"
 * plus a single daily `sync: empire-state daily rollup <YYYY-MM-DD>` row.
 *
 * Intended schedule: 0 6 * * *  (6:00 AM local / EDT), run by launchd as Jack.
 * See docs/runbook/proposed/install-empire-rollup.sh for the LaunchAgent.
 *
 * SAFETY GATES (important):
 *   - DRY-RUN BY DEFAULT. With no `--run` flag it only prints the plan + a
 *     diffstat of what WOULD land on main, and touches nothing. This is so an
 *     accidental/early invocation can never push to main.
 *   - Requires a clean working tree to proceed with `--run` (refuses if dirty).
 *   - Only ever fast-forward-pulls main; aborts on divergence rather than
 *     guessing.
 *   - Restores the original branch in a `finally`.
 *
 * This script is the ONE place allowed to write to main, and only when a human
 * (via launchd) runs it with --run. The 15-min sync (sync-empire-state.mjs)
 * must never touch main.
 *
 * Flow when run with --run:
 *   1. git fetch origin
 *   2. checkout main; git pull --ff-only origin main
 *   3. git checkout state/auto -- public/data    (latest snapshot only)
 *   4. git commit -m "sync: empire-state daily rollup <YYYY-MM-DD>"
 *   5. git push origin main
 *   6. reset state/auto to main: git branch -f state/auto main
 *      git push --force-with-lease origin state/auto
 *      (cycle restarts; next 15-min sync re-creates fresh state/auto commits)
 */

import { execSync } from "node:child_process";
import path from "node:path";
import { homedir } from "node:os";

const STUDIO = path.join(homedir(), "Documents/studio");
const RUN = process.argv.includes("--run");
const SYNC_BRANCH = "state/auto";
const MAIN = "main";

const git = (cmd, opts = {}) =>
  execSync(`git ${cmd}`, { cwd: STUDIO, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], ...opts }).toString();

function today() {
  // Local-date YYYY-MM-DD (matches the 6 AM local schedule).
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function log(...a) { console.log("[rollup]", ...a); }

async function main() {
  let original = null;
  try {
    original = git("symbolic-ref --short HEAD").trim();
  } catch {
    console.error("Not on a branch (detached HEAD) — aborting.");
    process.exit(1);
  }

  // Refuse to run against a dirty tree (could swallow in-flight work).
  const dirty = git("status --porcelain").trim();
  if (dirty && RUN) {
    console.error("Working tree is dirty — refusing to roll up. Commit/stash first:");
    console.error(dirty.split("\n").slice(0, 20).join("\n"));
    process.exit(1);
  }

  // Make sure state/auto exists (locally or on origin).
  let hasSync = true;
  try { git(`rev-parse --verify ${SYNC_BRANCH}`); }
  catch {
    try { git(`rev-parse --verify origin/${SYNC_BRANCH}`); }
    catch { hasSync = false; }
  }
  if (!hasSync) {
    log(`no ${SYNC_BRANCH} branch yet — nothing to roll up. Exiting.`);
    return;
  }

  // What would change on main?
  let diffstat = "";
  try {
    diffstat = git(`diff --stat ${MAIN}..${SYNC_BRANCH} -- public/data`).trim();
  } catch {
    diffstat = "(could not compute diff vs main — branches may have diverged)";
  }

  if (!RUN) {
    log("DRY RUN (no --run flag). Nothing will be changed.");
    log(`Would roll up ${SYNC_BRANCH} -> ${MAIN} as a single commit:`);
    log(`  message: "sync: empire-state daily rollup ${today()}"`);
    log(`  payload: public/data (latest snapshot only)`);
    log("Diffstat that would land on main:");
    console.log(diffstat || "  (no public/data delta)");
    log("Re-run with --run to actually perform the rollup.");
    return;
  }

  try {
    log("fetching origin…");
    git("fetch origin");

    log(`checking out ${MAIN} and fast-forwarding…`);
    git(`checkout ${MAIN}`);
    try {
      git(`pull --ff-only origin ${MAIN}`);
    } catch (e) {
      console.error(`main is not fast-forwardable (diverged?) — aborting. ${String(e.message).slice(0, 200)}`);
      throw e;
    }

    log(`pulling latest public/data snapshot from ${SYNC_BRANCH}…`);
    git(`checkout ${SYNC_BRANCH} -- public/data`);
    git("add public/data");

    const staged = git("status --porcelain public/data").trim();
    if (!staged) {
      log("no public/data delta between state/auto and main — nothing to commit.");
    } else {
      git(`commit -m "sync: empire-state daily rollup ${today()}"`);
      log("pushing rollup commit to origin/main…");
      git(`push origin ${MAIN}`, { stdio: ["pipe", "inherit", "inherit"] });
      log("✓ daily rollup committed + pushed to main");
    }

    // Reset state/auto to main so the cycle restarts cleanly.
    log(`resetting ${SYNC_BRANCH} to ${MAIN}…`);
    git(`branch -f ${SYNC_BRANCH} ${MAIN}`);
    try {
      git(`push --force-with-lease origin ${SYNC_BRANCH}`, { stdio: ["pipe", "inherit", "inherit"] });
      log(`✓ ${SYNC_BRANCH} reset to ${MAIN} (cycle restarts)`);
    } catch (e) {
      console.error(`WARNING: could not force-update origin/${SYNC_BRANCH}: ${String(e.message).slice(0, 200)}`);
    }
  } catch (e) {
    console.error(`rollup failed: ${String(e.message).slice(0, 300)}`);
    process.exitCode = 1;
  } finally {
    try {
      if (original) git(`checkout ${original}`);
    } catch (e) {
      console.error(`WARNING: could not restore branch ${original}: ${String(e.message).slice(0, 200)}`);
    }
  }
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
