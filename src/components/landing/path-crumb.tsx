"use client";

/**
 * PathCrumb — a faint monospace path label that sits above each section's
 * eyebrow. Sets the IDE-pane frame:
 *
 *   ~/empire/case-studies
 *   ===
 *   • Built and operated on Day14 OS
 *   ===
 *   We use it on six of our own.
 *
 * Types in with a brief cursor when its section enters view. Renders
 * statically (full text, faint) on SSR for SEO and screen readers.
 */

import { TypeIn } from "./type-in";

interface PathCrumbProps {
  /** The path segment after ~/empire/. E.g. "case-studies", "pricing". */
  path: string;
  /** Optional className for the wrapping div. */
  className?: string;
}

export function PathCrumb({ path, className = "" }: PathCrumbProps) {
  const full = `~/empire/${path}`;
  return (
    <div
      className={className}
      style={{
        fontFamily: 'ui-monospace, "SF Mono", Menlo, "JetBrains Mono", monospace',
        fontSize: 11,
        letterSpacing: "0.04em",
        color: "var(--warm-gray-400, #8a8579)",
        marginBottom: 12,
        fontWeight: 500,
      }}
    >
      <TypeIn text={full} cps={120} triggerOnView cursor />
    </div>
  );
}
