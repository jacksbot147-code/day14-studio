import Link from "next/link";
import { notFound } from "next/navigation";
import { loadTenantOps, type REEvaluation } from "@/lib/admin-state";
import { buildGameplan, type REProperty } from "@/lib/realty-gameplan";
import { buildAcquisitionPlan, DEFAULT_BUYER_PROFILE } from "@/lib/realty-acquisition";
import { contractsForPlay, ownerOutreach } from "@/lib/realty-contracts";
import { buildLoopholeScan } from "@/lib/realty-loopfinder";
import { buildRehabEstimate } from "@/lib/realty-rehab";
import { AdminNav, ADMIN_CSS } from "../../layout-bits";
import { DealStageControl } from "./gameplan-interactive";

export const dynamic = "force-dynamic";

const GAMEPLAN_CSS = `
.admin-shell .gp-head { display:flex; gap:16px; align-items:flex-start; background:var(--surface); border:1px solid var(--border); border-left-width:3px; border-radius:var(--r-md); padding:18px 20px; }
.admin-shell .gp-head.tier-a { border-left-color:var(--green); }
.admin-shell .gp-head.tier-b { border-left-color:var(--amber); }
.admin-shell .gp-head.tier-c { border-left-color:var(--border-strong); }
.admin-shell .gp-score { width:60px; height:60px; flex-shrink:0; border-radius:var(--r-md); display:flex; align-items:center; justify-content:center; font-size:25px; font-weight:800; background:var(--surface-2); color:var(--text); font-variant-numeric:tabular-nums; }
.admin-shell .gp-head.tier-a .gp-score { background:var(--green-soft); color:var(--green); }
.admin-shell .gp-head.tier-b .gp-score { background:var(--amber-soft); color:var(--amber); }
.admin-shell .gp-headmain { flex:1; min-width:0; }
.admin-shell .gp-tier { font-size:14px; font-weight:700; color:var(--text); }
.admin-shell .gp-headmeta { font-size:13px; color:var(--muted); margin-top:4px; line-height:1.6; }
.admin-shell .gp-deal-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
.admin-shell .gp-deal-grid .deal-detail-card.rec { border-color:var(--accent); box-shadow:inset 0 2px 0 var(--accent); }
.admin-shell .gp-reclabel { font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--accent-text); margin-left:6px; }
.admin-shell .gp-cardnote { font-size:11px; color:var(--muted); margin-top:8px; line-height:1.5; border-top:1px solid var(--border); padding-top:7px; }
.admin-shell .gp-links { display:flex; flex-direction:column; gap:8px; }
.admin-shell .gp-link { display:flex; align-items:baseline; gap:10px; padding:11px 13px; background:var(--surface); border:1px solid var(--border); border-radius:var(--r-sm); flex-wrap:wrap; }
.admin-shell .gp-link a { color:var(--accent-text); font-weight:700; font-size:13px; }
.admin-shell .gp-link a:hover { color:var(--accent); text-decoration:underline; }
.admin-shell .gp-link-note { font-size:12px; color:var(--muted); }
.admin-shell .gp-risk { display:flex; gap:10px; padding:10px 0; border-bottom:1px solid var(--border); font-size:13px; line-height:1.55; color:var(--text-2); }
.admin-shell .gp-risk:last-child { border-bottom:none; }
.admin-shell .gp-risk-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; margin-top:5px; }
.admin-shell .gp-risk.warn .gp-risk-dot { background:var(--red); }
.admin-shell .gp-risk.caution .gp-risk-dot { background:var(--amber); }
.admin-shell .gp-risk.info .gp-risk-dot { background:var(--cyan); }
.admin-shell .gp-steps { margin:0; padding-left:22px; display:flex; flex-direction:column; gap:9px; }
.admin-shell .gp-steps li { font-size:13px; color:var(--text-2); line-height:1.55; }
.admin-shell .gp-steps li:last-child { color:var(--accent-text); font-weight:600; }
.admin-shell .gp-kv { display:flex; justify-content:space-between; gap:14px; padding:8px 0; border-bottom:1px solid var(--border); font-size:13px; }
.admin-shell .gp-kv:last-child { border-bottom:none; }
.admin-shell .gp-kv .k { color:var(--muted); }
.admin-shell .gp-kv .v { color:var(--text); font-weight:600; text-align:right; }
.admin-shell .gp-confidence { font-size:11px; font-weight:700; padding:2px 8px; border-radius:var(--r-sm); text-transform:uppercase; letter-spacing:0.05em; }
.admin-shell .gp-confidence.high { background:var(--green-soft); color:var(--green); }
.admin-shell .gp-confidence.medium { background:var(--amber-soft); color:var(--amber); }
.admin-shell .gp-confidence.low { background:var(--red-soft); color:var(--red); }
.admin-shell .gp-prose { font-size:13.5px; line-height:1.65; color:var(--text-2); margin:0; }
.admin-shell .gp-note-line { font-size:12.5px; color:var(--muted); margin:12px 0 0; line-height:1.55; }
.admin-shell .gp-stage-row { display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
.admin-shell .gp-stage-btn { padding:7px 12px; border:1px solid var(--border); border-radius:var(--r-sm); background:var(--surface); color:var(--muted); font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; transition:border-color 0.12s ease, color 0.12s ease, background 0.12s ease; }
.admin-shell .gp-stage-btn:hover { border-color:var(--border-strong); color:var(--text); }
.admin-shell .gp-stage-btn.active { background:var(--accent-soft); border-color:var(--accent); color:var(--accent-text); }
.admin-shell .gp-stage-btn:disabled { opacity:0.5; cursor:default; }
.admin-shell .gp-note-list { margin:12px 0 0; display:flex; flex-direction:column; gap:6px; }
.admin-shell .gp-note { font-size:12.5px; color:var(--text-2); padding:8px 11px; background:var(--surface-2); border:1px solid var(--border); border-radius:var(--r-sm); line-height:1.5; }
.admin-shell .gp-note-ts { color:var(--muted); font-size:11px; }
.admin-shell .gp-next { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
.admin-shell .gp-next-card { background:var(--surface-2); border:1px dashed var(--border-strong); border-radius:var(--r-sm); padding:14px 15px; }
.admin-shell .gp-next-phase { font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:var(--accent-text); }
.admin-shell .gp-next-card h4 { margin:4px 0 5px; font-size:13.5px; font-weight:700; color:var(--text); }
.admin-shell .gp-next-card p { margin:0; font-size:12.5px; color:var(--muted); line-height:1.55; }
.admin-shell .gp-route { display:flex; gap:14px; background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md); padding:14px 16px; }
.admin-shell .gp-route.cheapest { border-color:var(--accent); border-left-width:3px; }
.admin-shell .gp-route-cash { width:132px; flex-shrink:0; }
.admin-shell .gp-route-cash-num { font-size:20px; font-weight:800; letter-spacing:-0.03em; color:var(--text); font-variant-numeric:tabular-nums; }
.admin-shell .gp-route-cash-label { font-size:10.5px; color:var(--muted); margin-top:3px; line-height:1.4; }
.admin-shell .gp-route-main { flex:1; min-width:0; }
.admin-shell .gp-route-head { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.admin-shell .gp-route-name { font-size:14px; font-weight:700; color:var(--text); }
.admin-shell .gp-fit { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; padding:2px 7px; border-radius:var(--r-sm); }
.admin-shell .gp-fit-strong { background:var(--green-soft); color:var(--green); }
.admin-shell .gp-fit-possible { background:var(--amber-soft); color:var(--amber); }
.admin-shell .gp-fit-weak { background:var(--surface-2); color:var(--muted); }
.admin-shell .gp-fit-not-now { background:var(--red-soft); color:var(--red); }
.admin-shell .gp-route-summary { font-size:12.5px; color:var(--text-2); margin:6px 0 0; line-height:1.55; }
.admin-shell .gp-route-detail { font-size:12px; color:var(--muted); margin-top:5px; line-height:1.5; }
.admin-shell .gp-route-detail b { color:var(--text-2); font-weight:600; }
.admin-shell .gp-subhead { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted); margin:18px 0 8px; }
.admin-shell .gp-letter { font-family:inherit; font-size:12.5px; color:var(--text-2); line-height:1.6; white-space:pre-wrap; background:var(--surface-2); border:1px solid var(--border); border-radius:var(--r-sm); padding:14px 16px; margin:0; overflow-x:auto; }
.admin-shell .gp-team { margin:6px 0 0; padding-left:20px; display:flex; flex-direction:column; gap:5px; }
.admin-shell .gp-team li { font-size:12.5px; color:var(--text-2); line-height:1.5; }
.admin-shell .gp-loop { padding:12px 0; border-bottom:1px solid var(--border); }
.admin-shell .gp-loop:last-child { border-bottom:none; }
.admin-shell .gp-loop-head { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.admin-shell .gp-loop-name { font-size:13.5px; font-weight:700; color:var(--text); }
.admin-shell .gp-loop-what { font-size:12.5px; color:var(--text-2); margin:5px 0 0; line-height:1.55; }
.admin-shell .gp-loop-applies { font-size:12.5px; color:var(--text-2); margin:5px 0 0; line-height:1.55; }
.admin-shell .gp-loop-applies b { color:var(--accent-text); font-weight:600; }
.admin-shell .gp-loop-src { font-size:11px; color:var(--muted); margin-top:5px; font-style:italic; }
@media (max-width:768px){ .admin-shell .gp-deal-grid{grid-template-columns:1fr;} .admin-shell .gp-next{grid-template-columns:1fr;} .admin-shell .gp-route{flex-direction:column;gap:6px;} .admin-shell .gp-route-cash{width:auto;} }
`;

