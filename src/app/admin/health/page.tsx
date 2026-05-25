import { loadEmpireState, type Heartbeat } from "@/lib/admin-state";
import { AdminNav, ADMIN_CSS, PageHint } from "../layout-bits";

export const metadata = { title: "Health — Day14 Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function rel(iso?: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

function cadence(h: Heartbeat): string {
  if (!h.cadenceMin) return "an irregular interval";
  return h.cadenceMin < 90 ? `~${h.cadenceMin}m` : `~${Math.round(h.cadenceMin / 60)}h`;
}

/** Plain-English explanation of an agent's state — the trustworthy bit. */
function reason(h: Heartbeat): string {
  const cad = cadence(h);
  if (h.status === "error")
    return `Down — no heartbeat in ${rel(h.lastBeat)}. It should report every ${cad}. It will not recover on its own; restart it on the Mac.`;
  if (h.status === "stale")
    return `Running behind — last beat ${rel(h.lastBeat)}, against a ${cad} cadence. The watchdog retries it automatically.`;
  if (h.kind === "oneshot")
    return `Healthy — an interval job that runs every ${cad} then exits. Last run ${rel(h.lastBeat)} — it is fine between runs.`;
  return `Healthy — reporting every ${cad}. Last beat ${rel(h.lastBeat)}.`;
}

const STATE_CLASS: Record<Heartbeat["status"], string> = {
  error: "down",
  stale: "stale",
  healthy: "healthy",
};
const STATE_LABEL: Record<Heartbeat["status"], string> = {
  error: "Down",
  stale: "Behind",
  healthy: "Healthy",
};

/**
 * Known third-party integrations. Each is keyed by one or more env vars; a
 * server component can read process.env directly. A missing key is a choice,
 * not a failure — so every dark feature stays explained, never silent.
 */
interface Integration {
  name: string;
  /** Env vars this integration needs — all must be set to count as connected. */
  envKeys: readonly string[];
  /** One plain line: what it unlocks, and what is dark without it. */
  unlocks: string;
}

const INTEGRATIONS: readonly Integration[] = [
  {
    name: "Anthropic API",
    envKeys: ["ANTHROPIC_API_KEY"],
    unlocks:
      "Powers the Life Loophole AI advisor and the agents' reasoning fallback. Without it, the advisor goes quiet and agents lose their backup model.",
  },
  {
    name: "Gemini API",
    envKeys: ["GEMINI_API_KEY"],
    unlocks:
      "Drives the content-generation engines. Without it, automated content drafting stops across the brands.",
  },
  {
    name: "Printify API",
    envKeys: ["PRINTIFY_API_KEY"],
    unlocks:
      "Publishes Hot Flash Co products and feeds the admin product counts. Without it, products fall back to manual upload and counts read zero.",
  },
  {
    name: "Telegram bridge",
    envKeys: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"],
    unlocks:
      "Runs the two-way Telegram bridge for alerts and commands. Without both the token and chat id, Telegram notifications and replies are dark.",
  },
  {
    name: "Real-estate API",
    envKeys: ["REALESTATE_API_KEY"],
    unlocks:
      "Gives Day14 Realty real licensed property valuations. Without it, deal scores fall back to rougher county estimates.",
  },
  {
    name: "MailerLite API",
    envKeys: ["MAILERLITE_API_KEY"],
    unlocks:
      "Handles newsletter and email capture across the brand sites. Without it, signup forms cannot add subscribers.",
  },
] as const;

export default async function HealthPage() {
  const state = await loadEmpireState();
  const beats = [...state.heartbeats];
  const down = beats.filter((h) => h.status === "error");
  const stale = beats.filter((h) => h.status === "stale");
  const healthy = beats.filter((h) => h.status === "healthy");
  const total = beats.length;

  const tone = down.length > 0 ? "bad" : stale.length > 0 ? "warn" : "ok";
  const headline =
    down.length > 0
      ? `${down.length} agent${down.length === 1 ? "" : "s"} down`
      : stale.length > 0
        ? `${stale.length} agent${stale.length === 1 ? "" : "s"} running behind`
        : `All ${total} agents healthy`;
  const detail =
    down.length > 0
      ? "A down agent has stopped reporting in. It will not recover on its own — restart it on the Mac."
      : stale.length > 0
        ? "Stale agents are a little behind schedule; the watchdog retries them automatically."
        : "Every monitored agent is reporting on its own schedule.";

  // Down first, then behind, then healthy — most-urgent at the top.
  const ordered: Heartbeat[] = [...down, ...stale, ...healthy];

  // Integrations — read each key from the server environment. Missing keys
  // group first so a dark feature is the first thing you see.
  const integrations = INTEGRATIONS.map((it) => ({
    ...it,
    connected: it.envKeys.every((k) => {
      const v = process.env[k];
      return typeof v === "string" && v.trim().length > 0;
    }),
  }));
  const integMissing = integrations.filter((it) => !it.connected);
  const integConnected = integrations.filter((it) => it.connected);
  const orderedIntegrations = [...integMissing, ...integConnected];

  return (
    <div className="admin-shell">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <AdminNav active="health" />
      <h1>System Health</h1>
      <PageHint>
        Whether every background agent is running — and which integrations are
        connected.
      </PageHint>
      <div className="sub">
        {total} background agents monitored · synced {rel(state.generated_at)}
      </div>

      <div className={`mc-banner ${tone}`}>
        <span className={`mc-dot ${tone}`} />
        <div className="mc-text">
          <div className="mc-headline">{headline}</div>
          <div className="mc-detail">{detail}</div>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="kpi">
          <div className="kpi-label">Healthy</div>
          <div className="kpi-value" style={{ color: "var(--green)" }}>{healthy.length}</div>
          <div className="kpi-sub">reporting on schedule</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Behind</div>
          <div className="kpi-value" style={{ color: stale.length ? "var(--amber)" : "var(--text)" }}>{stale.length}</div>
          <div className="kpi-sub">watchdog retrying</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Down</div>
          <div className="kpi-value" style={{ color: down.length ? "var(--red)" : "var(--text)" }}>{down.length}</div>
          <div className="kpi-sub">needs a restart</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Monitored</div>
          <div className="kpi-value">{total}</div>
          <div className="kpi-sub">background agents</div>
        </div>
      </div>

      <div className="section-header">
        <div className="section-title">
          {down.length + stale.length > 0 ? "Every agent — needs attention first" : "Every agent"}
        </div>
      </div>
      {ordered.length === 0 ? (
        <div className="section"><div className="empty">No agents are reporting heartbeats yet.</div></div>
      ) : (
        <div>
          {ordered.map((h) => {
            const cls = STATE_CLASS[h.status];
            return (
              <div key={h.name} className={`hbeat ${cls}`}>
                <span className={`hbeat-dot ${cls}`} />
                <div className="hbeat-name">{h.name}</div>
                <div className="hbeat-when">{STATE_LABEL[h.status]} · {rel(h.lastBeat)}</div>
                <div className="hbeat-why">{reason(h)}</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="section-header">
        <div className="section-title">
          {integMissing.length > 0
            ? "Integrations — not connected first"
            : "Integrations"}
        </div>
      </div>
      <div>
        {orderedIntegrations.map((it) => {
          const cls = it.connected ? "connected" : "missing";
          return (
            <div key={it.name} className={`integ-row ${cls}`}>
              <span className={`integ-dot ${cls}`} />
              <div className="integ-name">{it.name}</div>
              <div className={`integ-state ${cls}`}>
                {it.connected ? "Connected" : "Not connected"}
              </div>
              <div className="integ-why">{it.unlocks}</div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 10, lineHeight: 1.6 }}>
        {integMissing.length === 0
          ? "Every integration key is set — no features are dark."
          : `${integMissing.length} of ${integrations.length} integrations ${
              integMissing.length === 1 ? "is" : "are"
            } not connected. A missing key is a choice, not a failure — each line above says exactly what stays dark until you add it.`}
      </div>

      <div className="section-header"><div className="section-title">How to read this</div></div>
      <div className="section">
        <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--muted)" }}>
          Each agent writes a heartbeat every run. <b style={{ color: "var(--green)" }}>Healthy</b> means
          it is reporting on its own schedule — an interval job that runs hourly is healthy between runs,
          not stale. <b style={{ color: "var(--amber)" }}>Behind</b> means it has missed a few beats; the
          auto-restart watchdog retries it for you. <b style={{ color: "var(--red)" }}>Down</b> means it
          has been silent long enough that it will not recover on its own and needs you to restart it.
          Send <code>/health</code> in Telegram any time for a live snapshot.
        </div>
      </div>
    </div>
  );
}
