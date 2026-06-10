import type { CSSProperties, ReactNode } from "react";

/**
 * BrandMain — the centered content column the brand sub-pages share:
 * max-width, auto margins, 60px/32px padding. Width varies per page
 * (600 contact, 720 article, 800 list, 1100–1200 grids).
 */
export function BrandMain({
  maxWidth,
  as: Tag = "main",
  style,
  children,
}: {
  maxWidth: number;
  as?: "main" | "article";
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <Tag style={{ maxWidth, margin: "0 auto", padding: "60px 32px", ...style }}>
      {children}
    </Tag>
  );
}
