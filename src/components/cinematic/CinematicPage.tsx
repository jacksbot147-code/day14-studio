import type { ReactNode } from "react";

import { CanvasField } from "./CanvasField";
import { Nav } from "./Nav";
import { SiteFooter } from "./SiteFooter";
import { Reveal } from "./Reveal";

/**
 * cinematic/CinematicPage — the shared shell for standalone cinematic pages.
 *
 * Wraps long-form / content pages (about, legal, guides, …) in the same chrome
 * the homepage and /platform/[slug] use: the `.cinematic` dark scope, the
 * atmospheric <CanvasField/> backdrop, the fixed <Nav/>, and the <SiteFooter/>.
 * Page content goes in <main className="cin-page"> and should use the `.cin-prose`
 * styles (see cinematic.css) for readable long-form copy.
 *
 *   <CinematicPage hero={{ eyebrow: "About", title: "Built by an operator" }}>
 *     <div className="cin-prose">…markdown-ish content…</div>
 *   </CinematicPage>
 *
 * `linkBase` defaults to "/" so the nav's section anchors (#pricing etc.) resolve
 * back to the homepage (/#pricing) from any standalone route. The wrapper is
 * server-renderable; the client interactivity lives inside CanvasField / Nav.
 */

export interface CinematicPageHero {
  /** Small uppercase kicker above the title. */
  eyebrow?: ReactNode;
  /** The page H1. */
  title: ReactNode;
  /** Optional lead paragraph under the title. */
  lede?: ReactNode;
}

export interface CinematicPageProps {
  children: ReactNode;
  /** Optional page hero rendered above the content. */
  hero?: CinematicPageHero;
  /** Prefix for the nav section anchors. Default "/" (links to /#section). */
  linkBase?: string;
  /** Extra classes appended to the <main className="cin-page …"> element. */
  className?: string;
}

export function CinematicPage({
  children,
  hero,
  linkBase = "/",
  className,
}: CinematicPageProps) {
  const mainClass = ["cin-page", className].filter(Boolean).join(" ");

  return (
    <div className="cinematic" id="top">
      <CanvasField />
      <Nav linkBase={linkBase} />

      <main className={mainClass}>
        {hero ? (
          <header className="cin-page-hero">
            {hero.eyebrow ? (
              <Reveal as="div" className="cin-kicker">
                {hero.eyebrow}
              </Reveal>
            ) : null}
            <Reveal as="h1" delayStep={1} className="cin-page-h1">
              {hero.title}
            </Reveal>
            {hero.lede ? (
              <Reveal as="p" delayStep={2} className="cin-page-lede">
                {hero.lede}
              </Reveal>
            ) : null}
          </header>
        ) : null}

        {children}
      </main>

      <SiteFooter />
    </div>
  );
}

export default CinematicPage;