function money(cents: number | undefined): string {
  return `$${Math.round((cents || 0) / 100).toLocaleString()}`;
}
function tierLetter(tier: string): "a" | "b" | "c" {
  return tier.startsWith("A") ? "a" : tier.startsWith("B") ? "b" : "c";
}

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const ops = await loadTenantOps("day14-realty");
  const props = (ops.properties || []) as unknown as REProperty[];
  const p = props.find((x) => x.id === id);
  return {
    title: `${p?.address || "Property"} — Realty — Day14 Admin`,
    robots: { index: false, follow: false },
  };
}

export default async function PropertyGameplan({ params }: Props) {
  const { id } = await params;
  const ops = await loadTenantOps("day14-realty");
  const properties = (ops.properties || []) as unknown as REProperty[];
  const property = properties.find((p) => p.id === id);
  const evaluation: REEvaluation | undefined = (ops.evaluations || []).find(
    (e) => e.property_id === id
  );
  if (!property || !evaluation) notFound();

  const gp = buildGameplan(property, evaluation);
  const acq = buildAcquisitionPlan(property, evaluation, ops.buyerprofile || DEFAULT_BUYER_PROFILE);
  const docs = contractsForPlay(evaluation.best_play);
  const outreach = ownerOutreach(property);
  const loop = buildLoopholeScan(property, evaluation);
  const rehab = buildRehabEstimate(property, evaluation);
  const stageEntry = ops.dealstages?.[id] || null;
  const tier = tierLetter(evaluation.tier);

  const facts = [
    property.beds ? `${property.beds} bd` : "",
    property.baths ? `${property.baths} ba` : "",
    property.sqft ? `${property.sqft.toLocaleString()} sqft` : "",
    property.year_built ? `built ${property.year_built}` : "",
  ].filter(Boolean);

  return (
    <div className="admin-shell">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS + GAMEPLAN_CSS }} />
      <AdminNav active="realty" />
      <div className="crumb">
        <Link href="/admin/realty">Realty</Link> &nbsp;/&nbsp; Property gameplan
      </div>
      <h1>{property.address || "(no address)"}</h1>
      <div className="sub">
        {[
          property.city,
          property.county ? `${property.county} County` : "",
          property.zip,
        ]
          .filter(Boolean)
          .join(" · ")}
        {evaluation.owner ? ` · owner: ${evaluation.owner}` : ""}
      </div>

      {/* ── Header ───────────────────────────────────────── */}
      <div className={`gp-head tier-${tier}`}>
        <div className="gp-score">{evaluation.score}</div>
        <div className="gp-headmain">
          <div className="gp-tier">{evaluation.tier}</div>
          <div className="gp-headmeta">
            Best play: <b>{gp.playLabel}</b> · est. value {money(evaluation.value_cents)}
            {facts.length ? <><br />{facts.join(" · ")}</> : null}
          </div>
          {evaluation.signals.length > 0 ? (
            <div className="deal-sigs">
              {evaluation.signals.map((s) => (
                <span key={s} className="deal-chip">{s}</span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* ── The deal ─────────────────────────────────────── */}
      <div className="section-header"><div className="section-title">The deal — all three plays</div></div>
      <div className="gp-deal-grid">
        <div className={`deal-detail-card${gp.play === "flip" ? " rec" : ""}`}>
          <h4>Fix &amp; flip{gp.play === "flip" ? <span className="gp-reclabel">recommended</span> : null}</h4>
          <div className="deal-detail-row"><span>After-repair value</span><span>{money(evaluation.flip.arv_cents)}</span></div>
          <div className="deal-detail-row"><span>Est. repairs</span><span>{money(evaluation.flip.repairs_cents)}</span></div>
          <div className="deal-detail-row"><span>Max offer (MAO)</span><span>{money(evaluation.flip.mao_cents)}</span></div>
          <div className="deal-detail-row"><span>Est. profit</span><span>{money(evaluation.flip.est_profit_cents)}</span></div>
          <div className="deal-detail-row"><span>Play score</span><span>{evaluation.flip.score}</span></div>
          <div className="gp-cardnote">The 70% rule: max offer = after-repair value &times; 0.70, then minus repairs. Budget about 12% of ARV for holding &amp; closing costs.</div>
        </div>
        <div className={`deal-detail-card${gp.play === "rental" ? " rec" : ""}`}>
          <h4>Rental{gp.play === "rental" ? <span className="gp-reclabel">recommended</span> : null}</h4>
          <div className="deal-detail-row"><span>Est. monthly rent</span><span>{money(evaluation.rental.monthly_rent_cents)}</span></div>
          <div className="deal-detail-row"><span>Cap rate</span><span>{evaluation.rental.cap_rate_pct}%</span></div>
          <div className="deal-detail-row"><span>Rent-to-value</span><span>{evaluation.rental.rent_to_value_pct}%</span></div>
          <div className="deal-detail-row"><span>Play score</span><span>{evaluation.rental.score}</span></div>
          <div className="gp-cardnote">A cap rate of 8% or more is strong for a SWFL single-family rental. Rent at 1% of price or higher is the classic screen.</div>
        </div>
        <div className={`deal-detail-card${gp.play === "wholesale" ? " rec" : ""}`}>
          <h4>Wholesale{gp.play === "wholesale" ? <span className="gp-reclabel">recommended</span> : null}</h4>
          <div className="deal-detail-row"><span>Est. value</span><span>{money(evaluation.value_cents)}</span></div>
          <div className="deal-detail-row"><span>Est. equity</span><span>{money(evaluation.wholesale.equity_cents)}</span></div>
          <div className="deal-detail-row"><span>Equity %</span><span>{evaluation.wholesale.equity_pct}%</span></div>
          <div className="deal-detail-row"><span>Play score</span><span>{evaluation.wholesale.score}</span></div>
          <div className="gp-cardnote">Wholesale potential rises with equity and motivated-seller signals — you lock a contract and assign it, never taking title.</div>
        </div>
      </div>

      {/* ── Repair scope ─────────────────────────────────── */}
      <div className="section-header"><div className="section-title">Repair scope — estimate</div></div>
      <div className="section">
        <p className="gp-prose" style={{ margin: "0 0 10px" }}>{rehab.basis}</p>
        {rehab.lines.map((l, i) => (
          <div key={i} className="gp-kv">
            <span className="k" title={l.note}>{l.category}</span>
            <span className="v">{money(l.cents)}</span>
          </div>
        ))}
        <div className="gp-kv">
          <span className="k" style={{ fontWeight: 700, color: "var(--text)" }}>Total estimated repairs</span>
          <span className="v">{money(rehab.total_cents)}</span>
        </div>
        <p className="gp-note-line">{rehab.disclaimer}</p>
      </div>

      {/* ── The play ─────────────────────────────────────── */}
      <div className="section-header"><div className="section-title">The recommended play</div></div>
      <div className="section">
        <p className="gp-prose">{gp.rationale}</p>
        <p className="gp-note-line">
          <span className={`gp-confidence ${gp.confidence.level}`}>{gp.confidence.level} confidence</span>
          &nbsp; {gp.confidence.note}
        </p>
      </div>

      {/* ── Acquire for the least ────────────────────────── */}
      <div className="section-header">
        <div className="section-title">Acquire it for the least cash</div>
        <Link href="/admin/realty/buyer-profile" className="section-link">Buyer profile →</Link>
      </div>
      <div className="gp-note-line" style={{ margin: "0 0 10px" }}>{acq.note}</div>
      <div style={{ display: "grid", gap: 8 }}>
        {acq.routes.map((r, i) => (
          <div key={r.id} className={`gp-route${i === 0 ? " cheapest" : ""}`}>
            <div className="gp-route-cash">
              <div className="gp-route-cash-num">{money(r.cash_cents)}</div>
              <div className="gp-route-cash-label">{r.cash_label}</div>
            </div>
            <div className="gp-route-main">
              <div className="gp-route-head">
                <span className="gp-route-name">{r.name}</span>
                <span className={`gp-fit gp-fit-${r.fit}`}>{r.fit.replace("-", " ")}</span>
                {i === 0 ? <span className="gp-reclabel">least cash</span> : null}
              </div>
              <p className="gp-route-summary">{r.summary}</p>
              <div className="gp-route-detail"><b>Needs:</b> {r.needs}</div>
              <div className="gp-route-detail"><b>Risk:</b> {r.risk}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── The loopholes ────────────────────────────────── */}
      <div className="section-header"><div className="section-title">The loopholes — every legal edge</div></div>
      <div className="section">
        <div className="gp-subhead" style={{ marginTop: 0 }}>Tax angles</div>
        {loop.taxAngles.map((t, i) => (
          <div key={i} className="gp-loop">
            <div className="gp-loop-head">
              <span className="gp-loop-name">{t.name}</span>
              {t.needs_pro ? <span className="pill">needs a pro</span> : null}
            </div>
            <p className="gp-loop-what">{t.what}</p>
            <p className="gp-loop-applies"><b>For this property:</b> {t.applies}</p>
            <div className="gp-loop-src">IRS source: {t.irs_source}</div>
          </div>
        ))}
        <div className="gp-subhead">Market &amp; legal edges</div>
        <ul className="gp-team">
          {loop.marketEdges.map((m, i) => (
            <li key={i}><b>{m.signal}</b> — {m.advantage}</li>
          ))}
        </ul>
        <p className="gp-note-line">{loop.financingNote}</p>
        <p className="gp-note-line"><b>{loop.disclaimer}</b></p>
      </div>

      {/* ── Links ────────────────────────────────────────── */}
      <div className="section-header"><div className="section-title">Work the property — links</div></div>
      <div className="gp-links">
        {gp.links.map((l) => (
          <div key={l.label} className="gp-link">
            <a href={l.url} target="_blank" rel="noopener noreferrer">{l.label} ↗</a>
            {l.note ? <span className="gp-link-note">{l.note}</span> : null}
          </div>
        ))}
      </div>

      {/* ── The people ───────────────────────────────────── */}
      <div className="section-header"><div className="section-title">The people</div></div>
      <div className="section">
        <div className="gp-kv"><span className="k">Owner of record</span><span className="v">{property.owner_name || "—"}</span></div>
        <div className="gp-kv"><span className="k">Owner mailing address</span><span className="v">{property.owner_mailing_address || "—"}</span></div>
        <div className="gp-kv"><span className="k">Lives at the property?</span><span className="v">{gp.ownerIsAbsentee ? "No — absentee owner" : "Likely yes"}</span></div>
        <div className="gp-subhead">First-contact letter — draft</div>
        <pre className="gp-letter">{outreach.letter}</pre>
        <div className="gp-subhead">If you reach them by phone</div>
        <p className="gp-prose">{outreach.phoneOpener}</p>
        <p className="gp-note-line">Review and personalize this before sending. Keep outreach honest and fair-housing compliant, never high-pressure. A mailed letter to the address above is the safe first touch — do not call or text a number listed on the Do-Not-Call registry. Owner phone and email via licensed skip-trace become available once a skip-trace provider key is added.</p>
        <div className="gp-subhead">Your deal team</div>
        <ul className="gp-team">
          <li>Title company or closing attorney — runs title and the closing.</li>
          <li>Funding source — a lender, hard money, or private money for the route you pick above.</li>
          <li>Contractor or inspector — confirms the real condition and the repair scope.</li>
          <li>Insurance agent — a real quote, which is critical on SWFL coastal property.</li>
          <li>For a wholesale exit — a standing cash-buyer list.</li>
        </ul>
      </div>

      {/* ── The documents ────────────────────────────────── */}
      <div className="section-header"><div className="section-title">The documents</div></div>
      <div className="section">
        <p className="gp-prose" style={{ marginBottom: 12 }}>
          Plain-language drafts of the contracts this play needs, filled in from the property data. Every document is a DRAFT for your attorney or title company to review and complete — never legal advice.
        </p>
        <div className="gp-links">
          {docs.map((d) => (
            <div key={d.type} className="gp-link">
              <Link href={`/admin/realty/${encodeURIComponent(id)}/contract/${d.type}`}>
                {d.name} →
              </Link>
              <span className="gp-link-note">{d.when}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── The plan ─────────────────────────────────────── */}
      <div className="section-header"><div className="section-title">Your action plan</div></div>
      <div className="section">
        <ol className="gp-steps">
          {gp.steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      </div>

      {/* ── Risks ────────────────────────────────────────── */}
      <div className="section-header"><div className="section-title">Risks &amp; watch-outs</div></div>
      <div className="section">
        {gp.risks.map((r, i) => (
          <div key={i} className={`gp-risk ${r.level}`}>
            <span className="gp-risk-dot" />
            <span>{r.text}</span>
          </div>
        ))}
      </div>

      {/* ── Deal stage ───────────────────────────────────── */}
      <div className="section-header"><div className="section-title">Deal stage</div></div>
      <div className="section">
        <DealStageControl propertyId={id} initial={stageEntry} />
      </div>

    </div>
  );
}
