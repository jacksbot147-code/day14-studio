import type { ReactNode } from "react";
import { SITE } from "@/lib/site";
import { decodePreview, titleCasePreview } from "@/lib/preview";
import CtaAnalytics from "./CtaAnalytics";

/**
 * /preview/[token]/layout — the shared shell for every generated preview page.
 *
 * Wraps the one-pager and the services/about/contact sub-routes in one sticky
 * header that carries (a) the honesty ribbon and (b) a shared nav
 * (Home / Services / About / Contact) under the business name. Centralizing
 * these here means a prospect can move between the generated pages like a real
 * multi-page site, and the honesty rail rides along on every route from a single
 * source of truth.
 *
 * NOTE (queue item 8): the ribbon used to be duplicated inline at the top of
 * each preview page. It now lives ONLY here, so those per-page ribbon blocks
 * were removed to avoid a double ribbon. The page bodies are otherwise unchanged.
 *
 * HONESTY RAIL: the ribbon makes clear this is a free preview Day14 generated,
 * not the business's live site, and links to book the real build. No invented
 * prices, metrics, or testimonials.
 */

type Params = { token: string };

const NAV: { label: string; sub: string }[] = [
  { label: "Home", sub: "" },
  { label: "Services", sub: "/services" },
  { label: "About", sub: "/about" },
  { label: "Contact", sub: "/contact" },
];

export default function PreviewLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Params;
}) {
  const d = decodePreview(params.token);
  const name = d ? titleCasePreview(d.name) : "This business";
  const base = `/preview/${params.token}`;

  return (
    <>
      {/* Delegated CTA analytics (queue item 14): mounts the same
          `[data-cta]` → `cta_click` listener the rest of the site gets from
          CanvasField, which preview routes don't render. Renders nothing. */}
      <CtaAnalytics />

      {/* Skip-to-content (queue item 13): visually hidden until focused, then
          pinned top-left, so keyboard users can jump past the sticky nav.
          Targets the <main> landmark that wraps every preview route below. */}
      <a href="#cin-main" className="cinematic cin-skip">
        Skip to content
      </a>

      {/* Shared sticky shell: honesty ribbon + nav, one source of truth. */}
      <div
        className="cinematic"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(8,9,13,0.86)",
          borderBottom: "1px solid var(--cin-line)",
          backdropFilter: "blur(8px)",
        }}
      >
        {/* Honesty ribbon (moved here from each page) */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            justifyContent: "center",
            padding: "10px 20px",
            fontSize: 12.5,
            color: "var(--cin-mut)",
            borderBottom: "1px solid var(--cin-line)",
          }}
        >
          <span>
            <span style={{ color: "var(--cin-cyan)" }}>✦</span> A free preview
            Day14 built for{" "}
            <strong style={{ color: "var(--cin-ink)", fontWeight: 400 }}>
              {name}
            </strong>{" "}
            — not live yet.
          </span>
          <a
            href={SITE.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="cin-btn cin-btn-solid"
            data-cta="book_preview_ribbon"
            style={{ padding: "8px 16px", fontSize: 13 }}
          >
            Make it real →
          </a>
        </div>

        {/* Shared nav under the business name */}
        <nav
          aria-label={`${name} preview navigation`}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 20px",
            maxWidth: 1040,
            margin: "0 auto",
          }}
        >
          <a
            href={base}
            data-cta="preview_nav_brand"
            className="cin-pnav"
            style={{
              fontSize: 16,
              color: "var(--cin-ink)",
              textDecoration: "none",
              letterSpacing: "-0.01em",
            }}
          >
            {name}
          </a>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 18,
              alignItems: "center",
              fontSize: 14,
            }}
          >
            {NAV.map((item) => (
              <a
                key={item.label}
                href={`${base}${item.sub}`}
                data-cta={`preview_nav_${item.label.toLowerCase()}`}
                className="cin-pnav"
                style={{ color: "var(--cin-mut)", textDecoration: "none" }}
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>
      </div>

      {/* Single <main> landmark wrapping every preview route (queue item 13):
          gives assistive tech a content region and a skip-link target. The
          per-page root divs render inside, unchanged. */}
      <main id="cin-main">{children}</main>
    </>
  );
}
