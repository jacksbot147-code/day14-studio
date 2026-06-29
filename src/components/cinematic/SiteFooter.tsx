/**
 * cinematic/SiteFooter — the cinematic page footer (task 6/8).
 *
 * Port of the locked prototype's <footer>: the "14 / Day14" lockup, the
 * one-line operator descriptor, and the copyright. Server-renderable (no client
 * hooks). Copy draws from src/lib/site.ts where it maps cleanly (location), and
 * the year is computed so the copyright never goes stale.
 */

import { SITE } from "@/lib/site";
import { Reveal } from "./Reveal";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <Reveal as="footer" className="cin-footer" stagger>
      <div className="cin-foot-brand">
        <b>14</b>
        {SITE.brand}
      </div>
      <div className="cin-foot-line">
        One platform for service businesses · built by an operator ·{" "}
        {SITE.location}
      </div>
      <div className="cin-foot-copy">
        © {year} {SITE.brand}
      </div>
    </Reveal>
  );
}

export default SiteFooter;
