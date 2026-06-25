"use client";

/**
 * cinematic/StickyCTA — the scroll-triggered "Book a 15-min look" bar (task 6/8).
 *
 * A tasteful sticky CTA that slides in once the visitor scrolls past the hero
 * and stays reachable while they read. Mirrors the prototype nav's
 * "Book a 15-min look" glow button, but as a persistent, dismissible affordance.
 *
 * Behaviour / accessibility:
 *  - Appears only after the visitor scrolls ~90% of the first viewport (past the
 *    hero). Hidden again near the very bottom so it never overlaps the closing
 *    CTA / footer (the same action is right there).
 *  - Dismissible: an explicit close button removes it for the session; once
 *    dismissed it never returns.
 *  - prefers-reduced-DATA → never rendered (it's a non-essential overlay; the
 *    nav + closing CTA already carry the booking action).
 *  - prefers-reduced-MOTION → still shown, but without the slide/scale
 *    transition (handled in CSS).
 *  - Real link to SITE.bookingUrl (Cal.com), new tab, rel=noopener. The close
 *    button is a real <button> with an aria-label; the bar is aria-live=off and
 *    labelled so it's announced sensibly.
 */

import { useEffect, useRef, useState } from "react";
import { SITE } from "@/lib/site";
import { prefersReducedData } from "./motion";

/** Fraction of the first viewport to scroll before the bar appears. */
const SHOW_AFTER_VH = 0.9;
/** Hide again when within this many px of the document bottom (near the footer). */
const HIDE_NEAR_BOTTOM = 420;

export function StickyCTA() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const dismissed = useRef(false);

  // Only decide to render after mount (reduced-data is a client read).
  useEffect(() => {
    if (prefersReducedData()) return;
    setMounted(true);

    const onScroll = () => {
      if (dismissed.current) return;
      const y = window.scrollY;
      const vh = window.innerHeight;
      const past = y > vh * SHOW_AFTER_VH;
      const doc = document.documentElement;
      const nearBottom =
        doc.scrollHeight - (y + vh) < HIDE_NEAR_BOTTOM;
      setVisible(past && !nearBottom);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  if (!mounted) return null;

  const dismiss = () => {
    dismissed.current = true;
    setVisible(false);
  };

  return (
    <div
      className={`cin-sticky-cta${visible ? " cin-sticky-in" : ""}`}
      role="complementary"
      aria-label="Book a call"
      aria-hidden={visible ? undefined : true}
    >
      <a
        className="cin-btn cin-btn-glow"
        href={SITE.bookingUrl}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={visible ? 0 : -1}
        data-mag
        data-cta="book_sticky"
      >
        Book a 15-min look
      </a>
      <button
        type="button"
        className="cin-sticky-x"
        onClick={dismiss}
        aria-label="Dismiss"
        tabIndex={visible ? 0 : -1}
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}

export default StickyCTA;
