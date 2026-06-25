"use client";

/**
 * cinematic/CanvasField — the atmospheric backdrop (task 2/8).
 *
 * Renders the fixed, decorative layers behind the cinematic page: a generative
 * particle flow-field on <canvas> (the prototype's "video" stand-in), three
 * drifting blurred orbs, film grain, a vignette, a cursor glow, and the
 * scroll-progress bar.
 *
 * Performance-first, per the QA brief:
 *   - devicePixelRatio capped at 1.5 (no 3x retina paint storms)
 *   - the rAF loop pauses when the tab is hidden AND when scrolled past the
 *     hero (the canvas is only visible behind the first viewport)
 *   - the whole effect is skipped under prefers-reduced-motion / -data
 *     (shouldDisableHeavyEffects) — the CSS reduced-data guard also display:none's
 *     these layers as a belt-and-braces
 *   - everything here is aria-hidden (purely decorative)
 */

import { useEffect, useRef } from "react";
import { shouldDisableHeavyEffects } from "./motion";
import { track } from "@/lib/analytics";

export function CanvasField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const progRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // --- scroll progress bar (always on; cheap) ---
    const onProgress = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      if (progRef.current) progRef.current.style.width = `${pct}%`;
    };
    window.addEventListener("scroll", onProgress, { passive: true });
    onProgress();

    const heavyOff = shouldDisableHeavyEffects();

    // --- cursor glow (pointer-fine only, heavy-effects gate) ---
    const fine =
      !!window.matchMedia && window.matchMedia("(pointer: fine)").matches;
    let onMove: ((e: PointerEvent) => void) | null = null;
    if (fine && !heavyOff) {
      onMove = (e: PointerEvent) => {
        const c = cursorRef.current;
        if (c) {
          c.style.left = `${e.clientX}px`;
          c.style.top = `${e.clientY}px`;
        }
      };
      window.addEventListener("pointermove", onMove, { passive: true });
    }

    // --- particle flow-field ---
    let detachCanvas = () => {};
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx && !heavyOff) {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      let W = 0;
      let H = 0;
      const resize = () => {
        W = canvas.width = Math.floor(window.innerWidth * dpr);
        H = canvas.height = Math.floor(window.innerHeight * dpr);
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
      };
      resize();

      const pts = Array.from({ length: 130 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        s: (0.3 + Math.random() * 0.8) * dpr,
      }));
      const field = (x: number, y: number, t: number) =>
        Math.sin((x / dpr) * 0.0016 + t) + Math.cos((y / dpr) * 0.0018 - t * 0.7);

      let t = 0;
      let raf = 0;
      let running = false;
      const frame = () => {
        t += 0.0016;
        ctx.fillStyle = "rgba(5,5,7,0.10)";
        ctx.fillRect(0, 0, W, H);
        for (const p of pts) {
          const a = field(p.x, p.y, t) * Math.PI;
          p.x += Math.cos(a) * p.s;
          p.y += Math.sin(a) * p.s;
          if (p.x < 0) p.x = W;
          if (p.x > W) p.x = 0;
          if (p.y < 0) p.y = H;
          if (p.y > H) p.y = 0;
          ctx.fillStyle = `rgba(86,179,255,${0.06 + (p.s / dpr) * 0.1})`;
          ctx.fillRect(p.x, p.y, 1.4 * dpr, 1.4 * dpr);
        }
        raf = requestAnimationFrame(frame);
      };
      const start = () => {
        if (!running) {
          running = true;
          raf = requestAnimationFrame(frame);
        }
      };
      const stop = () => {
        running = false;
        cancelAnimationFrame(raf);
      };
      // Only animate while visible AND within ~1.3 viewports of the top.
      const evaluate = () => {
        const onscreen =
          !document.hidden && window.scrollY < window.innerHeight * 1.3;
        if (onscreen) start();
        else stop();
      };
      window.addEventListener("resize", resize);
      window.addEventListener("scroll", evaluate, { passive: true });
      document.addEventListener("visibilitychange", evaluate);
      evaluate();

      detachCanvas = () => {
        stop();
        window.removeEventListener("resize", resize);
        window.removeEventListener("scroll", evaluate);
        document.removeEventListener("visibilitychange", evaluate);
      };
    }

    // Delegated CTA analytics: one listener fires on any [data-cta] click.
    // Privacy-respecting (track() honours DNT/GPC and no-ops otherwise).
    const onCtaClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.(
        "[data-cta]",
      ) as HTMLElement | null;
      if (!el) return;
      track("cta_click", {
        cta: el.dataset.cta ?? "unknown",
        href: el.getAttribute("href") ?? "",
      });
    };
    document.addEventListener("click", onCtaClick);

    return () => {
      window.removeEventListener("scroll", onProgress);
      if (onMove) window.removeEventListener("pointermove", onMove);
      document.removeEventListener("click", onCtaClick);
      detachCanvas();
    };
  }, []);

  return (
    <>
      <div ref={progRef} className="cin-prog" aria-hidden="true" />
      <canvas ref={canvasRef} className="cin-flow" aria-hidden="true" />
      <div className="cin-field" aria-hidden="true">
        <div className="cin-orb cin-orb-a" />
        <div className="cin-orb cin-orb-b" />
        <div className="cin-orb cin-orb-c" />
      </div>
      <div className="cin-grain" aria-hidden="true" />
      <div className="cin-vignette" aria-hidden="true" />
      <div ref={cursorRef} className="cin-cursor" aria-hidden="true" />
    </>
  );
}

export default CanvasField;
