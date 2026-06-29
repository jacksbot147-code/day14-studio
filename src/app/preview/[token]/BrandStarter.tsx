import type { CSSProperties } from "react";
import { brandKit } from "@/lib/preview";
import LogoSlot from "./LogoSlot";

/**
 * BrandStarter — a text-only "brand starter" block for the generated preview
 * (queue item 16). Surfaces the trade-matched palette (hex swatches) and font
 * pairing from `brandKit(trade)` so a prospect sees a coherent starting point
 * for their identity right on the preview.
 *
 * HONESTY RAIL: this is explicitly a STARTING POINT, not a finished brand — the
 * copy says so. NO logo image is shown or generated (image generation is not
 * wired; Build Spec phase 4 is blocked). No fabricated prices/metrics/
 * testimonials. Pure render of the deterministic brandKit() suggestion.
 */

const cardWrap: CSSProperties = {
  border: "1px solid var(--cin-line)",
  borderRadius: 14,
  background: "rgba(255,255,255,0.02)",
  padding: "22px 24px",
};

const swatchRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  marginTop: 4,
};

function Swatch({ label, hex }: { label: string; hex: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 64 }}>
      <span
        aria-hidden
        style={{
          width: 46,
          height: 46,
          borderRadius: 12,
          background: hex,
          border: "1px solid var(--cin-line)",
          display: "block",
        }}
      />
      <span style={{ fontSize: 11, color: "var(--cin-mut)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </span>
      <span style={{ fontSize: 12, color: "var(--cin-ink)", fontFamily: "var(--cin-mono, monospace)" }}>
        {hex}
      </span>
    </div>
  );
}

export default function BrandStarter({
  name,
  trade,
  token,
}: {
  name: string;
  trade: string;
  token?: string;
}) {
  const biz = name.trim() || "your business";
  const kit = brandKit(trade);
  const p = kit.palette;

  return (
    <section
      id="brand"
      style={{ padding: "40px 7vw 20px", maxWidth: 1040, margin: "0 auto" }}
    >
      {token ? <LogoSlot token={token} /> : null}
      <div className="cin-kicker" style={{ marginBottom: 14 }}>
        A brand starter for {biz}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 14,
        }}
      >
        {/* Palette card */}
        <div style={cardWrap}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 500, color: "var(--cin-fg)" }}>
            {kit.name}
          </p>
          <p style={{ margin: "6px 0 16px", fontSize: 14, lineHeight: 1.5, color: "var(--cin-mut)" }}>
            {kit.vibe}
          </p>
          <div style={swatchRow}>
            <Swatch label="Primary" hex={p.primary} />
            <Swatch label="Accent" hex={p.accent} />
            <Swatch label="Ink" hex={p.ink} />
            <Swatch label="Surface" hex={p.surface} />
          </div>
        </div>

        {/* Fonts card */}
        <div style={cardWrap}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 500, color: "var(--cin-fg)" }}>
            Type pairing
          </p>
          <p style={{ margin: "6px 0 16px", fontSize: 14, lineHeight: 1.5, color: "var(--cin-mut)" }}>
            A heading and body face that read clean together.
          </p>
          <p style={{ margin: 0, fontSize: 28, lineHeight: 1.1, fontWeight: 600, color: "var(--cin-fg)" }}>
            {kit.fonts.heading}
          </p>
          <p style={{ margin: "2px 0 14px", fontSize: 12, color: "var(--cin-mut)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Headings
          </p>
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.4, color: "var(--cin-ink)" }}>
            {kit.fonts.body}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--cin-mut)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Body
          </p>
        </div>
      </div>
      <p style={{ margin: "14px 0 0", fontSize: 13, lineHeight: 1.6, color: "var(--cin-mut)" }}>
        This is a starting point, not a finished brand — colors and fonts are
        easy to swap before {biz} goes live. (A matching logo is part of the real
        build, designed with you.)
      </p>
    </section>
  );
}
