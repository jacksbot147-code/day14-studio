import Link from "next/link";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Free tools — Day14",
  description: "Free tools and templates from Day14. The stack we use to ship in 14 days, available for anyone to study or steal.",
};

const TOOLS = [
  {
    title: "Day14 Pricing Calculator",
    desc: "Plug in your SaaS subscriptions (Jobber, Housecall Pro, Squarespace, GoHighLevel, etc.) — we'll calculate the 3-year cost vs Day14 + tell you when the break-even is.",
    href: "/tools/pricing-calculator",
    icon: "🧮",
    status: "coming",
  },
  {
    title: "14-Day Build Plan Template",
    desc: "The exact playbook we use to ship a Portal-tier project. Notion template + checklists + the order-form we send customers.",
    href: "/tools/build-plan",
    icon: "📋",
    status: "coming",
  },
  {
    title: "Niche Validator",
    desc: "Type a business idea. We Gemini-search for current competitors + market size signals + winning angles. Same engine we use internally.",
    href: "/tools/niche-validator",
    icon: "🎯",
    status: "coming",
  },
  {
    title: "Stack Auditor",
    desc: "Paste your current website URL. We'll inspect your stack (analytics, hosting, ESP, CRM, payments) and tell you what's costing you 3x what it should.",
    href: "/tools/stack-audit",
    icon: "🔍",
    status: "coming",
  },
];

export default function ToolsPage() {
  return (
    <>
    <SiteHeader />
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "80px 32px", fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif", color: "#2F2A33" }}>
      <h1 style={{ fontSize: 48, letterSpacing: "-0.02em", marginBottom: 16, lineHeight: 1.1 }}>Free tools</h1>
      <p style={{ fontSize: 19, color: "#7A6F8F", marginBottom: 48, lineHeight: 1.55, maxWidth: 720 }}>
        Internal tools from the Day14 stack, open to anyone. Most of these power our customer builds — we figured if they save us hours, they'll save you hours.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20, marginBottom: 64 }}>
        {TOOLS.map((t) => (
          <div key={t.title} style={{ background: "white", border: "1px solid #E5DDD0", borderRadius: 12, padding: 24, position: "relative", opacity: t.status === "coming" ? 0.85 : 1 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>{t.icon}</div>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, letterSpacing: "-0.01em" }}>{t.title}</h3>
            <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6, marginBottom: 16 }}>{t.desc}</p>
            {t.status === "coming" ? (
              <span style={{ display: "inline-block", padding: "4px 10px", background: "#FAF8F4", border: "1px solid #E5DDD0", borderRadius: 100, fontSize: 11, color: "#7A6F8F", textTransform: "uppercase", letterSpacing: "0.08em" }}>Coming soon</span>
            ) : (
              <Link href={t.href} style={{ color: "#2F2A33", fontSize: 14, fontWeight: 500 }}>Open tool →</Link>
            )}
          </div>
        ))}
      </div>

      <section style={{ background: "#FAF8F4", borderRadius: 16, padding: 32, marginBottom: 48 }}>
        <h2 style={{ fontSize: 24, letterSpacing: "-0.01em", marginBottom: 12 }}>Tell me when these ship</h2>
        <p style={{ color: "#666", marginBottom: 20, fontSize: 15 }}>Subscribe to the build log and I'll email you when each tool goes live (along with everything else we're shipping).</p>
        <NewsletterSignup source="tools-page" buttonText="Notify me" />
      </section>

      <section>
        <h2 style={{ fontSize: 24, letterSpacing: "-0.01em", marginBottom: 12 }}>Already public</h2>
        <ul style={{ paddingLeft: 24, lineHeight: 2 }}>
          <li><Link href="/api/feed.xml" style={{ color: "#7A6F8F" }}>Live RSS feed</Link> — every commit and agent action on the Day14 empire, in real time.</li>
          <li><Link href="/builds" style={{ color: "#7A6F8F" }}>Public build logs</Link> — every customer build is public from day one.</li>
          <li><Link href="/stack" style={{ color: "#7A6F8F" }}>The Day14 stack</Link> — full breakdown of the 20+ agents we run.</li>
          <li><Link href="/case-studies/hot-flash-co" style={{ color: "#7A6F8F" }}>Hot Flash Co case study</Link> — how we used the stack to build an autonomous POD store in under a day.</li>
        </ul>
      </section>
    </main>
    <SiteFooter />
    </>
  );
}
