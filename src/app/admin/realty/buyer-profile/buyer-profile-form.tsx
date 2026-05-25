"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { BuyerProfile, CreditBand } from "@/lib/admin-state";

const LABEL: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "var(--muted)",
  marginBottom: 6,
};

/**
 * Buyer-profile editor. Drives the acquisition strategist's least-cash
 * routing. Saves via /api/realty/buyer-profile — local Mac admin only.
 */
export function BuyerProfileForm({ initial }: { initial: BuyerProfile }) {
  const router = useRouter();
  const [cash, setCash] = useState(
    initial.cash_available_cents ? String(Math.round(initial.cash_available_cents / 100)) : ""
  );
  const [credit, setCredit] = useState<CreditBand>(initial.credit_band);
  const [hasLlc, setHasLlc] = useState(initial.has_llc);
  const [occupy, setOccupy] = useState(initial.will_owner_occupy);
  const [goal, setGoal] = useState(initial.goal);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  async function save() {
    if (busy) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/realty/buyer-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cash_available: Number(cash) || 0,
          credit_band: credit,
          has_llc: hasLlc,
          will_owner_occupy: occupy,
          goal,
        }),
      });
      if (res.status === 503) {
        setOk(false);
        setMsg("The buyer profile saves on the local admin (localhost) — the hosted day14.us copy can't write to your Mac.");
        setBusy(false);
        return;
      }
      const data: { ok?: boolean; error?: string } = await res.json().catch(() => ({}));
      if (data.ok) {
        setOk(true);
        setMsg("Saved — your acquisition routes are now personalized.");
        router.refresh();
      } else {
        setOk(false);
        setMsg(data.error || "Couldn't save that.");
      }
    } catch {
      setOk(false);
      setMsg("Couldn't reach the server — make sure the local admin is running.");
    }
    setBusy(false);
  }

  return (
    <div className="section" style={{ maxWidth: 460 }}>
      <label style={{ display: "block", marginBottom: 18 }}>
        <div style={LABEL}>Cash available for deals (USD)</div>
        <input
          className="search-input"
          inputMode="numeric"
          placeholder="e.g. 40000"
          value={cash}
          onChange={(e) => setCash(e.target.value.replace(/[^0-9]/g, ""))}
          style={{ minWidth: 0, width: "100%" }}
        />
      </label>

      <label style={{ display: "block", marginBottom: 18 }}>
        <div style={LABEL}>Credit</div>
        <select
          className="sort-select"
          value={credit}
          onChange={(e) => setCredit(e.target.value as CreditBand)}
          style={{ width: "100%" }}
        >
          <option value="excellent">Excellent (740+)</option>
          <option value="good">Good (680-739)</option>
          <option value="fair">Fair (620-679)</option>
          <option value="limited">Limited / below 620</option>
          <option value="unknown">Not sure</option>
        </select>
      </label>

      <label style={{ display: "block", marginBottom: 18 }}>
        <div style={LABEL}>Primary goal</div>
        <select
          className="sort-select"
          value={goal}
          onChange={(e) => setGoal(e.target.value as BuyerProfile["goal"])}
          style={{ width: "100%" }}
        >
          <option value="mixed">Mixed — open to any play</option>
          <option value="flip">Fix &amp; flip</option>
          <option value="rental">Rentals / buy-and-hold</option>
          <option value="wholesale">Wholesale</option>
        </select>
      </label>

      <label style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 12, cursor: "pointer" }}>
        <input type="checkbox" checked={hasLlc} onChange={(e) => setHasLlc(e.target.checked)} />
        <span style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>
          I have an LLC (or will set one up) — used for DSCR loans and entity-level strategies.
        </span>
      </label>
      <label style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 18, cursor: "pointer" }}>
        <input type="checkbox" checked={occupy} onChange={(e) => setOccupy(e.target.checked)} />
        <span style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>
          I would live in the property — unlocks low-down owner-occupied loans (FHA, 203k).
        </span>
      </label>

      <button className="add-county-btn" onClick={save} disabled={busy}>
        {busy ? "Saving…" : "Save buyer profile"}
      </button>
      {msg ? (
        <div
          className="add-county-hint"
          style={{ marginTop: 12, color: ok ? "var(--green)" : "var(--amber)" }}
        >
          {msg}
        </div>
      ) : null}
    </div>
  );
}
