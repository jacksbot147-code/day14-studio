"use client";

/**
 * dossier-queue.tsx — interactive operator workflow for the AlignMD dossier
 * queue (the client half of /admin/alignmd).
 *
 * The server loads + priority-sorts the queue (see @/lib/alignmd-dossiers) and
 * hands us plain enriched records. This component renders three operator
 * polishes:
 *   1. Priority-sorted rows, each with a single chip naming the top sort reason
 *      ("expiring in 14 days" / "verifier flag: license-number mismatch" /
 *      "high-value placement").
 *   2. One-click Approve (advances to "ready for placement") + Kick back
 *      (prompts for a note, returns the dossier to the clinician portal). Both
 *      are UI-only for now — the clinician-portal write is a TODO backend hook.
 *   3. Verifier-flag inline accordion: when the evidence-verifier flagged a
 *      dossier, the operator expands the row and reads the mismatch detail in
 *      place — no click-through to another screen.
 *
 * Aesthetic: clinical-calm per the brand-animator skill — cool blue (#3b82f6)
 * primary accent, hairline rules, generous negative space, sans-serif. The
 * styles are scoped under `.amd-dossiers` so they never touch the ember admin
 * chrome around them.
 */

import { useCallback, useMemo, useState } from "react";
import type {
  EnrichedDossier,
  PriorityChip,
  VerifierFlag,
} from "@/lib/alignmd-dossiers";

type RowPhase =
  | { kind: "idle" }
  | { kind: "approved" }
  | { kind: "kickback" } // note entry open
  | { kind: "kicked-back"; note: string };

type Filter = "all" | "flagged" | "urgent";

function money(n: number | null | undefined): string {
  if (!n || n <= 0) return "—";
  return `$${n.toLocaleString("en-US")}`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(ms)) return iso;
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function ChipBadge({ chip }: { chip: PriorityChip }) {
  return <span className={`amd-chip amd-chip-${chip.tone}`}>{chip.label}</span>;
}

function FlagDetail({ flag }: { flag: VerifierFlag }) {
  return (
    <div className={`amd-flag amd-flag-${flag.severity}`}>
      <div className="amd-flag-head">
        <span className="amd-flag-field">{flag.field.replace(/_/g, " ")}</span>
        <span className={`amd-sev amd-sev-${flag.severity}`}>{flag.severity}</span>
      </div>
      {flag.parsed_value !== undefined && flag.source_value !== undefined ? (
        <div className="amd-flag-diff">
          <span className="amd-diff-parsed">
            parsed: <code>{String(flag.parsed_value ?? "∅")}</code>
          </span>
          <span className="amd-diff-arrow">vs</span>
          <span className="amd-diff-source">
            source: <code>{String(flag.source_value ?? "∅")}</code>
          </span>
        </div>
      ) : null}
      {flag.recommended_fix ? (
        <p className="amd-flag-fix">{flag.recommended_fix}</p>
      ) : null}
    </div>
  );
}

