"use client";

/**
 * cinematic/MagneticLink — a link/button that drifts toward the cursor (task 2/8).
 *
 * Pure CSS transform on pointermove; disabled on coarse pointers (touch) and
 * under prefers-reduced-motion. Used by the nav + hero CTAs. Keyboard/focus
 * behaviour is the native <a>'s — the magnet is decorative only.
 */

import { useEffect, useRef, type ReactNode } from "react";
import { prefersReducedMotion } from "./motion";

interface MagneticLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
  /** Optional analytics tag, read by the delegated [data-cta] click listener. */
  dataCta?: string;
}

export function MagneticLink({
  href,
  className,
  children,
  dataCta,
}: MagneticLinkProps) {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fine =
      !!window.matchMedia && window.matchMedia("(pointer: fine)").matches;
    if (prefersReducedMotion() || !fine) return;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width / 2) * 0.25;
      const dy = (e.clientY - r.top - r.height / 2) * 0.35;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const onLeave = () => {
      el.style.transform = "";
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <a ref={ref} href={href} className={className} data-cta={dataCta}>
      {children}
    </a>
  );
}

export default MagneticLink;
