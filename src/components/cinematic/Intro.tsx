"use client";

/**
 * cinematic/Intro — the brief opening curtain (task 2/8).
 *
 * A full-screen dark overlay where the "14" mark resolves, then lifts to reveal
 * the hero. Shows once per session (sessionStorage) and is skipped entirely
 * under prefers-reduced-motion. Decorative — aria-hidden, never traps focus
 * (it's gone in <3s and renders nothing once dismissed).
 */

import { useEffect, useState } from "react";
import { prefersReducedMotion } from "./motion";

export function Intro() {
  const [show, setShow] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    try {
      if (sessionStorage.getItem("cin-intro-seen")) return;
    } catch {
      /* sessionStorage blocked — just play it once this load */
    }
    setShow(true);
    const t1 = window.setTimeout(() => setDone(true), 2000);
    const t2 = window.setTimeout(() => {
      setShow(false);
      try {
        sessionStorage.setItem("cin-intro-seen", "1");
      } catch {
        /* ignore */
      }
    }, 2900);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className={`cin-intro${done ? " cin-intro-done" : ""}`}
      aria-hidden="true"
    >
      <div className="cin-intro-mark">14</div>
    </div>
  );
}

export default Intro;
