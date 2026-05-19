/**
 * /dashboard/tenants/[slug] — single tenant detail.
 *
 * Reads tenant config, dossier files, work-register entries for that
 * tenant slug. Shows everything one business at a glance.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { getTenant, getTenantType } from "@/lib/tenants";

export const dynamic = "force-dynamic";

const HOME = homedir();
const SHARED = path.join(HOME, "Documents/businesses/_shared");

async function readSafe(p: string) {
  try {
    return await fs.readFile(p, "utf8");
  } catch {
    return null;
  }
}

async function loadTenantData(slug: string) {
  const dossierDir = path.join(SHARED, "customers", slug);
  const tenantDir = path.join(HOME, "Documents/businesses", slug);
  const businessDir = existsSync(dossierDir) ? dossierDir : tenantDir;

  // Load dossier files if present
  const intake = await readSafe(path.join(businessDir, "00-intake.md"));
  const brand = await readSafe(path.join(businessDir, "01-brand.json"));
  const status = await readSafe(path.join(businessDir, "02-status.md"));
  const refunds = await readSafe(path.join(businessDir, "03-refunds.md"));
  const launch = await readSafe(path.join(businessDir, "05-launch.md"));
  const feedback = await readSafe(path.join(businessDir, "06-feedback.md"));

  // Recent work-register entries for this slug
  const regPath = path.join(SHARED, "growth/work-register.jsonl");
  const recent: Array<{
    timestamp: string;
    action_phrase: string;
    invoked_skill?: string;
  }> = [];
  if (existsSync(regPath)) {
    const text = await fs.readFile(regPath, "utf8");
    for (const line of text.split("\n").reverse()) {
      if (!line.trim()) continue;
      try {
        const e = JSON.parse(line);
        if (e.customer_slug === slug || e.context === slug) {
          recent.push(e);
          if (recent.length >= 10) break;
        }
      } catch {
        // skip
      }
    }
  }

  return { businessDir, intake, brand, status, refunds, launch, feedback, recent };
}

interface PageProps {
  params: { slug: string };
}

export default async function TenantDetailPage({ params }: PageProps) {
  const tenant = getTenant(params.slug);
  if (!tenant) notFound();

  const type = getTenantType(tenant.type);
  const data = await loadTenantData(params.slug);

  const statusBadge = {
    active: { bg: "bg-emerald-500/20", text: "text-emerald-300", label: "active" },
    paused: { bg: "bg-yellow-500/20", text: "text-yellow-300", label: "paused" },
    archived: { bg: "bg-zinc-700/40", text: "text-zinc-400", label: "archived" },
  }[tenant.status];

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Link
            href="/dashboard/tenants"
            className="text-sm text-zinc-400 hover:text-zinc-200"
          >
            ← Tenants
          </Link>
          <span className={`px-2 py-0.5 rounded text-xs ${statusBadge.bg} ${statusBadge.text}`}>
            {statusBadge.label}
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{tenant.name}</h1>
        <div className="mt-2 text-sm text-zinc-400">
          <code className="font-mono">{tenant.slug}</code> · {type?.label || tenant.type}
          {tenant.domain && (
            <>
              {" · "}
              <a
                href={`https://${tenant.domain}`}
                target="_blank"
                rel="noopener"
                className="text-emerald-400 hover:text-emerald-300"
              >
                {tenant.domain}
              </a>
            </>
          )}
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="MRR" value={`$${tenant.billing?.monthly_amount?.toLocaleString() ?? 0}`} />
        <StatCard label="Tier" value={tenant.billing?.tier ?? "—"} />
        <StatCard label="Skill packs" value={tenant.enabled_skill_packs.length} sub={tenant.enabled_skill_packs.join(", ")} />
        <StatCard label="Recent actions" value={data.recent.length} sub="last 10 work-register entries" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Brand / config">
          {data.brand ? (
            <pre className="text-xs text-zinc-300 overflow-x-auto bg-zinc-950/50 p-3 rounded">
              {data.brand}
            </pre>
          ) : (
            <p className="text-zinc-500 text-sm">
              No <code>01-brand.json</code> yet for this tenant.
            </p>
          )}
        </Card>

        <Card title="Recent activity">
          {data.recent.length === 0 ? (
            <p className="text-zinc-500 text-sm">No recent work-register entries.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {data.recent.map((e, i) => (
                <li key={i} className="border-b border-zinc-800 pb-1.5 last:border-0">
                  <span className="text-zinc-500">
                    {new Date(e.timestamp).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                  {" — "}
                  <span className="font-mono text-zinc-300">
                    {e.invoked_skill || e.action_phrase.slice(0, 40)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {data.status && (
          <Card title="Status history" wide>
            <pre className="text-xs text-zinc-300 whitespace-pre-wrap overflow-x-auto">
              {data.status.slice(0, 4000)}
            </pre>
          </Card>
        )}

        {data.refunds && (
          <Card title="Refund history">
            <pre className="text-xs text-zinc-300 whitespace-pre-wrap overflow-x-auto">
              {data.refunds.slice(0, 2000)}
            </pre>
          </Card>
        )}

        {data.intake && (
          <Card title="Intake snapshot">
            <pre className="text-xs text-zinc-300 whitespace-pre-wrap overflow-x-auto">
              {data.intake.slice(0, 2000)}
            </pre>
          </Card>
        )}
      </div>

      {tenant.notes && (
        <div className="mt-6 rounded-lg bg-zinc-900 border border-zinc-800 p-4 text-sm text-zinc-300">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Notes</div>
          {tenant.notes}
        </div>
      )}

      <div className="mt-6 text-xs text-zinc-500">
        Dossier: <code>{data.businessDir}</code>
      </div>
    </main>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4">
      <div className="text-xs text-zinc-500 uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-bold text-zinc-100 mt-1">{value}</div>
      {sub && <div className="text-xs text-zinc-500 mt-1 truncate" title={sub}>{sub}</div>}
    </div>
  );
}

function Card({ title, children, wide }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`rounded-lg bg-zinc-900 border border-zinc-800 p-5 ${wide ? "lg:col-span-2" : ""}`}>
      <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  );
}
