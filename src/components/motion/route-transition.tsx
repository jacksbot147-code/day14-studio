"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * RouteTransition — fades content between client-side route changes.
 * Mounted once at the root layout; persists across navigations. Reads
 * `usePathname()` to key the animation so each new route's content fades
 * in cleanly.
 *
 * Scope: marketing-site routes only. Admin (/admin/*) bypasses the
 * transition because operators hit refresh and re-nav constantly and an
 * extra 180ms fade would feel slow on a daily-driver cockpit. Admin has
 * its own internal motion polish (KPI stagger, AnimatePresence on inbox
 * rows, etc.) — no need for a route-level cross-fade there.
 *
 * Reduced-motion: renders children straight through with no animation.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  // Admin routes bypass the cross-fade.
  if (pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  if (reduce) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
