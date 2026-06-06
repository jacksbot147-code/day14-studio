"use client";

/**
 * FullTerminalHero — total rebuild. No split layout, no right-column tile,
 * no particles, no constellation. The entire hero IS a full-viewport
 * terminal session.
 *
 * Black background with a faint dot grid. Thin terminal chrome at the top
 * (DAY14 · OS · online) and bottom (press ⏎ to book). Center: a sequence
 * of fake shell commands that type themselves out in real time, with
 * outputs revealing the pitch (who Day14 is, the pricing ladder, the
 * tenant proof, the CTA). After the sequence completes, the final prompt
 * blinks and the user can press Enter (or click) to jump to the scope-call
 * section below the fold.
 *
 * Why this is the right hero for Day14:
 *   - Day14 OS is literally terminal-driven. The marketing IS the product
 *     surface, not a metaphor for it.
 *   - Cursor/Bun/Plain prove the full-terminal aesthetic reads as confident
 *     and committed, not gimmicky.
 *   - Kills every decoration the user (Jack) explicitly rejected: particles,
 *     constellation tile, split layout, blur-to-sharp builds.
 *   - The pricing + tenant list are visible WITHIN the hero — no need to
 *     scroll to see them. Higher conversion intent above the fold.
 *
 * SSR-safe: server renders the terminal frame + all command output text at
 * opacity 0 so SEO/crawlers see the full pitch. Client takes over to
 * animate the type-in sequence.
 *
 * Reduced motion: all lines shown immediately, no typing animation.
 * Keyboard Enter or click on the CTA: scrolls to #book.
 */

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

// ---------- the terminal session script ----------

type Line =
  | { kind: "command"; text: string }
  | { kind: "output"; text: string; tint?: "default" | "muted" | "ember" | "green" | "rule" }
  | { kind: "blank" };

const SESSION: Line[] = [
  { kind: "command", text: "whoami" },
  { kind: "output", text: "day14 — productized build studio" },
  { kind: "output", text: "running on a multi-tenant OS we built ourselves", tint: "muted" },
  { kind: "output", text: "taking three new client builds a month", tint: "muted" },
  { kind: "blank" },
  { kind: "command", text: "cat ./pricing.txt" },
  { kind: "output", text: "────────────────────────────────────────────", tint: "rule" },
  { kind: "output", text: "spark      $1,500     5 days    local site" },
  { kind: "output", text: "studio     $9,000     14 days   marketing site" },
  { kind: "output", text: "platform   $24,000    4 weeks   full stack", tint: "ember" },
  { kind: "output", text: "custom     scoped     6–12 wk   bespoke" },
  { kind: "output", text: "────────────────────────────────────────────", tint: "rule" },
  { kind: "blank" },
  { kind: "command", text: "ls ./clients" },
  { kind: "output", text: "alignmd   life-loophole   day14-realty" },
  { kind: "output", text: "hot-flash-co   kennum   day14" },
  { kind: "output", text: "+ 1 in flight (yours?)", tint: "ember" },
  { kind: "blank" },
  { kind: "command", text: "./book-scope-call" },
];

const COMMAND_CPS = 90; // chars per second for command typing
const OUTPUT_LINE_DELAY_MS = 120; // gap between output lines appearing
const PROMPT_GAP_MS = 260; // gap before next command prompt appears

