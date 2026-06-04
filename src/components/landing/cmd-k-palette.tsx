"use client";

/**
 * CmdKPalette — Phase C: the thing they can touch.
 *
 * A floating "Ask the OS · ⌘K" pill bottom-right of the viewport. Click it
 * (or press ⌘K / Ctrl+K anywhere on the page) and a glassmorphism command
 * palette opens center-screen with backdrop blur over the page.
 *
 * Pre-seeded with 14 realistic Day14 OS commands across the categories
 * Jack actually uses (approve, schedule, deploy, tenant ops, inbox, agent
 * ops, analytics). The visitor types — results filter live by simple
 * fuzzy substring match. Hitting Enter on the highlighted result triggers
 * a faked "execution" — a green check, a slide-down toast saying "would
 * have run: <command>", and the palette closes.
 *
 * This is the marketing page's first interactive product moment. Visitors
 * touch the OS without signing up. Lands the "Cursor's Cmd+K but for an
 * empire" pitch without explaining it.
 *
 * Keyboard:
 *   ⌘K / Ctrl+K   → toggle open
 *   ↑ / ↓         → move highlight
 *   Enter         → "execute" highlighted
 *   Esc           → close
 *
 * SSR-safe: server renders just the floating pill. Palette panel only
 * mounts when opened.
 *
 * Reduced motion: open/close is instant fade (no scale/blur). Toast still
 * appears but doesn't translate.
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Command {
  id: string;
  label: string;
  group: string;
  hint?: string;
  /** Brand color dot, if the command is tenant-scoped. */
  tenantColor?: string;
}

// Buyer-oriented commands first (so a non-technical visitor who opens the
// palette sees useful actions, not internal-ops jargon). The "Behind the
// scenes" group keeps the OS-personality without confusing prospects.
const COMMANDS: Command[] = [
  { id: "book-call",        label: "Book a 20-min scope call",                         group: "Talk to us",      hint: "↵ to open" },
  { id: "see-pricing",      label: "See pricing — Spark / Studio / Platform / Custom", group: "Talk to us" },
  { id: "email-jack",       label: "Email Jack directly",                              group: "Talk to us" },

  { id: "see-work",         label: "See what we've built",                             group: "Our work" },
  { id: "see-how",          label: "See how it works",                                 group: "Our work" },
  { id: "hire-us",          label: "Read the full hire-us page",                       group: "Our work" },

  { id: "deploy-day14",     label: "Deploy day14 to production",                       group: "Behind the scenes",   tenantColor: "#ef6c33" },
  { id: "deploy-alignmd",   label: "Deploy alignmd to production",                     group: "Behind the scenes",   tenantColor: "#3b82f6" },
  { id: "deploy-loophole",  label: "Deploy life-loophole to production",               group: "Behind the scenes",   tenantColor: "#ca8a04" },
  { id: "approve-all",      label: "Approve all pending inbox items",                  group: "Behind the scenes" },
  { id: "schedule-brief",   label: "Schedule a new daily briefing",                    group: "Behind the scenes" },
  { id: "show-worklog",     label: "Show today's work-log entries",                    group: "Behind the scenes" },
];

function fuzzyMatch(q: string, label: string): boolean {
  if (!q) return true;
  const lower = label.toLowerCase();
  const query = q.toLowerCase();
  let qi = 0;
  for (let i = 0; i < lower.length && qi < query.length; i++) {
    if (lower[i] === query[qi]) qi++;
  }
  return qi === query.length;
}

