import Link from "next/link";
import { AdminNav, ADMIN_CSS, PageHint } from "../layout-bits";
import {
  CREW_ROSTER,
  FLEET_META,
  unitsByFleet,
  stateClass,
  stateLabel,
  type CrewUnit,
} from "@/lib/crew";

export const metadata = {
  title: "Day14 — Mission Control v2 · Robot Cosmodrome",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const PAGE_CSS = `
  .crew-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:16px; margin:16px 0 28px; }
  .crew-card {
    border:1px solid var(--border); border-left-width:3px; border-radius:8px;
    padding:16px 18px; background:var(--surface);
    display:flex; flex-direction:column; gap:8px;
  }
  .crew-card .desig {
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    font-size:18px; font-weight:700; letter-spacing:0.04em; color:var(--ink-900);
  }
  .crew-card .role { font-size:13px; color:var(--ink-700); font-weight:500; }
  .crew-card .meta { font-size:12px; color:var(--ink-500); font-style:italic; margin-top:-2px; }
  .crew-card .wraps {
    font-size:12px; color:var(--ink-700);
    background:var(--surface-2); border-radius:6px; padding:8px 10px;
    line-height:1.5;
  }
  .crew-card .wraps strong { color:var(--ink-900); font-weight:600; display:block; margin-bottom:4px; font-size:11px; text-transform:uppercase; letter-spacing:0.06em; }
  .crew-card .action {
    font-size:13px; color:var(--ink-900); font-weight:500;
    padding-top:6px; border-top:1px dashed var(--border);
  }
  .crew-card .action::before { content: "→ "; color:var(--accent); }
  .crew-card .plugins { display:flex; flex-wrap:wrap; gap:4px; }
  .crew-card .plugins .pin {
    font-size:10px; padding:2px 6px; border-radius:10px;
    background:var(--accent-soft); color:var(--accent-strong);
    font-family: ui-monospace, "SF Mono", Menlo, monospace; font-weight:600;
    text-transform:lowercase;
  }
  .crew-card .state-chip {
    align-self:flex-start; font-size:10px; font-weight:700;
    padding:2px 8px; border-radius:10px; letter-spacing:0.08em;
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
  }
  .crew-state-active   { background:#dcfce7; color:#166534; }
  .crew-state-watch    { background:#fef3c7; color:#854d0e; }
  .crew-state-parked   { background:#e5e7eb; color:#475569; }
  .crew-state-offline  { background:#fee2e2; color:#991b1b; }
  .crew-state-planned  { background:#dbeafe; color:#1e40af; }

  .crew-card.left-active   { border-left-color:#16a34a; }
  .crew-card.left-watch    { border-left-color:#d97706; }
  .crew-card.left-parked   { border-left-color:#94a3b8; }
  .crew-card.left-offline  { border-left-color:#dc2626; }
  .crew-card.left-planned  { border-left-color:#2563eb; }

  .fleet-header {
    margin-top:32px; margin-bottom:8px;
    padding-bottom:8px; border-bottom:1px solid var(--border);
  }
  .fleet-header h2 { font-size:18px; font-weight:700; margin:0; color:var(--ink-900); }
  .fleet-header p { font-size:13px; color:var(--ink-500); margin:4px 0 0; }

  .legend { display:flex; flex-wrap:wrap; gap:10px; margin:8px 0 20px; font-size:11px; }
  .legend .item { display:flex; align-items:center; gap:6px; color:var(--ink-700); }
  .legend .dot { width:8px; height:8px; border-radius:50%; }

  .roster-meta {
    background:var(--surface-2); border:1px solid var(--border);
    border-radius:8px; padding:14px 18px; margin:12px 0 20px;
    display:grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap:12px;
  }
  .roster-meta .stat { display:flex; flex-direction:column; gap:2px; }
  .roster-meta .stat .n { font-size:22px; font-weight:700; font-family: ui-monospace, "SF Mono", Menlo, monospace; color:var(--ink-900); }
  .roster-meta .stat .l { font-size:11px; color:var(--ink-500); text-transform:uppercase; letter-spacing:0.06em; }
`;

function CrewCard({ unit }: { unit: CrewUnit }) {
  const stateCls = stateClass(unit.state);
  const leftCls = `left-${unit.state}`;
  return (
    <div className={`crew-card ${leftCls}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <div className="desig">{unit.designation}</div>
          <div className="role">{unit.role}</div>
        </div>
        <span className={`state-chip ${stateCls}`}>{stateLabel(unit.state)}</span>
      </div>
      <div className="meta">{unit.rootMeaning} · {unit.signature}</div>
      {unit.pluginAssignments && unit.pluginAssignments.length > 0 ? (
        <div className="plugins">
          {unit.pluginAssignments.map((p) => (
            <span key={p} className="pin">{p}</span>
          ))}
        </div>
      ) : null}
      <div className="wraps">
        <strong>Wraps</strong>
        {unit.wraps.join(" · ")}
      </div>
      <div className="action">{unit.primaryAction}</div>
    </div>
  );
}

export default function MissionControlV2() {
  const fleets = unitsByFleet();
  const stateCounts = CREW_ROSTER.reduce<Record<string, number>>((acc, u) => {
    acc[u.state] = (acc[u.state] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS + PAGE_CSS }} />
      <main className="admin-shell">
        <AdminNav active="crew" />
        <h1>Mission Control v2 — Robot Cosmodrome</h1>
        <PageHint>
          24 Russian-cosmonaut-designated robot operators across 6 fleets. Every unit wraps
          real running agents in the empire. Brutalist mechanical naming, deliberately not
          anthropomorphized. Source of truth: <code>src/lib/crew.ts</code>.
        </PageHint>

        <div className="roster-meta">
          <div className="stat">
            <span className="n">{CREW_ROSTER.length}</span>
            <span className="l">Total units</span>
          </div>
          <div className="stat">
            <span className="n">{fleets.length}</span>
            <span className="l">Fleets</span>
          </div>
          <div className="stat">
            <span className="n">{stateCounts.active ?? 0}</span>
            <span className="l">Active</span>
          </div>
          <div className="stat">
            <span className="n">{stateCounts.parked ?? 0}</span>
            <span className="l">Parked</span>
          </div>
          <div className="stat">
            <span className="n">{stateCounts.planned ?? 0}</span>
            <span className="l">Planned</span>
          </div>
          <div className="stat">
            <span className="n">{stateCounts.offline ?? 0}</span>
            <span className="l">Offline</span>
          </div>
        </div>

        <div className="legend">
          <div className="item"><span className="dot" style={{ background: "#16a34a" }} /> Active</div>
          <div className="item"><span className="dot" style={{ background: "#94a3b8" }} /> Parked</div>
          <div className="item"><span className="dot" style={{ background: "#2563eb" }} /> Planned</div>
          <div className="item"><span className="dot" style={{ background: "#dc2626" }} /> Offline</div>
          <div className="item"><span className="dot" style={{ background: "#d97706" }} /> Watch</div>
        </div>

        {fleets.map(({ fleet, units }) => {
          const meta = FLEET_META[fleet];
          return (
            <section key={fleet}>
              <div className="fleet-header">
                <h2>{meta.label}</h2>
                <p>{meta.subtitle}</p>
              </div>
              <div className="crew-grid">
                {units.map((u) => (
                  <CrewCard key={u.designation} unit={u} />
                ))}
              </div>
            </section>
          );
        })}

        <p style={{ fontSize: 13, color: "var(--ink-500)", marginTop: 32, lineHeight: 1.6 }}>
          Planning source:{" "}
          <Link href="https://github.com/jacksbot147-code/day14-studio/blob/main/docs/MISSION-CONTROL-V2-FULL-EMPIRE.md" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
            MISSION-CONTROL-V2-FULL-EMPIRE.md
          </Link>{" "}
          (2026-05-27). Names mean (Cyrillic roots): MIRA = world, VOSTOK = east, STRAZH = guard,
          ZORKII = sharp-sighted, SCHET = count. Per-fleet glossaries inside <code>crew.ts</code>.
        </p>
      </main>
    </>
  );
}
