import { loadEmpireState } from "@/lib/admin-state";
import { AdminNav, ADMIN_CSS, PageHint } from "../layout-bits";
import { ApprovalsQueue, type TenantOption } from "./approvals-queue";
import { collectAllApprovals } from "@/lib/admin-approvals";

export const metadata = {
  title: "Approvals — Day14 Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * /admin/inbox — the unified Approvals queue.
 *
 * Initiative A1: one approval surface. Everything that needs Jack — from every
 * source — is aggregated here so nothing is ever lost, even with the Telegram
 * bridge down. The on-screen queue is the source of truth; the Approve / Skip
 * actions (in approvals-queue.tsx) write straight to the underlying state files
 * via /api/admin/approvals, using the same conventions the Telegram flow uses.
 *
 * Aggregated sources (see `collectAllApprovals` in src/lib/admin-approvals.ts):
 *   - open operator to-dos    (empire-state.json human_todos)
 *   - queued social posts     (businesses/<t>/social-queue/<platform>/*.json)
 *   - skill drafts            (studio/docs/seeds/skills/_drafts/<name>)
 *   - expansion requests      (businesses/_shared/expansion-requests/*.json)
 *   - opportunity pitches     (empire-state.json opportunities, pitched + open)
 *
 * The `?tenant=<slug>` query param sets the initial tenant filter so links
 * from per-tenant Mission Control land directly on the filtered view.
 */

interface PageProps {
  searchParams: Promise<{ tenant?: string | string[] }>;
}

export default async function InboxPage({ searchParams }: PageProps) {
  const state = await loadEmpireState();
  const items = await collectAllApprovals(state);

  // The tenant chip row is built from the empire-state tenant list so it
  // stays stable across renders even when a tenant currently has zero items.
  const tenants: TenantOption[] = state.tenants.map((t) => ({
    slug: t.slug,
    displayName: t.display_name,
  }));

  // Resolve the initial filter from the URL: a known tenant slug, the
  // sentinel "unassigned", or null for "All".
  const params = await searchParams;
  const rawTenant = Array.isArray(params.tenant) ? params.tenant[0] : params.tenant;
  const knownSlug = tenants.some((t) => t.slug === rawTenant);
  const initialTenant: string | null =
    rawTenant === "unassigned"
      ? "unassigned"
      : knownSlug
        ? (rawTenant as string)
        : null;

  const counts = {
    high: items.filter((i) => i.urgency === "high").length,
    todo: items.filter((i) => i.kind === "todo").length,
    social: items.filter((i) => i.kind === "social").length,
    skill: items.filter((i) => i.kind === "skill").length,
    expansion: items.filter((i) => i.kind === "expansion").length,
    opportunity: items.filter((i) => i.kind === "opportunity").length,
  };

  return (
    <div className="admin-shell">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <AdminNav active="inbox" />
      <h1>Approvals queue</h1>
      <PageHint>
        Your single approvals queue — everything from every source that is
        waiting on a decision from you.
      </PageHint>
      <div className="sub">
        {items.length === 0
          ? "Every source checked — nothing is waiting on you. New work shows up the moment an agent queues it."
          : `${items.length} ${items.length === 1 ? "item needs" : "items need"} you, from every source — one surface, works whether or not Telegram is up.`}
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(6,1fr)" }}>
        <div className="kpi">
          <div className="kpi-label">Urgent</div>
          <div className="kpi-value">{counts.high}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">To-dos</div>
          <div className="kpi-value">{counts.todo}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Posts</div>
          <div className="kpi-value">{counts.social}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Skills</div>
          <div className="kpi-value">{counts.skill}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Requests</div>
          <div className="kpi-value">{counts.expansion}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Pitches</div>
          <div className="kpi-value">{counts.opportunity}</div>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <ApprovalsQueue items={items} tenants={tenants} initialTenant={initialTenant} />
      </div>
    </div>
  );
}
