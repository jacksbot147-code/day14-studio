import Link from "next/link";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "The Day14 Stack — how a one-operator studio ships in 14 days",
  description: "Inside the Day14 OS: 20+ AI agents running customer operations, content production, financial reporting, and self-improvement. Same stack we sell to customers.",
  openGraph: { title: "The Day14 Stack", description: "How a one-operator studio ships in 14 days." },
};

const AGENTS = [
  { icon: "💼", name: "CFO", role: "Daily P&L, cash flow, pricing recommendations" },
  { icon: "📦", name: "Head of Product", role: "Sales-driven roadmap, kill list, cross-pollination" },
  { icon: "🤝", name: "Customer Success", role: "Post-purchase drafts, NPS, win-back" },
  { icon: "⚖️", name: "Compliance Officer", role: "Legal + brand-safety review of every output" },
  { icon: "📊", name: "Performance Analyst", role: "Weekly cohort, WoW growth, attribution" },
  { icon: "🎯", name: "VP Sales", role: "Outbound drafts per archetype" },
  { icon: "📰", name: "PR Director", role: "Brand mention monitoring, podcast pitches" },
  { icon: "🎨", name: "Brand Steward", role: "Voice consistency watchdog across content" },
  { icon: "🔧", name: "DevOps / SRE", role: "Uptime, daemon health, security audits" },
  { icon: "📈", name: "Investor Relations", role: "Monthly investor-style update with wins/asks" },
];

const ENGINES = [
  { icon: "🌐", name: "Opportunity scanner", desc: "Continuous Gemini-grounded scan for underserved niches, scored 0-100." },
  { icon: "💡", name: "Idea pitcher", desc: "When an opportunity scores ≥75, auto-drafts a full launch pitch with 30-day MVP plan." },
  { icon: "🚀", name: "Business bootstrap", desc: "One command spins up a new business of any archetype: constitution + identity + competitor research + products + LaunchAgents + brand site." },
  { icon: "🛒", name: "Product factory", desc: "Daily Imagen / Pollinations design generation, Printify upload, draft creation." },
  { icon: "🎬", name: "Content pipeline", desc: "TikTok script → AI video → 6 platform variants → cross-poster → publishers across IG / TikTok / YouTube / LinkedIn / Pinterest / Threads / X." },
  { icon: "🧬", name: "Recursive expansion", desc: "When you describe a need, the system auto-drafts a SKILL.md + implementation stub. Approve to ship into the registry." },
];

export default function StackPage() {
  return (
    <>
    <SiteHeader />
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 32px" }}>
      <section style={{ textAlign: "center", marginBottom: 80 }}>
        <h1 style={{ fontSize: 52, letterSpacing: "-0.03em", lineHeight: 1.05, marginBottom: 20 }}>
          The stack we ship to clients<br />is the one we run ourselves.
        </h1>
        <p style={{ fontSize: 19, color: "#7A6F8F", maxWidth: 720, margin: "0 auto", lineHeight: 1.55 }}>
          Day14 is a one-operator studio. We can ship a real product in 14 days because <strong>20+ AI agents</strong> handle everything that isn't judgment: marketing, sales, customer success, financial reporting, compliance, devops. We sell you the same stack.
        </p>
      </section>

      <section style={{ marginBottom: 80 }}>
        <h2 style={{ fontSize: 30, letterSpacing: "-0.02em", marginBottom: 8 }}>The C-suite, hired</h2>
        <p style={{ color: "#7A6F8F", marginBottom: 32, fontSize: 15 }}>10 agents that fill the roles a real company would hire for. Each one runs on schedule, writes reports, pings Telegram when something needs your attention.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {AGENTS.map((a) => (
            <div key={a.name} style={{ background: "white", border: "1px solid #E5DDD0", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{a.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{a.name}</h3>
              <p style={{ fontSize: 13, color: "#666", lineHeight: 1.5 }}>{a.role}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 80 }}>
        <h2 style={{ fontSize: 30, letterSpacing: "-0.02em", marginBottom: 8 }}>The autonomous loops</h2>
        <p style={{ color: "#7A6F8F", marginBottom: 32, fontSize: 15 }}>Six recursive engines that run between you tapping approve. The system finds opportunities, drafts pitches, builds businesses, ships content, and improves itself.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
          {ENGINES.map((e) => (
            <div key={e.name} style={{ background: "white", border: "1px solid #E5DDD0", borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{e.icon}</div>
              <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>{e.name}</h3>
              <p style={{ fontSize: 14, color: "#444", lineHeight: 1.6 }}>{e.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 80, padding: 40, background: "#FAF8F4", borderRadius: 16 }}>
        <h2 style={{ fontSize: 30, letterSpacing: "-0.02em", marginBottom: 8 }}>Live proof</h2>
        <p style={{ color: "#7A6F8F", marginBottom: 24, fontSize: 15 }}>The same stack runs our own internal businesses. Hot Flash Co is a perimenopause humor POD store we built as a stress-test — full autopilot from idea to first product in under a day.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          <Link href="/case-studies/hot-flash-co" style={{ display: "block", padding: 20, background: "white", border: "1px solid #E5DDD0", borderRadius: 12, textDecoration: "none", color: "inherit" }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Hot Flash Co →</div>
            <div style={{ fontSize: 12, color: "#666" }}>Autonomous POD store, perimenopause humor niche</div>
          </Link>
          <Link href="/case-studies/splash-jacks-pools" style={{ display: "block", padding: 20, background: "white", border: "1px solid #E5DDD0", borderRadius: 12, textDecoration: "none", color: "inherit" }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Splash Jacks Pools →</div>
            <div style={{ fontSize: 12, color: "#666" }}>Service business platform, customer #0</div>
          </Link>
          <Link href="/brands/hot-flash-co" style={{ display: "block", padding: 20, background: "white", border: "1px solid #E5DDD0", borderRadius: 12, textDecoration: "none", color: "inherit" }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Open Hot Flash Co →</div>
            <div style={{ fontSize: 12, color: "#666" }}>Live storefront (Printify-fulfilled)</div>
          </Link>
        </div>
      </section>

      <section style={{ textAlign: "center", padding: "60px 32px" }}>
        <h2 style={{ fontSize: 28, letterSpacing: "-0.02em", marginBottom: 12 }}>Want this running in your business?</h2>
        <p style={{ color: "#7A6F8F", marginBottom: 24, fontSize: 15 }}>The Platform SKU includes the agent stack, tuned to your operations.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 32 }}>
          <Link href="/#sku" style={{ padding: "14px 28px", background: "#2F2A33", color: "white", borderRadius: 8, textDecoration: "none", fontSize: 15, fontWeight: 500 }}>See pricing</Link>
          <a href="https://cal.com/day14/intro" style={{ padding: "14px 28px", background: "white", border: "1px solid #E5DDD0", color: "#2F2A33", borderRadius: 8, textDecoration: "none", fontSize: 15, fontWeight: 500 }}>Book intro call</a>
        </div>
        <div style={{ marginTop: 40, maxWidth: 480, margin: "40px auto 0" }}>
          <div style={{ fontSize: 13, color: "#7A6F8F", marginBottom: 8 }}>Or get the weekly build log instead:</div>
          <NewsletterSignup source="stack-page" buttonText="Subscribe →" />
        </div>
      </section>
    </main>
    <SiteFooter />
    </>
  );
}
