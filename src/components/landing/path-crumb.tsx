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
 * Renders as static text — no TypeIn animation, no cursor. Kept very
 * subtle so it reads as ambient frame rather than UI noise.
 */

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
        fontSize: 10,
        letterSpacing: "0.05em",
        color: "var(--warm-gray-400, #8a8579)",
        marginBottom: 12,
        fontWeight: 500,
        opacity: 0.45,
      }}
    >
      {full}
    </div>
  );
}