function DossierRow({ d }: { d: EnrichedDossier }) {
  const [phase, setPhase] = useState<RowPhase>({ kind: "idle" });
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const hasFlags = d.flags.length > 0;

  const approve = useCallback(() => {
    // TODO(backend): POST the dossier_id to the AlignMD placement queue
    // (advance stage → "ready_for_placement"). UI-only for now.
    setPhase({ kind: "approved" });
  }, []);

  const sendKickback = useCallback(() => {
    const trimmed = note.trim();
    if (!trimmed) return;
    // TODO(backend): POST { dossier_id, operator_note } to the clinician portal
    // so the clinician sees the reason and can re-submit. UI-only for now.
    setPhase({ kind: "kicked-back", note: trimmed });
  }, [note]);

  const resolved = phase.kind === "approved" || phase.kind === "kicked-back";

  return (
    <div
      className={`amd-row${resolved ? " amd-row-resolved" : ""}${
        hasFlags ? " amd-row-flagged" : ""
      }`}
    >
      <div className="amd-row-main">
        <button
          type="button"
          className={`amd-disclosure${hasFlags ? " on" : " off"}`}
          aria-expanded={hasFlags ? open : undefined}
          aria-label={hasFlags ? "Toggle verifier flags" : "No verifier flags"}
          disabled={!hasFlags}
          onClick={() => hasFlags && setOpen((v) => !v)}
        >
          {hasFlags ? (open ? "▾" : "▸") : "·"}
        </button>

        <div className="amd-ident">
          <div className="amd-name">{d.provider_name}</div>
          <div className="amd-sub">
            {d.specialty ? <span>{d.specialty}</span> : null}
            {d.issuing_state || d.license_number ? (
              <span className="amd-license">
                {d.issuing_state ?? "—"} · {d.license_number ?? "no license #"}
              </span>
            ) : null}
            <span className="amd-exp">exp {fmtDate(d.expiration_date)}</span>
          </div>
        </div>

        <div className="amd-meta">
          <ChipBadge chip={d.chip} />
          {hasFlags ? (
            <button
              type="button"
              className="amd-flag-count"
              onClick={() => setOpen((v) => !v)}
            >
              {d.flags.length} flag{d.flags.length === 1 ? "" : "s"}
            </button>
          ) : null}
          <span className="amd-value">{money(d.contract_value_usd)}</span>
        </div>

        <div className="amd-actions">
          {phase.kind === "idle" ? (
            <>
              <button type="button" className="amd-btn amd-btn-primary" onClick={approve}>
                Approve
              </button>
              <button
                type="button"
                className="amd-btn amd-btn-ghost"
                onClick={() => setPhase({ kind: "kickback" })}
              >
                Kick back
              </button>
            </>
          ) : null}
          {phase.kind === "approved" ? (
            <span className="amd-status amd-status-ok">
              ✓ Ready for placement
              <button
                type="button"
                className="amd-undo"
                onClick={() => setPhase({ kind: "idle" })}
              >
                undo
              </button>
            </span>
          ) : null}
          {phase.kind === "kicked-back" ? (
            <span className="amd-status amd-status-back">
              ↩ Sent to clinician
              <button
                type="button"
                className="amd-undo"
                onClick={() => setPhase({ kind: "idle" })}
              >
                undo
              </button>
            </span>
          ) : null}
        </div>
      </div>

      {phase.kind === "kickback" ? (
        <div className="amd-kickback">
          <label className="amd-kickback-label" htmlFor={`note-${d.dossier_id}`}>
            Reason sent back to the clinician
          </label>
          <textarea
            id={`note-${d.dossier_id}`}
            className="amd-kickback-input"
            placeholder="e.g. License number on the uploaded PDF doesn't match the parsed value — please re-upload a clearer scan."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            autoFocus
          />
          <div className="amd-kickback-actions">
            <button
              type="button"
              className="amd-btn amd-btn-primary"
              disabled={!note.trim()}
              onClick={sendKickback}
            >
              Send back
            </button>
            <button
              type="button"
              className="amd-btn amd-btn-ghost"
              onClick={() => {
                setPhase({ kind: "idle" });
                setNote("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {phase.kind === "kicked-back" ? (
        <div className="amd-kickback-receipt">
          Returned with note: <span>“{phase.note}”</span>
        </div>
      ) : null}

      {hasFlags && open ? (
        <div className="amd-flags">
          {d.flags.map((f, i) => (
            <FlagDetail key={`${f.field}-${i}`} flag={f} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function DossierQueue({
  dossiers,
  isSample,
  flagsTotal,
}: {
  dossiers: EnrichedDossier[];
  isSample: boolean;
  flagsTotal: number;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const flagged = dossiers.filter((d) => d.flags.length > 0).length;
    const urgent = dossiers.filter(
      (d) => d.urgency.expired || d.urgency.expiringSoon,
    ).length;
    return { all: dossiers.length, flagged, urgent };
  }, [dossiers]);

  const shown = useMemo(() => {
    if (filter === "flagged") return dossiers.filter((d) => d.flags.length > 0);
    if (filter === "urgent")
      return dossiers.filter((d) => d.urgency.expired || d.urgency.expiringSoon);
    return dossiers;
  }, [dossiers, filter]);

  if (dossiers.length === 0) {
    return (
      <div className="amd-dossiers">
        <style dangerouslySetInnerHTML={{ __html: DOSSIER_CSS }} />
        <div className="amd-empty">
          No dossiers in the operator queue. Once a live credential-parse run
          assembles a dossier, it appears here ranked by review priority.
        </div>
      </div>
    );
  }

  return (
    <div className="amd-dossiers">
      <style dangerouslySetInnerHTML={{ __html: DOSSIER_CSS }} />

      <div className="amd-toolbar">
        <div className="amd-filters">
          <button
            type="button"
            className={`amd-tab${filter === "all" ? " active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All <span>{counts.all}</span>
          </button>
          <button
            type="button"
            className={`amd-tab${filter === "urgent" ? " active" : ""}`}
            onClick={() => setFilter("urgent")}
          >
            License-urgent <span>{counts.urgent}</span>
          </button>
          <button
            type="button"
            className={`amd-tab${filter === "flagged" ? " active" : ""}`}
            onClick={() => setFilter("flagged")}
          >
            Verifier-flagged <span>{counts.flagged}</span>
          </button>
        </div>
        <div className="amd-toolbar-note">
          Sorted by priority: license urgency → verifier flags → placement value
          {isSample ? " · sample queue" : ""}
        </div>
      </div>

      <div className="amd-list">
        {shown.map((d) => (
          <DossierRow key={d.dossier_id} d={d} />
        ))}
      </div>

      <div className="amd-footnote">
        {flagsTotal} verifier flag{flagsTotal === 1 ? "" : "s"} across the queue ·
        Approve advances to placement · Kick back returns the dossier to the
        clinician with your note.
      </div>
    </div>
  );
}

/* Clinical-calm, scoped to .amd-dossiers — cool blue accent, hairline rules,
 * generous whitespace, system sans-serif (not monospace). */
const DOSSIER_CSS = `
.amd-dossiers {
  --amd-blue:#3b82f6; --amd-blue-ink:#1d4ed8; --amd-blue-soft:#eff6ff;
  --amd-ink:#0f172a; --amd-muted:#64748b; --amd-faint:#94a3b8;
  --amd-line:#e8edf3; --amd-line-2:#dbe3ec; --amd-paper:#ffffff;
  --amd-red:#dc2626; --amd-red-soft:#fef2f2; --amd-amber:#b45309; --amd-amber-soft:#fffbeb;
  font:14px/1.6 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color:var(--amd-ink);
}
.amd-dossiers *:focus-visible { outline:2px solid var(--amd-blue); outline-offset:2px; border-radius:6px; }

.amd-toolbar { display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; margin:4px 0 18px; }
.amd-filters { display:flex; gap:4px; flex-wrap:wrap; }
.amd-tab {
  display:inline-flex; align-items:center; gap:7px; padding:7px 13px; border:1px solid var(--amd-line-2);
  background:var(--amd-paper); color:var(--amd-muted); border-radius:999px; font:inherit; font-size:12.5px;
  font-weight:500; cursor:pointer; transition:color .14s ease, border-color .14s ease, background .14s ease;
}
.amd-tab span { font-variant-numeric:tabular-nums; color:var(--amd-faint); font-weight:600; }
.amd-tab:hover { border-color:var(--amd-blue); color:var(--amd-ink); }
.amd-tab.active { background:var(--amd-blue-soft); border-color:var(--amd-blue); color:var(--amd-blue-ink); }
.amd-tab.active span { color:var(--amd-blue-ink); }
.amd-toolbar-note { font-size:12px; color:var(--amd-faint); letter-spacing:.01em; }

.amd-list { display:flex; flex-direction:column; border-top:1px solid var(--amd-line); }
.amd-row { border-bottom:1px solid var(--amd-line); transition:background .14s ease; }
.amd-row:hover { background:#fbfdff; }
.amd-row-flagged { box-shadow:inset 2px 0 0 var(--amd-amber); }
.amd-row-resolved { opacity:.62; }

.amd-row-main { display:grid; grid-template-columns:22px minmax(0,1.7fr) minmax(0,1.5fr) auto; gap:18px; align-items:center; padding:18px 4px; }
.amd-disclosure {
  width:22px; height:22px; padding:0; border:none; background:none; color:var(--amd-faint);
  font-size:13px; cursor:pointer; line-height:1; transition:color .14s ease;
}
.amd-disclosure.on:hover { color:var(--amd-blue); }
.amd-disclosure.off { cursor:default; color:var(--amd-line-2); }

.amd-ident { min-width:0; }
.amd-name { font-size:15px; font-weight:600; letter-spacing:-0.01em; color:var(--amd-ink); }
.amd-sub { display:flex; flex-wrap:wrap; gap:6px 12px; margin-top:4px; font-size:12.5px; color:var(--amd-muted); }
.amd-license { color:var(--amd-faint); }
.amd-exp { color:var(--amd-faint); }

.amd-meta { display:flex; align-items:center; gap:10px; flex-wrap:wrap; min-width:0; }
.amd-chip {
  display:inline-flex; align-items:center; padding:4px 11px; border-radius:999px; font-size:11.5px;
  font-weight:600; letter-spacing:.005em; white-space:nowrap; border:1px solid transparent;
}
.amd-chip-blue { background:var(--amd-blue-soft); color:var(--amd-blue-ink); border-color:#dbeafe; }
.amd-chip-amber { background:var(--amd-amber-soft); color:var(--amd-amber); border-color:#fde68a; }
.amd-chip-red { background:var(--amd-red-soft); color:var(--amd-red); border-color:#fecaca; }
.amd-flag-count {
  padding:3px 9px; border:1px solid #fde68a; background:var(--amd-amber-soft); color:var(--amd-amber);
  border-radius:999px; font:inherit; font-size:11px; font-weight:600; cursor:pointer;
}
.amd-flag-count:hover { border-color:var(--amd-amber); }
.amd-value { font-size:12.5px; font-weight:600; color:var(--amd-muted); font-variant-numeric:tabular-nums; margin-left:auto; }

.amd-actions { display:flex; align-items:center; gap:8px; justify-self:end; }
.amd-btn {
  padding:8px 16px; border-radius:8px; font:inherit; font-size:13px; font-weight:600; cursor:pointer;
  border:1px solid transparent; transition:background .14s ease, border-color .14s ease, color .14s ease, transform .08s ease; white-space:nowrap;
}
.amd-btn:active { transform:translateY(1px); }
.amd-btn-primary { background:var(--amd-blue); color:#fff; border-color:var(--amd-blue); }
.amd-btn-primary:hover { background:var(--amd-blue-ink); border-color:var(--amd-blue-ink); }
.amd-btn-primary:disabled { background:#bfdbfe; border-color:#bfdbfe; cursor:not-allowed; transform:none; }
.amd-btn-ghost { background:var(--amd-paper); color:var(--amd-muted); border-color:var(--amd-line-2); }
.amd-btn-ghost:hover { color:var(--amd-ink); border-color:var(--amd-faint); }

.amd-status { display:inline-flex; align-items:center; gap:10px; font-size:13px; font-weight:600; white-space:nowrap; }
.amd-status-ok { color:var(--amd-blue-ink); }
.amd-status-back { color:var(--amd-amber); }
.amd-undo { background:none; border:none; padding:0; font:inherit; font-size:12px; font-weight:500; color:var(--amd-faint); cursor:pointer; text-decoration:underline; }
.amd-undo:hover { color:var(--amd-muted); }

.amd-kickback { padding:0 4px 18px 44px; display:flex; flex-direction:column; gap:10px; }
.amd-kickback-label { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.08em; color:var(--amd-muted); }
.amd-kickback-input {
  width:100%; padding:11px 13px; border:1px solid var(--amd-line-2); border-radius:8px; background:var(--amd-paper);
  font:inherit; font-size:13px; color:var(--amd-ink); resize:vertical; box-sizing:border-box;
}
.amd-kickback-input:focus { outline:none; border-color:var(--amd-blue); box-shadow:0 0 0 3px var(--amd-blue-soft); }
.amd-kickback-input::placeholder { color:var(--amd-faint); }
.amd-kickback-actions { display:flex; gap:8px; }
.amd-kickback-receipt { padding:0 4px 16px 44px; font-size:12.5px; color:var(--amd-muted); }
.amd-kickback-receipt span { color:var(--amd-ink); font-style:italic; }

.amd-flags { padding:0 4px 18px 44px; display:flex; flex-direction:column; gap:10px; }
.amd-flag { border:1px solid var(--amd-line-2); border-left-width:3px; border-radius:8px; padding:12px 14px; background:#fcfdfe; }
.amd-flag-high { border-left-color:var(--amd-red); }
.amd-flag-medium { border-left-color:var(--amd-amber); }
.amd-flag-low, .amd-flag-info { border-left-color:var(--amd-faint); }
.amd-flag-head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.amd-flag-field { font-size:13px; font-weight:600; color:var(--amd-ink); text-transform:capitalize; }
.amd-sev { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; padding:2px 8px; border-radius:999px; }
.amd-sev-high { background:var(--amd-red-soft); color:var(--amd-red); }
.amd-sev-medium { background:var(--amd-amber-soft); color:var(--amd-amber); }
.amd-sev-low, .amd-sev-info { background:#f1f5f9; color:var(--amd-muted); }
.amd-flag-diff { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-top:9px; font-size:12.5px; color:var(--amd-muted); }
.amd-flag-diff code { font-family:ui-monospace, SFMono-Regular, Menlo, monospace; font-size:12px; background:#f1f5f9; border:1px solid var(--amd-line); border-radius:5px; padding:1px 6px; color:var(--amd-ink); }
.amd-diff-arrow { color:var(--amd-faint); }
.amd-flag-fix { margin:9px 0 0; font-size:12.5px; line-height:1.55; color:var(--amd-muted); }

.amd-empty { padding:40px 20px; text-align:center; color:var(--amd-muted); font-size:13.5px; line-height:1.6; border:1px dashed var(--amd-line-2); border-radius:12px; }
.amd-footnote { margin-top:16px; font-size:12px; color:var(--amd-faint); line-height:1.6; }

@media (max-width: 820px) {
  .amd-row-main { grid-template-columns:22px 1fr; gap:10px 14px; }
  .amd-meta { grid-column:2; }
  .amd-actions { grid-column:2; justify-self:start; }
  .amd-value { margin-left:0; }
  .amd-kickback, .amd-kickback-receipt, .amd-flags { padding-left:4px; }
}
@media (prefers-reduced-motion: reduce) {
  .amd-dossiers *, .amd-dossiers *::before { transition:none !important; }
}
`;
