"use client";

import { useState } from "react";
import type { REEvaluation } from "@/lib/admin-state";

function money(cents: number) {
  return `$${Math.round((cents || 0) / 100).toLocaleString()}`;
}
function tierClass(tier: string) {
  return tier.startsWith("A") ? "a" : tier.startsWith("B") ? "b" : "c";
}

/**
 * Add-a-county box. The dashboard is hosted on Vercel and can't write to the
 * Mac, so this routes through Telegram — it opens the bot with the
 * "realty <county>" command pre-filled, and the poller starts the scout.
 */
export function AddCountyBox({ botUsername }: { botUsername: string | null }) {
  const [val, setVal] = useState("");
  const trimmed = val.trim();
  const href =
    botUsername && trimmed
      ? `https://t.me/${botUsername}?text=${encodeURIComponent(`realty ${trimmed}`)}`
      : null;

  return (
    <div className="add-county">
      <input
        className="search-input"
        placeholder="Add a county or metro — e.g. Lee County, FL  or  Tampa Bay area"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && href) window.open(href, "_blank", "noopener");
        }}
      />
      {href ? (
        <a className="add-county-btn" href={href} target="_blank" rel="noopener noreferrer">
          Send to scout →
        </a>
      ) : (
        <button
          className="add-county-btn"
          disabled
          title={botUsername ? "Type a county first" : "Bot link unavailable — sync the empire state"}
        >
          Send to scout →
        </button>
      )}
    </div>
  );
}

const TIERS = [
  { id: "all", label: "All tiers" },
  { id: "A", label: "A" },
  { id: "B", label: "B" },
  { id: "C", label: "C" },
];
const PLAYS = [
  { id: "all", label: "All plays" },
  { id: "flip", label: "Flip" },
  { id: "rental", label: "Rental" },
  { id: "wholesale", label: "Wholesale" },
];

/** Searchable, filterable, sortable deal board with expandable per-deal math. */
export function DealBoard({ deals }: { deals: REEvaluation[] }) {
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState("all");
  const [play, setPlay] = useState("all");
  const [sort, setSort] = useState<"score" | "value" | "equity">("score");
  const [expanded, setExpanded] = useState<string | null>(null);

  if (deals.length === 0) {
    return (
      <div className="section">
        <div className="empty">
          No properties scored yet. Add a county above, or drop a county
          property-appraiser CSV into the realty intake folder — the scout
          ingests and scores it on its next run.
        </div>
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const filtered = deals
    .filter((d) => {
      if (tier !== "all" && !d.tier.startsWith(tier)) return false;
      if (play !== "all" && d.best_play !== play) return false;
      if (q) {
        const hay = `${d.address || ""} ${d.city || ""} ${d.owner || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sort === "value") return (b.value_cents || 0) - (a.value_cents || 0);
      if (sort === "equity") return (b.wholesale?.equity_pct || 0) - (a.wholesale?.equity_pct || 0);
      return b.score - a.score;
    });

  return (
    <>
      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Search address, city, county, or owner…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="filter-group">
          {TIERS.map((t) => (
            <button
              key={t.id}
              className={`filter-chip ${tier === t.id ? "active" : ""}`}
              onClick={() => setTier(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="filter-group">
          {PLAYS.map((p) => (
            <button
              key={p.id}
              className={`filter-chip ${play === p.id ? "active" : ""}`}
              onClick={() => setPlay(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <select
          className="sort-select"
          value={sort}
          onChange={(e) => setSort(e.target.value as "score" | "value" | "equity")}
        >
          <option value="score">Sort: deal score</option>
          <option value="value">Sort: est. value</option>
          <option value="equity">Sort: equity %</option>
        </select>
      </div>
      <div className="toolbar-count">
        Showing {filtered.length} of {deals.length} deals
      </div>

      {filtered.length === 0 ? (
        <div className="section">
          <div className="empty">No deals match your search or filters.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((d) => {
            const open = expanded === d.property_id;
            return (
              <div key={d.property_id} className="deal-card-wrap">
                <div
                  className={`deal deal-${tierClass(d.tier)} expandable`}
                  onClick={() => setExpanded(open ? null : d.property_id)}
                >
                  <div className="deal-score">{d.score}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="deal-addr">
                      {d.address || "(no address)"}
                      {d.city ? `, ${d.city}` : ""}
                    </div>
                    <div className="deal-meta">
                      {d.tier} · best play: <b>{d.best_play}</b> · est. value{" "}
                      {money(d.value_cents)}
                      {d.owner ? ` · ${d.owner}` : ""}
                    </div>
                    {d.signals.length > 0 ? (
                      <div className="deal-sigs">
                        {d.signals.map((s) => (
                          <span key={s} className="deal-chip">{s}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="deal-plays">
                    <span>flip {d.flip.score}</span>
                    <span>rent {d.rental.score}</span>
                    <span>whlsl {d.wholesale.score}</span>
                  </div>
                </div>
                {open ? (
                  <div className="deal-detail">
                    <div className="deal-detail-card">
                      <h4>Fix &amp; flip</h4>
                      <div className="deal-detail-row"><span>Max offer (MAO)</span><span>{money(d.flip.mao_cents)}</span></div>
                      <div className="deal-detail-row"><span>Est. profit</span><span>{money(d.flip.est_profit_cents)}</span></div>
                      <div className="deal-detail-row"><span>Play score</span><span>{d.flip.score}</span></div>
                    </div>
                    <div className="deal-detail-card">
                      <h4>Rental</h4>
                      <div className="deal-detail-row"><span>Cap rate</span><span>{d.rental.cap_rate_pct}%</span></div>
                      <div className="deal-detail-row"><span>Rent-to-value</span><span>{d.rental.rent_to_value_pct}%</span></div>
                      <div className="deal-detail-row"><span>Play score</span><span>{d.rental.score}</span></div>
                    </div>
                    <div className="deal-detail-card">
                      <h4>Wholesale</h4>
                      <div className="deal-detail-row"><span>Equity</span><span>{d.wholesale.equity_pct}%</span></div>
                      <div className="deal-detail-row"><span>Play score</span><span>{d.wholesale.score}</span></div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
