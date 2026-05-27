"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { REEvaluation } from "@/lib/admin-state";
import { EmptyState } from "@/components/ui";

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
/** base64url-encode a string (UTF-8 safe) for a Telegram ?start= payload. */
function startPayload(cmd: string): string | null {
  try {
    const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(cmd)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    return b64.length <= 64 ? b64 : null; // Telegram caps start payloads at 64
  } catch {
    return null;
  }
}

type AddState = "idle" | "sending" | "added" | "note" | "telegram";

export function AddCountyBox({ botUsername }: { botUsername: string | null }) {
  const router = useRouter();
  const [val, setVal] = useState("");
  const [state, setState] = useState<AddState>("idle");
  const [msg, setMsg] = useState("");
  const trimmed = val.trim();

  /** Hosted-copy fallback: hand off to Telegram + copy the command. */
  function telegramFallback(cmd: string) {
    let copied = false;
    try {
      navigator.clipboard?.writeText(cmd);
      copied = true;
    } catch {
      /* clipboard may be blocked */
    }
    if (botUsername) {
      const payload = startPayload(cmd);
      const url = payload
        ? `https://t.me/${botUsername}?start=${payload}`
        : `https://t.me/${botUsername}`;
      window.open(url, "_blank", "noopener");
      setMsg(
        "This is the hosted dashboard, so it can't reach your Mac — opened your Telegram bot to register it instead." +
          (copied ? " (Command copied to your clipboard too.)" : "")
      );
    } else {
      setMsg(copied ? "Command copied — paste it into your Day14 bot." : `Send "${cmd}" to your Day14 bot.`);
    }
    setState("telegram");
  }

  async function send() {
    if (!trimmed || state === "sending") return;
    const cmd = `realty ${trimmed}`;
    setState("sending");
    setMsg("");
    let res: Response;
    try {
      res = await fetch("/api/realty/add-county", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ county: trimmed }),
      });
    } catch {
      telegramFallback(cmd);
      return;
    }
    if (res.status === 503) {
      telegramFallback(cmd);
      return;
    }
    let data: { ok?: boolean; message?: string; error?: string } = {};
    try {
      data = await res.json();
    } catch {
      /* unparseable */
    }
    if (data.ok) {
      setState("added");
      setMsg(data.message || "Added — the scout is sourcing it now.");
      setVal("");
      router.refresh();
    } else {
      setState("note");
      setMsg(data.message || data.error || "Couldn't add that county.");
    }
  }

  const hintColor =
    state === "added" ? "var(--green)" : state === "note" ? "var(--amber)" : undefined;

  return (
    <div>
      <div className="add-county">
        <input
          className="search-input"
          placeholder="Add a county or metro — e.g. Lee County, FL  or  Tampa Bay area"
          value={val}
          onChange={(e) => {
            setVal(e.target.value);
            if (state !== "sending") setState("idle");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          disabled={state === "sending"}
        />
        <button
          className="add-county-btn"
          onClick={send}
          disabled={!trimmed || state === "sending"}
        >
          {state === "sending" ? "Starting…" : "Send to scout →"}
        </button>
      </div>
      <div className="add-county-hint" style={hintColor ? { color: hintColor } : undefined}>
        {msg ||
          "Registers the county on the watch list and starts the scout — straight from the dashboard."}
      </div>
    </div>
  );
}

/**
 * Upload a county property-records CSV straight from the dashboard. Posts the
 * file to the local API, which drops it into intake/ and runs the scout.
 */
export function UploadCsvBox({
  targets,
}: {
  targets: { id: string; county: string; label: string }[];
}) {
  const router = useRouter();
  const [county, setCounty] = useState(targets[0]?.county ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  if (targets.length === 0) return null;

  async function upload() {
    if (!file || state === "uploading") return;
    setState("uploading");
    setMsg("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("county", county);
    let res: Response;
    try {
      res = await fetch("/api/realty/upload-csv", { method: "POST", body: fd });
    } catch {
      setState("error");
      setMsg("Upload failed — make sure the local admin (localhost) is running.");
      return;
    }
    if (res.status === 503) {
      setState("error");
      setMsg("CSV upload works on the local dashboard (localhost) — the hosted day14.us copy can't reach your Mac.");
      return;
    }
    let data: { ok?: boolean; message?: string; error?: string } = {};
    try {
      data = await res.json();
    } catch {
      /* unparseable */
    }
    if (data.ok) {
      setState("done");
      setMsg(data.message || "Uploaded — the scout is scoring it now.");
      setFile(null);
      router.refresh();
    } else {
      setState("error");
      setMsg(data.error || "Upload failed.");
    }
  }

  const hintColor =
    state === "done" ? "var(--green)" : state === "error" ? "var(--amber)" : undefined;

  return (
    <div>
      <div className="upload-csv">
        <select className="sort-select" value={county} onChange={(e) => setCounty(e.target.value)}>
          {targets.map((t) => (
            <option key={t.id} value={t.county}>{t.label}</option>
          ))}
        </select>
        <label className="upload-file">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setState("idle");
              setMsg("");
            }}
          />
          <span>{file ? file.name : "Choose a county CSV…"}</span>
        </label>
        <button className="add-county-btn" onClick={upload} disabled={!file || state === "uploading"}>
          {state === "uploading" ? "Uploading…" : "Upload + score →"}
        </button>
      </div>
      <div className="add-county-hint" style={hintColor ? { color: hintColor } : undefined}>
        {msg ||
          "Have a county's property-records CSV? Pick the county, choose the file — the scout ingests and scores it. No folders, no Telegram."}
      </div>
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

/** Searchable, filterable, sortable deal board — each deal links through to
 *  its full property gameplan. */
export function DealBoard({ deals }: { deals: REEvaluation[] }) {
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState("all");
  const [play, setPlay] = useState("all");
  const [sort, setSort] = useState<"score" | "value" | "equity">("score");

  if (deals.length === 0) {
    return (
      <EmptyState
        icon="🏚️"
        headline="No properties scored yet."
        hint={
          <>
            Add a county to the watch list above, or drop a county
            property-appraiser CSV into the realty intake folder — the scout
            ingests, comps and scores it on its next run. Deals tier up to A/B
            automatically once <code>re-evaluation-agent</code> has the data.
          </>
        }
      />
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
        <EmptyState
          icon="🔎"
          headline="No deals match your search or filters."
          hint={
            <>
              Clear the search box, widen the tier (try All), or switch the play
              filter. {deals.length} scored {deals.length === 1 ? "deal is" : "deals are"} in
              the pool — narrowing too far is usually the cause.
            </>
          }
        />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((d) => (
            <Link
              key={d.property_id}
              href={`/admin/realty/${encodeURIComponent(d.property_id)}`}
              className={`deal deal-${tierClass(d.tier)} expandable`}
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
              <div className="biz-arrow" style={{ alignSelf: "center" }}>›</div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
