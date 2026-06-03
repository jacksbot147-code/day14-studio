"use client";

/**
 * TypeIn — line-by-line spawn animation that types text into existence
 * character-by-character with a blinking cursor.
 *
 * Usage:
 *   <TypeIn text="From a local site" startAt={0} cps={80} cursor />
 *   <TypeIn text="to a full platform." startAt={750} cps={80} cursor />
 *
 * Each instance animates independently from `startAt` ms after mount.
 * Caller calculates `startAt` so a sequence of lines types in order with
 * a single visible cursor walking down them.
 *
 * SSR-safe: server renders the full text with opacity 0 so there's no flash
 * of completed text before the animation starts. On client mount, opacity
 * goes to 1 and chars are revealed one-at-a-time. Screen readers get the
 * full text via aria-label regardless of animation state.
 *
 * Glitch: when `glitch` is true, AFTER typing completes, the component
 * occasionally (every 4-10s) swaps one random visible character with a
 * random terminal glyph for ~50ms, then reverts. Subtle CRT-corruption
 * feel — never distracting if used sparingly.
 *
 * Reduced motion: text appears instantly fully-typed. No cursor, no glitch.
 */

import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

const GLITCH_GLYPHS = "▮█▓░▒▌▐■◊◈◇⌬⎔▪◆◉⊡⌖";

interface TypeInProps {
  /** The text to type. */
  text: string;
  /** Characters per second. Default 80 (~12.5ms/char). */
  cps?: number;
  /** Delay in ms after mount before typing begins. Default 0. */
  startAt?: number;
  /** Show a blinking ember cursor at the end of the typed text while typing. */
  cursor?: boolean;
  /** After completion, occasionally flash a random char as a glitch glyph. */
  glitch?: boolean;
  /** Optional callback when typing completes. */
  onComplete?: () => void;
  /** Optional className for the wrapping span. */
  className?: string;
  /** Optional style for the wrapping span (e.g. pass gradient styles here). */
  style?: CSSProperties;
  /**
   * Nested children rendered AFTER the typed text. Useful for ending a line
   * with non-text content (e.g. an inline icon or a second TypeIn segment).
   */
  children?: ReactNode;
}

export function TypeIn({
  text,
  cps = 80,
  startAt = 0,
  cursor = false,
  glitch = false,
  onComplete,
  className,
  style,
  children,
}: TypeInProps) {
  const reduce = useReducedMotion();
  // Hydration-safe: server renders mounted=false, opacity 0, full text in DOM.
  // On client mount, opacity goes to 1 and the typing animation begins from 0.
  const [mounted, setMounted] = useState(false);
  const [charIdx, setCharIdx] = useState(0);
  const [done, setDone] = useState(false);
  const [glitchAt, setGlitchAt] = useState<{ idx: number; glyph: string } | null>(null);

  // Typing animation
  useEffect(() => {
    setMounted(true);

    if (reduce) {
      setCharIdx(text.length);
      setDone(true);
      onComplete?.();
      return;
    }

    let cancelled = false;
    const charDelayMs = 1000 / cps;

    const startTimer = window.setTimeout(() => {
      let i = 0;
      const tick = () => {
        if (cancelled) return;
        if (i < text.length) {
          i++;
          setCharIdx(i);
          window.setTimeout(tick, charDelayMs);
        } else {
          setDone(true);
          onComplete?.();
        }
      };
      tick();
    }, startAt);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, cps, startAt, reduce]);

  // Glitch loop — only fires after typing completes
  useEffect(() => {
    if (!glitch || !done || reduce || text.length === 0) return;
    let cancelled = false;

    const scheduleNext = () => {
      const nextDelay = 4000 + Math.random() * 6000;
      const id = window.setTimeout(() => {
        if (cancelled) return;
        const idx = Math.floor(Math.random() * text.length);
        const glyph = GLITCH_GLYPHS[Math.floor(Math.random() * GLITCH_GLYPHS.length)]!;
        // Skip if the picked char is whitespace — looks weird glitching a space.
        if (/\s/.test(text[idx] ?? "")) {
          scheduleNext();
          return;
        }
        setGlitchAt({ idx, glyph });
        window.setTimeout(() => {
          if (!cancelled) setGlitchAt(null);
          scheduleNext();
        }, 55);
      }, nextDelay);
      return id;
    };
    const id = scheduleNext();
    return () => {
      cancelled = true;
      if (typeof id === "number") window.clearTimeout(id);
    };
  }, [glitch, done, reduce, text]);

  // SSR / pre-mount: full text rendered at opacity 0 (preserves layout +
  // screen-reader access, no flash before animation starts).
  if (!mounted) {
    return (
      <span
        className={className}
        style={{ ...style, opacity: 0 }}
        aria-label={text}
      >
        {text}
        {children}
      </span>
    );
  }

  // Compose visible text — apply glitch swap inline if active
  let visibleText: ReactNode;
  if (glitchAt && glitchAt.idx < charIdx) {
    visibleText = (
      <>
        {text.slice(0, glitchAt.idx)}
        <span style={{ color: "#ef6c33" }}>{glitchAt.glyph}</span>
        {text.slice(glitchAt.idx + 1, charIdx)}
      </>
    );
  } else {
    visibleText = text.slice(0, charIdx);
  }

  return (
    <span
      className={className}
      style={{ ...style, opacity: 1 }}
      aria-label={text}
      suppressHydrationWarning
    >
      {visibleText}
      {cursor && !done && <TypeCursor />}
      {children}
    </span>
  );
}

/** A blinking ember cursor block. Used inline. */
function TypeCursor() {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: "0.55em",
        height: "0.92em",
        marginLeft: "0.08em",
        background: "#ef6c33",
        verticalAlign: "text-bottom",
        animation: "type-in-cursor 0.9s steps(2) infinite",
        translate: "0 -0.04em",
      }}
    />
  );
  // (The keyframes are injected via global style — see below.)
}

/**
 * Keyframes injection — render this once near your TypeIn usage (e.g. at
 * the top of a page). Or include in globals.css.
 */
export function TypeInKeyframes() {
  return (
    <style>{`
      @keyframes type-in-cursor {
        50% { opacity: 0; }
      }
    `}</style>
  );
}
