import { ImageResponse } from "next/og";
import { SITE, PITCH } from "@/lib/site";

export const runtime = "edge";

export const alt = `${SITE.brand} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#F8F6F1",
          color: "#0B0B0A",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          fontFamily: "system-ui",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 8,
              background: "#0B0B0A",
              color: "#F8F6F1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.05em",
            }}
          >
            14
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em" }}>
            {SITE.brand}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.02,
              maxWidth: 980,
            }}
          >
            {SITE.tagline}
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#4A4A43",
              fontWeight: 500,
              maxWidth: 980,
              lineHeight: 1.3,
            }}
          >
            {PITCH.vsAgency}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            color: "#6E6E66",
            fontFamily: "monospace",
          }}
        >
          <div>{SITE.domain}</div>
          <div style={{ color: "#FF5C28" }}>Real platforms. Two weeks. Done.</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
