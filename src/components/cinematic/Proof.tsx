"use client";

/**
 * cinematic/Proof — the "same engine, different businesses" proof tiles (task 5/8).
 *
 * Port of the locked prototype's `#work` section: the "Same engine. Wildly
 * different businesses." head + subhead and two real, LIVE proof tiles —
 * Splash Jacks Pools (field service) and AlignMD (healthcare staffing) — each
 * linking out to the running product so a visitor can poke at the real thing.
 *
 * Honesty rail (binding): only genuinely live businesses appear here. The
 * retired brands (hot-flash-co, kennum-lawn-care) are deliberately NOT shown —
 * nothing on this page may present them as live customers.
 *
 * Motion: the tiles are real <a> elements, so the entrance reveal is driven
 * directly with `observeReveal` (we can't use <Reveal as="a"> because that
 * primitive doesn't forward href/target). The 3D tilt is a pointer-fine-only
 * flourish — attached only when the device has a fine pointer
 * (`(pointer: fine)`) AND reduced-motion is off. Touch + reduced-motion users
 * get static, fully-legible tiles.
 */

import { useEffect, useRef, type CSSProperties } from "react";
import { Reveal } from "./Reveal";
import { CIN_STAGGER, observeReveal, prefersReducedMotion } from "./motion";

interface Tile {
  variant: "t1" | "t2";
  tag: string;
  name: string;
  blurb: string;
  href: string;
}

const TILES: readonly Tile[] = [
  {
    variant: "t1",
    tag: "field service · live",
    name: "Splash Jacks Pools",
    blurb:
      "The route I run myself — site, booking, board — on the exact software you'd get. Poke at the real thing.",
    href: "https://splashjackspools.com",
  },
  {
    variant: "t2",
    tag: "healthcare staffing · live",
    name: "AlignMD",
    blurb:
      "A live staffing platform — credentialing, matching, ops — proving the engine scales into high-fee work.",
    href: "https://alignmd.vercel.app",
  },
];

const TILT_MAX = 8; // degrees
const TILT_LIFT = 6; // px

export function Proof() {
  const tilesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = tilesRef.current;
    if (!container) return;

    const tiles = Array.from(
      container.querySelectorAll<HTMLElement>(".cin-tile"),
    );

    // Entrance reveal for each tile (matches the <Reveal> primitive).
    const revealCleanups = tiles.map((t) => observeReveal(t));

    // 3D tilt: pointer-fine-only, and never under reduced motion.
    let tiltCleanups: Array<() => void> = [];
    const pointerFine =
      typeof window !== "undefined" &&
      !!window.matchMedia &&
      window.matchMedia("(pointer: fine)").matches;

    if (!prefersReducedMotion() && pointerFine) {
      tiltCleanups = tiles.map((tile) => {
        const onMove = (e: MouseEvent) => {
          const r = tile.getBoundingClientRect();
          const rx = ((e.clientY - r.top) / r.height - 0.5) * -TILT_MAX;
          const ry = ((e.clientX - r.left) / r.width - 0.5) * TILT_MAX;
          tile.style.transform = `translateY(-${TILT_LIFT}px) rotateX(${rx}deg) rotateY(${ry}deg)`;
        };
        const onLeave = () => {
          tile.style.transform = "";
        };
        tile.addEventListener("mousemove", onMove);
        tile.addEventListener("mouseleave", onLeave);
        return () => {
          tile.removeEventListener("mousemove", onMove);
          tile.removeEventListener("mouseleave", onLeave);
          tile.style.transform = "";
        };
      });
    }

    return () => {
      revealCleanups.forEach((fn) => fn());
      tiltCleanups.forEach((fn) => fn());
    };
  }, []);

  return (
    <section className="cin-section cin-proof" id="work">
      <Reveal as="h2" className="cin-proof-h">
        Same engine. Wildly different businesses.
      </Reveal>
      <Reveal as="p" delayStep={1} className="cin-proof-sub">
        A pool route and a healthcare-staffing platform run on the exact same
        system. If it can do both, it can run yours.
      </Reveal>

      <div className="cin-tiles" ref={tilesRef}>
        {TILES.map((tile, i) => (
          <a
            key={tile.name}
            className={`cin-tile cin-tile-${tile.variant} reveal cinematic-reveal`}
            style={
              { "--reveal-delay": `${i * CIN_STAGGER}s` } as CSSProperties
            }
            href={tile.href}
            target="_blank"
            rel="noopener noreferrer"
            data-tilt
          >
            <span className="cin-tile-glow" aria-hidden="true" />
            <span className="cin-tile-scan" aria-hidden="true" />
            <span className="cin-tile-tag cin-mono">{tile.tag}</span>
            <span className="cin-tile-h">{tile.name}</span>
            <span className="cin-tile-p">{tile.blurb}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

export default Proof;
