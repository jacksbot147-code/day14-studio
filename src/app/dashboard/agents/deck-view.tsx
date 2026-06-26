/**
 * deck-view — the shared Command Deck presentation.
 *
 * One component renders both the god-view (/dashboard/agents, tenant=null) and a
 * customer's scoped view (/app/[tenant]/agents) from the same typed DeckState.
 * Server component; the only client island is <TapActions>, which posts to the
 * `endpoint` this view is given (god-view vs tenant-scoped write route).
 */

import type { AgentStatus, DeckState } from "@/lib/agent-deck";
import { CanvasField } from "@/components/cinematic/CanvasField";
import { TapActions } from "./agent-actions";
import { AutoRefresh } from "./auto-refresh";

const C = {
  bg: "#050507", ink: "#f3f4f8", mut: "#9698a4", faint: "#767883",
  accent: "#56b3ff", cyan: "#39e6d4", line: "rgba(255,255,255,0.09)",
  panel: "rgba(255,255,255,0.025)", ok: "#3ddc84", bad: "#ff5a5a", warn: "#f5b945", off: "#5b5d68",
  sans: "var(--cin-font-sans)", mono: "var(--cin-font-mono)", serif: "var(--cin-font-serif)",
} as const;

function fmtAge(min: number | null): string {
  if (min === null) return "no telemetry";
  if (min < 60) return `${min}m`;
  if (min < 1440) return `${Math.round(min / 60)}h`;
  return `${Math.round(min / 1440)}d`;
}
function tone(s: AgentStatus): "ok" | "bad" | "warn" | "off" {
  return s === "healthy" ? "ok" : s === "down" || s === "stale" ? "bad" : "off";
}

const panel: React.CSSProperties = { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16, backdropFilter: "blur(6px)" };

function Dot({ t, glow = true }: { t: "ok" | "bad" | "warn" | "off"; glow?: boolean }) {
  const c = t === "ok" ? C.ok : t === "bad" ? C.bad : t === "warn" ? C.warn : C.off;
  return <span style={{ width: 7, height: 7, borderRadius: 99, background: c, boxShadow: glow ? `0 0 8px ${c}99` : "none", display: "inline-block", flex: "0 0 auto" }} />;
}
function Label({ children, color }: { children: React.ReactNode; color?: string }) {
  return <span style={{ fontFamily: C.mono, color: color || C.faint, letterSpacing: "0.22em", fontSize: 11 }} className="uppercase">{children}</span>;
}
function Panel({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={panel} className="p-6">
      <div className="mb-4 flex items-center justify-between"><Label>{title}</Label>{right}</div>
      {children}
    </div>
  );
}

export interface DeckViewProps {
  state: DeckState;
  /** Small uppercase scope kicker, e.g. "all tenants" or a tenant slug. */
  scopeLabel: string;
  /** POST target for approve/deny — god-view vs tenant-scoped route. */
  endpoint: string;
  backHref: string;
  backLabel: string;
}

