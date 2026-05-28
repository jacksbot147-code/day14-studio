"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * AdminPageTransition — subtle 200ms fade+slide between /admin/* routes.
 *
 * Mounted from `src/app/admin/layout.tsx` (a server component) which is why
 * this lives in its own client file. The root-level `<RouteTransition>` in
 * `src/app/layout.tsx` short-circuits anything under `/admin`, so this is the
 * only motion wrapper running on the admin shell — no double-fade.
 *
 * Behaviour:
 *   • `key={pathname}` so AnimatePresence treats each route as a fresh mount.
 *   • `initial`/`animate`/`exit` use opacity + a tiny 8/4px y-shift to give
 *     navigation a gentle direction without being noticeable as motion.
 *   • `transition` is 0.2s, easeOut — matches the brief.
 *   • `prefers-reduced-motion`: when the user opts out we render children
 *     straight through, no AnimatePresence wrapper at all.
 */
export function AdminPageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  if (reduce) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
