/**
 * alignmd-bridge.ts — server-only inspector for the AlignMD repo.
 *
 * Reads git + migration state out of ~/Documents/alignmd via short-lived
 * `git -C <path> …` invocations. Every shell call is wrapped in try/catch:
 * if alignmd isn't present, git is missing, or any command errors, the
 * function returns null-ish fields with `reachable: false` rather than
 * throwing. Designed to be called from a server component (e.g.
 * /admin/alignmd) — never bundled to the client.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";

const execFileP = promisify(execFile);

/** Resolved at module load — the admin process runs locally on the Mac. */
const ALIGNMD = path.join(homedir(), "Documents/alignmd");
const STUDIO_OPS = path.join(
  process.cwd(),
  "public/data/ops/alignmd.json",
);

export interface AlignmdSummary {
  /** True iff every probed signal succeeded. False means at least one
   *  field is null because we couldn't reach the repo (or git failed). */
  reachable: boolean;
  /** Absolute path we probed — handy for debugging the empty state. */
  repo_path: string;
  branch: string | null;
  last_commit:
    | { sha: string; subject: string; author: string; ts: string }
    | null;
  /** Tracked files with unstaged or staged modifications (excludes untracked). */
  uncommitted_files: number | null;
  /** Files git is not tracking at all (matches `git status` "??" rows). */
  untracked_files: number | null;
  /** Commits ahead of `origin/<branch>` (alias: `unpushed_commits`). */
  ahead_of_origin: number | null;
  /** Commits behind `origin/<branch>` (null if no upstream is configured). */
  behind_of_origin: number | null;
  /**
   * Back-compat alias of `ahead_of_origin`. Older callers used this name;
   * the new field name matches the upstream/downstream pair.
   */
  unpushed_commits: number | null;
  /** Newest 00NN_*.sql filename under supabase/migrations/, or null. */
  last_migration: string | null;
  /**
   * Every `00NN_*.sql` file present in the AlignMD repo. Note: from git
   * alone we can't tell which migrations have been applied to the live
   * Supabase project — "applied" here means "present on disk in the
   * partner repo". The studio ops ledger (if present) drives the
   * separate `pending_migrations` field below.
   */
  applied_migrations: string[];
  /** Migration files not yet recorded as applied (see notes below). */
  pending_migrations: string[];
  readiness_route_exists: boolean;
  opportunities_route_exists: boolean;
}

/** Run a single command without ever throwing. Returns trimmed stdout or null. */
async function safeExec(
  bin: string,
  args: readonly string[],
  cwd: string,
  timeoutMs = 5_000,
): Promise<string | null> {
  try {
    const { stdout } = await execFileP(bin, args as string[], {
      cwd,
      timeout: timeoutMs,
      maxBuffer: 512 * 1024,
    });
    return stdout.trimEnd();
  } catch {
    return null;
  }
}

/** True if a path exists and is a directory. Never throws. */
async function dirExists(p: string): Promise<boolean> {
  try {
    const st = await fs.stat(p);
    return st.isDirectory();
  } catch {
    return false;
  }
}

/** Return migration filenames in order (00NN_*.sql), oldest first. */
async function listMigrations(repo: string): Promise<string[]> {
  const dir = path.join(repo, "supabase/migrations");
  try {
    const entries = await fs.readdir(dir);
    return entries
      .filter((f) => /^\d{4}_.+\.sql$/.test(f))
      .sort();
  } catch {
    return [];
  }
}

/**
 * Load the studio-side ops ledger if present. The optional
 * `applied_migrations` array lists migration filenames already
 * pushed to production. Anything in the repo but not in that
 * list is considered "pending".
 */
