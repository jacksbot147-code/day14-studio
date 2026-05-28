"use client";

/**
 * approvals-queue.tsx — the interactive client side of /admin/inbox.
 *
 * The page server-collects every pending thing that needs Jack — open operator
 * to-dos, queued social posts, skill drafts, expansion requests, opportunity
 * pitches — from every source. This component renders them in one list,
 * grouped by urgency, each with Approve / Skip actions wired to
 * POST /api/admin/approvals.
 *
 * The on-screen queue is the source of truth: actions write straight to the
 * underlying state files using the same conventions the Telegram flow uses, so
 * the queue works whether or not the Telegram bridge is up. On the hosted
 * (view-only) copy the API returns 503 and the row shows the Telegram command
 * to run instead — nothing is silently lost.
 *
 * Tenant filter chips at the top let Jack slice the queue to one business at
 * a time. Filtering is purely client-side over the already-loaded items, so
 * switching chips is instant. The active chip is reflected in the `?tenant=`
 * query param so the filtered view is shareable / linkable from per-tenant
 * Mission Control pages.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EmptyState } from "@/components/ui";
import type { ApprovalItem, ApprovalKind } from "@/lib/admin-approvals";

// Re-export the shared types so existing imports from this module keep
// working (the inbox page used to own these definitions locally).
export type { ApprovalItem, ApprovalKind };

export interface TenantOption {
  slug: string;
  displayName: string;
}

/** Sentinel chip value for items with no tenant scope (empire-level). */
const UNASSIGNED = "unassigned";

type FilterValue = "all" | "unassigned" | string;

type RowState =
  | { phase: "idle" }
  | { phase: "working" }
  | { phase: "done"; message: string }
  | { phase: "error"; message: string };

function ageLabel(min: number): string {
  if (min <= 0) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function ApprovalRow({ item }: { item: ApprovalItem }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [state, setState] = useState<RowState>({ phase: "idle" });

  async function act(action: "approve" | "skip") {
    if (state.phase === "working" || state.phase === "done") return;
    setState({ phase: "working" });
    let res: Response;
    try {
      res = await fetch("/api/admin/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: item.kind, id: item.id, action }),
      });
    } catch {
      setState({
        phase: "error",
        message: item.telegramHint
          ? `Could not reach the local admin. In Telegram: ${item.telegramHint}`
          : "Could not reach the local admin.",
      });
      return;
    }
    if (res.status === 503) {
      setState({
        phase: "error",
        message: item.telegramHint
          ? `This is the view-only hosted dashboard. In Telegram: ${item.telegramHint}`
          : "This is the view-only hosted dashboard — use the local admin.",
      });
      return;
    }
    let data: { ok?: boolean; message?: string; error?: string } = {};
    try {
      data = await res.json();
    } catch {
      /* unparseable */
    }
    if (data.ok) {
      setState({ phase: "done", message: data.message || "Done." });
      // Let the success state read, then re-collect the queue from disk.
      setTimeout(() => router.refresh(), 1100);
    } else {
      setState({
        phase: "error",
        message: data.message || data.error || "Could not complete that action.",
      });
    }
  }

  const busy = state.phase === "working";
  const resolved = state.phase === "done";

  return (
    <motion.div
      layout
      className="opp-card"
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: resolved ? 0.6 : 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
      transition={{ duration: reduce ? 0 : 0.22, ease: [0.2, 0.65, 0.3, 1] }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span className={`pill ${item.urgency === "high" ? "pri-high" : ""}`}>
              {item.typeLabel}
            </span>
            <span className="pill">{item.business}</span>
            <span className="pill">{ageLabel(item.ageMin)}</span>
          </div>
          <h3 style={{ fontSize: 15, marginBottom: 4 }}>{item.title}</h3>
          <div style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.5 }}>
            {item.reason}
          </div>
          {item.preview ? (
            <div
              style={{
                fontSize: 12,
                color: "var(--muted)",
                lineHeight: 1.5,
                whiteSpace: "pre-line",
                maxHeight: 66,
                overflow: "hidden",
                marginTop: 6,
              }}
            >
              {item.preview}
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0, width: 130 }}>
          {resolved ? (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--green)",
                textAlign: "right",
              }}
            >
              {state.message}
            </span>
          ) : (
            <>
              <button
                type="button"
                className="add-county-btn"
                style={{ justifyContent: "center", width: "100%" }}
                onClick={() => act("approve")}
                disabled={busy}
              >
                {busy ? "Working…" : item.approveLabel}
              </button>
              <button
                type="button"
                className="todo-done-btn"
                style={{ textAlign: "center", width: "100%" }}
                onClick={() => act("skip")}
                disabled={busy}
              >
                {item.skipLabel}
              </button>
            </>
          )}
        </div>
      </div>
      {state.phase === "error" ? (
        <div style={{ fontSize: 12, color: "var(--amber)", marginTop: 10, lineHeight: 1.5 }}>
          {state.message}
        </div>
      ) : null}
    </motion.div>
  );
}

