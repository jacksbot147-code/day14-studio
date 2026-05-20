import Link from "next/link";

export const ADMIN_CSS = `
:root {
  --bg:#f7f8fa; --surface:#ffffff; --surface-2:#f1f3f5; --surface-3:#e9ecef;
  --border:#e4e7eb; --border-strong:#d3d8de;
  --text:#1c2024; --text-2:#3d434a; --muted:#737a82;
  --accent:#4f46e5; --accent-text:#4338ca; --accent-soft:#eef0fe;
  --green:#15803d; --green-soft:#e7f6ec;
  --gold:#b45309; --amber:#b45309; --amber-soft:#fbf0db;
  --red:#dc2626; --red-soft:#fdeceb;
  --cyan:#0e7490; --purple:#7c3aed;
  --shadow:0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.05);
  --mono:'SF Mono', ui-monospace, Menlo, Monaco, Consolas, monospace;
}
.admin-shell { font:14px/1.55 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background:var(--bg); color:var(--text); padding:28px 24px 72px; max-width:1200px; margin:0 auto; min-height:100vh; -webkit-font-smoothing:antialiased; }
.admin-shell h1 { font-size:24px; font-weight:600; letter-spacing:-0.015em; margin:0 0 2px; color:var(--text); }
.admin-shell h3 { font-size:15px; font-weight:600; color:var(--text); margin:0; }
.admin-shell .sub { color:var(--muted); font-size:13px; margin-bottom:22px; }
.admin-shell a { color:inherit; text-decoration:none; }
.admin-shell code { font-family:var(--mono); font-size:12px; background:var(--surface-2); border:1px solid var(--border); border-radius:5px; padding:1px 6px; color:var(--accent-text); }

/* ── Nav ─────────────────────────────────────────────── */
.admin-shell .nav { display:flex; gap:2px; margin-bottom:22px; flex-wrap:wrap; align-items:center; }
.admin-shell .nav a { padding:7px 13px; border-radius:8px; font-size:13px; font-weight:500; color:var(--muted); transition:background 0.13s, color 0.13s; }
.admin-shell .nav a:hover { background:var(--surface-2); color:var(--text); }
.admin-shell .nav a.active { background:var(--accent-soft); color:var(--accent-text); font-weight:600; }
.admin-shell .nav a.nav-site { margin-left:auto; border:1px solid var(--border); background:var(--surface); color:var(--accent-text); font-weight:500; box-shadow:var(--shadow); }
.admin-shell .nav a.nav-site:hover { border-color:var(--accent); background:var(--accent-soft); }

/* ── Site CTA ────────────────────────────────────────── */
.admin-shell .site-cta { display:inline-flex; align-items:center; gap:7px; padding:9px 16px; background:var(--accent); color:#fff; border-radius:9px; font-size:13px; font-weight:600; margin-bottom:22px; transition:background 0.15s; box-shadow:var(--shadow); }
.admin-shell .site-cta:hover { background:var(--accent-text); }
.admin-shell .site-pending { display:inline-flex; align-items:center; gap:7px; padding:9px 14px; background:var(--surface); border:1px dashed var(--border-strong); border-radius:9px; font-size:13px; color:var(--muted); margin-bottom:22px; }

/* ── Breadcrumb ──────────────────────────────────────── */
.admin-shell .crumb { font-size:12px; color:var(--muted); margin-bottom:14px; }
.admin-shell .crumb a { color:var(--accent-text); font-weight:500; }

/* ── KPI strip ───────────────────────────────────────── */
.admin-shell .kpi-grid { display:grid; grid-template-columns:repeat(6,1fr); gap:12px; margin-bottom:4px; }
.admin-shell .kpi { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:15px 16px; box-shadow:var(--shadow); }
.admin-shell .kpi-label { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; color:var(--muted); margin-bottom:8px; }
.admin-shell .kpi-value { font-size:23px; font-weight:600; letter-spacing:-0.02em; color:var(--text); line-height:1.1; }
.admin-shell .kpi-sub { font-size:12px; color:var(--muted); margin-top:4px; }

/* ── Section ─────────────────────────────────────────── */
.admin-shell .section-header { display:flex; align-items:baseline; justify-content:space-between; gap:12px; margin:28px 0 12px; }
.admin-shell .section-title { font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.07em; color:var(--muted); }
.admin-shell .section-link { font-size:12px; color:var(--accent-text); font-weight:500; }
.admin-shell .section { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:18px 20px; box-shadow:var(--shadow); }
.admin-shell .panel-grid { display:grid; grid-template-columns:1.5fr 1fr; gap:16px; }
.admin-shell .empty { color:var(--muted); text-align:center; padding:30px 20px; font-size:13px; line-height:1.6; }

/* ── To-do panel ─────────────────────────────────────── */
.admin-shell .todo-panel { background:var(--surface); border:1px solid var(--border); border-radius:12px; box-shadow:var(--shadow); padding:2px 18px; }
.admin-shell .todo-panel.has-items { border-color:#e6c98f; }
.admin-shell .todo-empty { color:var(--muted); text-align:center; padding:24px 20px; font-size:13px; }
.admin-shell .todo-row { display:flex; gap:13px; align-items:flex-start; padding:14px 0; border-bottom:1px solid var(--border); }
.admin-shell .todo-row:last-child { border-bottom:none; }
.admin-shell .todo-seq { width:26px; height:26px; flex-shrink:0; background:var(--surface-2); border:1px solid var(--border); border-radius:7px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; color:var(--muted); }
.admin-shell .todo-row.pri-high .todo-seq { color:var(--red); background:var(--red-soft); border-color:#f3c9c5; }
.admin-shell .todo-body { flex:1; min-width:0; }
.admin-shell .todo-title { font-size:14px; font-weight:600; color:var(--text); }
.admin-shell .todo-detail { font-size:13px; color:var(--muted); margin-top:3px; line-height:1.5; }
.admin-shell .todo-meta { margin-top:8px; display:flex; gap:6px; flex-wrap:wrap; }
.admin-shell .pill { font-size:11px; background:var(--surface-2); border:1px solid var(--border); border-radius:6px; padding:2px 8px; color:var(--muted); text-transform:capitalize; }
.admin-shell .pill.pri-high { color:var(--red); background:var(--red-soft); border-color:#f3c9c5; }
.admin-shell .todo-action { flex-shrink:0; align-self:center; }
.admin-shell .todo-done-btn { display:inline-block; padding:7px 14px; background:var(--surface); border:1px solid var(--border-strong); color:var(--text-2); border-radius:8px; font-size:12px; font-weight:600; transition:all 0.13s; }
.admin-shell .todo-done-btn:hover { border-color:var(--green); color:var(--green); background:var(--green-soft); }
.admin-shell .todo-done-hint { font-size:12px; color:var(--muted); white-space:nowrap; }
.admin-shell .todo-done-hint code { color:var(--accent-text); }

/* ── Businesses list ─────────────────────────────────── */
.admin-shell .biz-list { background:var(--surface); border:1px solid var(--border); border-radius:12px; box-shadow:var(--shadow); overflow:hidden; }
.admin-shell .biz-row { display:flex; align-items:center; gap:16px; padding:14px 18px; border-bottom:1px solid var(--border); transition:background 0.12s; }
.admin-shell .biz-row:last-child { border-bottom:none; }
.admin-shell .biz-row:hover { background:var(--surface-2); }
.admin-shell .biz-main { flex:1; min-width:0; }
.admin-shell .biz-name { font-size:14px; font-weight:600; color:var(--text); }
.admin-shell .biz-sub { font-size:12px; color:var(--muted); margin-top:2px; }
.admin-shell .biz-stats { display:flex; gap:24px; flex-shrink:0; }
.admin-shell .biz-stat { text-align:right; min-width:58px; }
.admin-shell .biz-stat-num { font-size:14px; font-weight:600; color:var(--text); }
.admin-shell .biz-stat-label { font-size:10px; text-transform:uppercase; letter-spacing:0.05em; color:var(--muted); margin-top:2px; }
.admin-shell .biz-arrow { color:var(--border-strong); font-size:17px; flex-shrink:0; }
.admin-shell .stage-pill { font-size:11px; font-weight:600; padding:3px 9px; border-radius:100px; text-transform:capitalize; white-space:nowrap; }
.admin-shell .stage-live { background:var(--green-soft); color:var(--green); }
.admin-shell .stage-building { background:var(--amber-soft); color:var(--amber); }
.admin-shell .stage-failed { background:var(--red-soft); color:var(--red); }
.admin-shell .stage-default { background:var(--surface-2); color:var(--muted); }

/* ── Agents ──────────────────────────────────────────── */
.admin-shell .agent-row { display:grid; grid-template-columns:1.5fr 64px 70px 1.5fr; gap:12px; align-items:center; padding:10px 2px; border-bottom:1px solid var(--border); font-size:13px; }
.admin-shell .agent-row:last-child { border-bottom:none; }
.admin-shell .agent-row.head { color:var(--muted); font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.07em; border-bottom:1px solid var(--border-strong); }
.admin-shell .agent-name { font-weight:600; color:var(--text); font-family:var(--mono); font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.admin-shell .agent-runs { color:var(--text); font-weight:600; }
.admin-shell .agent-last { color:var(--muted); }
.admin-shell .agent-action { color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

/* ── Daemons ─────────────────────────────────────────── */
.admin-shell .daemon-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(210px, 1fr)); gap:8px; }
.admin-shell .daemon { background:var(--surface); border:1px solid var(--border); border-radius:9px; padding:10px 12px; display:flex; align-items:center; gap:9px; box-shadow:var(--shadow); }
.admin-shell .daemon-status { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.admin-shell .daemon-status.healthy { background:var(--green); }
.admin-shell .daemon-status.stale { background:var(--red); }
.admin-shell .daemon-status.error { background:var(--muted); }
.admin-shell .daemon-name { font-size:12px; font-family:var(--mono); flex:1; color:var(--text-2); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.admin-shell .daemon-age { font-size:11px; color:var(--muted); }
.admin-shell .sys-row { display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border); font-size:13px; }
.admin-shell .sys-row:last-child { border-bottom:none; }
.admin-shell .sys-label { color:var(--muted); }
.admin-shell .sys-value { font-weight:600; color:var(--text); }

/* ── Activity feed ───────────────────────────────────── */
.admin-shell .feed-row { display:grid; grid-template-columns:84px 150px 1fr; gap:12px; padding:9px 0; border-bottom:1px solid var(--border); font-size:13px; align-items:baseline; }
.admin-shell .feed-row:last-child { border-bottom:none; }
.admin-shell .feed-time { color:var(--muted); font-size:12px; }
.admin-shell .feed-actor { color:var(--accent-text); font-weight:600; font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.admin-shell .feed-actor a { color:var(--accent-text); }
.admin-shell .feed-text { color:var(--text-2); }

/* ── Ops / content / queue stat grids ────────────────── */
.admin-shell .ops-grid, .admin-shell .content-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:10px; }
.admin-shell .ops-stat, .admin-shell .content-stat { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:14px; box-shadow:var(--shadow); }
.admin-shell .ops-stat-num, .admin-shell .content-stat-num { font-size:21px; font-weight:600; color:var(--text); }
.admin-shell .ops-stat-label, .admin-shell .content-stat-label { font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:0.05em; margin-top:3px; }
.admin-shell .queue-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:8px; }
.admin-shell .queue-cell { background:var(--surface); border:1px solid var(--border); border-radius:9px; padding:11px; text-align:center; box-shadow:var(--shadow); }
.admin-shell .queue-cell-name { font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:6px; }
.admin-shell .queue-counts { display:flex; gap:6px; justify-content:center; align-items:center; font-size:13px; }
.admin-shell .queue-counts .q { color:var(--amber); font-weight:600; }
.admin-shell .queue-counts .a { color:var(--accent-text); font-weight:600; }
.admin-shell .queue-counts .p { color:var(--green); font-weight:600; }

/* ── Realty deal cards ───────────────────────────────── */
.admin-shell .deal { display:flex; gap:14px; align-items:center; background:var(--surface); border:1px solid var(--border); border-left-width:3px; border-radius:10px; padding:14px 16px; box-shadow:var(--shadow); }
.admin-shell .deal-a { border-left-color:var(--green); }
.admin-shell .deal-b { border-left-color:var(--amber); }
.admin-shell .deal-c { border-left-color:var(--border-strong); }
.admin-shell .deal-score { width:44px; height:44px; flex-shrink:0; border-radius:9px; background:var(--surface-2); display:flex; align-items:center; justify-content:center; font-size:17px; font-weight:700; color:var(--text); }
.admin-shell .deal-a .deal-score { color:var(--green); background:var(--green-soft); }
.admin-shell .deal-b .deal-score { color:var(--amber); background:var(--amber-soft); }
.admin-shell .deal-c .deal-score { color:var(--muted); }
.admin-shell .deal-addr { font-size:14px; font-weight:600; color:var(--text); }
.admin-shell .deal-meta { font-size:12px; color:var(--muted); margin-top:3px; }
.admin-shell .deal-sigs { margin-top:7px; display:flex; flex-wrap:wrap; gap:5px; }
.admin-shell .deal-chip { font-size:11px; background:var(--surface-2); border:1px solid var(--border); border-radius:100px; padding:2px 8px; color:var(--muted); }
.admin-shell .deal-plays { display:flex; flex-direction:column; gap:3px; font-size:11px; color:var(--muted); text-align:right; flex-shrink:0; }

/* ── Realty interactive toolbar ──────────────────────── */
.admin-shell .toolbar { display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin-bottom:10px; }
.admin-shell .search-input { flex:1; min-width:220px; padding:9px 12px; border:1px solid var(--border); border-radius:9px; background:var(--surface); color:var(--text); font-size:13px; font-family:inherit; outline:none; box-shadow:var(--shadow); }
.admin-shell .search-input:focus { border-color:var(--accent); }
.admin-shell .search-input::placeholder { color:var(--muted); }
.admin-shell .filter-group { display:flex; gap:4px; flex-wrap:wrap; }
.admin-shell .filter-chip { padding:6px 11px; border:1px solid var(--border); border-radius:100px; background:var(--surface); color:var(--muted); font-size:12px; font-weight:500; cursor:pointer; font-family:inherit; transition:background 0.12s, color 0.12s, border-color 0.12s; }
.admin-shell .filter-chip:hover { border-color:var(--border-strong); color:var(--text); }
.admin-shell .filter-chip.active { background:var(--accent-soft); border-color:var(--accent); color:var(--accent-text); font-weight:600; }
.admin-shell .sort-select { padding:8px 10px; border:1px solid var(--border); border-radius:9px; background:var(--surface); color:var(--text); font-size:12px; font-family:inherit; cursor:pointer; box-shadow:var(--shadow); }
.admin-shell .toolbar-count { font-size:12px; color:var(--muted); margin:0 0 10px; }
.admin-shell .add-county { display:flex; gap:8px; margin-bottom:14px; flex-wrap:wrap; }
.admin-shell .add-county-btn { display:inline-flex; align-items:center; padding:9px 16px; background:var(--accent); color:#fff; border:none; border-radius:9px; font-size:13px; font-weight:600; white-space:nowrap; box-shadow:var(--shadow); cursor:pointer; font-family:inherit; }
.admin-shell .add-county-btn:hover { background:var(--accent-text); }
.admin-shell .add-county-btn:disabled { background:var(--surface-3); color:var(--muted); cursor:not-allowed; box-shadow:none; }
.admin-shell .deal-card-wrap { display:flex; flex-direction:column; gap:8px; }
.admin-shell .deal.expandable { cursor:pointer; transition:border-color 0.12s; }
.admin-shell .deal.expandable:hover { border-color:var(--border-strong); }
.admin-shell .deal-detail { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
.admin-shell .deal-detail-card { background:var(--surface-2); border:1px solid var(--border); border-radius:9px; padding:11px 13px; }
.admin-shell .deal-detail-card h4 { margin:0 0 7px; font-size:11px; text-transform:uppercase; letter-spacing:0.06em; color:var(--muted); font-weight:600; }
.admin-shell .deal-detail-row { display:flex; justify-content:space-between; gap:10px; font-size:12px; padding:2px 0; }
.admin-shell .deal-detail-row span:first-child { color:var(--muted); }
.admin-shell .deal-detail-row span:last-child { color:var(--text); font-weight:600; }

/* ── Opportunity / inbox cards ───────────────────────── */
.admin-shell .opp-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:16px 18px; margin-bottom:10px; box-shadow:var(--shadow); }
.admin-shell .opp-score-badge { display:inline-block; padding:3px 10px; border-radius:100px; font-size:12px; font-weight:700; }
.admin-shell .opp-score-badge.high { background:var(--green-soft); color:var(--green); }
.admin-shell .opp-score-badge.medium { background:var(--amber-soft); color:var(--amber); }
.admin-shell .opp-score-badge.low { background:var(--surface-2); color:var(--muted); }

/* ── Mobile ──────────────────────────────────────────── */
@media (max-width: 880px) {
  .admin-shell .kpi-grid { grid-template-columns:repeat(2,1fr) !important; }
  .admin-shell .panel-grid { grid-template-columns:1fr; }
  .admin-shell .nav { overflow-x:auto; flex-wrap:nowrap; -webkit-overflow-scrolling:touch; }
  .admin-shell .nav a { flex-shrink:0; }
  .admin-shell .nav a.nav-site { margin-left:0; }
}
@media (max-width: 768px) {
  .admin-shell { padding:16px 14px 56px; }
  .admin-shell h1 { font-size:21px; }
  .admin-shell .biz-row { flex-wrap:wrap; gap:10px; }
  .admin-shell .biz-stats { gap:18px; }
  .admin-shell .agent-row { grid-template-columns:1fr 50px 60px; }
  .admin-shell .agent-row .agent-action { display:none; }
  .admin-shell .feed-row { grid-template-columns:64px 1fr; }
  .admin-shell .feed-row .feed-actor { display:none; }
  .admin-shell table { font-size:11px; }
  .admin-shell .deal-detail { grid-template-columns:1fr; }
  .admin-shell .search-input { min-width:100%; }
}
`;

