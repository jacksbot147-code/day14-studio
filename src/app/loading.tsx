/**
 * Root route-loading UI — shown by Next.js during route segment transitions
 * and Suspense boundaries. Accessible: a polite live region announces the
 * loading state, and the spinner itself is aria-hidden so SR users hear the
 * label, not the decoration. Respects prefers-reduced-motion via the
 * `motion-reduce` utilities.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4"
    >
      <span
        aria-hidden="true"
        className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-ember-500 motion-reduce:animate-none"
      />
      <span className="font-mono text-xs uppercase tracking-[0.22em] text-ink-400">
        Loading…
      </span>
    </div>
  );
}
