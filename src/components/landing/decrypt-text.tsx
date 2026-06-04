"use client";

/**
 * DecryptText — Mr. Robot / hacker-decrypt effect for anchor text.
 *
 * Renders text that starts as scrambled glyphs and resolves character by
 * character into the real text. Layout-stable from frame 1: the full text
 * width is reserved immediately so nothing pushes content around as it
 * decrypts.
 *
 * Use on anchor strings — headlines, eyebrows, key labels — NOT on body
 * paragraphs. Long copy decrypting is exhausting to watch.
 *
 * SSR-safe: server renders the resolved text at opacity 0 (preserves layout
 * + accessibility). Client takes over on mount: at opacity 1, with chars
 * starting as random glyphs and settling to the real values left-to-right.
 *
 * Reduced motion: skips the scramble, shows the text instantly.
 *
 * Glyph set is a mix of block characters and a couple of letters/digits so
 * the scramble reads as "encrypted data" rather than just noise.
 */

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

const SCRAMBLE_GLYPHS = "▮█▓░▒▌▐■◊◈◇⌬⎔▪◆◉⊡⌖01ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&*+";

interface DecryptTextProps {
  text: string;
  /** Total time from start to fully decrypted, in ms. Default 700. */
  durationMs?: number;
  /** Delay in ms before decryption starts (after armed). Default 0. */
  startAt?: number;
  /** If true, waits for the element to enter the viewport before decrypting. */
  triggerOnView?: boolean;
  /** Tint of unscrambled glyphs. Default ember orange. */
  glyphColor?: string;
  className?: string;
  style?: CSSProperties;
}

export function DecryptText({
  text,
  durationMs = 700,
  startAt = 0,
  triggerOnView = false,
  glyphColor = "#ef6c33",
  className,
  style,
}: DecryptTextProps) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [armed, setArmed] = useState(!triggerOnView);
  const [decryptedCount, setDecryptedCount] = useState(0);
  const [scrambleTick, setScrambleTick] = useState(0);
  const wrapperRef = useRef<HTMLSpanElement | null>(null);

  // Client-mount handoff
  useEffect(() => {
    setMounted(true);
  }, []);

  // Viewport-trigger arming
  useEffect(() => {
    if (!triggerOnView || armed) return;
    const el = wrapperRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setArmed(true);
            obs.disconnect();
            break;
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -10% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [triggerOnView, armed]);

  // Decryption animation — fires once armed
  useEffect(() => {
    if (!armed) return;

    if (reduce) {
      setDecryptedCount(text.length);
      return;
    }

    let cancelled = false;

    const startTimer = window.setTimeout(() => {
      // Per-char settle interval — chars decrypt sequentially left-to-right
      const perCharMs = Math.max(20, durationMs / Math.max(1, text.length));

      // Tick for scrambled-glyph re-render (every 50ms feels like real decrypt)
      const scrambleInterval = window.setInterval(() => {
        if (cancelled) return;
        setScrambleTick((t) => t + 1);
      }, 50);

      let i = 0;
      const decryptStep = () => {
        if (cancelled) return;
        if (i < text.length) {
          i++;
          setDecryptedCount(i);
          window.setTimeout(decryptStep, perCharMs);
        } else {
          window.clearInterval(scrambleInterval);
        }
      };
      decryptStep();

      // safety cleanup if component unmounts mid-scramble
      return () => {
        cancelled = true;
        window.clearInterval(scrambleInterval);
      };
    }, startAt);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
    };
  }, [armed, reduce, text, durationMs, startAt]);

  // SSR / pre-mount: full text rendered at opacity 0. Layout reserved.
  if (!mounted) {
    return (
      <span
        ref={wrapperRef}
        className={className}
        style={{ ...style, opacity: 0 }}
        aria-label={text}
      >
        {text}
      </span>
    );
  }

  // Render: each char takes layout space immediately. Decrypted chars show
  // the real value. Undecrypted chars show a deterministic random glyph
  // (changes every scrambleTick to give the live-decrypt feel). Whitespace
  // is preserved as-is — scrambled glyphs in place of spaces look weird.
  return (
    <span
      ref={wrapperRef}
      className={className}
      style={{ ...style, opacity: 1 }}
      aria-label={text}
      suppressHydrationWarning
    >
      {text.split("").map((char, i) => {
        const decrypted = i < decryptedCount;
        const isWhitespace = /\s/.test(char);

        if (decrypted || isWhitespace) {
          return (
            <span key={i} style={{ whiteSpace: "pre" }}>
              {char}
            </span>
          );
        }

        // Deterministic glyph from scrambleTick + index — re-renders on each
        // scrambleTick to give the live "data streaming" feel.
        const glyphIdx = (scrambleTick * 7 + i * 13 + i * i) % SCRAMBLE_GLYPHS.length;
        return (
          <span
            key={i}
            style={{
              color: glyphColor,
              opacity: 0.85,
              whiteSpace: "pre",
            }}
          >
            {SCRAMBLE_GLYPHS[glyphIdx]}
          </span>
        );
      })}
    </span>
  );
}
