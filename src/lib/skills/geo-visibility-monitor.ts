/**
 * geo-visibility-monitor — hand-coded impl.
 *
 * Scores a GEO client's AI-answer visibility (/20) from recorded prompt
 * runs, writes the monthly report, and appends score history for delta
 * tracking. The measurement engine behind the GEO service line.
 *
 * MEASURES ONLY. Never queries ChatGPT/Perplexity/Google AI Mode itself
 * (CLAUDE.md rule 3 — no real-key API calls from agent code). Runs are
 * recorded by Jack or imported from the tracking tool into
 * customers/{slug}/07-geo/prompt-runs.jsonl.
 *
 * Rubric (spec: docs/seeds/skills/geo-visibility-monitor/SKILL.md):
 * latest run per (prompt, engine) cell; 0 = not mentioned, 1 = mentioned,
 * 2 = mentioned top-3; score = round(20 × points / (2 × cells)).
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { auditLog } from "./audit-log-generator";

export const GEO_ENGINES = ["chatgpt", "perplexity", "google-ai"] as const;
export type GeoEngine = (typeof GEO_ENGINES)[number];

export interface GeoPromptRun {
  timestamp: string;
  engine: GeoEngine;
  prompt: string;
  mentioned: boolean;
  position?: number | null;
  sentiment?: "positive" | "neutral" | "negative";
  citation?: string;
}

export interface GeoEngineBreakdown {
  cells: number;
  mentioned: number;
  topThree: number;
}

export interface GeoScoreResult {
  slug: string;
  /** 0–20, or null when no runs are recorded (unmeasured ≠ invisible). */
  score: number | null;
  cells: number;
  skippedLines: number;
  perEngine: Record<GeoEngine, GeoEngineBreakdown>;
  /** vs the previous score-history entry; null on first measurement. */
  delta: number | null;
  /** cells currently scoring 0 — next month's content targets. */
  weakestCells: Array<{ prompt: string; engine: GeoEngine }>;
  enginesMeasured: number;
}

// Paths derived per-call (not cached at module load) so tests that swap
// process.env.HOME between cases are honored — same lesson as
// audit-log-generator.
function customersDir(): string {
  return path.join(homedir(), "Documents/businesses/_shared/customers");
}
function geoDir(slug: string): string {
  return path.join(customersDir(), slug, "07-geo");
}

function isGeoEngine(v: unknown): v is GeoEngine {
  return typeof v === "string" && (GEO_ENGINES as readonly string[]).includes(v);
}

/** Read + parse a client's prompt-runs.jsonl. Malformed lines are counted,
 *  never fatal (spec failure mode: one bad line must not kill the run). */
export async function readPromptRuns(
  slug: string
): Promise<{ runs: GeoPromptRun[]; skipped: number }> {
  const file = path.join(geoDir(slug), "prompt-runs.jsonl");
  if (!existsSync(file)) return { runs: [], skipped: 0 };
  const text = await fs.readFile(file, "utf8");
  const runs: GeoPromptRun[] = [];
  let skipped = 0;
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const raw = JSON.parse(line) as Record<string, unknown>;
      if (
        typeof raw.timestamp !== "string" ||
        typeof raw.prompt !== "string" ||
        typeof raw.mentioned !== "boolean" ||
        !isGeoEngine(raw.engine)
      ) {
        skipped += 1;
        continue;
      }
      runs.push({
        timestamp: raw.timestamp,
        engine: raw.engine,
        prompt: raw.prompt,
        mentioned: raw.mentioned,
        position: typeof raw.position === "number" ? raw.position : null,
        sentiment:
          raw.sentiment === "positive" ||
          raw.sentiment === "neutral" ||
          raw.sentiment === "negative"
            ? raw.sentiment
            : undefined,
        citation: typeof raw.citation === "string" ? raw.citation : undefined,
      });
    } catch {
      skipped += 1;
    }
  }
  return { runs, skipped };
}

function cellPoints(run: GeoPromptRun): 0 | 1 | 2 {
  if (!run.mentioned) return 0;
  if (typeof run.position === "number" && run.position >= 1 && run.position <= 3)
    return 2;
  return 1;
}

