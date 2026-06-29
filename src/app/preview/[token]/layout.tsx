import type { ReactNode, CSSProperties } from "react";
import { decodePreview, titleCasePreview, brandKit } from "@/lib/preview";
import CtaAnalytics from "./CtaAnalytics";

/**
 * /preview/[token]/layout — the shared shell for every generated preview page.
 *
 * THEMED PER BUSINESS: the page adopts the trade's own brand (brandKit) via
 * `--pv-*` CSS variables + the trade's heading font, so a pool company looks
 * coastal, a salon luxe, a roofer bold — NOT Day14's dark cinematic brand. The
 * only Day14 element is the thin dark honesty-ribbon frame at the very top.
 */

type Params = { token: string };

const NAV = [
  { label: "Home", sub: "" },
  { label: "Services", sub: "/services" },
  { label: "About", sub: "/about" },
  { label: "Contact", sub: "/contact" },
];

const HEAD_WEIGHTS: Record<string, string> = {
  Poppins: "400;500;600;700",
  Montserrat: "400;500;600;700",
  Oswald: "400;500;600;700",
  Quicksand: "400;500;600;700",
  "Playfair Display": "400;500;600;700",
  Rajdhani: "500;600;700",
};

function fontHref(heading: string): string {
  const w = HEAD_WEIGHTS[heading] ?? "400;500;600;700";
  const fam = heading.replace(/ /g, "+");
  return `https://fonts.googleapis.com/css2?family=${fam}:wght@${w}&family=Inter:wght@400;500;600&display=swap`;
}

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
  const kit = brandKit(d?.trade ?? "service business");
  const dark = kit.mood === "dark";
  const p = kit.palette;

  const themeVars = {
    "--pv-bg": kit.bg,
    "--pv-primary": p.primary,
    "--pv-accent": p.accent,
    "--pv-ink": p.ink,
    "--pv-surface": p.surface,
    "--pv-line": dark ? "rgba(255,255,255,0.12)" : "rgba(15,40,55,0.12)",
    "--pv-mut": dark ? "rgba(255,255,255,0.66)" : "rgba(20,40,50,0.62)",
    "--pv-hero": kit.heroGradient,
    "--pv-head": `"${kit.fonts.heading}", system-ui, sans-serif`,
    "--pv-body": `"${kit.fonts.body}", system-ui, sans-serif`,
    background: "var(--pv-bg)",
    color: "var(--pv-ink)",
    minHeight: "100vh",
    fontFamily: "var(--pv-body)",
  } as CSSProperties;

  const monogram = (name.trim()[0] || "•").toUpperCase();

  return (
    <div className="pv-root" style={themeVars}>
      {/* Per-trade fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={fontHref(kit.fonts.heading)} />

      <CtaAnalytics />
      <a
        href="#pv-main"
        style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}
      >
        Skip to content
      </a>

      {/* Day14 honesty frame — the ONLY Day14-branded element */}
      <div
        style={{
          background: "#0b1f2a",
          color: "#cfe6f1",
          fontSize: 12.5,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px 20px",
        }}
      >
        <span>
          ✦ A free preview <strong style={{ color: "#fff" }}>Day14</strong> built
          for {name} — not live yet.
        </span>
        <a
          href="https://cal.com/day14/intro"
          target="_blank"
          rel="noopener noreferrer"
          data-cta="book_preview_ribbon"
          style={{
            background: "#48CAE4",
            color: "#062633",
            fontWeight: 600,
            padding: "5px 12px",
            borderRadius: 8,
            textDecoration: "none",
          }}
        >
          Make it real →
        </a>
      </div>

      {/* Business nav (themed) */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: dark ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.82)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid var(--pv-line)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            maxWidth: 1120,
            margin: "0 auto",
            padding: "13px 24px",
          }}
        >
          <a
            href={base}
            data-cta="preview_nav_brand"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              textDecoration: "none",
              color: "var(--pv-ink)",
              fontFamily: "var(--pv-head)",
              fontWeight: 700,
              fontSize: 19,
            }}
          >
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg,var(--pv-primary),var(--pv-accent))",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
              }}
            >
              {monogram}
            </span>
            {name}
          </a>
          <div style={{ display: "flex", gap: 20, fontSize: 14, fontWeight: 500 }}>
            {NAV.map((item) => (
              <a
                key={item.label}
                href={`${base}${item.sub}`}
                data-cta={`preview_nav_${item.label.toLowerCase()}`}
                style={{ color: "var(--pv-mut)", textDecoration: "none" }}
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <main id="pv-main">{children}</main>
    </div>
  );
}
