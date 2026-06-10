import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { BrandTheme } from "./theme";

/**
 * BrandLayout — shared nav + footer chrome for the brand sites.
 *
 * Server component. Renders the brand-colored page wrapper, optional
 * JSON-LD scripts, the Google Fonts <link>, a top nav (brand link +
 * nav links + optional extras like a CTA), the page content, and the
 * footer shell.
 *
 * Base styles come from the BrandTheme; per-brand pixel details
 * (padding, wrap behavior, surface backgrounds) are passed as style
 * overrides so each brand's rendered HTML stays exactly what its
 * hand-built layout produced.
 */

export interface BrandNavLink {
  href: string;
  label: string;
  /** Override the default link style (e.g. a button-styled CTA). */
  style?: CSSProperties;
}

interface BrandLayoutProps {
  theme: BrandTheme;
  /** Google Fonts stylesheet URL for this brand's heading/body fonts. */
  fontsHref: string;
  /** Optional JSON-LD payloads rendered before the fonts link. */
  jsonLd?: object[];
  home: { href: string; label: string; style: CSSProperties };
  links: BrandNavLink[];
  /** Style for the row of nav links (gap, fontSize, etc.). */
  linksRowStyle: CSSProperties;
  /** Merged over the base nav style (border-bottom, flex row). */
  navStyle?: CSSProperties;
  /** Footer contents — brand-specific, rendered inside the footer shell. */
  footer: ReactNode;
  /** Merged over the base footer style (border-top, centered, muted). */
  footerStyle?: CSSProperties;
  children: ReactNode;
}

export function BrandLayout({
  theme: t,
  fontsHref,
  jsonLd,
  home,
  links,
  linksRowStyle,
  navStyle,
  footer,
  footerStyle,
  children,
}: BrandLayoutProps) {
  return (
    <div
      style={{
        background: t.colors.bg,
        color: t.colors.text,
        fontFamily: t.fonts.body,
        minHeight: "100vh",
      }}
    >
      {jsonLd?.map((payload, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
        />
      ))}
      <link href={fontsHref} rel="stylesheet" />
      <nav
        style={{
          borderBottom: `1px solid ${t.colors.accent}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          ...navStyle,
        }}
      >
        <Link href={home.href} style={home.style}>
          {home.label}
        </Link>
        <div style={linksRowStyle}>
          {links.map((l) => (
            <Link
              key={`${l.href}#${l.label}`}
              href={l.href}
              style={l.style ?? { color: t.colors.text, textDecoration: "none" }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
      {children}
      <footer
        style={{
          borderTop: `1px solid ${t.colors.accent}`,
          padding: "40px 32px",
          textAlign: "center",
          color: t.colors.muted,
          marginTop: 80,
          ...footerStyle,
        }}
      >
        {footer}
      </footer>
    </div>
  );
}
