import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Press kit — Day14",
  description: "Press kit for Day14: a one-operator AI-leveraged build studio. Logos, founder bio, recent shipped projects, contact for press inquiries.",
};

export default function PressPage() {
  return (
    <>
    <SiteHeader />
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "80px 32px", fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif", color: "#2F2A33", lineHeight: 1.6 }}>
      <h1 style={{ fontSize: 44, letterSpacing: "-0.02em", marginBottom: 16 }}>Press kit</h1>
      <p style={{ fontSize: 18, color: "#7A6F8F", marginBottom: 40, lineHeight: 1.55 }}>
        Day14 is a one-operator productized build studio in Southwest Florida. We ship real business platforms in 14 days using AI agents as the work force.
      </p>

      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 24, letterSpacing: "-0.01em", marginBottom: 12 }}>One-liner</h2>
        <p style={{ fontSize: 16, padding: 20, background: "#FAF8F4", borderLeft: "3px solid #7A6F8F", borderRadius: 4 }}>
          A one-operator build studio shipping real business platforms in 14 days, productized at $2,500–$10,000 — and using its own AI agent stack to do it.
        </p>
      </section>

      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 24, letterSpacing: "-0.01em", marginBottom: 12 }}>Why it matters</h2>
        <p>The agency model is broken: project managers + designers + frontend + backend + QA + account managers + 6-month timelines + $50k minimums. Day14 ships the same output with one operator and a fleet of AI agents — in 2 weeks, at fixed price, with the customer owning the code.</p>
        <p style={{ marginTop: 12 }}>It also runs its own businesses on the same stack as proof: a perimenopause-humor POD store (Hot Flash Co), a service-business platform (Splash Jacks Pools), a marketplace (Buildbridge), and a brand-heavy events site (Casamoré).</p>
      </section>

      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 24, letterSpacing: "-0.01em", marginBottom: 12 }}>Founder bio</h2>
        <p style={{ fontStyle: "italic", borderLeft: "3px solid #E5DDD0", paddingLeft: 16 }}>
          Jack Boppington is the founder and operator of Day14. Based in Southwest Florida, he's the only human on the team. Day14's twenty-plus AI agents handle the rest: sales drafts, customer success, financial reporting, content production, compliance review, devops. Before Day14 he ran service businesses directly — the playbook is now productized.
        </p>
      </section>

      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 24, letterSpacing: "-0.01em", marginBottom: 12 }}>Stats (live)</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {[
            { stat: "1", label: "Operator" },
            { stat: "20+", label: "AI agents in production" },
            { stat: "14 days", label: "Average ship time" },
            { stat: "$2.5k → $10k", label: "Fixed price SKUs" },
            { stat: "Florida", label: "HQ" },
            { stat: "2026", label: "Founded" },
          ].map((s, i) => (
            <div key={i} style={{ padding: 16, background: "white", border: "1px solid #E5DDD0", borderRadius: 8 }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{s.stat}</div>
              <div style={{ fontSize: 12, color: "#7A6F8F", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 24, letterSpacing: "-0.01em", marginBottom: 12 }}>Recent projects</h2>
        <ul style={{ paddingLeft: 24, lineHeight: 2 }}>
          <li><Link href="/case-studies/splash-jacks-pools" style={{ color: "#7A6F8F" }}>Splash Jacks Pools</Link> — service business platform, full Stripe billing, AI chatbot, operator admin app. Live.</li>
          <li><Link href="/case-studies/casamore" style={{ color: "#7A6F8F" }}>Casamoré Events</Link> — brand-heavy events site, 18 pages, 19 blog essays, full visual identity. Live.</li>
          <li><Link href="/case-studies/buildbridge" style={{ color: "#7A6F8F" }}>Buildbridge</Link> — two-sided marketplace with Stripe milestone escrow, native iOS/Android wrappers. Preview.</li>
          <li><Link href="/case-studies/hot-flash-co" style={{ color: "#7A6F8F" }}>Hot Flash Co</Link> — autonomous POD store (internal stress test of the agent stack). Live.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 24, letterSpacing: "-0.01em", marginBottom: 12 }}>Brand assets</h2>
        <p>Logo SVG, founder photo, screenshots available on request. Email <a href="mailto:hello@day14.us">hello@day14.us</a> with your outlet and we'll send a Dropbox link within a day.</p>
      </section>

      <section style={{ padding: 32, background: "#FAF8F4", borderRadius: 12 }}>
        <h2 style={{ fontSize: 22, marginBottom: 12 }}>Press contact</h2>
        <p style={{ marginBottom: 8 }}><strong>Jack Boppington</strong>, Founder</p>
        <p style={{ marginBottom: 8 }}><a href="mailto:hello@day14.us" style={{ color: "#7A6F8F" }}>hello@day14.us</a></p>
        <p style={{ fontSize: 13, color: "#666" }}>Generally available for podcast appearances, written interviews, and panel talks on AI-leveraged productized services. Replies within 24h.</p>
      </section>
    </main>
    <SiteFooter />
    </>
  );
}
