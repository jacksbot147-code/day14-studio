/**
 * /dashboard/capture — internal Capture ops surface.
 *
 * The fourth service line, rendered for the operator: live client status
 * (empty until client #0), the offer ladder from pricing.ts, the hard
 * compliance gate, and the monthly delivery loop the capture-monitor skill
 * runs. Self-contained on purpose — no capture-content.ts dependency yet.
 *
 * Dashboard skin (zinc-950), same pattern as /dashboard/geo.
 *
 * HARD RAILS: prices only from CAPTURE_TIERS/CAPTURE_FOUNDING. Nothing on
 * this page sends, routes, or charges anything — it is a read-only view.
 */

import Link from "next/link";
import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { CAPTURE_TIERS, CAPTURE_FOUNDING } from "@/lib/pricing";

export const dynamic = "force-dynamic";

interface ClientCaptureRow {
  slug: string;
  jobsBooked: number | null;
  revenueAttributed: number | null;
  lastReport: string | null;
}

/** Read the latest monthly Capture summary per client, if any exist.
 *  Read-only view of the dossier tree — the skill owns all writes.
 *  Mirrors the GEO 07-geo/ contract with an 08-capture/ folder. */
async function readClientCapture(): Promise<ClientCaptureRow[]> {
  const customers = path.join(
    homedir(),
    "Documents/businesses/_shared/customers"
  );
  if (!existsSync(customers)) return [];
  const rows: ClientCaptureRow[] = [];
  for (const slug of await fs.readdir(customers).catch(() => [] as string[])) {
    const dir = path.join(customers, slug, "08-capture");
    const summary = path.join(dir, "summary.json");
    if (!existsSync(summary)) continue;
    let jobsBooked: number | null = null;
    let revenueAttributed: number | null = null;
    let lastReport: string | null = null;
    try {
      const parsed = JSON.parse(await fs.readFile(summary, "utf8")) as {
        jobsBooked?: number;
        revenueAttributed?: number;
        lastReport?: string;
      };
      jobsBooked =
        typeof parsed.jobsBooked === "number" ? parsed.jobsBooked : null;
      revenueAttributed =
        typeof parsed.revenueAttributed === "number"
          ? parsed.revenueAttributed
          : null;
      lastReport =
        typeof parsed.lastReport === "string" ? parsed.lastReport : null;
    } catch {
      // unreadable summary → show as unreported
    }
    rows.push({ slug, jobsBooked, revenueAttributed, lastReport });
  }
  rows.sort((a, b) => (b.jobsBooked ?? -1) - (a.jobsBooked ?? -1));
  return rows;
}

const COMPLIANCE_GATE = [
  "A2P 10DLC approved before any SMS — workflows stay paused until approval lands.",
  "Recording-disclosure config ON in every greeting (Florida two-party). No config = recording off = do not route.",
  "The assistant identifies as automated in the first exchange of every call.",
  "8/8 per-client call test + 12/12 on the demo line before a number routes live.",
  'Positioning stays "catches what you’re missing" — never "never miss a call."',
];

const DELIVERY_LOOP = [
  {
    phase: "Monitor",
    detail:
      "Pull call/booking metrics + sample transcripts (every urgent-flagged + 10 random). Score against the 10-point rubric.",
  },
  {
    phase: "Tune",
    detail:
      "Any transcript <8 or a repeated failure opens a tuning task. Config changes are reversible and, on live clients, tap-gated.",
  },
  {
    phase: "Report",
    detail:
      "Fill the one-page report from data only — a number with no source doesn’t ship. Jobs booked + revenue attributed to source.",
  },
  {
    phase: "Sync",
    detail:
      "Write the vault report note (jobs_booked, revenue_attributed, rubric, hours) and update client health. Send is a Jack tap.",
  },
];

export default async function CaptureOpsPage() {
  const clients = await readClientCapture();
  const foundingTier = CAPTURE_TIERS.find(
    (t) => t.slug === CAPTURE_FOUNDING.appliesTo
  );

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10">
      <header className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Capture ops
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            AI lead-capture / receptionist · monthly loop by{" "}
            <span className="font-mono">capture-monitor</span> · attribution =
            booked jobs by source
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
        {/* Client status — live from the dossier tree. */}
        <Card title={`Client capture status (${clients.length})`}>
          {clients.length === 0 ? (
            <div className="text-sm text-zinc-400 space-y-2">
              <p>
                No Capture clients yet. Founding slots open:{" "}
                <span className="text-emerald-300 font-mono">3 of 3</span> —{" "}
                {foundingTier?.name ?? "Essentials"} at {CAPTURE_FOUNDING.label}.
              </p>
              <p className="text-xs text-zinc-500">
                A client appears here once{" "}
                <span className="font-mono">
                  customers/&#123;slug&#125;/08-capture/summary.json
                </span>{" "}
                has a monthly summary.
              </p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {clients.map((c) => (
                <li key={c.slug} className="text-sm flex items-center gap-2">
                  <span className="font-mono text-zinc-300">{c.slug}</span>
                  <span className="ml-auto font-mono">
                    {c.jobsBooked === null ? (
                      <span className="text-zinc-500">unreported</span>
                    ) : (
                      <>
                        {c.jobsBooked} booked
                        {c.revenueAttributed !== null && (
                          <span className="text-emerald-400">
                            {" "}
                            (${c.revenueAttributed.toLocaleString("en-US")})
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

        {/* Offer ladder — numbers from pricing.ts only. */}
        <Card title="Offer ladder">
          <ul className="space-y-3 text-sm">
            {CAPTURE_TIERS.map((t) => (
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
                  {CAPTURE_FOUNDING.label}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                {CAPTURE_FOUNDING.terms}
              </p>
            </li>
          </ul>
          <p className="text-xs text-zinc-600 mt-3">
            Stripe payment links not wired yet — env vars reserved in
            pricing.ts; CTAs route to /book until Jack creates them.
          </p>
        </Card>

        {/* Compliance gate — the hard rails. */}
        <Card title="Compliance gate (hard)">
          <ul className="space-y-2 text-sm text-zinc-300">
            {COMPLIANCE_GATE.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="text-amber-500/80">⚠</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-zinc-600 mt-3">
            No client number routes live until its row is green on all five.
          </p>
        </Card>

        {/* Monthly delivery loop — what capture-monitor runs. */}
        <Card title="Monthly delivery loop">
          <div className="space-y-4">
            {DELIVERY_LOOP.map((step, i) => (
              <div key={step.phase}>
                <h4 className="text-sm text-zinc-200 font-medium">
                  {i + 1}. {step.phase}
                </h4>
                <p className="text-sm text-zinc-400 mt-1">{step.detail}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-400/90 mt-3">
            ⚠ Sends and live-config changes are Jack taps — the loop drafts and
            queues, never sends.
          </p>
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
