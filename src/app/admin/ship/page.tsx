import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { homedir } from "node:os";
import { AdminNav, ADMIN_CSS, PageHint } from "../layout-bits";
import { Card, EmptyState, Kpi, StatusBanner } from "@/components/ui";
import {
  checkSlopAction,
  readCurrentPreview,
} from "./publish-action";
import {
  SLOP_GATE_THRESHOLD,
  type SlopPreviewSnapshot,
} from "./publish-action.shared";

export const metadata = {
  title: "Ship — Day14 Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
// Build + lint can take a moment; give the page enough headroom to render
// the real result rather than a half-baked one.
export const maxDuration = 120;

const execFileP = promisify(execFile);

/* ─── Helpers ─────────────────────────────────────────────── */

const STUDIO = path.join(homedir(), "Documents/studio");
const ALIGNMD = path.join(homedir(), "Documents/alignmd");

interface CmdResult {
  ok: boolean;
  durationMs: number;
  /** Truncated combined stdout+stderr — never the whole world. */
  output: string;
  /** Reason if the command could not even run (binary missing, etc.). */
  errorReason?: string;
}

/**
 * Run a single binary and capture its result without ever throwing.
 * A non-zero exit code is `ok: false`; a missing binary or timeout
 * is captured as `errorReason` so the UI can explain the failure
 * instead of crashing the page.
 */
async function runCmd(
  bin: string,
  args: readonly string[],
  cwd: string,
  timeoutMs = 90_000,
): Promise<CmdResult> {
  const started = Date.now();
  try {
    const { stdout, stderr } = await execFileP(bin, args as string[], {
      cwd,
      timeout: timeoutMs,
      maxBuffer: 2 * 1024 * 1024,
    });
    return {
      ok: true,
      durationMs: Date.now() - started,
      output: tail(`${stdout}${stderr}`, 4000),
    };
  } catch (err) {
    const e = err as NodeJS.ErrnoException & {
      stdout?: string;
      stderr?: string;
      code?: string | number;
      killed?: boolean;
    };
    // ENOENT — binary missing entirely (e.g. node_modules absent or hosted env).
    if (e.code === "ENOENT") {
      return {
        ok: false,
        durationMs: Date.now() - started,
        output: "",
        errorReason: `Binary not found: ${bin}. This page only works on the Mac where Day14 is developed.`,
      };
    }
    if (e.killed) {
      return {
        ok: false,
        durationMs: Date.now() - started,
        output: tail(`${e.stdout ?? ""}${e.stderr ?? ""}`, 4000),
        errorReason: `Timed out after ${Math.round(timeoutMs / 1000)}s.`,
      };
    }
    return {
      ok: false,
      durationMs: Date.now() - started,
      output: tail(`${e.stdout ?? ""}${e.stderr ?? ""}`, 4000),
    };
  }
}

function tail(s: string, n: number): string {
  if (!s) return "";
  if (s.length <= n) return s.trimEnd();
  return `…\n${s.slice(-n).trimEnd()}`;
}

/* ─── Git inspectors ──────────────────────────────────────── */

interface GitPorcelainEntry {
  /** Two-letter status code, e.g. " M", "??", "MM". */
  status: string;
  path: string;
}

function parsePorcelain(raw: string): GitPorcelainEntry[] {
  const out: GitPorcelainEntry[] = [];
  for (const line of raw.split("\n")) {
    if (!line) continue;
    // porcelain v1: 2 chars status, space, path. Renames have ` -> `.
    const status = line.slice(0, 2);
    const p = line.slice(3);
    out.push({ status, path: p });
  }
  return out;
}

/** Files outside the `.github/` convention — the only ones safe to commit. */
function nonGithub(entries: readonly GitPorcelainEntry[]): GitPorcelainEntry[] {
  return entries.filter((e) => !e.path.startsWith(".github/"));
}

function isUntracked(e: GitPorcelainEntry): boolean {
  return e.status === "??";
}

interface GitSnapshot {
  ok: boolean;
  errorReason?: string;
  entries: GitPorcelainEntry[];
  unpushed: string[];
}

async function gitSnapshot(repo: string): Promise<GitSnapshot> {
  const status = await runCmd("git", ["-C", repo, "status", "--porcelain"], repo, 15_000);
  if (!status.ok) {
    return {
      ok: false,
      errorReason: status.errorReason || "git status failed",
      entries: [],
      unpushed: [],
    };
  }
  const entries = parsePorcelain(status.output);

  // Unpushed commits — best-effort. May fail with no upstream; not fatal.
  let unpushed: string[] = [];
  const log = await runCmd(
    "git",
    ["-C", repo, "log", "origin/main..HEAD", "--oneline"],
    repo,
    15_000,
  );
  if (log.ok && log.output) {
    unpushed = log.output.split("\n").filter(Boolean);
  }
  return { ok: true, entries, unpushed };
}

/* ─── Integrations (mirrors the Health page) ──────────────── */

interface Integration {
  name: string;
  envKeys: readonly string[];
  unlocks: string;
}
const INTEGRATIONS: readonly Integration[] = [
  {
    name: "Anthropic API",
    envKeys: ["ANTHROPIC_API_KEY"],
    unlocks:
      "Powers the Life Loophole AI advisor and the agents' reasoning fallback. Without it, the advisor goes quiet and agents lose their backup model.",
  },
  {
    name: "Gemini API",
    envKeys: ["GEMINI_API_KEY"],
    unlocks:
      "Drives the content-generation engines. Without it, automated content drafting stops across the brands.",
  },
  {
    name: "Printify API",
    envKeys: ["PRINTIFY_API_KEY"],
    unlocks:
      "Publishes Hot Flash Co products and feeds the admin product counts. Without it, products fall back to manual upload and counts read zero.",
  },
  {
    name: "Telegram bridge",
    envKeys: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"],
    unlocks:
      "Runs the two-way Telegram bridge for alerts and commands. Without both the token and chat id, Telegram notifications and replies are dark.",
  },
  {
    name: "Real-estate API",
    envKeys: ["REALESTATE_API_KEY"],
    unlocks:
      "Gives Day14 Realty real licensed property valuations. Without it, deal scores fall back to rougher county estimates.",
  },
  {
    name: "MailerLite API",
    envKeys: ["MAILERLITE_API_KEY"],
    unlocks:
      "Handles newsletter and email capture across the brand sites. Without it, signup forms cannot add subscribers.",
  },
] as const;

/* ─── Status helpers ──────────────────────────────────────── */

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 10_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 1000)}s`;
}

/** Heading used for the commit block — keeps Jack's shell paste short. */
function commitBlockText(paths: readonly string[]): string {
  if (paths.length === 0) return "# nothing to commit";
  const lines = ["git add \\"];
  paths.forEach((p, i) => {
    const last = i === paths.length - 1;
    // Quote any path that contains spaces.
    const safe = /\s/.test(p) ? `"${p}"` : p;
    lines.push(`  ${safe}${last ? "" : " \\"}`);
  });
  lines.push("");
  lines.push('git commit -m "chore: ship preflight"');
  lines.push("git push");
  return lines.join("\n");
}

/* ─── Page ─────────────────────────────────────────────────── */

export default async function ShipPage() {
  // Run the three slowest commands concurrently. The git calls are fast and
  // run sequentially inside their helpers.
  const tscBin = path.join(STUDIO, "node_modules", ".bin", "tsc");
  const nextBin = path.join(STUDIO, "node_modules", ".bin", "next");
  const [tsc, lint, studioGit, alignmdGit, slopPreview] = await Promise.all([
    runCmd(tscBin, ["--noEmit"], STUDIO, 90_000),
    runCmd(nextBin, ["lint"], STUDIO, 90_000),
    gitSnapshot(STUDIO),
    gitSnapshot(ALIGNMD),
    readCurrentPreview(),
  ]);

  // ── Build verdict ────────────────────────────────────────
  const buildOk = tsc.ok && lint.ok;
  const buildTone: "ok" | "warn" | "bad" = buildOk ? "ok" : "bad";
  const buildHeadline = buildOk
    ? "Build is green — typecheck and lint both clean"
    : !tsc.ok && !lint.ok
      ? "Build is red — typecheck and lint both failing"
      : !tsc.ok
        ? "Build is red — typecheck failing"
        : "Build is red — lint failing";

  // ── Uncommitted summary ──────────────────────────────────
  const allEntries = studioGit.entries;
  const shippable = nonGithub(allEntries);
  const modifiedShippable = shippable.filter((e) => !isUntracked(e));
  const untrackedShippable = shippable.filter(isUntracked);
  const githubOnly = allEntries.filter((e) => e.path.startsWith(".github/"));
  const unpushed = studioGit.unpushed;
  const hasUncommitted = shippable.length > 0;

  // ── Integrations ────────────────────────────────────────
  const integrations = INTEGRATIONS.map((it) => ({
    ...it,
    connected: it.envKeys.every((k) => {
      const v = process.env[k];
      return typeof v === "string" && v.trim().length > 0;
    }),
  }));
  const integMissing = integrations.filter((it) => !it.connected);

  // ── Verdict ─────────────────────────────────────────────
  const holds: string[] = [];
  if (!buildOk) holds.push("the build");
  if (hasUncommitted) holds.push(`${shippable.length} uncommitted file${shippable.length === 1 ? "" : "s"}`);
  if (integMissing.length > 0)
    holds.push(`${integMissing.length} missing integration${integMissing.length === 1 ? "" : "s"}`);
  const nothingToShip = !hasUncommitted && unpushed.length === 0;
  const verdictTone: "ok" | "warn" | "bad" =
    holds.length === 0
      ? "ok"
      : !buildOk
        ? "bad"
        : "warn";
  const verdictHeadline =
    holds.length === 0
      ? nothingToShip
        ? "Nothing to ship — working tree clean, nothing unpushed"
        : `Ready to push${unpushed.length > 0 ? ` · ${unpushed.length} unpushed commit${unpushed.length === 1 ? "" : "s"}` : ""}`
      : `Hold — ${holds.length} thing${holds.length === 1 ? "" : "s"} to check first`;
  const verdictDetail =
    holds.length === 0
      ? nothingToShip
        ? "No file changes, no unpushed commits. There is nothing here that needs to ship."
        : "Build is green, working tree matches the commit block below, every integration key is set."
      : `Outstanding: ${holds.join(", ")}.`;

  // ── Static commit block (server-rendered, no JS) ─────────
  const commitBlock = commitBlockText(shippable.map((e) => e.path));

  // ── AlignMD migration note ───────────────────────────────
  const alignmdMigrationPath = "alignmd/APPLY-MIGRATIONS-0011-0013.sql";

  return (
    <div className="admin-shell">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <AdminNav active="ship" />
      <h1>Shipping wizard</h1>
      <PageHint>
        The one screen to check before every <code>git push</code> to day14.us —
        build status, exactly what is uncommitted, the paste-ready commit block,
        the AlignMD hand-off, and which integration keys are live.
      </PageHint>
      <div className="sub">
        Pre-flight for the Day14 studio repo · live results, recomputed on every load
      </div>

      <div style={{ marginBottom: 20 }}>
        <StatusBanner tone={verdictTone} headline={verdictHeadline} detail={verdictDetail} />
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="kpi">
          <div className="kpi-label">Build</div>
          <div className="kpi-value" style={{ color: buildOk ? "var(--green)" : "var(--red)" }}>
            {buildOk ? "Green" : "Red"}
          </div>
          <div className="kpi-sub">typecheck + lint</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Uncommitted</div>
          <div className="kpi-value" style={{ color: hasUncommitted ? "var(--amber)" : "var(--text)" }}>
            {shippable.length}
          </div>
          <div className="kpi-sub">
            {modifiedShippable.length} modified · {untrackedShippable.length} untracked
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Unpushed</div>
          <div className="kpi-value" style={{ color: unpushed.length > 0 ? "var(--accent-text)" : "var(--text)" }}>
            {unpushed.length}
          </div>
          <div className="kpi-sub">commits ahead of origin/main</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Integrations</div>
          <div className="kpi-value" style={{ color: integMissing.length > 0 ? "var(--amber)" : "var(--green)" }}>
            {integrations.length - integMissing.length}/{integrations.length}
          </div>
          <div className="kpi-sub">
            {integMissing.length === 0 ? "all keys set" : `${integMissing.length} missing`}
          </div>
        </div>
      </div>

      {/* ── 1. Build status ───────────────────────────────── */}
      <div className="section-header">
        <div className="section-title">Build status</div>
        <span className="section-link" style={{ pointerEvents: "none", color: "var(--muted)" }}>
          {fmtDuration(tsc.durationMs + lint.durationMs)} total
        </span>
      </div>
      <div style={{ marginBottom: 12 }}>
        <StatusBanner
          tone={buildTone}
          headline={buildHeadline}
          detail={
            buildOk
              ? `npx tsc --noEmit in ${fmtDuration(tsc.durationMs)} · npx next lint in ${fmtDuration(lint.durationMs)}`
              : "Fix the failing command before you push. The exact output is below."
          }
        />
      </div>
      <div className="panel-grid">
        <BuildResultCard title="npx tsc --noEmit" result={tsc} />
        <BuildResultCard title="npx next lint" result={lint} />
      </div>

      {/* ── 1b. Pre-publish slop gate ─────────────────────── */}
      <div className="section-header" id="publish-gate">
        <div className="section-title">Pre-publish slop gate</div>
        <span className="section-link" style={{ pointerEvents: "none", color: "var(--muted)" }}>
          blocks publish if &gt;{SLOP_GATE_THRESHOLD} phrases stripped without override
        </span>
      </div>
      <SlopGateSection snapshot={slopPreview} />

      {/* ── 2. What's uncommitted ─────────────────────────── */}
      <div className="section-header">
        <div className="section-title">
          What&rsquo;s uncommitted{shippable.length > 0 ? ` · ${shippable.length}` : ""}
        </div>
      </div>
      {!studioGit.ok ? (
        <EmptyState
          icon="🔒"
          headline="Could not read git state."
          hint={
            <>
              {studioGit.errorReason ||
                "`git status` failed in the studio repo. This page only works on the Mac where Day14 is developed."}
            </>
          }
        />
      ) : shippable.length === 0 && unpushed.length === 0 && githubOnly.length === 0 ? (
        <EmptyState
          icon="✓"
          headline="Working tree is clean."
          hint={<>No tracked or untracked changes, and nothing waiting for <code>git push</code>.</>}
        />
      ) : (
        <Card>
          {modifiedShippable.length > 0 && (
            <FileList title="Modified" entries={modifiedShippable} />
          )}
          {untrackedShippable.length > 0 && (
            <FileList title="Untracked" entries={untrackedShippable} />
          )}
          {githubOnly.length > 0 && (
            <FileList
              title=".github/ — excluded from the commit block by convention"
              entries={githubOnly}
              muted
            />
          )}
          {unpushed.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "var(--muted)",
                  marginBottom: 8,
                }}
              >
                Unpushed commits — ahead of <code>origin/main</code>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {unpushed.map((line) => (
                  <li
                    key={line}
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 12,
                      padding: "4px 0",
                      color: "var(--text-2)",
                    }}
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* ── 3. Ready-to-paste commit block ────────────────── */}
      <div className="section-header">
        <div className="section-title">Ready-to-paste commit block</div>
        <span className="section-link" style={{ pointerEvents: "none", color: "var(--muted)" }}>
          excludes <code>.github/</code>
        </span>
      </div>
      <div className="section" style={{ padding: 0, overflow: "hidden" }}>
        {shippable.length === 0 ? (
          <div
            style={{
              padding: "26px 22px",
              color: "var(--muted)",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            Nothing to add. The working tree (outside <code>.github/</code>) is clean.
          </div>
        ) : (
          <pre
            style={{
              margin: 0,
              padding: "16px 18px",
              fontFamily: "var(--mono)",
              fontSize: 12.5,
              lineHeight: 1.55,
              color: "var(--text)",
              background: "var(--surface-3, var(--surface-2))",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              overflowX: "auto",
            }}
          >
            {commitBlock}
          </pre>
        )}
      </div>

      {/* ── 4. AlignMD handoff ────────────────────────────── */}
      <div className="section-header">
        <div className="section-title">AlignMD handoff</div>
      </div>
      <div className="panel-grid">
        <div>
          {!alignmdGit.ok ? (
            <EmptyState
              icon="📦"
              headline="No AlignMD checkout found."
              hint={
                <>
                  {alignmdGit.errorReason || "git failed"} — looked for{" "}
                  <code>~/Documents/alignmd</code>. Clone the repo there to see its status here.
                </>
              }
            />
          ) : alignmdGit.entries.length === 0 && alignmdGit.unpushed.length === 0 ? (
            <EmptyState
              icon="✓"
              headline="AlignMD repo is clean."
              hint={<>No uncommitted work in <code>~/Documents/alignmd</code>.</>}
            />
          ) : (
            <Card title="AlignMD git status">
              {alignmdGit.entries.length > 0 ? (
                <FileList entries={alignmdGit.entries} />
              ) : (
                <div style={{ color: "var(--muted)", fontSize: 13 }}>No file changes.</div>
              )}
              {alignmdGit.unpushed.length > 0 && (
                <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--text-2)" }}>
                  {alignmdGit.unpushed.length} unpushed commit
                  {alignmdGit.unpushed.length === 1 ? "" : "s"}.
                </div>
              )}
            </Card>
          )}
        </div>
        <div>
          <StatusBanner
            tone="warn"
            headline="Apply SQL before any AlignMD deploy"
            detail={
              <>
                <code>{alignmdMigrationPath}</code> must be applied in the AlignMD
                Supabase project before pushing AlignMD code. Skipping this leaves
                the new tables and columns missing in production.
              </>
            }
          />
        </div>
      </div>

      {/* ── 5. Integrations status ────────────────────────── */}
      <div className="section-header">
        <div className="section-title">
          {integMissing.length > 0
            ? "Integrations — missing keys first"
            : "Integrations"}
        </div>
      </div>
      <div>
        {[...integMissing, ...integrations.filter((it) => it.connected)].map((it) => {
          const cls = it.connected ? "connected" : "missing";
          return (
            <div key={it.name} className={`integ-row ${cls}`}>
              <span className={`integ-dot ${cls}`} />
              <div className="integ-name">{it.name}</div>
              <div className={`integ-state ${cls}`}>
                {it.connected ? "Connected" : "Not connected"}
              </div>
              <div className="integ-why">{it.unlocks}</div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 10, lineHeight: 1.6 }}>
        {integMissing.length === 0
          ? "Every integration key is set on this server — nothing is dark."
          : `${integMissing.length} of ${integrations.length} integration${integrations.length === 1 ? "" : "s"} ${
              integMissing.length === 1 ? "is" : "are"
            } not connected. A missing key is a choice, not a failure — each line says exactly what stays dark until you add it.`}
      </div>

      <Kpi
        label="Why this page exists"
        value={holds.length === 0 ? "Push with confidence" : "Slow down"}
        sub={
          holds.length === 0
            ? "Build, working tree, and integrations all line up — paste the commit block and ship."
            : "One scannable screen surfaces every preflight problem before they bite in production."
        }
        style={{ marginTop: 32 }}
      />
    </div>
  );
}

/* ─── Local sub-components (server-rendered, no JS) ───────── */

function FileList({
  title,
  entries,
  muted,
}: {
  title?: string;
  entries: readonly GitPorcelainEntry[];
  muted?: boolean;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      {title ? (
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "var(--muted)",
            marginBottom: 8,
          }}
        >
          {title}
        </div>
      ) : null}
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {entries.map((e) => (
          <li
            key={`${e.status}-${e.path}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "5px 0",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                color: "var(--accent-text)",
                width: 28,
                flexShrink: 0,
                textTransform: "none",
              }}
            >
              {e.status.trim() || "??"}
            </span>
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 12.5,
                color: muted ? "var(--muted)" : "var(--text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {e.path}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Slop-gate UI (server component) ─────────────────────── */

