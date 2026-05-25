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
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

export type ApprovalKind = "todo" | "social" | "skill" | "expansion" | "opportunity";

export interface ApprovalItem {
  /** Stable React key — unique across the whole queue. */
  key: string;
  /** Which write handler the API should run. */
  kind: ApprovalKind;
  /** The id the API resolves the item by. */
  id: string;
  /** Urgency bucket — drives grouping. */
  urgency: "high" | "normal" | "low";
  /** Short type label, e.g. "Operator to-do". */
  typeLabel: string;
  /** Which business this belongs to. */
  business: string;
  /** The headline. */
  title: string;
  /** Why it needs Jack. */
  reason: string;
  /** Optional longer preview text. */
  preview?: string;
  /** Minutes since the item appeared, for the meta line. */
  ageMin: number;
  /** Verb shown on the primary button. */
  approveLabel: string;
  /** Verb shown on the secondary button. */
  skipLabel: string;
  /** Telegram command that does the same thing — the hosted-copy fallback. */
  telegramHint?: string;
}

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
    <div className="opp-card" style={resolved ? { opacity: 0.6 } : undefined}>
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
    </div>
  );
}

const GROUPS: Array<{ urgency: ApprovalItem["urgency"]; label: string }> = [
  { urgency: "high", label: "Needs you now" },
  { urgency: "normal", label: "Waiting on sign-off" },
  { urgency: "low", label: "When you have a minute" },
];

export function ApprovalsQueue({ items }: { items: ApprovalItem[] }) {
  if (items.length === 0) {
    return (
      <div className="section">
        <div className="empty">
          Approvals zero — nothing is waiting on you. Every queued post, draft and
          to-do across the empire is signed off.
        </div>
      </div>
    );
  }

  return (
    <div>
      {GROUPS.map((group) => {
        const groupItems = items.filter((i) => i.urgency === group.urgency);
        if (groupItems.length === 0) return null;
        return (
          <div key={group.urgency}>
            <div className="section-header">
              <div className="section-title">
                {group.label} ({groupItems.length})
              </div>
            </div>
            {groupItems.map((item) => (
              <ApprovalRow key={item.key} item={item} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
