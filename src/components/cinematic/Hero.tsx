"use client";

/**
 * cinematic/Hero — the above-the-fold (task 2/8).
 *
 * Line-by-line headline reveal, a vertical business-type word-cycle, lead copy,
 * CTAs, and a scroll cue. Scroll-tell: the hero dissolves + lifts + slightly
 * scales as you scroll into the page.
 *
 * The word-cycle is CLS-safe by construction: all candidate words are stacked
 * in a single inline-grid cell (see .cin-cycle in cinematic.css), so the box is
 * always the width of the WIDEST word and nothing reflows when the word swaps —
 * only opacity changes. A visually-hidden "service" keeps the <h1> a stable,
 * sensible sentence for screen readers ("…runs your service business.").
 *
 * The single <h1> for the page lives here.
 */

import { useEffect, useState } from "react";
import { MagneticLink } from "./MagneticLink";
import { prefersReducedMotion } from "./motion";

const WORDS = [
  "pool route",
  "lawn crew",
  "cleaning company",
  "HVAC shop",
  "salon",
  "restaurant",
];

export function Hero() {
  const [active, setActive] = useState(0);

  // Word-cycle (skipped under reduced motion — first word stays).
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = window.setInterval(
      () => setActive((i) => (i + 1) % WORDS.length),
      2400,
    );
    return () => window.clearInterval(id);
  }, []);

  // Scroll-tell parallax + dissolve (hero only, first viewport).
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const hero = document.getElementById("cin-hero");
    if (!hero) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < window.innerHeight) {
          hero.style.opacity = String(1 - (y / window.innerHeight) * 1.1);
          hero.style.transform = `translateY(${y * 0.16}px) scale(${
            1 + (y / window.innerHeight) * 0.04
          })`;
        }
        raf = 0;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header id="cin-hero" className="cin-hero">
      <div className="cin-status">
        <span className="cin-dot" aria-hidden="true" />
        <span style={{ fontFamily: "var(--cin-font-mono)" }}>
          one platform · any service business · built by an operator
        </span>
      </div>

      <h1>
        <span className="cin-ln">
          <span>The system that runs</span>
        </span>
        <span className="cin-ln">
          <span>
            your{" "}
            <span className="cin-cycle" aria-hidden="true">
              {WORDS.map((w, i) => (
                <span
                  key={w}
                  className={i === active ? "cin-cycle-active" : undefined}
                >
                  {w}
                </span>
              ))}
            </span>
            <span className="cin-sr-only">service</span>
          </span>
        </span>
        <span className="cin-ln">
          <span>business.</span>
        </span>
      </h1>

      <p>
        Site, online booking, customer portal, payments, and a back office that
        runs itself — one platform for service businesses, built by someone who
        runs one too.
      </p>

      <div className="cin-hcta">
        <MagneticLink
          href="#book"
          className="cin-btn cin-btn-solid"
          dataCta="book_hero"
        >
          See it run
        </MagneticLink>
        <a href="#capabilities" className="cin-btn">
          What it does
        </a>
      </div>

      <div className="cin-scrollcue" aria-hidden="true">
        Scroll
      </div>
    </header>
  );
}

export default Hero;
