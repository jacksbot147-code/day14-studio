"use client";

import { usePathname } from "next/navigation";

/**
 * Quiet monospace failure-state line for the custom 404 page.
 *
 * Renders `~/empire/<requested-path> :: not found`. `usePathname()` resolves
 * the real path on the not-found boundary during SSR, so the line is correct
 * without client JS; hydration just keeps it in sync. No JS is required for
 * the page to render or be navigable — this only sharpens the path string.
 */
export function RequestedPath() {
  const pathname = usePathname();
  const path = (pathname ?? "/").replace(/^\/+/, "");

  return (
    <p className="mt-12 font-mono text-xs text-ink-400">
      <span className="text-ink-300">~/empire/</span>
      {path}
      <span className="text-ink-300"> :: </span>
      <span className="text-ember-600">not found</span>
    </p>
  );
}
