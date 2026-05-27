import Link from "next/link";
import { DESIGN_TOKENS } from "@/lib/design-tokens";
import { SearchBox } from "./search-box";

export const ADMIN_CSS = `
/* Day14 admin — a sharp, line-driven command center.
 * Definition over softness: hairline rules and crisp borders carry the
 * structure, near-square edges, big editorial numbers against small
 * uppercase labels. One ember accent, used with restraint.
 *
 * The :root token block is sourced from src/lib/design-tokens.ts so the
 * admin and per-brand sites share one canonical palette + geometry. */
${DESIGN_TOKENS}
.admin-shell { font:14px/1.55 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background:var(--bg); color:var(--text); padding:40px 24px 96px; max-width:1200px; margin:0 auto; min-height:100vh; -webkit-font-smoothing:antialiased; }
.admin-shell h1 { font-size:32px; font-weight:800; letter-spacing:-0.04em; margin:0 0 4px; color:var(--text); line-height:1.05; }
.admin-shell h3 { font-size:15px; font-weight:700; letter-spacing:-0.02em; color:var(--text); margin:0; }
.admin-shell .sub { color:var(--muted); font-size:13px; margin-bottom:24px; padding-bottom:20px; border-bottom:1px solid var(--border); }
.admin-shell .page-hint { color:var(--text-2); font-size:13px; line-height:1.5; margin:0 0 6px; }
.admin-shell a { color:inherit; text-decoration:none; }
.admin-shell ::selection { background:var(--accent); color:#fff; }
.admin-shell *:focus-visible { outline:none; box-shadow:var(--ring); border-radius:var(--r-sm); }
.admin-shell code { font-family:var(--mono); font-size:12px; background:var(--surface-2); border:1px solid var(--border); border-radius:var(--r-sm); padding:1px 6px; color:var(--accent-text); }

/* ── Nav — hairline-divided tab strip ────────────────── */
.admin-shell .nav { display:flex; gap:0; margin-bottom:24px; flex-wrap:wrap; align-items:center; border-bottom:1px solid var(--border); }
.admin-shell .nav a { padding:9px 14px; font-size:13px; font-weight:600; color:var(--muted); border-bottom:2px solid transparent; margin-bottom:-1px; transition:color 0.13s ease, border-color 0.13s ease; }
.admin-shell .nav a:hover { color:var(--text); }
.admin-shell .nav a.active { color:var(--text); border-bottom-color:var(--accent); }
.admin-shell .nav a.nav-site { border:1px solid var(--border-strong); border-bottom-width:1px; margin-bottom:0; align-self:center; background:var(--surface); color:var(--accent-text); font-weight:600; border-radius:var(--r-sm); padding:6px 12px; }
.admin-shell .nav a.nav-site:hover { border-color:var(--accent); background:var(--accent-soft); color:var(--accent-text); }

/* ── Nav search — empire-wide search input docked in the nav ─── */
.admin-shell .nav-search-form { display:flex; flex:1 1 220px; min-width:0; margin:0 10px 6px auto; align-self:center; max-width:320px; }
.admin-shell .nav-search-input { width:100%; min-width:0; padding:6px 10px; font-size:12px; }
@media (max-width: 880px) {
  .admin-shell .nav-search-form { flex:1 1 100%; max-width:none; margin:6px 0; }
}

/* ── Site CTA — flat ink-orange fill, no glow ────────── */
.admin-shell .site-cta { display:inline-flex; align-items:center; gap:7px; padding:9px 16px; background:var(--accent); color:#fff; border:1px solid var(--accent); border-radius:var(--r-sm); font-size:13px; font-weight:700; margin-bottom:24px; transition:background 0.15s ease, border-color 0.15s ease, transform 0.1s ease; }
.admin-shell .site-cta:hover { background:var(--accent-text); border-color:var(--accent-text); }
.admin-shell .site-cta:active { transform:translateY(1px); }
.admin-shell .site-pending { display:inline-flex; align-items:center; gap:7px; padding:9px 14px; background:var(--surface); border:1px dashed var(--border-strong); border-radius:var(--r-sm); font-size:13px; color:var(--muted); margin-bottom:24px; }

/* ── Breadcrumb ──────────────────────────────────────── */
.admin-shell .crumb { font-size:11px; color:var(--muted); margin-bottom:14px; text-transform:uppercase; letter-spacing:0.1em; font-weight:600; }
.admin-shell .crumb a { color:var(--accent-text); font-weight:700; transition:color 0.12s ease; }
.admin-shell .crumb a:hover { color:var(--accent); }

/* ── KPI strip — line-divided strip, not floating boxes ─ */
.admin-shell .kpi-grid { display:grid; grid-template-columns:repeat(6,1fr); gap:0; margin-bottom:4px; border:1px solid var(--border); border-radius:var(--r-md); overflow:hidden; }
.admin-shell .kpi { position:relative; background:var(--surface); border-right:1px solid var(--border); padding:18px 18px; transition:background 0.13s ease; }
.admin-shell .kpi:last-child { border-right:none; }
.admin-shell .kpi:hover { background:var(--surface-2); }
.admin-shell .kpi::before { content:""; position:absolute; inset:0 auto auto 0; height:2px; width:0; background:var(--accent); transition:width 0.2s ease; }
.admin-shell .kpi:hover::before { width:100%; }
.admin-shell .kpi-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.12em; color:var(--muted); margin-bottom:10px; }
.admin-shell .kpi-value { font-size:27px; font-weight:800; letter-spacing:-0.04em; color:var(--text); line-height:1; font-variant-numeric:tabular-nums; }
.admin-shell .kpi-sub { font-size:12px; color:var(--muted); margin-top:6px; }

/* ── Section — editorial header with hairline rule ───── */
.admin-shell .section-header { display:flex; align-items:baseline; justify-content:space-between; gap:12px; margin:36px 0 12px; padding-bottom:8px; border-bottom:1px solid var(--border); }
.admin-shell .section-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.14em; color:var(--text-2); }
.admin-shell .section-link { font-size:11px; color:var(--accent-text); font-weight:700; text-transform:uppercase; letter-spacing:0.06em; transition:color 0.12s ease; }
.admin-shell .section-link:hover { color:var(--accent); }
.admin-shell .section { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md); padding:20px 22px; }
.admin-shell .panel-grid { display:grid; grid-template-columns:1.5fr 1fr; gap:16px; }
.admin-shell .empty { color:var(--muted); text-align:center; padding:36px 20px; font-size:13px; line-height:1.65; }

/* ── To-do panel ─────────────────────────────────────── */
.admin-shell .todo-panel { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md); padding:2px 20px; }
.admin-shell .todo-panel.has-items { border-color:var(--border-strong); border-left:2px solid var(--amber); }
.admin-shell .todo-empty { color:var(--muted); text-align:center; padding:26px 20px; font-size:13px; }
.admin-shell .todo-row { display:flex; gap:13px; align-items:flex-start; padding:14px 0; border-bottom:1px solid var(--border); }
.admin-shell .todo-row:last-child { border-bottom:none; }
.admin-shell .todo-seq { width:26px; height:26px; flex-shrink:0; background:var(--surface-2); border:1px solid var(--border); border-radius:var(--r-sm); display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; color:var(--muted); font-variant-numeric:tabular-nums; }
.admin-shell .todo-row.pri-high .todo-seq { color:var(--red); background:var(--red-soft); border-color:#f3c9c5; }
.admin-shell .todo-body { flex:1; min-width:0; }
.admin-shell .todo-title { font-size:14px; font-weight:600; color:var(--text); }
.admin-shell .todo-detail { font-size:13px; color:var(--muted); margin-top:3px; line-height:1.5; }
.admin-shell .todo-meta { margin-top:8px; display:flex; gap:6px; flex-wrap:wrap; }
.admin-shell .pill { font-size:11px; font-weight:600; background:var(--surface-2); border:1px solid var(--border); border-radius:var(--r-sm); padding:2px 8px; color:var(--muted); text-transform:capitalize; }
.admin-shell .pill.pri-high { color:var(--red); background:var(--red-soft); border-color:#f3c9c5; }
.admin-shell .todo-action { flex-shrink:0; align-self:center; }
.admin-shell .todo-done-btn { display:inline-block; padding:7px 14px; background:var(--surface); border:1px solid var(--border-strong); color:var(--text-2); border-radius:var(--r-sm); font-size:12px; font-weight:600; cursor:pointer; transition:border-color 0.13s ease, color 0.13s ease, background 0.13s ease; }
.admin-shell .todo-done-btn:hover { border-color:var(--green); color:var(--green); background:var(--green-soft); }
.admin-shell .todo-done-hint { font-size:12px; color:var(--muted); white-space:nowrap; }
.admin-shell .todo-done-hint code { color:var(--accent-text); }

/* ── To-do: click-to-expand instructions ─────────────── */
.admin-shell .todo-head { display:flex; align-items:center; gap:8px; width:100%; background:none; border:none; padding:0; margin:0; font-family:inherit; text-align:left; color:inherit; }
.admin-shell .todo-head.expandable { cursor:pointer; }
.admin-shell .todo-head.expandable:hover .todo-title { color:var(--accent-text); }
.admin-shell .todo-caret { font-size:15px; color:var(--border-strong); transition:transform 0.14s ease, color 0.14s ease; flex-shrink:0; }
.admin-shell .todo-head.expandable:hover .todo-caret { color:var(--accent); }
.admin-shell .todo-caret.open { transform:rotate(90deg); color:var(--accent); }
.admin-shell .todo-expand-link { background:none; border:none; padding:2px 0; margin:0; font-family:inherit; font-size:11px; font-weight:600; color:var(--accent-text); cursor:pointer; }
.admin-shell .todo-expand-link:hover { color:var(--accent); text-decoration:underline; }
.admin-shell .todo-instructions { margin-top:11px; display:flex; flex-direction:column; gap:11px; }
.admin-shell .todo-ins-block { background:var(--surface-2); border:1px solid var(--border); border-radius:var(--r-sm); padding:11px 13px; }
.admin-shell .todo-ins-label { font-size:10.5px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; color:var(--muted); margin-bottom:7px; }
.admin-shell .todo-ins-label-row { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.admin-shell .todo-steps { margin:0; padding-left:20px; display:flex; flex-direction:column; gap:5px; }
.admin-shell .todo-steps li { font-size:12.5px; color:var(--text-2); line-height:1.5; }
.admin-shell .todo-links { margin:0; padding:0; list-style:none; display:flex; flex-direction:column; gap:4px; }
.admin-shell .todo-links li { font-size:12.5px; }
.admin-shell .todo-links a { color:var(--accent-text); font-weight:600; }
.admin-shell .todo-links a:hover { color:var(--accent); text-decoration:underline; }
.admin-shell .todo-code { margin:0; font-family:var(--mono); font-size:11.5px; line-height:1.55; color:var(--text); background:var(--surface-3); border:1px solid var(--border); border-radius:var(--r-sm); padding:10px 12px; white-space:pre-wrap; word-break:break-word; overflow-x:auto; }
.admin-shell .todo-copy-btn { background:var(--surface); border:1px solid var(--border-strong); color:var(--text-2); border-radius:var(--r-sm); font-family:inherit; font-size:10.5px; font-weight:600; padding:3px 9px; cursor:pointer; transition:border-color 0.13s ease, color 0.13s ease, background 0.13s ease; }
.admin-shell .todo-copy-btn:hover { border-color:var(--accent); color:var(--accent-text); background:var(--accent-soft); }

/* ── Businesses list ─────────────────────────────────── */
.admin-shell .biz-list { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md); overflow:hidden; }
.admin-shell .biz-row { position:relative; display:flex; align-items:center; gap:16px; padding:15px 18px; border-bottom:1px solid var(--border); transition:background 0.12s ease; }
.admin-shell .biz-row:last-child { border-bottom:none; }
.admin-shell .biz-row:hover { background:var(--surface-2); }
.admin-shell .biz-row:hover { box-shadow:inset 2px 0 0 var(--accent); }
.admin-shell .biz-main { flex:1; min-width:0; }
.admin-shell .biz-name { font-size:14px; font-weight:700; color:var(--text); letter-spacing:-0.01em; }
.admin-shell .biz-sub { font-size:12px; color:var(--muted); margin-top:2px; }
.admin-shell .biz-stats { display:flex; gap:24px; flex-shrink:0; }
.admin-shell .biz-stat { text-align:right; min-width:58px; }
.admin-shell .biz-stat-num { font-size:14px; font-weight:600; color:var(--text); font-variant-numeric:tabular-nums; }
.admin-shell .biz-stat-label { font-size:10px; text-transform:uppercase; letter-spacing:0.06em; color:var(--muted); margin-top:2px; }
.admin-shell .biz-arrow { color:var(--border-strong); font-size:17px; flex-shrink:0; transition:color 0.12s ease, transform 0.12s ease; }
.admin-shell .biz-row:hover .biz-arrow { color:var(--accent); transform:translateX(2px); }
.admin-shell .stage-pill { font-size:11px; font-weight:600; padding:3px 9px; border-radius:var(--r-sm); text-transform:capitalize; white-space:nowrap; }
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
.admin-shell .daemon { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-sm); padding:10px 12px; display:flex; align-items:center; gap:9px; box-shadow:var(--shadow); }
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

/* ── Mission Control banner + health board ───────────── */
.admin-shell .mc-banner { display:flex; align-items:center; gap:13px; padding:14px 18px; background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md); margin:0 0 20px; }
.admin-shell .mc-banner.ok { border-left:3px solid var(--green); }
.admin-shell .mc-banner.warn { border-left:3px solid var(--amber); }
.admin-shell .mc-banner.bad { border-left:3px solid var(--red); }
.admin-shell .mc-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
.admin-shell .mc-dot.ok { background:var(--green); }
.admin-shell .mc-dot.warn { background:var(--amber); }
.admin-shell .mc-dot.bad { background:var(--red); }
.admin-shell .mc-text { min-width:0; }
.admin-shell .mc-headline { font-size:14px; font-weight:700; color:var(--text); letter-spacing:-0.01em; }
.admin-shell .mc-detail { font-size:12.5px; color:var(--muted); margin-top:2px; }
.admin-shell .hbeat { display:grid; grid-template-columns:12px 200px 104px 1fr; gap:13px; align-items:center; padding:11px 14px; background:var(--surface); border:1px solid var(--border); border-radius:var(--r-sm); margin-bottom:6px; }
.admin-shell .hbeat.down { border-left:2px solid var(--red); }
.admin-shell .hbeat.stale { border-left:2px solid var(--amber); }
.admin-shell .hbeat.healthy { border-left:2px solid var(--green); }
.admin-shell .hbeat-dot { width:9px; height:9px; border-radius:50%; }
.admin-shell .hbeat-dot.down { background:var(--red); }
.admin-shell .hbeat-dot.stale { background:var(--amber); }
.admin-shell .hbeat-dot.healthy { background:var(--green); }
.admin-shell .hbeat-name { font-family:var(--mono); font-size:12px; font-weight:600; color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.admin-shell .hbeat-when { font-size:12px; color:var(--muted); font-variant-numeric:tabular-nums; }
.admin-shell .hbeat-why { font-size:12px; color:var(--text-2); line-height:1.45; }

/* ── Activity feed ───────────────────────────────────── */
.admin-shell .feed-row { display:grid; grid-template-columns:84px 150px 1fr; gap:12px; padding:9px 0; border-bottom:1px solid var(--border); font-size:13px; align-items:baseline; }
.admin-shell .feed-row:last-child { border-bottom:none; }
.admin-shell .feed-time { color:var(--muted); font-size:12px; }
.admin-shell .feed-actor { color:var(--accent-text); font-weight:600; font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.admin-shell .feed-actor a { color:var(--accent-text); }
.admin-shell .feed-text { color:var(--text-2); }

/* ── Activity timeline — day-grouped feed ────────────── */
.admin-shell .act-timeline { display:flex; flex-direction:column; gap:22px; }
.admin-shell .act-day-head { display:flex; align-items:baseline; justify-content:space-between; gap:12px; margin:0 0 10px; padding-bottom:8px; border-bottom:1px solid var(--border); }
.admin-shell .act-day-label { font-size:13px; font-weight:700; letter-spacing:-0.01em; color:var(--text); }
.admin-shell .act-day-count { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.07em; color:var(--muted); }
.admin-shell .act-day-body { padding-top:6px; padding-bottom:6px; }

/* ── Ops / content / queue stat grids ────────────────── */
.admin-shell .ops-grid, .admin-shell .content-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:0; border:1px solid var(--border); border-radius:var(--r-md); overflow:hidden; }
.admin-shell .ops-stat, .admin-shell .content-stat { position:relative; background:var(--surface); border-right:1px solid var(--border); border-bottom:1px solid var(--border); padding:16px; transition:background 0.13s ease; }
.admin-shell .ops-stat:hover, .admin-shell .content-stat:hover { background:var(--surface-2); }
.admin-shell .ops-stat::before, .admin-shell .content-stat::before { content:""; position:absolute; inset:0 auto auto 0; height:2px; width:0; background:var(--accent); transition:width 0.2s ease; }
.admin-shell .ops-stat:hover::before, .admin-shell .content-stat:hover::before { width:100%; }
.admin-shell .ops-stat-num, .admin-shell .content-stat-num { font-size:23px; font-weight:800; letter-spacing:-0.04em; color:var(--text); font-variant-numeric:tabular-nums; }
.admin-shell .ops-stat-label, .admin-shell .content-stat-label { font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:0.1em; margin-top:5px; font-weight:700; }
.admin-shell .queue-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:0; border:1px solid var(--border); border-radius:var(--r-md); overflow:hidden; }
.admin-shell .queue-cell { background:var(--surface); border-right:1px solid var(--border); border-bottom:1px solid var(--border); padding:12px; text-align:center; }
.admin-shell .queue-cell-name { font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:0.1em; margin-bottom:6px; font-weight:700; }
.admin-shell .queue-counts { display:flex; gap:6px; justify-content:center; align-items:center; font-size:13px; font-variant-numeric:tabular-nums; }
.admin-shell .queue-counts .q { color:var(--amber); font-weight:600; }
.admin-shell .queue-counts .a { color:var(--accent-text); font-weight:600; }
.admin-shell .queue-counts .p { color:var(--green); font-weight:600; }

/* ── Realty deal cards ───────────────────────────────── */
.admin-shell .deal { display:flex; gap:14px; align-items:center; background:var(--surface); border:1px solid var(--border); border-left-width:2px; border-radius:var(--r-md); padding:14px 16px; }
.admin-shell .deal-a { border-left-color:var(--green); }
.admin-shell .deal-b { border-left-color:var(--amber); }
.admin-shell .deal-c { border-left-color:var(--border-strong); }
.admin-shell .deal-score { width:44px; height:44px; flex-shrink:0; border-radius:var(--r-sm); background:var(--surface-2); display:flex; align-items:center; justify-content:center; font-size:17px; font-weight:700; color:var(--text); }
.admin-shell .deal-a .deal-score { color:var(--green); background:var(--green-soft); }
.admin-shell .deal-b .deal-score { color:var(--amber); background:var(--amber-soft); }
.admin-shell .deal-c .deal-score { color:var(--muted); }
.admin-shell .deal-addr { font-size:14px; font-weight:600; color:var(--text); }
.admin-shell .deal-meta { font-size:12px; color:var(--muted); margin-top:3px; }
.admin-shell .deal-sigs { margin-top:7px; display:flex; flex-wrap:wrap; gap:5px; }
.admin-shell .deal-chip { font-size:11px; background:var(--surface-2); border:1px solid var(--border); border-radius:var(--r-sm); padding:2px 8px; color:var(--muted); }
.admin-shell .deal-plays { display:flex; flex-direction:column; gap:3px; font-size:11px; color:var(--muted); text-align:right; flex-shrink:0; }

/* ── Realty interactive toolbar ──────────────────────── */
.admin-shell .toolbar { display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin-bottom:10px; }
.admin-shell .search-input { flex:1; min-width:220px; padding:9px 12px; border:1px solid var(--border); border-radius:var(--r-sm); background:var(--surface); color:var(--text); font-size:13px; font-family:inherit; outline:none; box-shadow:var(--shadow); transition:border-color 0.13s ease, box-shadow 0.13s ease; }
.admin-shell .search-input:hover { border-color:var(--border-strong); }
.admin-shell .search-input:focus { border-color:var(--accent); box-shadow:var(--ring); }
.admin-shell .search-input::placeholder { color:var(--muted); }
.admin-shell .filter-group { display:flex; gap:4px; flex-wrap:wrap; }
.admin-shell .filter-chip { padding:6px 11px; border:1px solid var(--border); border-radius:var(--r-sm); background:var(--surface); color:var(--muted); font-size:12px; font-weight:500; cursor:pointer; font-family:inherit; transition:background 0.12s ease, color 0.12s ease, border-color 0.12s ease; }
.admin-shell .filter-chip:hover { border-color:var(--border-strong); color:var(--text); }
.admin-shell .filter-chip.active { background:var(--accent-soft); border-color:var(--accent); color:var(--accent-text); font-weight:600; }
.admin-shell .sort-select { padding:8px 10px; border:1px solid var(--border); border-radius:var(--r-sm); background:var(--surface); color:var(--text); font-size:12px; font-family:inherit; cursor:pointer; box-shadow:var(--shadow); }
.admin-shell .toolbar-count { font-size:12px; color:var(--muted); margin:0 0 10px; }
.admin-shell .add-county { display:flex; gap:8px; margin-bottom:6px; flex-wrap:wrap; }
.admin-shell .add-county-hint { font-size:12px; color:var(--muted); margin:0 0 14px; line-height:1.5; }
.admin-shell .upload-csv { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin:12px 0 6px; }
.admin-shell .upload-file { display:inline-flex; align-items:center; padding:9px 14px; border:1px solid var(--border); border-radius:var(--r-sm); background:var(--surface); font-size:13px; color:var(--muted); cursor:pointer; box-shadow:var(--shadow); max-width:300px; }
.admin-shell .upload-file:hover { border-color:var(--border-strong); color:var(--text); }
.admin-shell .upload-file input { display:none; }
.admin-shell .upload-file span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.admin-shell .add-county-btn { display:inline-flex; align-items:center; padding:9px 16px; background:var(--accent); color:#fff; border:1px solid var(--accent); border-radius:var(--r-sm); font-size:13px; font-weight:700; white-space:nowrap; cursor:pointer; font-family:inherit; transition:background 0.13s ease, border-color 0.13s ease, transform 0.1s ease; }
.admin-shell .add-county-btn:hover { background:var(--accent-text); border-color:var(--accent-text); }
.admin-shell .add-county-btn:active { transform:translateY(1px); }
.admin-shell .add-county-btn:disabled { background:var(--surface-3); border-color:var(--border); color:var(--muted); cursor:not-allowed; transform:none; }
.admin-shell .deal-card-wrap { display:flex; flex-direction:column; gap:8px; }
.admin-shell .deal.expandable { cursor:pointer; transition:border-color 0.12s ease, background 0.12s ease; }
.admin-shell .deal.expandable:hover { border-color:var(--border-strong); background:var(--surface-2); }
.admin-shell .deal-detail { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
.admin-shell .deal-detail-card { background:var(--surface-2); border:1px solid var(--border); border-radius:var(--r-sm); padding:11px 13px; }
.admin-shell .deal-detail-card h4 { margin:0 0 7px; font-size:11px; text-transform:uppercase; letter-spacing:0.06em; color:var(--muted); font-weight:600; }
.admin-shell .deal-detail-row { display:flex; justify-content:space-between; gap:10px; font-size:12px; padding:2px 0; }
.admin-shell .deal-detail-row span:first-child { color:var(--muted); }
.admin-shell .deal-detail-row span:last-child { color:var(--text); font-weight:600; }

/* ── Opportunity / inbox cards ───────────────────────── */
.admin-shell .opp-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md); padding:16px 18px; margin-bottom:10px; transition:border-color 0.13s ease, background 0.13s ease; }
.admin-shell .opp-card:hover { border-color:var(--border-strong); background:var(--surface-2); }
.admin-shell .opp-score-badge { display:inline-block; padding:3px 10px; border-radius:var(--r-sm); font-size:12px; font-weight:700; }
.admin-shell .opp-score-badge.high { background:var(--green-soft); color:var(--green); }
.admin-shell .opp-score-badge.medium { background:var(--amber-soft); color:var(--amber); }
.admin-shell .opp-score-badge.low { background:var(--surface-2); color:var(--muted); }

/* ── Integrations panel (Health) ──────────────────────── */
.admin-shell .integ-row { display:grid; grid-template-columns:12px 160px 96px 1fr; gap:13px; align-items:center; padding:11px 14px; background:var(--surface); border:1px solid var(--border); border-radius:var(--r-sm); margin-bottom:6px; }
.admin-shell .integ-row.connected { border-left:2px solid var(--green); }
.admin-shell .integ-row.missing { border-left:2px solid var(--border-strong); }
.admin-shell .integ-dot { width:9px; height:9px; border-radius:50%; }
.admin-shell .integ-dot.connected { background:var(--green); }
.admin-shell .integ-dot.missing { background:var(--border-strong); }
.admin-shell .integ-name { font-size:13px; font-weight:600; color:var(--text); }
.admin-shell .integ-state { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; }
.admin-shell .integ-state.connected { color:var(--green); }
.admin-shell .integ-state.missing { color:var(--amber); }
.admin-shell .integ-why { font-size:12px; color:var(--text-2); line-height:1.45; }
@media (max-width: 768px) {
  .admin-shell .integ-row { grid-template-columns:12px 1fr auto; }
  .admin-shell .integ-row .integ-why { grid-column:2 / -1; }
}

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
  .admin-shell .hbeat { grid-template-columns:12px 1fr auto; }
  .admin-shell .hbeat .hbeat-why { grid-column:2 / -1; }
}
`;