export function DeckView({ state: d, scopeLabel, endpoint, backHref, backLabel }: DeckViewProps) {
  const daemons = d.agents.filter((a) => a.kind === "daemon");
  const employees = d.agents.filter((a) => a.kind === "employee");
  const down = daemons.filter((a) => a.status !== "healthy");
  const healthy = daemons.filter((a) => a.status === "healthy");
  const staleEmps = employees.filter((a) => a.status !== "healthy");
  const todoTaps = d.taps.filter((t) => t.kind === "todo");
  const outboxTaps = d.taps.filter((t) => t.kind === "tap");
  const topTap = todoTaps[0] ?? null;
  const restTodos = topTap ? todoTaps.slice(1) : todoTaps;
  const { daemonsHealthy: alive, daemonsTotal: total, tapsAwaiting: tapCount } = d.summary;
  const attention = d.posture === "attention";
  const healthPct = total > 0 ? Math.round((alive / total) * 100) : 0;

  return (
    <div className="cinematic" style={{ background: C.bg, color: C.ink, minHeight: "100vh", fontFamily: C.sans }}>
      <AutoRefresh seconds={30} />
      <CanvasField />
      <main className="relative px-6 md:px-12 py-10 max-w-[1380px] mx-auto" style={{ fontWeight: 300 }}>

        <header className="mb-8 flex items-end justify-between flex-wrap gap-5">
          <div>
            <div className="mb-3"><Label>Day14 · Agent Oversight · {scopeLabel}</Label></div>
            <h1 style={{ fontFamily: C.sans, letterSpacing: "-0.045em", lineHeight: 1.0 }} className="text-5xl md:text-6xl font-light">
              Command <span style={{ fontFamily: C.serif, fontStyle: "italic", fontWeight: 400 }}>Deck</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span style={{ ...panel, borderColor: attention ? `${C.warn}55` : `${C.ok}44` }} className="inline-flex items-center gap-2 px-3.5 py-1.5">
              <Dot t={attention ? "warn" : "ok"} />
              <span style={{ fontFamily: C.mono, color: attention ? C.warn : C.ok }} className="text-[11px] uppercase tracking-[0.18em]">{attention ? "Attention" : "Nominal"}</span>
            </span>
            <a href={backHref} style={{ color: C.mut, fontFamily: C.mono }} className="text-xs uppercase tracking-[0.18em] hover:text-white transition-colors">← {backLabel}</a>
          </div>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
          <div style={panel} className="p-5">
            <Label>Awaiting tap</Label>
            <div style={{ color: tapCount > 0 ? C.accent : C.ink, letterSpacing: "-0.03em" }} className="text-4xl font-light tabular-nums mt-2">{tapCount}</div>
          </div>
          <div style={panel} className="p-5 col-span-2">
            <div className="flex items-center justify-between"><Label>Fleet health</Label><span style={{ fontFamily: C.mono, color: C.faint }} className="text-[11px]">{alive}/{total} healthy</span></div>
            <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div style={{ width: `${healthPct}%`, background: down.length === 0 ? C.ok : C.warn, height: "100%" }} />
            </div>
            <div style={{ color: down.length ? C.bad : C.faint, fontFamily: C.mono }} className="text-[11px] mt-2.5 uppercase tracking-wider">
              {total === 0 ? "no agents in scope" : down.length ? `${down.length} down · ${down.slice(0, 3).map((h) => h.name).join(", ")}${down.length > 3 ? "…" : ""}` : "all daemons reporting"}
            </div>
          </div>
          <div style={panel} className="p-5">
            <Label>Employees stale</Label>
            <div style={{ color: staleEmps.length ? C.warn : C.ink, letterSpacing: "-0.03em" }} className="text-4xl font-light tabular-nums mt-2">{staleEmps.length}<span style={{ color: C.faint }} className="text-lg">/{employees.length}</span></div>
          </div>
        </div>

        {topTap && (
          <div className="mb-6" style={{ ...panel, borderColor: `${C.accent}44`, background: "rgba(86,179,255,0.05)" }}>
            <div className="p-6 flex items-start justify-between gap-6 flex-wrap">
              <div className="min-w-0">
                <div className="mb-2"><Label color={C.accent}>The one move · highest consequence</Label></div>
                <div style={{ color: C.ink }} className="text-xl font-normal">{topTap.title}</div>
                {topTap.detail && <div style={{ color: C.mut }} className="text-sm mt-1.5 max-w-2xl">{topTap.detail}</div>}
              </div>
              <div className="shrink-0"><TapActions kind="todo" id={topTap.id} endpoint={endpoint} /></div>
            </div>
          </div>
        )}

        {(restTodos.length > 0 || outboxTaps.length > 0) && (
          <div className="mb-6">
            <Panel title={`Tap queue · ${restTodos.length + outboxTaps.length} more`}>
              <ul className="divide-y" style={{ borderColor: C.line }}>
                {restTodos.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 flex-wrap py-3 first:pt-0">
                    <span style={{ fontFamily: C.mono, color: C.accent, border: `1px solid ${C.line}`, borderRadius: 6 }} className="text-[10px] uppercase tracking-wider px-1.5 py-0.5">{t.priority}</span>
                    <span style={{ color: C.ink }} className="text-sm">{t.title}</span>
                    {t.tenant && <span style={{ color: C.faint }} className="text-xs">· {t.tenant}</span>}
                    <span className="ml-auto"><TapActions kind="todo" id={t.id} endpoint={endpoint} /></span>
                  </li>
                ))}
                {outboxTaps.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 flex-wrap py-3">
                    <span style={{ fontFamily: C.mono, color: C.warn, border: `1px solid ${C.warn}44`, borderRadius: 6 }} className="text-[10px] uppercase tracking-wider px-1.5 py-0.5">{t.urgency || "P2"} · unsent</span>
                    <span style={{ color: C.ink }} className="text-sm">{t.title}</span>
                    <span className="ml-auto"><TapActions kind="tap" id={t.id} endpoint={endpoint} /></span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Panel title="Fleet · needs attention first" right={<span style={{ fontFamily: C.mono, color: C.faint }} className="text-[11px]">{total} daemons</span>}>
            {total === 0 ? (
              <p style={{ color: C.mut }} className="text-sm">No agents scoped to this tenant yet.</p>
            ) : down.length === 0 && staleEmps.length === 0 ? (
              <p style={{ color: C.ok }} className="text-sm">Every daemon healthy. Nothing to chase.</p>
            ) : (
              <ul className="space-y-2.5 mb-4">
                {down.map((h) => (
                  <li key={h.name} className="text-sm flex items-center gap-2.5">
                    <Dot t="bad" />
                    <span style={{ fontFamily: C.mono, color: C.ink }} className="text-xs">{h.name}</span>
                    {h.lastAction && <span style={{ color: C.faint }} className="text-xs truncate max-w-[40%]">· {h.lastAction}</span>}
                    <span style={{ color: C.bad, fontFamily: C.mono }} className="text-[11px] ml-auto">{h.ageMin !== null ? fmtAge(h.ageMin) : "down"}</span>
                  </li>
                ))}
              </ul>
            )}
            {healthy.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span style={{ color: C.faint, fontFamily: C.mono }} className="text-[11px] uppercase tracking-wider mr-1">{healthy.length} healthy</span>
                {healthy.map((h) => (<span key={h.name} title={`${h.name} · ${h.ageMin !== null ? fmtAge(h.ageMin) : ""}`}><Dot t="ok" glow={false} /></span>))}
              </div>
            )}
          </Panel>

          <Panel title="Leader brief · today's priorities">
            {d.priorities.length === 0 ? (
              <p style={{ color: C.mut }} className="text-sm">No priorities in scope{d.newestBriefFile ? <> · newest <code style={{ color: C.accent }}>founder-ops/{d.newestBriefFile}</code></> : ""}.</p>
            ) : (
              <ol className="space-y-3">
                {d.priorities.slice(0, 6).map((it, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span style={{ color: C.faint, fontFamily: C.mono }} className="text-[11px] uppercase tracking-wider min-w-[60px]">{it.tier || "•"}</span>
                    <span style={{ color: C.ink }}>{it.label}</span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Panel title="Employees · scheduled C-suite">
            {employees.length === 0 ? (
              <p style={{ color: C.mut }} className="text-sm">Shared C-suite is managed at the Day14 level (not tenant-scoped).</p>
            ) : (
              <>
                <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                  {employees.map((e) => (
                    <li key={e.name} className="text-sm flex items-center gap-2.5">
                      <Dot t={tone(e.status)} glow={e.status !== "unknown"} />
                      <span style={{ fontFamily: C.mono, color: e.status === "unknown" ? C.off : C.ink }} className="text-xs truncate">{e.name}</span>
                      <span style={{ color: C.faint, fontFamily: C.mono }} className="text-[11px] ml-auto">{fmtAge(e.ageMin)}</span>
                    </li>
                  ))}
                </ul>
                <p style={{ color: C.off }} className="text-[11px] mt-4 leading-relaxed">Cron-scheduled — liveness is log mtime; 9 of 10 emit no per-agent audit trail yet.</p>
              </>
            )}
          </Panel>

          <Panel title="Live activity">
            <ul className="space-y-2">
              {d.activity.slice(-16).reverse().map((b, i) => (
                <li key={i} className="text-xs flex items-center gap-2.5">
                  <span style={{ color: C.off, fontFamily: C.mono }} className="tabular-nums shrink-0">{b.ts?.slice(5, 16).replace("T", " ") || "—"}</span>
                  <span style={{ color: C.mut, fontFamily: C.mono }} className="truncate max-w-[30%]">{b.actor || "—"}</span>
                  <span style={{ color: C.ink }} className="truncate">{b.action}</span>
                  {b.error && <span style={{ color: C.bad }} className="text-[10px] ml-auto shrink-0">err</span>}
                </li>
              ))}
              {d.activity.length === 0 && <li style={{ color: C.mut }} className="text-sm">No recent activity in scope.</li>}
            </ul>
          </Panel>
        </div>

        <p style={{ color: C.off, fontFamily: C.mono }} className="text-[11px] mt-9 tracking-wide">
          {d.tenant ? `scoped · tenant ${d.tenant}` : "god-view · all tenants"} · auto-refresh 30s · agent-deck service (file backend; Supabase-ready)
        </p>
      </main>
    </div>
  );
}