const GROUPS: Array<{ urgency: ApprovalItem["urgency"]; label: string }> = [
  { urgency: "high", label: "Needs you now" },
  { urgency: "normal", label: "Waiting on sign-off" },
  { urgency: "low", label: "When you have a minute" },
];

interface ApprovalsQueueProps {
  items: ApprovalItem[];
  /** Tenant chips to render (in addition to All + Unassigned). */
  tenants?: TenantOption[];
  /**
   * Initial tenant filter: a tenant slug, the sentinel "unassigned", or
   * null for "All". Sourced from the `?tenant=` query param server-side.
   */
  initialTenant?: string | null;
}

export function ApprovalsQueue({
  items,
  tenants = [],
  initialTenant = null,
}: ApprovalsQueueProps) {
  // Resolve the initial filter value, defaulting to "all" when no tenant
  // was supplied. The chip row is always visible so the chosen filter can
  // be toggled even when the empty-state fills the rest of the panel.
  const initial: FilterValue =
    initialTenant === UNASSIGNED
      ? UNASSIGNED
      : initialTenant && tenants.some((t) => t.slug === initialTenant)
        ? initialTenant
        : "all";

  const [filter, setFilter] = useState<FilterValue>(initial);

  // Keep the URL in sync with the active chip so the filtered view is
  // shareable and survives a browser refresh. `replaceState` avoids
  // pushing history entries on every chip click.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (filter === "all") url.searchParams.delete("tenant");
    else url.searchParams.set("tenant", filter);
    const next = `${url.pathname}${url.search}${url.hash}`;
    if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(null, "", next);
    }
  }, [filter]);

  // Counts per chip — drives the badge on each chip and updates as the
  // server re-collects after an approve/skip.
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length, [UNASSIGNED]: 0 };
    for (const t of tenants) c[t.slug] = 0;
    for (const item of items) {
      if (item.tenant === null) c[UNASSIGNED] = (c[UNASSIGNED] ?? 0) + 1;
      else c[item.tenant] = (c[item.tenant] ?? 0) + 1;
    }
    return c;
  }, [items, tenants]);

  // The chip row — order: All, one per tenant, then Unassigned.
  const chips: Array<{ value: FilterValue; label: string }> = [
    { value: "all", label: "All" },
    ...tenants.map((t) => ({ value: t.slug as FilterValue, label: t.displayName })),
    { value: UNASSIGNED, label: "Unassigned" },
  ];

  // Slice the already-loaded items by the active filter. Empire-level
  // items (no tenant) only show under "All" or "Unassigned".
  const filtered = useMemo(() => {
    if (filter === "all") return items;
    if (filter === UNASSIGNED) return items.filter((i) => i.tenant === null);
    return items.filter((i) => i.tenant === filter);
  }, [items, filter]);

  const activeChipLabel =
    filter === "all"
      ? null
      : filter === UNASSIGNED
        ? "empire-level items"
        : (tenants.find((t) => t.slug === filter)?.displayName ?? filter);

  const chipRow = (
    <div
      role="tablist"
      aria-label="Filter approvals by tenant"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 18,
      }}
    >
      {chips.map((chip) => {
        const active = filter === chip.value;
        const count = counts[chip.value] ?? 0;
        return (
          <button
            key={chip.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={`filter-chip${active ? " active" : ""}`}
            onClick={() => setFilter(chip.value)}
          >
            {chip.label}
            <span
              style={{
                marginLeft: 6,
                opacity: 0.75,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );

  // Empty states — three flavours:
  //   1. Empire-wide empty   ("All" filter, no items at all)
  //   2. Per-tenant empty    (chip selected, nothing for that tenant)
  //   3. Unassigned empty    (chip selected, no empire-level items)
  if (items.length === 0) {
    return (
      <div>
        {chipRow}
        <EmptyState
          icon="✅"
          headline="Approvals zero — nothing waiting on you."
          hint={
            <>
              Every queued post, skill draft, expansion request, pitched opportunity
              and operator to-do is signed off. New work shows up here the moment an
              agent queues it.
            </>
          }
        />
      </div>
    );
  }

  if (filtered.length === 0) {
    const headline =
      filter === UNASSIGNED
        ? "No empire-level items waiting — nice."
        : `No approvals waiting for ${activeChipLabel} — nice.`;
    return (
      <div>
        {chipRow}
        <EmptyState
          icon="✅"
          headline={headline}
          hint={
            <>
              Switch back to <b>All</b> above to see the rest of the queue,
              or pick another tenant.
            </>
          }
        />
      </div>
    );
  }

  return (
    <div>
      {chipRow}
      {GROUPS.map((group) => {
        const groupItems = filtered.filter((i) => i.urgency === group.urgency);
        if (groupItems.length === 0) return null;
        return (
          <div key={group.urgency}>
            <div className="section-header">
              <div className="section-title">
                {group.label} ({groupItems.length})
              </div>
            </div>
            <AnimatePresence initial={false} mode="popLayout">
              {groupItems.map((item) => (
                <ApprovalRow key={item.key} item={item} />
              ))}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
