import { loadEmpireState } from "@/lib/admin-state";
import { AdminNav, ADMIN_CSS, PageHint } from "../layout-bits";
import { ApprovalsQueue, type TenantOption } from "./approvals-queue";
import { collectAllApprovals, type ApprovalItem } from "@/lib/admin-approvals";
import { StatusBanner } from "@/components/ui";
import { SlideInBanner } from "@/components/motion/slide-in-banner";

/**
 * Sign-off-style kinds — the picker cards the bulk-signoff surface chews
 * through in one pass. When ≥5 of these are waiting, the inbox shows a
 * callout pointing at /admin/bulk-signoff so Jack doesn't scroll past
 * a queue he could clear in a single sweep.
 */
const SIGN_OFF_KINDS = new Set<string>([
  "headline-pick",
  "subject-line-pick",
  "cs-body-pick",
  "landing-headline-pick",
  "decision-pick",
]);
const BULK_SIGNOFF_THRESHOLD = 5;

/**
 * Kind-filter chip row (server-rendered).
 *
 * The approvals queue now mixes the original `inbox` cards with picker cards
 * pushed by the marketing/banana skills — subject-line picks (T10), headline
 * picks (T8), brand-hero picks (T17), OG-card picks (T18), and loophole-hero
 * picks (T16). When the queue grows, scanning for "just the headline picks"
 * or "just the OG cards" is faster than scrolling past the inbox items, so
 * we add a `?kind=<value>` chip filter above the list.
 *
 * Server-component-friendly: each chip is a plain `<a>` link, no client JS.
 * Counts are computed from the *unfiltered* queue so chips don't blank-out
 * when one is selected. `tenant` is preserved across kind navigation so the
 * kind filter composes with the existing tenant chip.
 */
const KIND_CHIPS: { label: string; value: string | null }[] = [
  { label: "All", value: null },
  { label: "Inbox", value: "inbox" },
  { label: "Subject Line", value: "subject-line-pick" },
  { label: "Headline", value: "headline-pick" },
  { label: "Brand Hero", value: "brand-hero-pick" },
  { label: "OG Card", value: "og-card-pick" },
  { label: "Loophole Hero", value: "loophole-hero-pick" },
];

function buildHref(kind: string | null, tenant: string | null): string {
  const sp = new URLSearchParams();
  if (kind) sp.set("kind", kind);
  if (tenant) sp.set("tenant", tenant);
  const qs = sp.toString();
  return qs ? `?${qs}` : "?";
}

function countByKind(items: ApprovalItem[], kind: string | null): number {
  if (kind == null) return items.length;
  return items.filter((i) => (i.kind as string) === kind).length;
}

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
  searchParams: Promise<{
    tenant?: string | string[];
    kind?: string | string[];
  }>;
}

export default async function InboxPage({ searchParams }: PageProps) {
  const state = await loadEmpireState();
  const allItems = await collectAllApprovals(state);

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

  // Resolve the kind filter from the URL. Only honor values from KIND_CHIPS
  // so a stray ?kind=foo doesn't blank the queue silently.
  const rawKind = Array.isArray(params.kind) ? params.kind[0] : params.kind;
  const activeKind: string | null = KIND_CHIPS.some((c) => c.value === rawKind)
    ? (rawKind as string)
    : null;

  // Apply kind filter to the items we hand to the queue, but compute chip
  // counts from the unfiltered set so each chip always shows its real total.
  const items: ApprovalItem[] = activeKind
    ? allItems.filter((i) => (i.kind as string) === activeKind)
    : allItems;

  const counts = {
    high: items.filter((i) => i.urgency === "high").length,
    todo: items.filter((i) => i.kind === "todo").length,
    social: items.filter((i) => i.kind === "social").length,
    skill: items.filter((i) => i.kind === "skill").length,
    expansion: items.filter((i) => i.kind === "expansion").length,
    opportunity: items.filter((i) => i.kind === "opportunity").length,
  };

  // Count sign-off-style items from the unfiltered queue so the bulk-review
  // callout stays accurate regardless of the active kind chip.
  const signOffCount = allItems.filter((i) =>
    SIGN_OFF_KINDS.has(i.kind as string),
  ).length;
  const showBulkBanner = signOffCount >= BULK_SIGNOFF_THRESHOLD;

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

      <nav
        aria-label="Filter by kind"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginTop: 24,
          paddingBottom: 16,
          borderBottom: "1px solid var(--border)",
        }}
      >
        {KIND_CHIPS.map((chip) => {
          const isActive =
            chip.value === activeKind || (chip.value === null && activeKind === null);
          const count = countByKind(allItems, chip.value);
          return (
            <a
              key={chip.label}
              href={buildHref(chip.value, initialTenant === "unassigned" ? null : initialTenant)}
              aria-current={isActive ? "page" : undefined}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 11px",
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 1.2,
                borderRadius: "var(--r-sm)",
                border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                background: isActive ? "var(--accent-soft)" : "var(--surface)",
                color: isActive ? "var(--accent-text)" : "var(--text-2)",
              }}
            >
              <span>{chip.label}</span>
              <span
                style={{
                  fontVariantNumeric: "tabular-nums",
                  color: isActive ? "var(--accent-text)" : "var(--muted)",
                  fontWeight: 500,
                }}
              >
                ({count})
              </span>
            </a>
          );
        })}
      </nav>

      {showBulkBanner ? (
        <SlideInBanner>
          <div style={{ marginTop: 20 }}>
            <StatusBanner
              tone="warn"
              headline={
                <a
                  href="/admin/bulk-signoff"
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  {signOffCount} items waiting — bulk review →
                </a>
              }
              detail="Headline, subject-line, CS body, landing-headline, and decision picks clear faster from one surface."
            />
          </div>
        </SlideInBanner>
      ) : null}

      <div style={{ marginTop: 24 }}>
        <ApprovalsQueue items={items} tenants={tenants} initialTenant={initialTenant} />
      </div>
    </div>
  );
}