async function loadAppliedLedger(): Promise<string[] | null> {
  try {
    const raw = await fs.readFile(STUDIO_OPS, "utf8");
    const parsed = JSON.parse(raw) as { applied_migrations?: unknown };
    const list = parsed.applied_migrations;
    if (Array.isArray(list) && list.every((s) => typeof s === "string")) {
      return list as string[];
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Snapshot the AlignMD repo's git + migration + route state. Safe to
 * call from any server context — returns a fully-populated object with
 * `reachable: false` and null fields if the repo can't be probed.
 */
export async function loadAlignmdSummary(): Promise<AlignmdSummary> {
  const empty: AlignmdSummary = {
    reachable: false,
    repo_path: ALIGNMD,
    branch: null,
    last_commit: null,
    uncommitted_files: null,
    untracked_files: null,
    ahead_of_origin: null,
    behind_of_origin: null,
    unpushed_commits: null,
    last_migration: null,
    applied_migrations: [],
    pending_migrations: [],
    readiness_route_exists: false,
    opportunities_route_exists: false,
  };

  if (!(await dirExists(ALIGNMD))) return empty;
  if (!(await dirExists(path.join(ALIGNMD, ".git")))) return empty;

  const gitArgs = (...rest: string[]) => ["-C", ALIGNMD, ...rest];

  // Branch.
  const branchOut = await safeExec("git", gitArgs("rev-parse", "--abbrev-ref", "HEAD"), ALIGNMD);

  // Last commit — four NUL-safe fields on one line via custom format.
  const commitOut = await safeExec(
    "git",
    gitArgs("log", "-1", "--format=%H%x1f%s%x1f%an%x1f%cI"),
    ALIGNMD,
  );
  let last_commit: AlignmdSummary["last_commit"] = null;
  if (commitOut) {
    const [sha, subject, author, ts] = commitOut.split("\x1f");
    if (sha && subject !== undefined && author !== undefined && ts) {
      last_commit = { sha, subject, author, ts };
    }
  }

  // Uncommitted + untracked file counts (porcelain v1, one line per file).
  // Lines beginning with "??" are untracked; everything else is a tracked
  // file with staged or unstaged changes.
  const porcelain = await safeExec("git", gitArgs("status", "--porcelain"), ALIGNMD);
  let uncommitted_files: number | null = null;
  let untracked_files: number | null = null;
  if (porcelain !== null) {
    if (porcelain === "") {
      uncommitted_files = 0;
      untracked_files = 0;
    } else {
      const lines = porcelain.split("\n");
      untracked_files = lines.filter((l) => l.startsWith("??")).length;
      uncommitted_files = lines.length - untracked_files;
    }
  }

  // Ahead/behind origin — only meaningful if an upstream is configured.
  let ahead_of_origin: number | null = null;
  let behind_of_origin: number | null = null;
  const upstream = await safeExec(
    "git",
    gitArgs("rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"),
    ALIGNMD,
  );
  if (upstream) {
    // `rev-list --left-right --count @{u}...HEAD` prints "<behind>\t<ahead>".
    const counts = await safeExec(
      "git",
      gitArgs("rev-list", "--left-right", "--count", "@{u}...HEAD"),
      ALIGNMD,
    );
    if (counts !== null) {
      const parts = counts.split(/\s+/);
      const behindN = Number.parseInt(parts[0] ?? "", 10);
      const aheadN = Number.parseInt(parts[1] ?? "", 10);
      behind_of_origin = Number.isFinite(behindN) ? behindN : null;
      ahead_of_origin = Number.isFinite(aheadN) ? aheadN : null;
    }
  } else {
    // No upstream — by convention treat as zero rather than null so the UI
    // doesn't render an alarming "?" for a fully-local-only branch. behind
    // stays null because the question doesn't apply.
    ahead_of_origin = 0;
    behind_of_origin = null;
  }
  // Back-compat alias.
  const unpushed_commits = ahead_of_origin;

  // Migrations.
  const migrations = await listMigrations(ALIGNMD);
  const last_migration = migrations.length ? migrations[migrations.length - 1]! : null;
  const applied = await loadAppliedLedger();
  const pending_migrations =
    applied === null ? [] : migrations.filter((m) => !applied.includes(m));
  // "applied_migrations" here means "present in the partner repo on disk".
  // We can't know which are *actually* applied to Supabase from git state.
  const applied_migrations = migrations;

  // Routes.
  const readiness_route_exists = await dirExists(
    path.join(ALIGNMD, "src/app/(clinician)/clinician/readiness"),
  );
  const opportunities_route_exists = await dirExists(
    path.join(ALIGNMD, "src/app/(app)/opportunities"),
  );

  // Reachability: we got at least a branch + a commit + a porcelain
  // status. If any of those came back null, the underlying git binary
  // misbehaved and we shouldn't pretend the snapshot is trustworthy.
  const reachable =
    branchOut !== null && last_commit !== null && uncommitted_files !== null;

  return {
    reachable,
    repo_path: ALIGNMD,
    branch: branchOut,
    last_commit,
    uncommitted_files,
    untracked_files,
    ahead_of_origin,
    behind_of_origin,
    unpushed_commits,
    last_migration,
    applied_migrations,
    pending_migrations,
    readiness_route_exists,
    opportunities_route_exists,
  };
}