function SlopGateSection({ snapshot }: { snapshot: SlopPreviewSnapshot | null }) {
  // Two server-side forms share the same action — the `intent` hidden input
  // distinguishes preview vs. publish. No client-side state required.
  return (
    <div className="panel-grid" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 24 }}>
      <Card title="Paste content to check before publish">
        <form action={checkSlopAction}>
          <input type="hidden" name="intent" value="preview" />
          <textarea
            name="content"
            defaultValue={snapshot?.original ?? ""}
            placeholder="Paste the article, landing-page copy, email body, or any content destined for a live surface."
            rows={10}
            style={{
              width: "100%",
              fontFamily: "var(--mono)",
              fontSize: 12.5,
              lineHeight: 1.5,
              padding: "10px 12px",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-sm)",
              background: "var(--surface-2)",
              color: "var(--text)",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
          <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="submit"
              style={{
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 600,
                border: "1px solid var(--border)",
                borderRadius: "var(--r-sm)",
                background: "var(--surface-3, var(--surface-2))",
                color: "var(--text)",
                cursor: "pointer",
              }}
            >
              Check for slop
            </button>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              Runs <code>stripSlop()</code> server-side. Nothing is published.
            </span>
          </div>
        </form>
      </Card>

      <div>
        <SlopPreviewResult snapshot={snapshot} />
      </div>
    </div>
  );
}

