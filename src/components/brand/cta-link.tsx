import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { BrandTheme } from "./theme";

/**
 * BrandCtaLink — the solid primary-color pill CTA the brand sites repeat
 * (hot-flash-co "Browse the shop →", "Buy on Printify →", …).
 * Renders <Link> for internal hrefs and <a> for external ones.
 */
export function BrandCtaLink({
  theme: t,
  href,
  style,
  children,
}: {
  theme: BrandTheme;
  href: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const baseStyle: CSSProperties = {
    display: "inline-block",
    marginTop: 32,
    padding: "14px 28px",
    background: t.colors.primary,
    color: "white",
    borderRadius: 8,
    textDecoration: "none",
    fontSize: 15,
    fontWeight: 500,
    ...style,
  };
  if (href.startsWith("/")) {
    return (
      <Link href={href} style={baseStyle}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} style={baseStyle}>
      {children}
    </a>
  );
}
