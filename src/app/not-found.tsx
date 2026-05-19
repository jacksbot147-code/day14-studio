import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Not found — Day14",
};

export default function NotFound() {
  return (
    <>
    <SiteHeader />
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "120px 32px", textAlign: "center", fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
      <div style={{ fontSize: 80, marginBottom: 16, opacity: 0.4 }}>404</div>
      <h1 style={{ fontSize: 36, letterSpacing: "-0.02em", marginBottom: 16, color: "#2F2A33" }}>
        That page doesn't exist.
      </h1>
      <p style={{ fontSize: 17, color: "#7A6F8F", lineHeight: 1.6, marginBottom: 32 }}>
        Probably moved, mistyped, or never existed in the first place. Here's what's actually live:
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, maxWidth: 520, margin: "0 auto 32px" }}>
        {[
          { href: "/", label: "Home" },
          { href: "/stack", label: "The stack" },
          { href: "/builds", label: "Active builds" },
          { href: "/case-studies/splash-jacks-pools", label: "Case study" },
          { href: "/newsletter", label: "Newsletter" },
          { href: "/#sku", label: "Pricing" },
        ].map((l) => (
          <Link key={l.href} href={l.href} style={{ padding: "12px 16px", background: "white", border: "1px solid #E5DDD0", borderRadius: 8, color: "#2F2A33", textDecoration: "none", fontSize: 14 }}>
            {l.label} →
          </Link>
        ))}
      </div>
      <p style={{ fontSize: 13, color: "#999" }}>
        Or <a href="https://cal.com/day14/intro" style={{ color: "#7A6F8F" }}>book a 30-min intro call</a> · <a href="mailto:hello@day14.us" style={{ color: "#7A6F8F" }}>hello@day14.us</a>
      </p>
    </main>
    <SiteFooter />
    </>
  );
}
