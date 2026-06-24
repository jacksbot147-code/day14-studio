/**
 * cinematic/motion.ts — motion utilities for the cinematic theme.
 *
 * The cinematic system deliberately uses raw IntersectionObserver + CSS classes
 * (not framer-motion) to mirror the locked prototype 1:1 and keep the entrance
 * primitive dependency-free and cheap. These helpers centralise the shared
 * constants and the user-preference guards so every cinematic component reads
 * motion/data settings the same way.
 *
 * Light-theme components keep using src/lib/motion.ts + framer-motion; this
 * module is scoped to the cinematic rebuild and intentionally separate.
 */

/** Signature expo-out curve. Matches src/lib/motion.ts EASE.out + the prototype. */
export const CIN_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/** Default per-step stagger (seconds) between revealed children. */
export const CIN_STAGGER = 0.1;

/** Reveal transition duration (seconds). Pairs with --cin-dur-reveal. */
export const CIN_REVEAL_DURATION = 1.1;

/** SSR-safe matchMedia read. Returns `false` on the server. */
function prefersMedia(query: string): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(query).matches;
}

/** True when the user asked for reduced motion. */
export function prefersReducedMotion(): boolean {
  return prefersMedia("(prefers-reduced-motion: reduce)");
}

/**
 * True when the user asked for reduced data (Save-Data / low-data mode).
 * Cinematic heavy effects (particle canvas, blurred orbs, grain) opt out on this.
 */
export function prefersReducedData(): boolean {
  return prefersMedia("(prefers-reduced-data: reduce)");
}

/**
 * True when the heavy, purely-decorative atmosphere should be suppressed —
 * either reduced-motion or reduced-data is set. Section components gate their
 * canvas/orb/grain layers on this.
 */
export function shouldDisableHeavyEffects(): boolean {
  return prefersReducedMotion() || prefersReducedData();
}

export interface RevealObserverOptions {
  /** Fraction of the element visible before it fires. Default 0.16. */
  threshold?: number;
  /** Root margin passed to IntersectionObserver. */
  rootMargin?: string;
  /** Re-trigger every entrance instead of firing once. Default false. */
  repeat?: boolean;
}

/**
 * Observe an element and toggle the `.in` class when it enters the viewport,
 * driving the `.reveal` CSS transition. Returns a cleanup function.
 *
 * If reduced-motion is set (or IntersectionObserver is unavailable), the
 * element is revealed immediately with no observation — content is never hidden
 * from users who can't see the animation.
 */
export function observeReveal(
  el: HTMLElement,
  { threshold = 0.16, rootMargin = "0px 0px -8% 0px", repeat = false }: RevealObserverOptions = {},
): () => void {
  if (
    prefersReducedMotion() ||
    typeof IntersectionObserver === "undefined"
  ) {
    el.classList.add("in");
    return () => {};
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          if (!repeat) io.unobserve(entry.target);
        } else if (repeat) {
          entry.target.classList.remove("in");
        }
      }
    },
    { threshold, rootMargin },
  );

  io.observe(el);
  return () => io.disconnect();
}