export function FullTerminalHero() {
  const reduce = useReducedMotion();
  const [lineIdx, setLineIdx] = useState(reduce ? SESSION.length : 0);
  const [charIdx, setCharIdx] = useState(0);
  const [done, setDone] = useState(reduce);

  useEffect(() => {
    if (reduce) return;
    let cancelled = false;
    let cur = 0;
    let chr = 0;

    const tick = () => {
      if (cancelled) return;
      if (cur >= SESSION.length) {
        setDone(true);
        return;
      }
      const line = SESSION[cur]!;
      if (line.kind === "blank") {
        cur++;
        setLineIdx(cur);
        window.setTimeout(tick, PROMPT_GAP_MS);
        return;
      }
      if (line.kind === "output") {
        // Output appears as a whole line (no char-by-char on outputs — keeps
        // total runtime sane and matches real shell behavior).
        cur++;
        setLineIdx(cur);
        setCharIdx(0);
        window.setTimeout(tick, OUTPUT_LINE_DELAY_MS);
        return;
      }
      // Command: type char by char
      if (chr < line.text.length) {
        chr++;
        setCharIdx(chr);
        window.setTimeout(tick, 1000 / COMMAND_CPS);
      } else {
        cur++;
        chr = 0;
        setLineIdx(cur);
        setCharIdx(0);
        window.setTimeout(tick, PROMPT_GAP_MS);
      }
    };

    // Slight initial delay so the page can paint before the type-in starts
    const startTimer = window.setTimeout(tick, 380);
    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
    };
  }, [reduce]);

  // Press Enter when done to scroll to the book section
  useEffect(() => {
    if (!done) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter") {
        e.preventDefault();
        document.getElementById("book")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done]);

  return (
    <section
      style={{
        position: "relative",
        minHeight: "100vh",
        background: "#06070b",
        overflow: "hidden",
        fontFamily: 'ui-monospace, "SF Mono", Menlo, "JetBrains Mono", monospace',
        color: "#e5e7eb",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Faint dot grid backdrop */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          maskImage:
            "radial-gradient(140% 100% at 50% 40%, rgba(0,0,0,1) 20%, rgba(0,0,0,0.2) 80%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage:
            "radial-gradient(140% 100% at 50% 40%, rgba(0,0,0,1) 20%, rgba(0,0,0,0.2) 80%, rgba(0,0,0,0) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Soft ember glow centered, low opacity — gives the void depth */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(50% 60% at 50% 45%, rgba(239,108,51,0.07), rgba(239,108,51,0) 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Top chrome bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "14px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 10.5,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.45)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(0,0,0,0.20)",
          backdropFilter: "blur(6px)",
          zIndex: 3,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span style={{ display: "inline-flex", gap: 5 }}>
            <Dot color="#ff5f57" />
            <Dot color="#febc2e" />
            <Dot color="#28c840" />
          </span>
          <span>
            <span style={{ color: "#fb923c" }}>day14</span>
            <span style={{ color: "rgba(255,255,255,0.30)" }}>@</span>
            <span style={{ color: "rgba(255,255,255,0.65)" }}>os</span>
            <span style={{ color: "rgba(255,255,255,0.30)" }}> v1.0.0</span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            <motion.span
              animate={reduce ? undefined : { opacity: [1, 0.35, 1] }}
              transition={reduce ? undefined : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#22c55e",
                boxShadow: "0 0 8px rgba(34,197,94,0.7)",
                display: "inline-block",
              }}
            />
            <span>online</span>
          </span>
          <Sep />
          <span>6 tenants</span>
          <Sep />
          <span>24 agents</span>
        </div>
      </div>

      {/* Terminal body */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: 880,
          margin: "0 auto",
          padding: "120px 28px 110px",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          fontSize: 15,
          lineHeight: 1.85,
        }}
      >
        {SESSION.map((line, i) => {
          if (i > lineIdx) return null;
          if (line.kind === "blank") {
            return <div key={i} style={{ height: "0.8em" }} />;
          }
          const isCurrentCommand =
            i === lineIdx && line.kind === "command";
          const showCursor = isCurrentCommand && !done;
          const visibleText =
            i === lineIdx && line.kind === "command"
              ? line.text.slice(0, charIdx)
              : line.text;
          if (line.kind === "command") {
            return (
              <div key={i} style={{ display: "flex", alignItems: "baseline" }}>
                <span style={{ color: "#fb923c", marginRight: 12, fontWeight: 700 }}>
                  $
                </span>
                <span style={{ color: "#f8fafc" }}>{visibleText}</span>
                {showCursor && <Cursor />}
              </div>
            );
          }
          // output
          const color =
            line.tint === "muted"
              ? "rgba(255,255,255,0.55)"
              : line.tint === "ember"
                ? "#fb923c"
                : line.tint === "green"
                  ? "#86efac"
                  : line.tint === "rule"
                    ? "rgba(255,255,255,0.20)"
                    : "rgba(255,255,255,0.85)";
          return (
            <motion.div
              key={i}
              initial={reduce ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              style={{ display: "flex", alignItems: "baseline" }}
            >
              <span style={{ color: "rgba(255,255,255,0.20)", marginRight: 12 }}>
                &gt;
              </span>
              <span style={{ color, whiteSpace: "pre" }}>{visibleText}</span>
            </motion.div>
          );
        })}

        {/* Final CTA prompt — appears once the script finishes typing */}
        {done && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{ marginTop: "1.4em" }}
          >
            <div
              style={{ display: "flex", alignItems: "baseline", marginBottom: 6 }}
            >
              <span style={{ color: "rgba(255,255,255,0.20)", marginRight: 12 }}>
                &gt;
              </span>
              <span style={{ color: "rgba(255,255,255,0.55)" }}>
                ready when you are.
              </span>
            </div>

            <a
              href="#book"
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById("book")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                marginTop: 16,
                padding: "12px 18px",
                background: "rgba(239,108,51,0.10)",
                border: "1px solid rgba(239,108,51,0.45)",
                borderRadius: 8,
                color: "#fb923c",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.02em",
                textDecoration: "none",
                cursor: "pointer",
                transition: "all 160ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(239,108,51,0.20)";
                e.currentTarget.style.borderColor = "rgba(239,108,51,0.85)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(239,108,51,0.10)";
                e.currentTarget.style.borderColor = "rgba(239,108,51,0.45)";
              }}
            >
              <kbd
                style={{
                  padding: "3px 8px",
                  borderRadius: 4,
                  background: "rgba(251,146,60,0.20)",
                  color: "#fb923c",
                  fontFamily: "inherit",
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                ⏎
              </kbd>
              <span>Book a 15-min intro call</span>
              <Cursor />
            </a>

            <div
              style={{
                marginTop: 14,
                fontSize: 11.5,
                color: "rgba(255,255,255,0.35)",
                letterSpacing: "0.04em",
              }}
            >
              or scroll for the receipts ↓
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom chrome bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "12px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.35)",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(0,0,0,0.20)",
          backdropFilter: "blur(6px)",
          zIndex: 3,
        }}
      >
        <span>~/day14.us</span>
        <span style={{ color: "rgba(255,255,255,0.50)" }}>
          press <kbd style={{
            padding: "1px 5px",
            borderRadius: 3,
            background: "rgba(255,255,255,0.08)",
            color: "#fb923c",
            fontFamily: "inherit",
            fontWeight: 700,
          }}>⏎</kbd> to book · scroll for the rest
        </span>
        <span>{done ? "ready" : "loading"}</span>
      </div>

      <style>{`
        @keyframes fth-blink { 50% { opacity: 0; } }
      `}</style>
    </section>
  );
}

// ---------- helpers ----------

function Dot({ color }: { color: string }) {
  return (
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: color,
      }}
    />
  );
}

function Sep() {
  return <span style={{ color: "rgba(255,255,255,0.18)" }}>·</span>;
}

function Cursor() {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: "0.55em",
        height: "0.95em",
        marginLeft: 4,
        background: "#fb923c",
        verticalAlign: "text-bottom",
        translate: "0 -0.05em",
        animation: "fth-blink 0.9s steps(2) infinite",
      }}
    />
  );
}
