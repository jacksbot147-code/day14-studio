"use client";

/**
 * cinematic/Nav — fixed top nav.
 *
 * Platform, Work, Pricing, GEO, Book. Section anchors on the homepage;
 * subpages pass linkBase="/" so Work jumps back to /#work.
 */

import { useEffect, useRef } from "react";
import { MagneticLink } from "./MagneticLink";

export function Nav({ linkBase = "" }: { linkBase?: string } = {}) {
  const ref = useRef<HTMLElement>(null);
  const workHref = linkBase ? `${linkBase}#work` : "#work";

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
        <a href="/platform">Platform</a>
        <a href={workHref}>Work</a>
        <a href="/pricing">Pricing</a>
        <a href="/geo">GEO</a>
        <MagneticLink href="/book" className="cin-btn cin-btn-glow" dataCta="book_nav">
          Book
        </MagneticLink>
      </div>
    </nav>
  );
}

export default Nav;