// ── Public-facing websites ────────────────────────────────────────────────
// The live empire site. Per-tenant brand sites are resolved at render time
// from public/data/brand-sites.json (see loadBrandSites in admin-state).
export const SITE_URL = "https://day14.us";

interface NavProps { active: string; siteUrl?: string; siteLabel?: string; }
export function AdminNav({ active, siteUrl = SITE_URL, siteLabel = "day14.us" }: NavProps) {
  const pages = [
    { id: "empire", href: "/admin", label: "Overview" },
    { id: "realty", href: "/admin/realty", label: "Realty" },
    { id: "inbox", href: "/admin/inbox", label: "Inbox" },
    { id: "opps", href: "/admin/opportunities", label: "Ideas" },
    { id: "finance", href: "/admin/finance", label: "Finance" },
    { id: "health", href: "/admin/health", label: "Health" },
  ];
  return (
    <nav className="nav">
      {pages.map((p) => (
        <Link key={p.id} href={p.href} prefetch={false} className={p.id === active ? "active" : ""}>
          {p.label}
        </Link>
      ))}
      <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="nav-site">
        {siteLabel} ↗
      </a>
    </nav>
  );
}

/** Prominent "open the live website in a new tab" button for the top of a dashboard. */
export function SiteCta({ url, label }: { url: string; label: string }) {
  return (
    <div>
      <a href={url} target="_blank" rel="noopener noreferrer" className="site-cta">
        {label} <span style={{ opacity: 0.75 }}>↗</span>
      </a>
    </div>
  );
}
