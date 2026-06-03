"use client";

/**
 * LivingOsHero — the hero IS the product.
 *
 * Instead of static headline + paragraph + CTA, the hero renders a faked-live
 * Day14 admin window. Browser chrome, tenants rail on the left, headline as
 * the main admin-content panel in the middle, and a streaming activity log
 * on the right that types new agent-fired lines every couple seconds. A
 * deploy bar pulses across the very top, an inbox counter ticks down from
 * 12 to 3, and a schedule strip across the bottom shows the next three
 * agents queued up.
 *
 * This is the v0.dev / Linear-changelog / Resend pattern: marketing IS the
 * product. People screenshot it for Twitter threads.
 *
 * NO new dependencies — framer-motion's AnimatePresence handles the
 * streaming log; everything else is HTML+CSS.
 *
 * SSR-safe: server renders the initial state (headline visible, three seed
 * log lines present, inbox at its starting count). Client takes over for
 * the ticking + streaming animations only.
 *
 * Reduced motion: streaming log freezes at seed state, inbox counter jumps
 * to final value, deploy bar holds still. Headline + chrome still render.
 *
 * Honors product reality: hot-flash-co + kennum-lawn-care show as PARKED,
 * day14-realty shows as PAUSED. These are the real tenant states — using
 * them here keeps the chrome from being marketing fiction.
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

// ---------- tenant rail data --------------------------------------------

type TenantStatus = "ok" | "paused" | "parked";

interface TenantRow {
  slug: string;
  label: string;
  color: string;
  status: TenantStatus;
}

const TENANTS: TenantRow[] = [
  { slug: "day14",            label: "day14",           color: "#ef6c33", status: "ok" },
  { slug: "alignmd",          label: "alignmd",         color: "#3b82f6", status: "ok" },
  { slug: "life-loophole",    label: "life-loophole",   color: "#ca8a04", status: "ok" },
  { slug: "day14-realty",     label: "day14-realty",    color: "#14805a", status: "paused" },
  { slug: "hot-flash-co",     label: "hot-flash-co",    color: "#f472b6", status: "parked" },
  { slug: "kennum-lawn-care", label: "kennum",          color: "#65a30d", status: "parked" },
];

function statusBadge(status: TenantStatus): { text: string; color: string; dot: string } {
  if (status === "ok")     return { text: "OK",     color: "#86efac", dot: "#22c55e" };
  if (status === "paused") return { text: "PAUSED", color: "#fcd34d", dot: "#f59e0b" };
  return { text: "PARKED",                          color: "#94a3b8", dot: "#64748b" };
}

// ---------- activity log entries ----------------------------------------
//
// 12 real-feeling agent events drawn from actual Day14 OS event vocabulary.
// They cycle so the log feels "always firing" rather than a 12-line script.

interface LogEntry {
  time: string;
  text: ReactNode;
}

const LOG_ENTRIES: LogEntry[] = [
  { time: "07:30", text: <>briefing agent ran <em style={{ color: "#94a3b8", fontStyle: "normal" }}>(alignmd)</em> <span style={{ color: "#22c55e" }}>✓</span></> },
  { time: "07:31", text: <>life-loophole/draft-2026-06-02-pmi.md <span style={{ color: "#fcd34d" }}>review</span></> },
  { time: "07:45", text: <>evidence verifier passed <span style={{ color: "#94a3b8" }}>18/18</span></> },
  { time: "08:02", text: <>jack approved <em style={{ color: "#94a3b8", fontStyle: "normal" }}>3 items</em> via Cmd+K</> },
  { time: "08:15", text: <>day14-realty/drip-7 published <span style={{ color: "#22c55e" }}>✓</span></> },
  { time: "08:30", text: <>alignmd portal deploy <span style={{ color: "#22c55e" }}>green</span></> },
  { time: "08:45", text: <>content-draft agent <em style={{ color: "#94a3b8", fontStyle: "normal" }}>(life-loophole)</em> queued</> },
  { time: "09:00", text: <>daily-briefing email sent <span style={{ color: "#94a3b8" }}>jack@</span></> },
  { time: "09:12", text: <>banana image gen <span style={{ color: "#94a3b8" }}>1024x1024</span> <span style={{ color: "#22c55e" }}>cached</span></> },
  { time: "09:30", text: <>alignmd candidate intake <span style={{ color: "#94a3b8" }}>4 new</span></> },
  { time: "09:45", text: <>scheduled-task fire <em style={{ color: "#94a3b8", fontStyle: "normal" }}>(eod-sweep)</em> <span style={{ color: "#fcd34d" }}>9 todos</span></> },
  { time: "10:00", text: <>worklog autosave <span style={{ color: "#94a3b8" }}>cron</span> <span style={{ color: "#22c55e" }}>✓</span></> },
];

// ---------- schedule strip ----------------------------------------------

const SCHEDULE = [
  { in: "in 12m", task: "daily-briefing" },
  { in: "in 45m", task: "content-draft (life-loophole)" },
  { in: "in 2h",  task: "eod-evidence-sweep" },
];

// ---------- component ---------------------------------------------------

export function LivingOsHero({ cta }: { cta: ReactNode }) {
  const reduce = useReducedMotion();

  // Inbox count ticks 12 -> 3 over the first ~6 seconds.
  const [inbox, setInbox] = useState(12);
  // Streaming activity log — keep the most recent 8 visible.
  const [logHead, setLogHead] = useState(3); // initial seed = first 3 entries visible
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduce) {
      setInbox(3);
      setLogHead(8);
      return;
    }

    // Inbox count tick — 9 decrements over ~6s (one every ~670ms).
    let n = 12;
    const tickInbox = window.setInterval(() => {
      n = Math.max(3, n - 1);
      setInbox(n);
      if (n <= 3) window.clearInterval(tickInbox);
    }, 670);

    // Activity log stream — every 2.2s, advance the head by one. The render
    // function slices a rolling window of the last 8 entries, modulo the
    // total length, so the log feels infinite without ever running out.
    const tickLog = window.setInterval(() => {
      setLogHead((h) => h + 1);
    }, 2200);
    tickRef.current = tickLog;

    return () => {
      window.clearInterval(tickInbox);
      window.clearInterval(tickLog);
    };
  }, [reduce]);

  // Visible window of log entries: last 8, oldest at top, newest at bottom.
  // Each entry has a stable key derived from its absolute index so
  // AnimatePresence can animate the new one in and the oldest one out.
  const visible: Array<LogEntry & { idx: number }> = [];
  const windowSize = 8;
  const start = Math.max(0, logHead - windowSize);
  for (let i = start; i < logHead; i++) {
    // i % length is always a valid index — assertion is safe and lets us
    // stay clean under tsconfig's `noUncheckedIndexedAccess`.
    const entry = LOG_ENTRIES[i % LOG_ENTRIES.length]!;
    visible.push({ ...entry, idx: i });
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 1180,
        margin: "0 auto",
        borderRadius: 16,
        background: "linear-gradient(180deg, #0d1118 0%, #0a0e14 100%)",
        boxShadow:
          "0 50px 120px -40px rgba(15,23,42,0.55), 0 8px 24px -12px rgba(15,23,42,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
        overflow: "hidden",
        fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
        color: "#e2e8f0",
      }}
    >
      {/* Pulsing deploy bar — pixel-thin ember stripe across the very top.
          Loops every 4s, feels like Vercel's deploy indicator. */}
      <DeployBar reduce={reduce} />

      {/* Browser chrome */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          background: "rgba(255,255,255,0.02)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          <Dot color="#ff5f57" />
          <Dot color="#febc2e" />
          <Dot color="#28c840" />
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 14px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.07)",
              fontSize: 11,
              color: "#cbd5e1",
              letterSpacing: "0.04em",
            }}
          >
            <span style={{ color: "#94a3b8" }}>https://</span>
            <span style={{ color: "#ffffff", fontWeight: 600 }}>day14.us</span>
            <span style={{ color: "#94a3b8" }}>/admin</span>
          </div>
        </div>
        <InboxPill count={inbox} />
      </div>

      {/* Body: 3-column grid on lg, stacked on mobile. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          minHeight: 460,
        }}
        className="living-os-grid"
      >
        {/* Tenant rail */}
        <TenantRail />

        {/* Main content — the headline lives here. */}
        <div
          style={{
            padding: "32px 28px 36px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            background:
              "radial-gradient(120% 80% at 50% 0%, rgba(239,108,51,0.05), rgba(239,108,51,0) 70%)",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignSelf: "flex-start",
              alignItems: "center",
              gap: 8,
              padding: "4px 10px",
              borderRadius: 999,
              background: "rgba(239,108,51,0.10)",
              border: "1px solid rgba(239,108,51,0.25)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#fb923c",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#fb923c",
                boxShadow: "0 0 8px rgba(251,146,60,0.8)",
              }}
            />
            Live · pivot announcement
          </div>

          <h1
            style={{
              marginTop: 22,
              fontFamily:
                'system-ui, -apple-system, "SF Pro Display", "Segoe UI", sans-serif',
              fontSize: "clamp(2.25rem, 5.5vw, 4.5rem)",
              fontWeight: 800,
              letterSpacing: "-0.035em",
              lineHeight: 0.96,
              color: "#f8fafc",
            }}
          >
            One operator.
            <br />
            Six businesses.
            <br />
            One{" "}
            <span
              style={{
                background:
                  "linear-gradient(180deg, #ffba7a 0%, #ef6c33 60%, #d35420 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              operating system
            </span>
            .
          </h1>

          <p
            style={{
              marginTop: 22,
              maxWidth: 520,
              fontFamily:
                'system-ui, -apple-system, "SF Pro Display", "Segoe UI", sans-serif',
              fontSize: "0.975rem",
              lineHeight: 1.55,
              color: "#94a3b8",
            }}
          >
            The multi-tenant studio I built to run every business I own from a single worktree. Marketing sites, portals, billing, scheduled agents, an inbox that only surfaces what a human has to decide.
          </p>

          <div style={{ marginTop: 26 }}>{cta}</div>
        </div>

        {/* Activity log */}
        <ActivityLog visible={visible} reduce={!!reduce} />
      </div>

      {/* Schedule strip — bottom border of the admin window. */}
      <ScheduleStrip />

      {/* Responsive grid CSS — at lg breakpoint, switch to 3-column. */}
      <style>{`
        @media (min-width: 1024px) {
          .living-os-grid {
            grid-template-columns: 200px minmax(0, 1fr) 280px;
          }
        }
      `}</style>
    </div>
  );
}

