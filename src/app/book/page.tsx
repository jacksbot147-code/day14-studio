import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CalInline } from "@/components/cal-inline";
import { SITE } from "@/lib/site";

export const metadata = {
  title: "Book a call — Day14",
  description:
    "Pick a 15-minute intro call. No prep needed — bring your business and a rough idea of what you want shipped.",
};

// The Cal link is the path after cal.com/ — derived from the canonical
// bookingUrl so there's one source of truth.
const CAL_LINK = SITE.bookingUrl.replace(/^https?:\/\/(app\.)?cal\.com\//, "");

export default function BookPage() {
  return (
    <>
      <SiteHeader />
      <main style={{ maxWidth: 880, margin: "0 auto", padding: "64px 24px 96px" }}>
        <p
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: "var(--accent, #ef6c33)",
            marginBottom: 12,
          }}
        >
          15-minute intro call
        </p>
        <h1
          style={{
            fontSize: "clamp(2rem,4.4vw,3.25rem)",
            fontWeight: 800,
            letterSpacing: "-0.035em",
            lineHeight: 1.04,
            margin: "0 0 16px",
          }}
        >
          Let&rsquo;s scope your build.
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.55, color: "#5b5b57", maxWidth: 620, marginBottom: 8 }}>
          No prep needed. Bring your business and a rough idea of what you want shipped — we&rsquo;ll
          figure out the right tier and timeline live. Prefer email?{" "}
          <a href={`mailto:${SITE.email}`} style={{ color: "var(--accent, #ef6c33)", fontWeight: 600 }}>
            {SITE.email}
          </a>
          .
        </p>

        <div style={{ marginTop: 36 }}>
          <CalInline calLink={CAL_LINK} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