function SlopPreviewResult({ snapshot }: { snapshot: SlopPreviewSnapshot | null }) {
  if (!snapshot) {
    return (
      <EmptyState
        icon="✎"
        headline="No content checked yet."
        hint={
          <>
            Paste content on the left and hit <strong>Check for slop</strong>. If
            <code> stripSlop()</code> removes more than {SLOP_GATE_THRESHOLD} phrases,
            the publish button below will require an explicit override checkbox.
          </>
        }
      />
    );
  }

  const overThreshold = snapshot.totalRemoved > SLOP_GATE_THRESHOLD;

  if (snapshot.intent === "publish" && snapshot.blocked) {
    return (
      <Card title="Publish blocked by slop gate" aside={<span style={{ color: "var(--red)", fontWeight: 700 }}>BLOCKED</span>}>
        <StatusBanner
          tone="bad"
          headline={`Publish blocked — ${snapshot.totalRemoved} phrases removed, override required`}
          detail={
            <>
              <code>stripSlop()</code> stripped more than {SLOP_GATE_THRESHOLD} phrases
              from the content. Tick <strong>&ldquo;I&rsquo;ve reviewed slop removals&rdquo;</strong>
              below and resubmit to push through anyway, or rewrite the content and re-check.
            </>
          }
        />
        <RemovedPhrasesList removed={snapshot.removed} />
        <PublishForm snapshot={snapshot} overThreshold={overThreshold} />
      </Card>
    );
  }

  if (snapshot.intent === "publish" && !snapshot.blocked) {
    return (
      <Card title="Publish queued" aside={<span style={{ color: "var(--green)", fontWeight: 700 }}>QUEUED</span>}>
        <StatusBanner
          tone="ok"
          headline={`Queued to inbox — ${snapshot.totalRemoved} phrases stripped`}
          detail={
            <>
              Cleaned content was written to the day14 publish-queue inbox
              {snapshot.override ? " (override checkbox was ticked)" : " (under threshold — no override needed)"}.
              No live surface was touched.
            </>
          }
        />
        <RemovedPhrasesList removed={snapshot.removed} />
      </Card>
    );
  }

  // Preview-only result.
  return (
    <Card
      title="Preview result"
      aside={
        <span
          style={{
            color: overThreshold ? "var(--amber)" : "var(--green)",
            fontWeight: 700,
          }}
        >
          {snapshot.totalRemoved} stripped
        </span>
      }
    >
      <StatusBanner
        tone={overThreshold ? "warn" : "ok"}
        headline={
          overThreshold
            ? `${snapshot.totalRemoved} phrases stripped — over the ${SLOP_GATE_THRESHOLD}-phrase threshold`
            : `${snapshot.totalRemoved} phrase${snapshot.totalRemoved === 1 ? "" : "s"} stripped — under threshold, publish is clear`
        }
        detail={
          overThreshold
            ? "Review the removed phrases below. Publish will be blocked until you tick the override checkbox."
            : "You can publish without override. The cleaned version below will be queued to the inbox."
        }
      />
      <RemovedPhrasesList removed={snapshot.removed} />
      <PublishForm snapshot={snapshot} overThreshold={overThreshold} />
    </Card>
  );
}

