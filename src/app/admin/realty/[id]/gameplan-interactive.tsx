"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DealStageEntry, DealStageId } from "@/lib/admin-state";

const STAGES: { id: DealStageId; label: string }[] = [
  { id: "watching", label: "Watching" },
  { id: "researching", label: "Researching" },
  { id: "contacted", label: "Contacted" },
  { id: "offer-made", label: "Offer made" },
  { id: "under-contract", label: "Under contract" },
  { id: "closed", label: "Closed" },
  { id: "passed", label: "Passed" },
];

/**
 * Deal-stage tracker for one property — a stage selector plus a running note
 * log. Posts to /api/realty/deal-stage, which only works on the local Mac
 * admin (the hosted copy returns 503 and this shows a friendly note).
 */
export function DealStageControl({
  propertyId,
  initial,
}: {
  propertyId: string;
  initial: DealStageEntry | null;
}) {
  const router = useRouter();
  const [entry, setEntry] = useState<DealStageEntry | null>(initial);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const stage: DealStageId = entry?.stage || "watching";

  async function post(body: { stage?: DealStageId; note?: string }) {
    if (busy) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/realty/deal-stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property_id: propertyId, ...body }),
      });
      if (res.status === 503) {
        setMsg("Deal tracking saves on the local admin (localhost) — the hosted day14.us copy can't write to your Mac.");
        setBusy(false);
        return;
      }
      const data: { ok?: boolean; entry?: DealStageEntry; error?: string } = await res
        .json()
        .catch(() => ({}));
      if (data.ok && data.entry) {
        setEntry(data.entry);
        setNote("");
        router.refresh();
      } else {
        setMsg(data.error || "Couldn't save that.");
      }
    } catch {
      setMsg("Couldn't reach the deal tracker — make sure the local admin is running.");
    }
    setBusy(false);
  }

  const notes = entry?.notes ? [...entry.notes].reverse() : [];

  return (
    <div>
      <div className="gp-stage-row">
        {STAGES.map((s) => (
          <button
            key={s.id}
            className={`gp-stage-btn ${stage === s.id ? "active" : ""}`}
            disabled={busy}
            onClick={() => post({ stage: s.id })}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <input
          className="search-input"
          placeholder="Add a note — a call, a number, a next step…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && note.trim()) post({ note: note.trim() });
          }}
          disabled={busy}
        />
        <button
          className="add-county-btn"
          disabled={busy || !note.trim()}
          onClick={() => note.trim() && post({ note: note.trim() })}
        >
          Add note
        </button>
      </div>
      {msg ? (
        <div className="add-county-hint" style={{ color: "var(--amber)" }}>
          {msg}
        </div>
      ) : null}
      {notes.length > 0 ? (
        <div className="gp-note-list">
          {notes.map((n, i) => (
            <div key={i} className="gp-note">
              <span className="gp-note-ts">{new Date(n.ts).toLocaleString()} — </span>
              {n.text}
            </div>
          ))}
        </div>
      ) : (
        <div className="add-county-hint" style={{ marginTop: 12 }}>
          No notes yet. Log calls, numbers, and next steps here as you work the deal.
        </div>
      )}
    </div>
  );
}
