/**
 * /dashboard/tenants — the multi-business index.
 *
 * Lists every tenant Jack runs. Each row links to a per-tenant
 * detail page. Shows aggregate MRR across all active tenants.
 *
 * "Tenant" here = any business Jack runs — Day14 itself, his
 * own e-commerce store, customer build shops, etc.
 */

import Link from "next/link";
import {
  getTenants,
  getActiveTenants,
  getTotalMonthlyRevenue,
  getTenantTypes,
} from "@/lib/tenants";

export const dynamic = "force-dynamic";

export default function TenantsPage() {
  const tenants = getTenants();
  const active = getActiveTenants();
  const totalMrr = getTotalMonthlyRevenue();
  const types = getTenantTypes();

  const byStatus = {
    active: tenants.filter((t) => t.status === "active"),
    paused: tenants.filter((t) => t.status === "paused"),
    archived: tenants.filter((t) => t.status === "archived"),
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10">
      <header className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Tenants</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {active.length} active · ${totalMrr.toLocaleString()}/mo aggregate MRR
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          ← back to dashboard
        </Link>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active" value={byStatus.active.length} />
        <StatCard label="Paused" value={byStatus.paused.length} />
        <StatCard label="Archived" value={byStatus.archived.length} />
        <StatCard label="Tenant types" value={Object.keys(types).length} sub="templates available" />
      </section>

      {byStatus.active.length > 0 && (
        <Section title="🟢 Active">
          <TenantTable tenants={byStatus.active} types={types} />
        </Section>
      )}

      {byStatus.paused.length > 0 && (
        <Section title="⏸ Paused">
          <TenantTable tenants={byStatus.paused} types={types} />
        </Section>
      )}

      {byStatus.archived.length > 0 && (
        <Section title="📦 Archived">
          <TenantTable tenants={byStatus.archived} types={types} />
        </Section>
      )}

      {tenants.length === 0 && (
        <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-8 text-center">
          <p className="text-zinc-400">No tenants yet. Add one via Telegram: <code className="text-emerald-400">/new-tenant</code></p>
        </div>
      )}

      <Section title="Tenant types (templates)">
        <p className="text-xs text-zinc-500 mb-3">
          Each type pre-configures intake fields + skill packs. Pick one when creating a new tenant.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {Object.entries(types).map(([key, type]) => (
            <div
              key={key}
              className="rounded bg-zinc-900 border border-zinc-800 p-3"
            >
              <div className="font-mono text-xs text-emerald-400">{key}</div>
              <div className="text-zinc-300 mt-1">{type.label}</div>
              <div className="text-xs text-zinc-500 mt-2">
                Skill packs: {type.default_skill_packs.join(", ")}
              </div>
            </div>
          ))}
        </div>
      </Section>
    </main>
  );
}

function TenantTable({
  tenants,
  types,
}: {
  tenants: ReturnType<typeof getTenants>;
  types: ReturnType<typeof getTenantTypes>;
}) {
  return (
    <div className="rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-zinc-950/50 text-xs text-zinc-500 uppercase tracking-wider">
          <tr>
            <th className="px-4 py-2 text-left">Slug</th>
            <th className="px-4 py-2 text-left">Name</th>
            <th className="px-4 py-2 text-left">Type</th>
            <th className="px-4 py-2 text-left">Domain</th>
            <th className="px-4 py-2 text-right">MRR</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((t) => {
            const typeLabel = types[t.type]?.label || t.type;
            return (
              <tr
                key={t.slug}
                className="border-t border-zinc-800 hover:bg-zinc-800/30"
              >
                <td className="px-4 py-2 font-mono text-emerald-400">
                  <Link href={`/dashboard/tenants/${t.slug}`}>{t.slug}</Link>
                </td>
                <td className="px-4 py-2 text-zinc-200">{t.name}</td>
                <td className="px-4 py-2 text-zinc-400 text-xs">{typeLabel}</td>
                <td className="px-4 py-2 text-zinc-500 text-xs">
                  {t.domain || "—"}
                </td>
                <td className="px-4 py-2 text-right font-mono text-zinc-300">
                  ${t.billing?.monthly_amount?.toLocaleString() ?? 0}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4">
      <div className="text-xs text-zinc-500 uppercase tracking-wider">{label}</div>
      <div className="text-3xl font-bold text-zinc-100 mt-1">{value}</div>
      {sub && <div className="text-xs text-zinc-500 mt-1">{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}
