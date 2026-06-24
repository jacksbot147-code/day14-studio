"use client";

/**
 * cinematic/Reveal — the scroll-entrance primitive for the cinematic theme.
 *
 * Wraps content in a `.reveal` element that fades + translates up when it scrolls
 * into view (via IntersectionObserver, see ./motion.ts). Mirrors the locked
 * prototype's `.reveal` / `.reveal.in` behaviour exactly, and is dependency-free
 * (no framer-motion). The light-theme <Reveal /> in ../motion/Reveal.tsx is a
 * separate, framer-based component — this one is cinematic-only.
 *
 *   <Reveal>…</Reveal>                      one block, single entrance
 *   <Reveal delayStep={1}>…</Reveal>        nudge timing (.d1/.d2/.d3 equivalent)
 *   <Reveal stagger>…children…</Reveal>     each direct child reveals in sequence
 *
 * Reduced-motion / reduced-data are honoured by both the CSS (cinematic.css
 * guards) and the observer (reveals immediately when motion is reduced).
 */

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import { CIN_STAGGER, observeReveal, prefersReducedMotion } from "./motion";

interface RevealProps {
  children: ReactNode;
  /** Element to render. Default "div". */
  as?: ElementType;
  /** Discrete delay step (0–3 maps to the prototype's .d1/.d2/.d3 cadence). */
  delayStep?: 0 | 1 | 2 | 3;
  /** Explicit delay in seconds (overrides delayStep). */
  delay?: number;
  /** Stagger direct children instead of revealing the wrapper as one block. */
  stagger?: boolean;
  /** Seconds between staggered children. Defaults to CIN_STAGGER. */
  staggerBy?: number;
  /** Re-animate every time it enters the viewport (default: once). */
  repeat?: boolean;
  /** Visibility fraction before firing. Default 0.16. */
  threshold?: number;
  className?: string;
  style?: CSSProperties;
}

function revealStyle(delay: number | undefined): CSSProperties | undefined {
  return delay !== undefined
    ? ({ "--reveal-delay": `${delay}s` } as CSSProperties)
    : undefined;
}

export function Reveal({
  children,
  as,
  delayStep,
  delay,
  stagger = false,
  staggerBy = CIN_STAGGER,
  repeat = false,
  threshold = 0.16,
  className,
  style,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (!stagger) {
      return observeReveal(node, { threshold, repeat });
    }

    // Stagger mode: each child is a `.reveal` target with a cascading delay.
    // Observe the container and toggle `.in` on the children as a group.
    const kids = Array.from(node.children) as HTMLElement[];
    kids.forEach((child, i) => {
      child.style.setProperty("--reveal-delay", `${i * staggerBy}s`);
    });

    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      kids.forEach((child) => child.classList.add("in"));
      return () => {};
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            kids.forEach((child) => child.classList.add("in"));
            if (!repeat) io.unobserve(entry.target);
          } else if (repeat) {
            kids.forEach((child) => child.classList.remove("in"));
          }
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [stagger, staggerBy, threshold, repeat]);

  const Tag = (as ?? "div") as ElementType;

  // Resolve the delay: explicit `delay` wins, else map delayStep onto the scale.
  const resolvedDelay =
    delay !== undefined
      ? delay
      : delayStep
        ? delayStep * CIN_STAGGER
        : undefined;

  const classes = ["reveal", "cinematic-reveal", className]
    .filter(Boolean)
    .join(" ");

  if (stagger) {
    // Each direct child becomes its own .reveal target.
    const wrapped = Children.map(children, (child) => {
      if (!isValidElement(child)) return child;
      const childClass = ["reveal", "cinematic-reveal", child.props.className]
        .filter(Boolean)
        .join(" ");
      return cloneElement(child as React.ReactElement<{ className?: string }>, {
        className: childClass,
      });
    });
    return (
      <Tag
        ref={ref as React.Ref<HTMLElement>}
        className={className}
        style={style}
      >
        {wrapped}
      </Tag>
    );
  }

  return (
    <Tag
      ref={ref as React.Ref<HTMLElement>}
      className={classes}
      style={{ ...revealStyle(resolvedDelay), ...style }}
    >
      {children}
    </Tag>
  );
}

export default Reveal;
