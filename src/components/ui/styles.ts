/**
 * Shared CSS for the Day14 UI primitives. Each primitive component
 * embeds this stylesheet via a small <UiStyles /> helper so the
 * components can be dropped into any page (admin or brand) without
 * a separate import step. Selectors are prefixed `d14-` so they
 * never collide with the admin shell classes (`.kpi`, `.section`,
 * `.mc-banner` …) defined in ADMIN_CSS.
 *
 * All values are sourced from the design tokens in `src/lib/design-tokens.ts`
 * via CSS custom properties (`var(--accent)`, `var(--surface)` …).
 */
export const UI_CSS = `
/* ── Button ─────────────────────────────────────────── */
.d14-btn { display:inline-flex; align-items:center; justify-content:center; gap:6px; border-radius:var(--r-sm); font-family:inherit; font-weight:600; cursor:pointer; transition:background 0.13s ease, border-color 0.13s ease, color 0.13s ease, transform 0.1s ease; border:1px solid transparent; white-space:nowrap; text-decoration:none; }
.d14-btn:disabled { cursor:not-allowed; opacity:0.55; }
.d14-btn:active:not(:disabled) { transform:translateY(1px); }
.d14-btn:focus-visible { outline:none; box-shadow:var(--ring); }
.d14-btn-sm { font-size:12px; padding:6px 11px; }
.d14-btn-md { font-size:13px; padding:9px 16px; }
.d14-btn-primary { background:var(--accent); color:#fff; border-color:var(--accent); }
.d14-btn-primary:hover:not(:disabled) { background:var(--accent-text); border-color:var(--accent-text); }
.d14-btn-secondary { background:var(--surface); color:var(--text-2); border-color:var(--border-strong); }
.d14-btn-secondary:hover:not(:disabled) { border-color:var(--accent); color:var(--accent-text); background:var(--accent-soft); }
.d14-btn-ghost { background:transparent; color:var(--text-2); border-color:transparent; }
.d14-btn-ghost:hover:not(:disabled) { color:var(--accent-text); background:var(--accent-soft); }

/* ── Card ───────────────────────────────────────────── */
.d14-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md); padding:20px 22px; }
.d14-card-head { display:flex; align-items:baseline; justify-content:space-between; gap:12px; margin:0 0 12px; padding-bottom:8px; border-bottom:1px solid var(--border); }
.d14-card-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.14em; color:var(--text-2); margin:0; }
.d14-card-aside { font-size:11px; color:var(--muted); }
.d14-card-body { color:var(--text); font-size:13px; line-height:1.55; }

/* ── KPI ────────────────────────────────────────────── */
.d14-kpi { position:relative; background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md); padding:18px; transition:background 0.13s ease; overflow:hidden; }
.d14-kpi:hover { background:var(--surface-2); }
.d14-kpi::before { content:""; position:absolute; inset:0 auto auto 0; height:2px; width:0; background:var(--accent); transition:width 0.2s ease; }
.d14-kpi:hover::before { width:100%; }
.d14-kpi-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.12em; color:var(--muted); margin-bottom:10px; }
.d14-kpi-value { font-size:27px; font-weight:800; letter-spacing:-0.04em; color:var(--text); line-height:1; font-variant-numeric:tabular-nums; }
.d14-kpi-sub { font-size:12px; color:var(--muted); margin-top:6px; }

/* ── Status banner ──────────────────────────────────── */
.d14-banner { display:flex; align-items:center; gap:13px; padding:14px 18px; background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md); }
.d14-banner-ok { border-left:3px solid var(--green); }
.d14-banner-warn { border-left:3px solid var(--amber); }
.d14-banner-bad { border-left:3px solid var(--red); }
.d14-banner-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
.d14-banner-ok .d14-banner-dot { background:var(--green); }
.d14-banner-warn .d14-banner-dot { background:var(--amber); }
.d14-banner-bad .d14-banner-dot { background:var(--red); }
.d14-banner-text { min-width:0; flex:1; }
.d14-banner-headline { font-size:14px; font-weight:700; color:var(--text); letter-spacing:-0.01em; }
.d14-banner-detail { font-size:12.5px; color:var(--muted); margin-top:2px; }

/* ── Empty state ────────────────────────────────────── */
.d14-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:40px 24px; color:var(--muted); border:1px dashed var(--border-strong); border-radius:var(--r-md); background:var(--surface); }
.d14-empty-icon { font-size:28px; line-height:1; margin-bottom:12px; color:var(--border-strong); display:inline-flex; align-items:center; justify-content:center; }
.d14-empty-headline { font-size:14px; font-weight:700; color:var(--text); letter-spacing:-0.01em; margin:0 0 4px; }
.d14-empty-hint { font-size:13px; color:var(--muted); line-height:1.55; margin:0; max-width:42ch; }
.d14-empty-cta { margin-top:16px; }
`;
