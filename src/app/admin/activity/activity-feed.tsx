"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui";

/**
 * One activity event, already shaped for display by the server component.
 * `summary` is a pre-built plain-English line; the raw fields stay untrusted
 * data and are only ever rendered as text, never executed.
 */
export interface ActivityEvent {
  /** ISO timestamp of the event. */
  ts: string;
  /** Tenant slug ("" when the log entry had none). */
  tenant: string;
  /** Display name for the tenant (falls back to the slug). */
  tenantLabel: string;
  /** Which agent / actor did it. */
  actor: string;
  /** Plain-English description of what happened. */
  summary: string;
}

type Window = "today" | "7d" | "all";

const WINDOWS: Array<{ id: Window; label: string }> = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "all", label: "All time" },
];

/** Start-of-today, local time, as an epoch ms value. */
function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function rel(iso: string): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const ms = Date.now() - t;
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

/** Human day header — "Today", "Yesterday", or a written date. */
function dayLabel(key: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(`${key}T00:00:00`);
  const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return day.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: today.getFullYear() === day.getFullYear() ? undefined : "numeric",
  });
}

/** Local YYYY-MM-DD key for grouping (avoids UTC date drift). */
function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface Props {
  events: ActivityEvent[];
  /** Distinct tenants present, as { slug, label } — for the filter chips. */
  tenants: Array<{ slug: string; label: string }>;
}

/**
 * Client-side activity timeline. The server component hands over the full,
 * newest-first event list; filtering by business and time window happens
 * here in the browser so the page never re-fetches.
 */
export function ActivityFeed({ events, tenants }: Props) {
  const [tenant, setTenant] = useState<string>("all");
  const [win, setWin] = useState<Window>("7d");

  const filtered = useMemo(() => {
    const cutoff =
      win === "today"
        ? startOfToday()
        : win === "7d"
          ? Date.now() - 7 * 86_400_000
          : 0;
    return events.filter((e) => {
      if (tenant !== "all" && e.tenant !== tenant) return false;
      if (cutoff > 0) {
        const t = new Date(e.ts).getTime();
        if (Number.isNaN(t) || t < cutoff) return false;
      }
      return true;
    });
  }, [events, tenant, win]);

  // Group the filtered events by local day, preserving newest-first order.
  const groups = useMemo(() => {
    const map = new Map<string, ActivityEvent[]>();
    for (const e of filtered) {
      const key = dayKey(e.ts);
      const bucket = map.get(key);
      if (bucket) bucket.push(e);
      else map.set(key, [e]);
    }
    return [...map.entries()];
  }, [filtered]);

  const businessCount = new Set(
    filtered.map((e) => e.tenant).filter((s) => s !== "")
  ).size;

  return (
    <div>
      <div className="toolbar">
        <div className="filter-group" aria-label="Filter by business">
          <button
            type="button"
            className={`filter-chip ${tenant === "all" ? "active" : ""}`}
            onClick={() => setTenant("all")}
          >
            All businesses
          </button>
          {tenants.map((t) => (
            <button
              key={t.slug}
              type="button"
              className={`filter-chip ${tenant === t.slug ? "active" : ""}`}
              onClick={() => setTenant(t.slug)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="filter-group" aria-label="Filter by time window">
          {WINDOWS.map((w) => (
            <button
              key={w.id}
              type="button"
              className={`filter-chip ${win === w.id ? "active" : ""}`}
              onClick={() => setWin(w.id)}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <p className="toolbar-count">
        {filtered.length} {filtered.length === 1 ? "event" : "events"} across{" "}
        {businessCount} {businessCount === 1 ? "business" : "businesses"}
        {tenant !== "all" || win !== "all" ? " (filtered)" : ""}
      </p>

      {groups.length === 0 ? (
        <EmptyState
          icon="🔭"
          headline="No activity in this window."
          hint={
            <>
              Try widening the time range or picking a different business —
              filters cut on tenant + recency, so a quiet hour doesn&apos;t mean a
              quiet day. Live runs appear here without a refresh.
            </>
          }
        />
      ) : (
        <div className="act-timeline">
          {groups.map(([key, items]) => (
            <div key={key} className="act-day">
              <div className="act-day-head">
                <span className="act-day-label">{dayLabel(key)}</span>
                <span className="act-day-count">
                  {items.length} {items.length === 1 ? "event" : "events"}
                </span>
              </div>
              <div className="section act-day-body">
                {items.map((e, i) => (
                  <div key={`${e.ts}-${i}`} className="feed-row">
                    <div className="feed-time">{rel(e.ts)}</div>
                    <div className="feed-actor">{e.tenantLabel}</div>
                    <div className="feed-text">
                      <b>{e.actor}</b> {e.summary}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
