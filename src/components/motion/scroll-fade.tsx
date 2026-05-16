"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * ScrollFade — fades + lifts its children into view when they enter the
 * viewport. Once seen, stays visible. Respects `prefers-reduced-motion`.
 *
 * Default state on first paint is VISIBLE (opacity 100). On mount, we
 * check if the wrapped node is below the fold; if so we transition it to
 * hidden + watch for intersection. This avoids the "page paints invisible
 * then flashes in" anti-pattern for above-the-fold content, and also
 * keeps everything visible for users with JS disabled.
 *
 * Use sparingly — too many wrappers feel trampoline-y. Best for the 4–6
 * primary section reveals on a long landing page.
 */
export function ScrollFade({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  // Start visible — SSR-safe, JS-disabled-safe.
  const [seen, setSeen] = useState(true);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const node = ref.current;
    if (!node) return;

    // If the element is already in viewport at mount, leave it visible.
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) return;

    // Below fold: hide and wait for it to scroll into view.
    setSeen(false);
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            window.setTimeout(() => setSeen(true), delay);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out",
        seen ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
