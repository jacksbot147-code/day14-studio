"use client";

/**
 * cinematic/Nav — fixed top nav (task 2/8).
 *
 * Transparent over the hero; gains a blurred background + border after 40px of
 * scroll. Brand mark, section anchors, and a magnetic glow CTA. Anchors hide on
 * narrow viewports (the CTA stays). Reuses the .cin-btn classes from task 6.
 */

import { useEffect, useRef } from "react";
import { MagneticLink } from "./MagneticLink";

/**
 * `linkBase` prefixes the section anchors so the nav works from sub-pages too:
 * on the homepage it's "" (same-page #anchors); on /platform/* pages pass
 * "/preview/cinematic" so "Pricing" etc. jump back to the homepage section.
 */
export function Nav({ linkBase = "" }: { linkBase?: string } = {}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => {
      ref.current?.classList.toggle("cin-nav-scrolled", window.scrollY > 40);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav ref={ref} className="cin-nav" aria-label="Primary">
      <a href={linkBase || "#top"} className="cin-brand">
        <b aria-hidden="true">14</b>Day14
      </a>
      <div className="cin-nlinks">
        <a href={`${linkBase}#capabilities`}>Platform</a>
        <a href={`${linkBase}#system`}>How it works</a>
        <a href={`${linkBase}#work`}>Work</a>
        <a href={`${linkBase}#pricing`}>Pricing</a>
        <a href="/geo">GEO</a>
        <a href="/capture">Capture</a>
        <a href="/brands/marque">Marque</a>
        <a href="/local">Local</a>
        <MagneticLink
          href={`${linkBase}#book`}
          className="cin-btn cin-btn-glow"
          dataCta="book_nav"
        >
          Book a 15-min look
        </MagneticLink>
      </div>
    </nav>
  );
}

export default Nav;