function RemovedPhrasesList({
  removed,
}: {
  removed: SlopPreviewSnapshot["removed"];
}) {
  if (removed.length === 0) {
    return (
      <div style={{ fontSize: 12.5, color: "var(--muted)", margin: "10px 0" }}>
        No slop phrases found. <code>stripSlop()</code> made zero edits.
      </div>
    );
  }
  return (
    <div style={{ margin: "12px 0" }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "var(--muted)",
          marginBottom: 8,
        }}
      >
        Removed phrases ({removed.length} distinct)
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {removed.map((r) => (
          <li
            key={r.phrase}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 0",
              borderBottom: "1px solid var(--border)",
              fontSize: 12.5,
            }}
          >
            <span style={{ fontFamily: "var(--mono)", color: "var(--text)" }}>{r.phrase}</span>
            <span style={{ color: "var(--accent-text)", fontVariantNumeric: "tabular-nums" }}>
              ×{r.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PublishForm({
  snapshot,
  overThreshold,
}: {
  snapshot: SlopPreviewSnapshot;
  overThreshold: boolean;
}) {
  // The form resubmits the ORIGINAL content (not the cleaned one) — the
  // server action re-runs stripSlop deterministically so the audit trail
  // matches what the user actually wrote.
  return (
    <form action={checkSlopAction} style={{ marginTop: 14 }}>
      <input type="hidden" name="intent" value="publish" />
      <input type="hidden" name="content" value={snapshot.original} />
      {overThreshold ? (
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "10px 12px",
            border: "1px solid var(--amber)",
            borderRadius: "var(--r-sm)",
            background: "rgba(217, 165, 53, 0.08)",
            fontSize: 12.5,
            marginBottom: 10,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            name="override"
            required
            defaultChecked={snapshot.override}
            style={{ marginTop: 2 }}
          />
          <span>
            <strong>I&rsquo;ve reviewed slop removals.</strong> Required because{" "}
            <code>stripSlop()</code> removed {snapshot.totalRemoved} phrases —
            more than the {SLOP_GATE_THRESHOLD}-phrase threshold.
          </span>
        </label>
      ) : null}
      <button
        type="submit"
        style={{
          padding: "8px 14px",
          fontSize: 13,
          fontWeight: 600,
          border: "1px solid var(--border)",
          borderRadius: "var(--r-sm)",
          background: overThreshold ? "rgba(217, 165, 53, 0.18)" : "var(--surface-3, var(--surface-2))",
          color: "var(--text)",
          cursor: "pointer",
        }}
      >
        {overThreshold ? "Override + publish (inbox queue)" : "Publish (inbox queue)"}
      </button>
      <span style={{ marginLeft: 10, fontSize: 12, color: "var(--muted)" }}>
        Writes the cleaned content to <code>~/Documents/businesses/day14/inbox/publish-queue/</code>. Never touches a live surface.
      </span>
    </form>
  );
}

function BuildResultCard({ title, result }: { title: string; result: CmdResult }) {
  return (
    <Card
      title={title}
      aside={
        <span style={{ color: result.ok ? "var(--green)" : "var(--red)", fontWeight: 700 }}>
          {result.ok ? "Pass" : "Fail"} · {fmtDuration(result.durationMs)}
        </span>
      }
    >
      {result.errorReason ? (
        <div style={{ fontSize: 12.5, color: "var(--amber)", marginBottom: 8 }}>
          {result.errorReason}
        </div>
      ) : null}
      {result.output ? (
        <pre
          style={{
            margin: 0,
            padding: "10px 12px",
            fontFamily: "var(--mono)",
            fontSize: 11.5,
            lineHeight: 1.5,
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-sm)",
            color: "var(--text-2)",
            maxHeight: 240,
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {result.output}
        </pre>
      ) : (
        <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
          {result.ok ? "Clean — no output." : "No output captured."}
        </div>
      )}
    </Card>
  );
}