/** Compute the /20 score from recorded runs. Latest run per (prompt, engine)
 *  cell wins; the score normalizes over measured cells only — missing cells
 *  are never extrapolated (hard rule 2). */
export async function computeGeoScore(slug: string): Promise<GeoScoreResult> {
  const { runs, skipped } = await readPromptRuns(slug);

  // Latest run per cell.
  const latest = new Map<string, GeoPromptRun>();
  for (const run of runs) {
    const key = `${run.engine}::${run.prompt.trim().toLowerCase()}`;
    const prev = latest.get(key);
    if (!prev || run.timestamp.localeCompare(prev.timestamp) >= 0) {
      latest.set(key, run);
    }
  }

  const perEngine: Record<GeoEngine, GeoEngineBreakdown> = {
    chatgpt: { cells: 0, mentioned: 0, topThree: 0 },
    perplexity: { cells: 0, mentioned: 0, topThree: 0 },
    "google-ai": { cells: 0, mentioned: 0, topThree: 0 },
  };

  let points = 0;
  const weakestCells: Array<{ prompt: string; engine: GeoEngine }> = [];
  for (const run of latest.values()) {
    const pts = cellPoints(run);
    points += pts;
    const eng = perEngine[run.engine];
    eng.cells += 1;
    if (pts >= 1) eng.mentioned += 1;
    if (pts === 2) eng.topThree += 1;
    if (pts === 0) weakestCells.push({ prompt: run.prompt, engine: run.engine });
  }

  const cells = latest.size;
  const score = cells === 0 ? null : Math.round((points / (2 * cells)) * 20);
  const enginesMeasured = GEO_ENGINES.filter((e) => perEngine[e].cells > 0).length;

  // Delta vs previous history entry (null on first measurement).
  let delta: number | null = null;
  const historyFile = path.join(geoDir(slug), "score-history.jsonl");
  if (score !== null && existsSync(historyFile)) {
    const lines = (await fs.readFile(historyFile, "utf8"))
      .split("\n")
      .filter(Boolean);
    const last = lines[lines.length - 1];
    if (last) {
      try {
        const parsed = JSON.parse(last) as { score?: unknown };
        if (typeof parsed.score === "number") delta = score - parsed.score;
      } catch {
        // unreadable last entry → treat as first measurement
      }
    }
  }

  return {
    slug,
    score,
    cells,
    skippedLines: skipped,
    perEngine,
    delta,
    weakestCells,
    enginesMeasured,
  };
}

const ENGINE_LABEL: Record<GeoEngine, string> = {
  chatgpt: "ChatGPT",
  perplexity: "Perplexity",
  "google-ai": "Google AI Mode",
};

/** Write the report + append score history. Returns the report path. */
export async function writeGeoReport(result: GeoScoreResult): Promise<string> {
  const dir = geoDir(result.slug);
  await fs.mkdir(dir, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const reportPath = path.join(dir, `report-${date}.md`);

  const lines: string[] = [];
  lines.push(`# GEO visibility — ${result.slug} — ${date}`);
  lines.push("");
  lines.push(
    `## Score: ${result.score === null ? "unmeasured" : `${result.score}/20`}` +
      (result.delta !== null
        ? ` (${result.delta >= 0 ? "+" : ""}${result.delta} vs last report)`
        : " (first measurement — this is the baseline)")
  );
  lines.push("");
  lines.push(`- Cells measured: ${result.cells}`);
  if (result.skippedLines > 0)
    lines.push(`- Malformed lines skipped: ${result.skippedLines}`);
  if (result.enginesMeasured < GEO_ENGINES.length && result.cells > 0) {
    lines.push(
      `- ⚠️ Partial coverage: only ${result.enginesMeasured}/${GEO_ENGINES.length} engines measured — do not compare against a 3-engine baseline.`
    );
  }
  lines.push("");
  lines.push(`## Per engine`);
  for (const engine of GEO_ENGINES) {
    const b = result.perEngine[engine];
    if (b.cells === 0) {
      lines.push(`- **${ENGINE_LABEL[engine]}** — not measured`);
    } else {
      lines.push(
        `- **${ENGINE_LABEL[engine]}** — mentioned in ${b.mentioned}/${b.cells} prompts (top-3 in ${b.topThree})`
      );
    }
  }
  lines.push("");
  if (result.weakestCells.length > 0) {
    lines.push(`## Weakest cells (next month's content targets)`);
    for (const c of result.weakestCells) {
      lines.push(`- "${c.prompt}" on ${ENGINE_LABEL[c.engine]}`);
    }
    lines.push("");
  }
  lines.push(`_Generated: ${new Date().toISOString()}_`);
  await fs.writeFile(reportPath, lines.join("\n"), "utf8");

  // Append-only score history (hard rule 3) — the trend IS the deliverable.
  if (result.score !== null) {
    const historyFile = path.join(dir, "score-history.jsonl");
    await fs.appendFile(
      historyFile,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        score: result.score,
        cells: result.cells,
        delta: result.delta,
      }) + "\n",
      "utf8"
    );
  }

  return reportPath;
}