// ── Public-facing websites ────────────────────────────────────────────────
// The live empire site. Per-tenant brand sites are resolved at render time
// from public/data/brand-sites.json (see loadBrandSites in admin-state).
export const SITE_URL = "https://day14.us";

interface NavProps {
  active: string;
  siteUrl?: string;
  siteLabel?: string;
  /** Pre-fills the empire search box when rendered on `/admin/search`. */
  searchQuery?: string;
}
export function AdminNav({
  active,
  siteUrl = SITE_URL,
  siteLabel = "day14.us",
  searchQuery = "",
}: NavProps) {
  const pages = [
    { id: "empire", href: "/admin", label: "Overview" },
    { id: "today", href: "/admin/today", label: "Today" },
    { id: "realty", href: "/admin/realty", label: "Realty" },
    { id: "preview", href: "/admin/preview", label: "Preview" },
    { id: "alignmd", href: "/admin/alignmd", label: "AlignMD" },
    { id: "inbox", href: "/admin/inbox", label: "Inbox" },
    { id: "opps", href: "/admin/opportunities", label: "Ideas" },
    { id: "finance", href: "/admin/finance", label: "Finance" },
    { id: "health", href: "/admin/health", label: "Health" },
    { id: "ship", href: "/admin/ship", label: "Ship" },
    { id: "activity", href: "/admin/activity", label: "Activity" },
  ];
  return (
    <nav className="nav">
      {pages.map((p) => (
        <Link key={p.id} href={p.href} prefetch={false} className={p.id === active ? "active" : ""}>
          {p.label}
        </Link>
      ))}
      <SearchBox initialQuery={searchQuery} />
      <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="nav-site">
        {siteLabel} ↗
      </a>
    </nav>
  );
}

/**
 * One plain sentence explaining what an admin screen is for. Sits right under
 * the page <h1> so nobody is ever lost about what they are looking at.
 */
export function PageHint({ children }: { children: React.ReactNode }) {
  return <p className="page-hint">{children}</p>;
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
