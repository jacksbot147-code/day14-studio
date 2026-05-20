import Link from "next/link";
import { brandTheme as t } from "../theme";

export const metadata = {
  title: "About",
  description:
    "Kennum Lawn Care is a Southwest Florida lawn care and landscaping service built on showing up — same crew, same day, flat monthly pricing.",
  alternates: { canonical: "/brands/kennum-lawn-care/about" },
  openGraph: {
    title: "About — Kennum Lawn Care",
    description:
      "A Southwest Florida lawn care and landscaping service built on dependability.",
    type: "website",
    url: "/brands/kennum-lawn-care/about",
  },
};

export default function KennumAbout() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "70px 32px" }}>
      <h1 style={{ fontFamily: t.fonts.heading, fontSize: 40, letterSpacing: "-0.02em", color: t.colors.primary, margin: 0 }}>
        About Kennum Lawn Care
      </h1>

      <div style={{ fontSize: 16, lineHeight: 1.75, color: t.colors.text, marginTop: 24 }}>
        <p>
          Kennum Lawn Care is a lawn care and landscaping service for homeowners and property
          managers across Southwest Florida. The idea is simple: your yard should be one less thing
          you think about.
        </p>
        <p>
          Most people don&apos;t want a relationship with their lawn — they want it handled. So we
          built the business around dependability. The same crew comes the same day every week. The
          price is a flat monthly rate, agreed up front. When something needs attention, you hear
          from us before it becomes a problem.
        </p>
        <p>
          We work the way a Southwest Florida yard actually behaves — St. Augustine grass that grows
          fast through the rainy season, beds that need real edging, palms and hedges that need
          shaping rather than hacking, and storm debris that has to be dealt with on time. Recurring
          maintenance keeps it consistent; landscaping projects step it up when you&apos;re ready.
        </p>
        <p>
          Behind the crew is a full digital admin layer — quoting, scheduling, and follow-up handled
          cleanly — so nothing slips and you&apos;re never left chasing a lawn guy.
        </p>
      </div>

      <div style={{ marginTop: 34 }}>
        <Link
          href="/brands/kennum-lawn-care/contact"
          style={{
            background: t.colors.primary,
            color: "#fff",
            padding: "13px 26px",
            borderRadius: 10,
            textDecoration: "none",
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          Get a free quote
        </Link>
      </div>
    </main>
  );
}
