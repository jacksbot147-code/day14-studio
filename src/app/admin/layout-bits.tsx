import Link from "next/link";

export const ADMIN_CSS = `
:root { --bg:#08070d; --surface:#13111a; --surface-2:#1a1825; --border:#2a2535; --text:#e8e6ea; --muted:#847a92; --accent:#b39ddb; --gold:#f5a623; --green:#6cd66c; --red:#ff6b6b; --purple:#a855f7; --cyan:#06b6d4; }
.admin-shell { font:14px/1.5 'SF Mono', Menlo, Monaco, Consolas, monospace; background:var(--bg); background-image:radial-gradient(at 80% 0%, rgba(168,85,247,0.15) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(6,182,212,0.1) 0px, transparent 50%); color:var(--text); padding:32px; max-width:1440px; margin:0 auto; min-height:100vh; }
.admin-shell h1 { font-size:36px; letter-spacing:-0.02em; margin-bottom:4px; background:linear-gradient(135deg,#fff,#b39ddb 50%,#06b6d4); -webkit-background-clip:text; background-clip:text; color:transparent; }
.admin-shell .sub { color:var(--muted); font-size:12px; margin-bottom:32px; }
.admin-shell a { color:inherit; text-decoration:none; }
.admin-shell .nav { display:flex; gap:4px; margin-bottom:24px; flex-wrap:wrap; }
.admin-shell .nav a { padding:8px 14px; background:var(--surface); border:1px solid var(--border); border-radius:8px; font-size:12px; color:var(--muted); text-transform:uppercase; letter-spacing:0.08em; transition:all 0.2s; }
.admin-shell .nav a:hover { color:var(--text); border-color:var(--accent); }
.admin-shell .nav a.active { background:linear-gradient(135deg,#a855f7,#06b6d4); color:white; border-color:transparent; }
.admin-shell .crumb { font-size:11px; color:var(--muted); margin-bottom:16px; text-transform:uppercase; letter-spacing:0.1em; }
.admin-shell .crumb a { color:var(--accent); }
.admin-shell .empire-bar { background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:24px; margin-bottom:24px; }
.admin-shell .empire-row { display:grid; grid-template-columns:200px 1fr 200px; gap:24px; align-items:center; }
.admin-shell .level-badge { text-align:center; }
.admin-shell .level-num { font-size:56px; font-weight:700; line-height:1; background:linear-gradient(135deg,#f5a623,#fff); -webkit-background-clip:text; background-clip:text; color:transparent; }
.admin-shell .level-label { font-size:11px; text-transform:uppercase; letter-spacing:0.15em; color:var(--muted); margin-top:4px; }
.admin-shell .xp-bar { width:100%; height:24px; background:var(--surface-2); border-radius:12px; overflow:hidden; position:relative; border:1px solid var(--border); }
.admin-shell .xp-fill { height:100%; background:linear-gradient(90deg,#a855f7,#06b6d4,#f5a623); border-radius:12px; box-shadow:0 0 12px rgba(168,85,247,0.4); }
.admin-shell .xp-text { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:600; text-shadow:0 0 8px rgba(0,0,0,0.8); }
.admin-shell .health-badge { text-align:center; }
.admin-shell .health-bar { width:100%; height:12px; background:var(--surface-2); border-radius:6px; overflow:hidden; margin-top:6px; border:1px solid var(--border); }
.admin-shell .health-fill { height:100%; }
.admin-shell .health-fill.good { background:var(--green); box-shadow:0 0 8px rgba(108,214,108,0.5); }
.admin-shell .health-fill.warn { background:var(--gold); }
.admin-shell .health-fill.bad { background:var(--red); animation:pulse 1.2s infinite; }
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
.admin-shell .kpi-grid { display:grid; grid-template-columns:repeat(6,1fr); gap:12px; margin-bottom:24px; }
.admin-shell .kpi { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:16px; }
.admin-shell .kpi-label { font-size:10px; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted); margin-bottom:6px; }
.admin-shell .kpi-value { font-size:22px; font-weight:700; }
.admin-shell .kpi-sub { font-size:11px; color:var(--muted); margin-top:2px; }
.admin-shell .section-header { display:flex; align-items:baseline; justify-content:space-between; margin:24px 0 12px; }
.admin-shell .section-title { font-size:14px; text-transform:uppercase; letter-spacing:0.2em; color:var(--muted); }
.admin-shell .tenant-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:16px; }
.admin-shell .char-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:20px; position:relative; overflow:hidden; transition:all 0.2s; }
.admin-shell .char-card:hover { transform:translateY(-4px); border-color:var(--accent); box-shadow:0 8px 24px rgba(168,85,247,0.2); }
.admin-shell .char-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:var(--accent); }
.admin-shell .char-card.rank-1::before { background:linear-gradient(90deg,#f5a623,#ffeb3b); }
.admin-shell .char-card.rank-2::before { background:linear-gradient(90deg,#c0c0c0,#fff); }
.admin-shell .char-card.rank-3::before { background:linear-gradient(90deg,#cd7f32,#f5a623); }
.admin-shell .char-header { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
.admin-shell .char-icon { width:48px; height:48px; background:var(--surface-2); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:24px; border:1px solid var(--border); }
.admin-shell .char-name { font-size:16px; font-weight:600; }
.admin-shell .char-class { font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:0.08em; }
.admin-shell .char-level { position:absolute; top:16px; right:16px; background:linear-gradient(135deg,#f5a623,#ff6b6b); color:white; padding:4px 10px; border-radius:100px; font-size:11px; font-weight:700; box-shadow:0 0 8px rgba(245,166,35,0.4); }
.admin-shell .char-stats { display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:12px; margin-top:12px; padding-top:12px; border-top:1px solid var(--border); }
.admin-shell .char-stat-label { color:var(--muted); }
.admin-shell .char-stat-value { font-weight:600; }
.admin-shell .streak-fire { color:var(--gold); }
.admin-shell .rank-badge { position:absolute; top:16px; left:16px; background:var(--surface-2); border-radius:100px; padding:2px 8px; font-size:10px; font-weight:700; border:1px solid var(--border); }
.admin-shell .char-click-hint { font-size:10px; color:var(--accent); margin-top:12px; text-align:center; opacity:0; transition:opacity 0.2s; }
.admin-shell .char-card:hover .char-click-hint { opacity:1; }
.admin-shell .battle-log { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:20px; max-height:500px; overflow-y:auto; }
.admin-shell .battle-entry { font-size:12px; padding:6px 0; border-bottom:1px solid var(--surface-2); display:grid; grid-template-columns:80px 110px 1fr; gap:12px; }
.admin-shell .battle-entry:last-child { border-bottom:none; }
.admin-shell .battle-time { color:var(--muted); }
.admin-shell .battle-tenant a { color:var(--cyan); }
.admin-shell .daemon-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:8px; }
.admin-shell .daemon { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:12px; display:flex; align-items:center; gap:10px; }
.admin-shell .daemon-status { width:8px; height:8px; border-radius:50%; }
.admin-shell .daemon-status.healthy { background:var(--green); box-shadow:0 0 8px var(--green); }
.admin-shell .daemon-status.stale { background:var(--red); animation:pulse 1.2s infinite; }
.admin-shell .daemon-status.error { background:var(--muted); }
.admin-shell .daemon-name { font-size:11px; font-family:'SF Mono',monospace; flex:1; }
.admin-shell .daemon-age { font-size:10px; color:var(--muted); }
.admin-shell .section { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:20px; }
.admin-shell .content-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(160px, 1fr)); gap:12px; }
.admin-shell .content-stat { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:14px; }
.admin-shell .content-stat-icon { font-size:24px; margin-bottom:6px; }
.admin-shell .content-stat-num { font-size:24px; font-weight:700; }
.admin-shell .content-stat-label { font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:0.05em; margin-top:2px; }
.admin-shell .queue-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:8px; }
.admin-shell .queue-cell { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:10px; text-align:center; }
.admin-shell .queue-cell-name { font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:6px; }
.admin-shell .queue-counts { display:flex; gap:6px; justify-content:center; align-items:center; font-size:12px; }
.admin-shell .queue-counts .q { color:var(--gold); }
.admin-shell .queue-counts .a { color:var(--accent); }
.admin-shell .queue-counts .p { color:var(--green); }
.admin-shell .opp-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:18px; margin-bottom:12px; }
.admin-shell .opp-score-badge { display:inline-block; padding:3px 10px; border-radius:100px; font-size:11px; font-weight:700; }
.admin-shell .opp-score-badge.high { background:linear-gradient(135deg,#10b981,#06b6d4); color:white; }
.admin-shell .opp-score-badge.medium { background:var(--gold); color:#08070d; }
.admin-shell .opp-score-badge.low { background:var(--surface-2); color:var(--muted); }

/* Mobile responsive */
@media (max-width: 768px) {
  .admin-shell { padding:16px; }
  .admin-shell h1 { font-size:26px; }
  .admin-shell .empire-row { grid-template-columns:1fr; gap:16px; }
  .admin-shell .kpi-grid { grid-template-columns:repeat(2,1fr) !important; }
  .admin-shell .tenant-grid { grid-template-columns:1fr; }
  .admin-shell .daemon-grid { grid-template-columns:repeat(2,1fr); }
  .admin-shell .nav { overflow-x:auto; flex-wrap:nowrap; -webkit-overflow-scrolling:touch; }
  .admin-shell .nav a { flex-shrink:0; }
  .admin-shell .battle-entry { grid-template-columns:60px 90px 1fr; font-size:11px; }
  .admin-shell .content-grid { grid-template-columns:repeat(2,1fr); }
  .admin-shell .queue-grid { grid-template-columns:repeat(2,1fr); }
  .admin-shell .level-num { font-size:42px; }
  .admin-shell table { font-size:11px; }
}
@media (max-width: 480px) {
  .admin-shell .kpi-value { font-size:18px; }
  .admin-shell .kpi-label { font-size:9px; }
  .admin-shell .char-card { padding:14px; }
}
`;

interface NavProps { active: string; }
export function AdminNav({ active }: NavProps) {
  const pages = [
    { id: "empire", href: "/admin", label: "⚔ Empire" },
    { id: "inbox", href: "/admin/inbox", label: "📬 Inbox" },
    { id: "opps", href: "/admin/opportunities", label: "💡 Ideas" },
    { id: "finance", href: "/admin/finance", label: "💼 Finance" },
    { id: "health", href: "/admin/health", label: "🩺 Health" },
  ];
  return (
    <nav className="nav">
      {pages.map((p) => (
        <Link key={p.id} href={p.href} prefetch={false} className={p.id === active ? "active" : ""}>
          {p.label}
        </Link>
      ))}
    </nav>
  );
}