// ---------- sub-components ----------------------------------------------

function Dot({ color }: { color: string }) {
  return (
    <span
      style={{
        width: 11,
        height: 11,
        borderRadius: "50%",
        background: color,
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.15)",
      }}
    />
  );
}

function InboxPill({ count }: { count: number }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "5px 11px",
        borderRadius: 999,
        background: count <= 3 ? "rgba(34,197,94,0.10)" : "rgba(239,108,51,0.10)",
        border: `1px solid ${count <= 3 ? "rgba(34,197,94,0.30)" : "rgba(239,108,51,0.30)"}`,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: count <= 3 ? "#86efac" : "#fb923c",
      }}
    >
      <span>inbox</span>
      <span
        style={{
          fontVariantNumeric: "tabular-nums",
          color: "#ffffff",
          fontSize: 11,
        }}
      >
        {count}
      </span>
    </div>
  );
}

function TenantRail() {
  return (
    <div
      style={{
        padding: "20px 16px",
        borderRight: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(255,255,255,0.015)",
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.18em",
          color: "#64748b",
          textTransform: "uppercase",
          marginBottom: 14,
          paddingLeft: 4,
        }}
      >
        Tenants · 6
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {TENANTS.map((t) => {
          const badge = statusBadge(t.status);
          return (
            <div
              key={t.slug}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 8,
                background: "transparent",
                transition: "background 160ms ease",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: t.color,
                  boxShadow: `0 0 8px ${t.color}80`,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  flex: 1,
                  fontSize: 12,
                  color: "#e2e8f0",
                  fontWeight: 500,
                  letterSpacing: "0.01em",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {t.label}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 8.5,
                  fontWeight: 700,
                  letterSpacing: "0.10em",
                  color: badge.color,
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: badge.dot,
                  }}
                />
                {badge.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActivityLog({
  visible,
  reduce,
}: {
  visible: Array<LogEntry & { idx: number }>;
  reduce: boolean;
}) {
  return (
    <div
      style={{
        padding: "20px 18px",
        borderLeft: "1px solid rgba(255,255,255,0.05)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.18em",
          color: "#64748b",
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        <span>Activity · live</span>
        {!reduce && (
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#22c55e",
              boxShadow: "0 0 8px rgba(34,197,94,0.7)",
            }}
          />
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, position: "relative" }}>
        <AnimatePresence initial={false}>
          {visible.map((entry) => (
            <motion.div
              key={entry.idx}
              initial={reduce ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, height: 0, marginTop: -8 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                fontSize: 11,
                lineHeight: 1.45,
                color: "#cbd5e1",
              }}
            >
              <span
                style={{
                  fontVariantNumeric: "tabular-nums",
                  color: "#64748b",
                  flexShrink: 0,
                  fontWeight: 600,
                }}
              >
                {entry.time}
              </span>
              <span style={{ minWidth: 0 }}>{entry.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ScheduleStrip() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "10px 18px",
        background: "rgba(255,255,255,0.02)",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        fontSize: 10.5,
        color: "#94a3b8",
        overflowX: "auto",
        scrollbarWidth: "none",
      }}
    >
      <span
        style={{
          fontWeight: 700,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "#64748b",
          fontSize: 9,
          flexShrink: 0,
        }}
      >
        Schedule
      </span>
      {SCHEDULE.map((s, i) => (
        <span
          key={i}
          style={{ display: "inline-flex", gap: 8, alignItems: "center", flexShrink: 0 }}
        >
          <span style={{ color: "#fb923c", fontWeight: 600 }}>{s.in}</span>
          <span style={{ color: "#cbd5e1" }}>{s.task}</span>
          {i < SCHEDULE.length - 1 && (
            <span style={{ color: "#334155", marginLeft: 10 }}>·</span>
          )}
        </span>
      ))}
    </div>
  );
}

function DeployBar({ reduce }: { reduce: boolean | null }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: "rgba(255,255,255,0.04)",
        overflow: "hidden",
        zIndex: 2,
      }}
    >
      {!reduce && (
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: "40%",
            background:
              "linear-gradient(90deg, transparent 0%, #ef6c33 50%, transparent 100%)",
          }}
        />
      )}
    </div>
  );
}
