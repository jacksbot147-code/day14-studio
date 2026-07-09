/**
 * /dashboard/geo — internal GEO ops surface.
 *
 * The operator kit, rendered: prompt pack, scoring rubric, delivery SOP,
 * founding-client follow-up drafts. Content is canonical in
 * src/lib/geo-content.ts; scores come from the geo-visibility-monitor
 * skill writing to customers/{slug}/07-geo/ in the shared dossier tree.
 *
 * Dashboard skin (zinc-950), same pattern as /dashboard/graph.
 *
 * HARD RAIL (CLAUDE.md rule 4): the follow-up sequence below is draft
 * copy for Jack to send BY HAND. Nothing on this page sends anything.
 */

import Link from "next/link";
import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { GEO_TIERS, GEO_FOUNDING } from "@/lib/pricing";
import {
  GEO_PROMPT_PACK,
  GEO_PROMPT_COUNT,
  GEO_SOP,
  GEO_FOLLOWUP_SEQUENCE,
  GEO_RUBRIC,
} from "@/lib/geo-content";

export const dynamic = "force-dynamic";

interface ClientScoreRow {
  slug: string;
  score: number | null;
  delta: number | null;
  lastRun: string | null;
}

/** Read the latest score-history entry per client with GEO runs recorded.
 *  Read-only view of the dossier tree — the skill owns all writes. */
async function readClientScores(): Promise<ClientScoreRow[]> {
  const customers = path.join(
    homedir(),
    "Documents/businesses/_shared/customers"
  );
  if (!existsSync(customers)) return [];
  const rows: ClientScoreRow[] = [];
  for (const slug of await fs.readdir(customers).catch(() => [] as string[])) {
    const geo = path.join(customers, slug, "07-geo");
    if (!existsSync(path.join(geo, "prompt-runs.jsonl"))) continue;
    let score: number | null = null;
    let delta: number | null = null;
    let lastRun: string | null = null;
    const historyFile = path.join(geo, "score-history.jsonl");
    if (existsSync(historyFile)) {
      const lines = (await fs.readFile(historyFile, "utf8"))
        .split("\n")
        .filter(Boolean);
      const last = lines[lines.length - 1];
      if (last) {
        try {
          const parsed = JSON.parse(last) as {
            score?: number;
            delta?: number | null;
            timestamp?: string;
          };
          score = typeof parsed.score === "number" ? parsed.score : null;
          delta = typeof parsed.delta === "number" ? parsed.delta : null;
          lastRun = typeof parsed.timestamp === "string" ? parsed.timestamp : null;
        } catch {
          // unreadable entry → show as unscored
        }
      }
    }
    rows.push({ slug, score, delta, lastRun });
  }
  rows.sort((a, b) => (a.score ?? -1) - (b.score ?? -1));
  return rows;
}

export default async function GeoOpsPage() {
  const clients = await readClientScores();
  const foundingTier = GEO_TIERS.find((t) => t.slug === GEO_FOUNDING.appliesTo);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10">
      <header className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            GEO ops
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            AI-answer visibility service line · {GEO_PROMPT_COUNT}-prompt pack ·
            scored /20 by <span className="font-mono">geo-visibility-monitor</span>
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          ← back to dashboard
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client scores — live from the dossier tree. */}
        <Card title={`Client visibility scores (${clients.length})`}>
          {clients.length === 0 ? (
            <div className="text-sm text-zinc-400 space-y-2">
              <p>
                No GEO clients yet. Founding slots open:{" "}
                <span className="text-emerald-300 font-mono">3 of 3</span> —{" "}
                {foundingTier?.name ?? "Essentials"} at {GEO_FOUNDING.label}.
              </p>
              <p className="text-xs text-zinc-500">
                A client appears here once{" "}
                <span className="font-mono">
                  customers/&#123;slug&#125;/07-geo/prompt-runs.jsonl
                </span>{" "}
                has recorded runs.
              </p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {clients.map((c) => (
                <li key={c.slug} className="text-sm flex items-center gap-2">
                  <span className="font-mono text-zinc-300">{c.slug}</span>
                  <span className="ml-auto font-mono">
                    {c.score === null ? (
                      <span className="text-zinc-500">unmeasured</span>
                    ) : (
                      <>
                        {c.score}/20
                        {c.delta !== null && (
                          <span
                            className={
                              c.delta >= 0 ? "text-emerald-400" : "text-red-400"
                            }
                          >
                            {" "}
                            ({c.delta >= 0 ? "+" : ""}
                            {c.delta})
                          </span>
                        )}
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Scoring rubric */}
        <Card title="Scoring rubric (/20)">
          <ul className="space-y-2 text-sm text-zinc-300">
            {GEO_RUBRIC.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="text-zinc-600">—</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Offer summary — numbers from pricing.ts only. */}
        <Card title="Offer ladder">
          <ul className="space-y-3 text-sm">
            {GEO_TIERS.map((t) => (
              <li key={t.slug}>
                <div className="flex justify-between">
                  <span className="text-zinc-200 font-medium">{t.name}</span>
                  <span className="font-mono text-zinc-300">{t.priceLabel}</span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">{t.tagline}</p>
              </li>
            ))}
            <li className="pt-2 border-t border-zinc-800">
              <div className="flex justify-between">
                <span className="text-emerald-300 font-medium">
                  Founding rate (first 3)
                </span>
                <span className="font-mono text-emerald-300">
                  {GEO_FOUNDING.label}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">{GEO_FOUNDING.terms}</p>
            </li>
          </ul>
          <p className="text-xs text-zinc-600 mt-3">
            Stripe payment links not wired yet — env vars reserved in
            pricing.ts; CTAs route to /book until Jack creates them.
          </p>
        </Card>

        {/* Prompt pack */}
        <Card title={`Prompt pack (${GEO_PROMPT_COUNT})`}>
          <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
            {GEO_PROMPT_PACK.map((group) => (
              <div key={group.vertical}>
                <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-1.5">
                  {group.vertical}
                </h4>
                <ul className="space-y-1">
                  {group.prompts.map((p) => (
                    <li key={p} className="text-sm font-mono text-zinc-300">
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-600 mt-3">
            Localize {"{city}"}/{"{service}"} per client. Record every run to{" "}
            <span className="font-mono">07-geo/prompt-runs.jsonl</span> — agent
            code never queries the engines itself.
          </p>
        </Card>

        {/* Delivery SOP */}
        <Card title="Delivery SOP">
          <div className="space-y-4">
            {GEO_SOP.map((step, i) => (
              <div key={step.phase}>
                <h4 className="text-sm text-zinc-200 font-medium">
                  {i + 1}. {step.phase}
                  <span className="text-xs text-zinc-500 font-normal ml-2">
                    {step.timing}
                  </span>
                </h4>
                <ul className="mt-1 space-y-1">
                  {step.actions.map((a) => (
                    <li key={a} className="text-sm text-zinc-400 flex gap-2">
                      <span className="text-zinc-600">·</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>

        {/* Follow-up drafts — Jack-send-only. */}
        <Card title="Founding-client follow-up drafts">
          <p className="text-xs text-amber-400/90 mb-3">
            ⚠ Drafts only. Jack sends by hand — never automated (CLAUDE.md
            rule 4).
          </p>
          <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
            {GEO_FOLLOWUP_SEQUENCE.map((f) => (
              <div key={f.day}>
                <h4 className="text-sm text-zinc-200">
                  <span className="font-mono text-zinc-500">Day {f.day}</span> —{" "}
                  {f.subject}
                </h4>
                <p className="text-sm text-zinc-400 mt-1">{f.body}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-5">
      <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}
