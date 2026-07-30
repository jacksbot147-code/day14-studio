/**
 * git-lock-doctor — clears stranded git lock files, and only stranded ones.
 *
 * WHY THIS EXISTS
 * ---------------
 * On 2026-07-15 at 21:18 a git process died mid-commit and left a zero-byte
 * `.git/index.lock` behind. Every `sync-empire-state.mjs --push` run after that
 * failed on "Unable to create '.git/index.lock': File exists", wrote the error
 * to a LaunchAgent log nobody reads, and exited 0. Fifteen days of commits were
 * lost before anyone noticed. This module is the preflight that makes that a
 * self-healing condition instead of a silent, permanent outage.
 *
 * A second failure mode it covers: git's auto-gc can strand locks across MANY
 * refs at once (HEAD.lock, packed-refs.lock, one per branch), so healing only
 * `index.lock` is not enough.
 *
 * SAFETY
 * ------
 * A lock is only removed when BOTH hold:
 *   1. No git process is running, and
 *   2. The lock is older than `minAgeMs` (default 10 minutes).
 *
 * Both guards matter. (1) alone would race a git process that is between forks;
 * (2) alone would delete a lock a long-running `git gc` legitimately holds. The
 * process check is deliberately coarse — it matches ANY git process on the box,
 * not just one in this repo — because a false negative (declining to heal) costs
 * one cycle, while a false positive (deleting a live lock) can corrupt an index.
 *
 * Usage:
 *   node scripts/lib/git-lock-doctor.mjs --selftest      pure logic, no IO
 *   node scripts/lib/git-lock-doctor.mjs --check         report, change nothing
 *   node scripts/lib/git-lock-doctor.mjs --heal          clear stranded locks
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

export const DEFAULT_MIN_AGE_MS = 10 * 60 * 1000;

/**
 * Pure decision core — no IO, so --selftest and unit tests can drive it
 * directly with synthetic inputs.
 *
 * @param {{ locks: Array<{path: string, mtimeMs: number}>, now: number,
 *           minAgeMs?: number, gitRunning: boolean }} input
 * @returns {{ stranded: Array<{path: string, ageMs: number}>,
 *             held: Array<{path: string, ageMs: number, why: string}> }}
 */
export function classifyLocks({ locks, now, minAgeMs = DEFAULT_MIN_AGE_MS, gitRunning }) {
  const stranded = [];
  const held = [];
  for (const lock of locks) {
    const ageMs = now - lock.mtimeMs;
    if (gitRunning) {
      held.push({ path: lock.path, ageMs, why: "a git process is running" });
      continue;
    }
    if (ageMs < minAgeMs) {
      held.push({
        path: lock.path,
        ageMs,
        why: `younger than ${Math.round(minAgeMs / 60000)}m — could still be live`,
      });
      continue;
    }
    stranded.push({ path: lock.path, ageMs });
  }
  return { stranded, held };
}

/** True when any git process is alive on this machine. Fails CLOSED: if the
 *  check itself errors we assume git IS running and heal nothing. */
export function gitProcessRunning() {
  try {
    const out = execFileSync("pgrep", ["-x", "git"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return out.trim().length > 0;
  } catch (err) {
    // pgrep exits 1 with no output when nothing matches — that is "not running".
    if (err && err.status === 1 && !String(err.stdout || "").trim()) return false;
    return true; // any other failure: assume running, do nothing
  }
}

/** Recursively collect every *.lock under a .git directory. */
export async function findLocks(gitDir) {
  const out = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        // Skip the object database: it holds millions of files and never *.lock
        // except objects/maintenance.lock, which lives at its root.
        if (full.endsWith(path.join("objects", "pack"))) continue;
        if (path.basename(dir) === "objects" && /^[0-9a-f]{2}$/.test(e.name)) continue;
        await walk(full);
      } else if (e.name.endsWith(".lock")) {
        try {
          const st = await fs.stat(full);
          out.push({ path: full, mtimeMs: st.mtimeMs });
        } catch {
          /* vanished between readdir and stat — nothing to heal */
        }
      }
    }
  }
  await walk(gitDir);
  return out;
}

/**
 * Inspect (and optionally clear) stranded locks in a repo.
 *
 * @param {{ repo: string, minAgeMs?: number, heal?: boolean, now?: number }} opts
 */
