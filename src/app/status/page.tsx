import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { loadEmpireSnapshot, describeAction, relativeAge } from "@/lib/empire-snapshot";

export const metadata = {
  title: "Day14 status — the empire, live.",
  description:
    "Live dashboard pulled from the same OS that powers six businesses we run.",
  openGraph: {
    title: "Day14 status — the empire, live.",
    description:
      "Live dashboard pulled from the same OS that powers six businesses we run.",
  },
};

export const dynamic = "force-dynamic";

type TenantStatus = "live" | "paused" | "parked";

/**
 * Brand-color + status metadata for the six tenants on the OS. Colors and
 * status pills aren't carried in empire-state.json, so they live here keyed
 * by slug (the set of brands is stable). Stripe colors follow the
 * brand-animator skill's tenant color references; status reflects which
 * brands are in active product work vs. parked.
 */
const TENANTS: Array<{
  slug: string;
  name: string;
  vertical: string;
  color: string;
  status: TenantStatus;
}> = [
  { slug: "day14", name: "Day14", vertical: "Build studio", color: "#ef6c33", status: "live" },
  { slug: "alignmd", name: "AlignMD", vertical: "Healthcare SaaS", color: "#3b82f6", status: "live" },
  { slug: "day14-realty", name: "Day14 Realty", vertical: "Real estate", color: "#14805a", status: "live" },
  { slug: "life-loophole", name: "Life Loophole", vertical: "Tax SaaS", color: "#ca8a04", status: "paused" },
  { slug: "hot-flash-co", name: "Hot Flash Co", vertical: "POD store", color: "#f472b6", status: "parked" },
  { slug: "kennum-lawn-care", name: "Kennum Lawn Care", vertical: "Lawn care", color: "#65a30d", status: "parked" },
];

const STATUS_PILL: Record<TenantStatus, string> = {
  live: "bg-shipped-400/15 text-shipped-600 ring-1 ring-inset ring-shipped-400/30",
  paused: "bg-amber-400/15 text-amber-600 ring-1 ring-inset ring-amber-400/30",
  parked: "bg-ink-100 text-ink-400 ring-1 ring-inset ring-ink-200/60",
};

/** Whole autonomous agent-hours logged today, derived from the snapshot:
 * healthy agents × hours elapsed since the start of the snapshot's UTC day. */
function operatorHoursToday(healthy: number, generatedAt: string): number {
  const gen = generatedAt ? new Date(generatedAt) : new Date();
  const t = Number.isNaN(gen.getTime()) ? Date.now() : gen.getTime();
  const d = new Date(t);
  const startOfDay = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const hoursElapsed = Math.max(0, (t - startOfDay) / 3_600_000);
  return Math.round(healthy * hoursElapsed);
}

export default async function StatusPage() {
  const snap = await loadEmpireSnapshot();
  const recent = snap.recent.slice(0, 10);
  const lastDeploy = relativeAge(snap.generated_at) || "—";
  const operatorHours = operatorHoursToday(snap.agent_count_healthy, snap.generated_at);

  const stats = [
    { label: "Tenants", value: snap.tenant_count.toLocaleString(), sub: "businesses on the OS" },
    { label: "Agents fired today", value: snap.runs_24h.toLocaleString(), sub: "agent runs, last 24h" },
    { label: "Last deploy", value: lastDeploy, sub: "OS snapshot synced" },
    { label: "Operator hours today", value: operatorHours.toLocaleString(), sub: "autonomous agent-hours" },
  ];

  return (
    <>
      <SiteHeader />
      <main className="container-page py-20 sm:py-28">
        {/* 1 — Header */}
        <section className="mb-16 max-w-3xl">
          <span className="eyebrow eyebrow-rule mb-4 font-mono">
            ~/status · updated every 15 minutes
          </span>
          <h1 className="mb-5 flex flex-wrap items-center gap-4">
            <span>The empire, live.</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-shipped-400/15 px-3 py-1 text-sm font-semibold text-shipped-600 ring-1 ring-inset ring-shipped-400/30">
              <span className="relative inline-block h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-shipped-500" />
                <span className="absolute -inset-1 animate-ping rounded-full bg-shipped-400/40" />
              </span>
              online
            </span>
          </h1>
          <p className="text-lg leading-relaxed text-ink-500 sm:text-xl">
            Real receipts from the Day14 OS — the same stack that runs six
            businesses. No screenshots, no mockups. This is the live state.
          </p>
        </section>

        {/* 2 — Stats grid */}
        <section className="mb-20" aria-label="Empire stats">
          <div className="grid grid-cols-2 gap-px overflow-hidden border border-ink-100 bg-ink-100 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-paper-50 p-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
                  {s.label}
                </div>
                <div className="mt-3 text-4xl font-extrabold tracking-tightest text-ink tnum">
                  {s.value}
                </div>
                <div className="mt-1 text-sm text-ink-500">{s.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 3 — Live activity feed */}
        <section className="mb-20" aria-label="Live activity feed">
          <div className="mb-6 max-w-2xl">
            <span className="eyebrow mb-3">Live activity</span>
            <h2 className="mb-2">The last ten things the OS did.</h2>
            <p className="text-base leading-relaxed text-ink-500">
              Straight off the empire battle log — agents running customer ops
              across every tenant.
            </p>
          </div>
          {recent.length > 0 ? (
            <div className="overflow-hidden border border-ink-100 bg-ink text-paper">
              <ul className="divide-y divide-ink-700">
                {recent.map((e, i) => (
                  <li
                    key={`${e.ts}-${i}`}
                    className="grid grid-cols-[72px_1fr] items-baseline gap-3 px-4 py-3 font-mono text-xs sm:grid-cols-[90px_150px_1fr] sm:gap-4 sm:px-6"
                  >
                    <span className="text-paper-300/70">{relativeAge(e.ts)}</span>
                    <span className="text-ember-300">{e.actor}</span>
                    <span className="col-span-2 text-paper-200/85 sm:col-span-1">
                      {describeAction(e)}
                      <span className="text-paper-300/60"> · {e.tenant}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="border border-ink-100 bg-paper-50 p-6 font-mono text-sm text-ink-400">
              No recent activity in the log.
            </div>
          )}
        </section>

        {/* 4 — Tenant grid */}
        <section className="mb-20" aria-label="Tenants">
          <div className="mb-6 max-w-2xl">
            <span className="eyebrow mb-3">The tenants</span>
            <h2 className="mb-2">Six brands, one OS.</h2>
            <p className="text-base leading-relaxed text-ink-500">
              Every business below runs on the same agent stack.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TENANTS.map((t) => (
              <div
                key={t.slug}
                className="group relative overflow-hidden border border-ink-100 bg-paper-50"
              >
                <span
                  className="block h-1 w-full"
                  style={{ backgroundColor: t.color }}
                  aria-hidden="true"
                />
                <div className="flex items-start justify-between gap-3 p-5">
                  <div>
                    <h3 className="text-base font-bold leading-snug tracking-tighter text-ink">
                      {t.name}
                    </h3>
                    <p className="mt-0.5 text-sm text-ink-500">{t.vertical}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${STATUS_PILL[t.status]}`}
                  >
                    {t.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5 — Trust line */}
        <section className="border-t border-ink-100 pt-12">
          <p className="max-w-2xl text-base leading-relaxed text-ink-500">
            Pulled from the same OS that powers six brands.{" "}
            <span className="text-ink">Refreshed every 15 minutes.</span>
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
