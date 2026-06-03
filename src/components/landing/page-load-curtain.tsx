"use client";

/**
 * PageLoadCurtain — the cinematic spawn-in moment on first paint.
 *
 * When the page first loads, a full-screen cream curtain covers the viewport
 * with a terminal-style boot sequence typing itself out:
 *
 *   > day14_os booting
 *   > 6 tenants loaded
 *   > 24 agents online
 *   > ready in 412ms
 *   > _
 *
 * Each line types char-by-char (~30ms/char) with a small gap between lines.
 * Total visible duration: ~1.4 seconds. Then the curtain wipes upward
 * (scaleY 1 → 0 from top, 600ms) revealing the page underneath. Total
 * load-in time before the page is visible: ~2 seconds first paint.
 *
 * Skip logic: if the user has seen the curtain in this browser session
 * within the last 60 seconds, it's skipped (avoids the "refresh during
 * dev review" annoyance). First fresh visit always plays.
 *
 * SSR-safe: server renders the curtain in its final "boot complete" state.
 * Client takes over on mount to play the sequence + exit. The page below
 * is fully rendered behind the curtain so LCP/SEO aren't penalized for
 * structure (only paint timing).
 *
 * Reduced motion: skips the typing entirely. Curtain shows briefly with
 * all lines visible, then fades (no scale wipe).
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

const BOOT_LINES = [
  "day14_os booting",
  "6 tenants loaded",
  "24 agents online",
  "ready in 412ms",
];

const CHAR_DELAY_MS = 28;
const LINE_GAP_MS = 110;
const HOLD_AFTER_BOOT_MS = 380;
const EXIT_DURATION_MS = 620;

const SESSION_KEY = "day14-curtain-last";
const SKIP_WINDOW_MS = 60_000;

export function PageLoadCurtain() {
  const reduce = useReducedMotion();
  // Server + first client paint: curtain visible (covers everything).
  const [visible, setVisible] = useState(true);
  // Number of lines fully typed.
  const [lineIdx, setLineIdx] = useState(0);
  // Number of characters typed on the current line.
  const [charIdx, setCharIdx] = useState(0);

  useEffect(() => {
    // Skip if recently shown (session refresh within 60s).
    try {
      const last = window.sessionStorage.getItem(SESSION_KEY);
      const now = Date.now();
      if (last && now - parseInt(last, 10) < SKIP_WINDOW_MS) {
        setVisible(false);
        return;
      }
      window.sessionStorage.setItem(SESSION_KEY, String(now));
    } catch {
      // sessionStorage blocked (privacy mode, sandboxed iframe) — just play
    }

    // Reduced motion: hold all-lines-visible for ~600ms, then exit.
    if (reduce) {
      setLineIdx(BOOT_LINES.length);
      const id = window.setTimeout(() => setVisible(false), 600);
      return () => window.clearTimeout(id);
    }

    // Full typing sequence — drive a queue of timeouts so the whole thing
    // unwinds even if React re-renders.
    let cancelled = false;
    let curLine = 0;
    let curChar = 0;

    const tick = () => {
      if (cancelled) return;
      if (curLine >= BOOT_LINES.length) {
        // All lines done — hold, then trigger exit.
        window.setTimeout(() => {
          if (!cancelled) setVisible(false);
        }, HOLD_AFTER_BOOT_MS);
        return;
      }
      const line = BOOT_LINES[curLine]!;
      if (curChar < line.length) {
        curChar++;
        setCharIdx(curChar);
        window.setTimeout(tick, CHAR_DELAY_MS);
      } else {
        curLine++;
        curChar = 0;
        setLineIdx(curLine);
        setCharIdx(0);
        window.setTimeout(tick, LINE_GAP_MS);
      }
    };
    window.setTimeout(tick, 80);

    return () => {
      cancelled = true;
    };
  }, [reduce]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="day14-curtain"
          initial={false}
          exit={
            reduce
              ? { opacity: 0 }
              : { scaleY: 0, transformOrigin: "top" }
          }
          transition={{
            duration: EXIT_DURATION_MS / 1000,
            ease: [0.7, 0, 0.3, 1],
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "#fafaf7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            transformOrigin: "top",
            willChange: "transform, opacity",
          }}
          aria-hidden
        >
          {/* Faint dot grid background — Matrix-but-minimal touch. */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "radial-gradient(circle, rgba(15,23,42,0.08) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
              maskImage:
                "radial-gradient(120% 100% at 50% 50%, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 80%)",
              WebkitMaskImage:
                "radial-gradient(120% 100% at 50% 50%, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 80%)",
              pointerEvents: "none",
            }}
          />

          {/* The boot sequence */}
          <div
            style={{
              position: "relative",
              fontFamily:
                'ui-monospace, "SF Mono", Menlo, "JetBrains Mono", monospace',
              fontSize: 14,
              lineHeight: 1.75,
              color: "#0a0a0a",
              minWidth: 280,
              maxWidth: "90vw",
            }}
          >
            {/* Brand mark above the boot sequence */}
            <div
              style={{
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: "0.32em",
                color: "#ef6c33",
                marginBottom: 18,
                textAlign: "left",
              }}
            >
              DAY14 · OS
            </div>

            {BOOT_LINES.map((line, i) => {
              const isPast = i < lineIdx;
              const isCurrent = i === lineIdx;
              const isFuture = i > lineIdx;
              if (isFuture) return null;
              const text = isPast ? line : line.slice(0, charIdx);
              return (
                <div key={i} style={{ display: "flex", alignItems: "baseline" }}>
                  <span
                    style={{
                      color: "#ef6c33",
                      marginRight: 10,
                      fontWeight: 600,
                    }}
                  >
                    &gt;
                  </span>
                  <span style={{ color: "#0a0a0a" }}>{text}</span>
                  {isCurrent && !reduce && (
                    <span
                      style={{
                        display: "inline-block",
                        width: 7,
                        height: 14,
                        background: "#ef6c33",
                        marginLeft: 4,
                        transform: "translateY(2px)",
                        animation: "day14-curtain-blink 0.9s steps(2) infinite",
                      }}
                    />
                  )}
                  {isPast && (
                    <span
                      style={{
                        marginLeft: 12,
                        color: "#22c55e",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.10em",
                      }}
                    >
                      ✓
                    </span>
                  )}
                </div>
              );
            })}

            {/* Final blinking prompt after all lines are typed */}
            {lineIdx >= BOOT_LINES.length && (
              <div style={{ display: "flex", alignItems: "baseline", marginTop: 4 }}>
                <span style={{ color: "#ef6c33", marginRight: 10, fontWeight: 600 }}>
                  &gt;
                </span>
                {!reduce && (
                  <span
                    style={{
                      display: "inline-block",
                      width: 7,
                      height: 14,
                      background: "#ef6c33",
                      transform: "translateY(2px)",
                      animation: "day14-curtain-blink 0.9s steps(2) infinite",
                    }}
                  />
                )}
              </div>
            )}
          </div>

          <style>{`
            @keyframes day14-curtain-blink {
              50% { opacity: 0; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