export async function diagnose({ repo, minAgeMs = DEFAULT_MIN_AGE_MS, heal = false, now = Date.now() }) {
  const gitDir = path.join(repo, ".git");
  if (!existsSync(gitDir)) {
    return { ok: false, error: `no .git at ${repo}`, stranded: [], held: [], cleared: [], failed: [] };
  }

  const locks = await findLocks(gitDir);
  const gitRunning = gitProcessRunning();
  const { stranded, held } = classifyLocks({ locks, now, minAgeMs, gitRunning });

  const cleared = [];
  const failed = [];
  if (heal) {
    for (const lock of stranded) {
      try {
        await fs.unlink(lock.path);
        cleared.push(lock.path);
      } catch (err) {
        // Some mounts (e.g. the Cowork device bridge) forbid unlink outright.
        // Renaming aside works there and is equally effective for git.
        try {
          await fs.rename(lock.path, `${lock.path}.stranded-${now}`);
          cleared.push(`${lock.path} (renamed aside — unlink not permitted)`);
        } catch (err2) {
          failed.push({ path: lock.path, error: String(err2 && err2.message || err && err.message) });
        }
      }
    }
  }

  return { ok: failed.length === 0, gitRunning, stranded, held, cleared, failed };
}

/* ------------------------------------------------------------------ CLI */

function fmtAge(ms) {
  const m = Math.round(ms / 60000);
  return m >= 1440 ? `${(m / 1440).toFixed(1)}d` : m >= 60 ? `${(m / 60).toFixed(1)}h` : `${m}m`;
}

async function cli() {
  const args = process.argv.slice(2);

  if (args.includes("--selftest")) {
    const now = 1_800_000_000_000;
    const MIN = DEFAULT_MIN_AGE_MS;
    const cases = [
      {
        name: "stale lock, no git running -> stranded",
        input: { locks: [{ path: "/r/.git/index.lock", mtimeMs: now - 15 * 86_400_000 }], now, gitRunning: false },
        expect: (r) => r.stranded.length === 1 && r.held.length === 0,
      },
      {
        name: "stale lock, git IS running -> held",
        input: { locks: [{ path: "/r/.git/index.lock", mtimeMs: now - 15 * 86_400_000 }], now, gitRunning: true },
        expect: (r) => r.stranded.length === 0 && r.held.length === 1,
      },
      {
        name: "fresh lock, no git running -> held (could be live)",
        input: { locks: [{ path: "/r/.git/index.lock", mtimeMs: now - 60_000 }], now, gitRunning: false },
        expect: (r) => r.stranded.length === 0 && r.held.length === 1,
      },
      {
        name: "exactly at the age threshold -> stranded",
        input: { locks: [{ path: "/r/.git/index.lock", mtimeMs: now - MIN }], now, gitRunning: false },
        expect: (r) => r.stranded.length === 1,
      },
      {
        name: "the auto-gc fan-out: many refs at once -> all stranded",
        input: {
          locks: [
            "index.lock", "HEAD.lock", "packed-refs.lock",
            "refs/heads/main.lock", "refs/remotes/origin/main.lock",
          ].map((p) => ({ path: `/r/.git/${p}`, mtimeMs: now - 3 * 3_600_000 })),
          now,
          gitRunning: false,
        },
        expect: (r) => r.stranded.length === 5,
      },
      {
        name: "no locks at all -> nothing to do",
        input: { locks: [], now, gitRunning: false },
        expect: (r) => r.stranded.length === 0 && r.held.length === 0,
      },
    ];

    let failures = 0;
    for (const c of cases) {
      const r = classifyLocks(c.input);
      const pass = c.expect(r);
      if (!pass) failures++;
      console.log(`  ${pass ? "PASS" : "FAIL"}  ${c.name}`);
    }
    console.log(failures === 0 ? "selftest: all passed" : `selftest: ${failures} FAILED`);
    process.exit(failures === 0 ? 0 : 1);
  }

  const repo = args.find((a) => !a.startsWith("--")) || process.cwd();
  const heal = args.includes("--heal");
  const report = await diagnose({ repo, heal });

  if (report.error) {
    console.error(`git-lock-doctor: ${report.error}`);
    process.exit(1);
  }

  if (report.stranded.length === 0 && report.held.length === 0) {
    console.log("git-lock-doctor: no lock files present — git is writable");
    return;
  }
  for (const h of report.held) {
    console.log(`  held     ${path.relative(repo, h.path)}  (${fmtAge(h.ageMs)}) — ${h.why}`);
  }
  for (const s of report.stranded) {
    const verb = heal ? "cleared " : "STRANDED";
    console.log(`  ${verb} ${path.relative(repo, s.path)}  (${fmtAge(s.ageMs)})`);
  }
  if (report.failed.length) {
    for (const f of report.failed) console.error(`  FAILED  ${f.path}: ${f.error}`);
    process.exit(1);
  }
  if (!heal && report.stranded.length) {
    console.log(`\n${report.stranded.length} stranded lock(s). Re-run with --heal to clear them.`);
    process.exit(2);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  cli().catch((err) => {
    console.error("git-lock-doctor FATAL:", err && err.message);
    process.exit(1);
  });
}