export function CmdKPalette() {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Global ⌘K listener
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus input when palette opens
  useEffect(() => {
    if (open) {
      setQ("");
      setHighlight(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const results = useMemo(
    () => COMMANDS.filter((c) => fuzzyMatch(q, c.label)),
    [q],
  );

  // Clamp highlight if results shrink below current index
  useEffect(() => {
    if (highlight >= results.length) setHighlight(Math.max(0, results.length - 1));
  }, [results.length, highlight]);

  const execute = useCallback(
    (cmd: Command) => {
      // Buyer-oriented commands route to real destinations. The "Behind the
      // scenes" Day14 OS commands stay as faked-execute toasts for personality.
      const routes: Record<string, () => void> = {
        "book-call": () => document.getElementById("book")?.scrollIntoView({ behavior: "smooth" }),
        "see-pricing": () => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }),
        "email-jack": () => {
          window.location.href = "mailto:jack@day14.us?subject=Day14%20scope%20call";
        },
        "see-work": () => document.getElementById("case-studies")?.scrollIntoView({ behavior: "smooth" }),
        "see-how": () => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" }),
        "hire-us": () => {
          window.location.href = "/work-with-us";
        },
      };
      const action = routes[cmd.id];
      if (action) {
        action();
        setOpen(false);
        return;
      }
      // Personality OS-commands — fake-execute with toast
      setToast(`Would have run: ${cmd.label}`);
      setOpen(false);
    },
    [],
  );

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(results.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = results[highlight];
      if (cmd) execute(cmd);
    }
  }

  return (
    <>
      {/* Floating trigger pill — bottom-right corner. */}
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        whileHover={reduce ? undefined : { y: -2 }}
        style={{
          position: "fixed",
          right: 22,
          bottom: 22,
          zIndex: 60,
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "11px 16px 11px 14px",
          borderRadius: 999,
          background: "#0a0e14",
          color: "#f1f5f9",
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.02em",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 18px 40px -12px rgba(15,23,42,0.45), 0 4px 12px -4px rgba(239,108,51,0.20)",
          cursor: "pointer",
        }}
      >
        <motion.span
          animate={reduce ? undefined : { scale: [1, 1.35, 1], opacity: [1, 0.6, 1] }}
          transition={reduce ? undefined : { duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#fb923c",
            boxShadow: "0 0 8px rgba(251,146,60,0.8)",
            display: "inline-block",
          }}
        />
        Ask anything
        <span
          style={{
            marginLeft: 4,
            padding: "2px 7px",
            borderRadius: 5,
            background: "rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.65)",
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          ⌘K
        </span>
      </motion.button>

      {/* Palette overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="cmdk-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 70,
              background: "rgba(10, 14, 20, 0.55)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              padding: "12vh 16px 16px",
            }}
          >
            <motion.div
              key="cmdk-panel"
              onClick={(e) => e.stopPropagation()}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              style={{
                width: "100%",
                maxWidth: 600,
                borderRadius: 16,
                overflow: "hidden",
                background: "rgba(10,14,20,0.92)",
                border: "1px solid rgba(255,255,255,0.10)",
                boxShadow: "0 50px 120px -30px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.05)",
                color: "#e2e8f0",
                fontFamily:
                  'system-ui, -apple-system, "SF Pro Display", "Segoe UI", sans-serif',
              }}
            >
              {/* Input row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "16px 18px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                  <circle cx="7" cy="7" r="5" />
                  <path d="M14 14L11 11" strokeLinecap="round" />
                </svg>
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setHighlight(0);
                  }}
                  onKeyDown={onInputKeyDown}
                  placeholder="Ask the OS — try 'deploy', 'inbox', 'tenant'…"
                  spellCheck={false}
                  style={{
                    flex: 1,
                    background: "transparent",
                    color: "#f8fafc",
                    border: "none",
                    outline: "none",
                    fontSize: 15,
                    letterSpacing: "-0.005em",
                    fontFamily: "inherit",
                  }}
                />
                <kbd
                  style={{
                    padding: "3px 7px",
                    borderRadius: 5,
                    background: "rgba(255,255,255,0.05)",
                    color: "rgba(255,255,255,0.45)",
                    fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                >
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div style={{ maxHeight: 360, overflowY: "auto", padding: 8 }}>
                {results.length === 0 ? (
                  <div
                    style={{
                      padding: "32px 16px",
                      textAlign: "center",
                      color: "rgba(255,255,255,0.40)",
                      fontSize: 13,
                    }}
                  >
                    Nothing matches "{q}".
                  </div>
                ) : (
                  groupResults(results).map((grp) => (
                    <div key={grp.group} style={{ marginBottom: 4 }}>
                      <div
                        style={{
                          padding: "10px 12px 6px",
                          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color: "rgba(255,255,255,0.40)",
                        }}
                      >
                        {grp.group}
                      </div>
                      {grp.items.map((c) => {
                        const globalIdx = results.indexOf(c);
                        const isActive = globalIdx === highlight;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onMouseEnter={() => setHighlight(globalIdx)}
                            onClick={() => execute(c)}
                            style={{
                              width: "100%",
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: "10px 12px",
                              borderRadius: 8,
                              background: isActive ? "rgba(239,108,51,0.10)" : "transparent",
                              border: isActive
                                ? "1px solid rgba(239,108,51,0.30)"
                                : "1px solid transparent",
                              color: "#e2e8f0",
                              fontSize: 13.5,
                              fontFamily: "inherit",
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                          >
                            {c.tenantColor && (
                              <span
                                style={{
                                  width: 7,
                                  height: 7,
                                  borderRadius: "50%",
                                  background: c.tenantColor,
                                  boxShadow: `0 0 6px ${c.tenantColor}80`,
                                  flexShrink: 0,
                                }}
                              />
                            )}
                            <span style={{ flex: 1, minWidth: 0 }}>{c.label}</span>
                            {isActive && c.hint && (
                              <span
                                style={{
                                  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                                  fontSize: 10,
                                  color: "rgba(255,255,255,0.45)",
                                }}
                              >
                                {c.hint}
                              </span>
                            )}
                            {isActive && (
                              <span style={{ color: "#fb923c", fontSize: 14 }}>↵</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer hint row */}
              <div
                style={{
                  padding: "10px 18px",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                  fontSize: 10,
                  color: "rgba(255,255,255,0.40)",
                  letterSpacing: "0.06em",
                }}
              >
                <span>↑↓ navigate · ↵ run · ESC close</span>
                <span>{results.length} of {COMMANDS.length}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast — appears bottom-center when a command "executes". */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="cmdk-toast"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "fixed",
              bottom: 28,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 80,
              padding: "11px 18px",
              borderRadius: 10,
              background: "rgba(10,14,20,0.96)",
              color: "#e2e8f0",
              border: "1px solid rgba(34,197,94,0.30)",
              boxShadow: "0 18px 40px -12px rgba(0,0,0,0.50)",
              fontFamily:
                'system-ui, -apple-system, "SF Pro Display", "Segoe UI", sans-serif',
              fontSize: 13,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              maxWidth: "92vw",
            }}
          >
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "#22c55e",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0a0e14",
                fontSize: 11,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              ✓
            </span>
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ---------- helpers ----------

function groupResults(items: Command[]): { group: string; items: Command[] }[] {
  const map = new Map<string, Command[]>();
  for (const c of items) {
    const arr = map.get(c.group) ?? [];
    arr.push(c);
    map.set(c.group, arr);
  }
  return Array.from(map.entries()).map(([group, items]) => ({ group, items }));
}