/** Discover customers that have GEO runs recorded. */
async function discoverGeoCustomers(): Promise<string[]> {
  const root = customersDir();
  if (!existsSync(root)) return [];
  const out: string[] = [];
  for (const slug of await fs.readdir(root)) {
    const runsFile = path.join(root, slug, "07-geo", "prompt-runs.jsonl");
    if (existsSync(runsFile)) out.push(slug);
  }
  return out.sort();
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  // Growth-hook note: logSkillInvocation fires centrally in skill-runtime.ts
  // (runSkill → invokeSkill), so it is intentionally NOT re-called here to
  // avoid double-logging — same pattern as churn-risk-scorer.
  try {
    const slugs = ctx.customer_slug
      ? [ctx.customer_slug]
      : await discoverGeoCustomers();

    if (slugs.length === 0) {
      return {
        ok: true,
        skill: "geo-visibility-monitor",
        path: "hand-coded",
        result: { customers_scored: 0 },
        next_actions: [
          "No GEO clients with recorded prompt runs — record a baseline with the GEO prompt pack (see /dashboard/geo).",
        ],
      };
    }

    const scored: GeoScoreResult[] = [];
    const artifacts: string[] = [];
    const nextActions: string[] = [];

    for (const slug of slugs) {
      const result = await computeGeoScore(slug);
      scored.push(result);

      if (result.score === null) {
        // Spec failure mode: no runs → report skipped, guidance surfaced.
        nextActions.push(
          `${slug}: no prompt runs recorded — run the baseline prompt pack before the next report.`
        );
        continue;
      }

      const reportPath = await writeGeoReport(result);
      artifacts.push(reportPath);

      // Hard rule 5: a drop ≥3 surfaces for Jack; never automated client
      // comms about drops.
      if (result.delta !== null && result.delta <= -3) {
        nextActions.push(
          `${slug}: score dropped ${result.delta} to ${result.score}/20 — review before the client sees the report. No automated sends.`
        );
      }
    }

    const reported = scored.filter((s) => s.score !== null);

    // Audit trail (CLAUDE.md rule 5): these reports drive client-facing
    // deliverables and renewal conversations — consequential.
    await auditLog({
      action: "geo_visibility_report_generated",
      actor: "automated:geo-visibility-monitor",
      customer_slug: ctx.customer_slug,
      details: {
        customers_scored: reported.length,
        scores: reported.map((s) => ({
          slug: s.slug,
          score: s.score,
          delta: s.delta,
          cells: s.cells,
        })),
        reports: artifacts,
      },
      skill_invoked: "geo-visibility-monitor",
      actor_source: ctx.caller ?? "scheduled",
    });

    return {
      ok: true,
      skill: "geo-visibility-monitor",
      path: "hand-coded",
      result: {
        customers_scored: reported.length,
        customers_unmeasured: scored.length - reported.length,
        scores: scored.map((s) => ({
          slug: s.slug,
          score: s.score,
          delta: s.delta,
          cells: s.cells,
          engines_measured: s.enginesMeasured,
        })),
      },
      artifacts,
      next_actions: nextActions,
    };
  } catch (err) {
    return {
      ok: false,
      skill: "geo-visibility-monitor",
      path: "hand-coded",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
