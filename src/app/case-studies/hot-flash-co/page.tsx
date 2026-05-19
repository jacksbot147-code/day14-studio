import Link from "next/link";
import { NewsletterSignup } from "@/components/NewsletterSignup";

export const metadata = {
  title: "Hot Flash Co — Day14 case study",
  description: "We built and launched a perimenopause humor print-on-demand store in under a day using Day14 OS. 10 products live, daily-engine running, full content + marketing autopilot.",
  openGraph: { title: "Hot Flash Co — Day14 case study", description: "POD store from idea to live store in under a day." },
};

export default function HotFlashCoCaseStudy() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "60px 32px" }}>
      <div style={{ fontSize: 11, color: "#7A6F8F", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>
        Internal · POD · Autonomous
      </div>
      <h1 style={{ fontSize: 44, letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 20 }}>
        Hot Flash Co: idea to live store in under a day
      </h1>
      <p style={{ fontSize: 18, color: "#7A6F8F", lineHeight: 1.6, marginBottom: 40 }}>
        We needed to stress-test the Day14 autonomous stack on a real business that wasn't a client. So we picked a niche we know is underserved (perimenopause humor, ages 45-60) and let the agents do the rest.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 48 }}>
        {[
          { label: "Time to first product live", value: "< 24h" },
          { label: "Products at launch", value: "10" },
          { label: "Manual design work", value: "0 min" },
          { label: "Manual copy work", value: "0 min" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#FAF8F4", border: "1px solid #E5DDD0", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, color: "#7A6F8F", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 28, letterSpacing: "-0.02em", marginBottom: 16 }}>What the agents did</h2>
      <ol style={{ paddingLeft: 24, lineHeight: 1.8, fontSize: 15, color: "#444", marginBottom: 40 }}>
        <li><strong>Niche research</strong> — opportunity-scanner found the gap, scored 87/100, auto-pitched it</li>
        <li><strong>Brand identity</strong> — voice rules, palette (muted purple / sand / charcoal), Helvetica + serif pair, banned-phrase list</li>
        <li><strong>Competitor map</strong> — 8 real competitors with pricing + positioning + the gap</li>
        <li><strong>Constitution</strong> — 11-section operating doc every agent reads before touching the tenant</li>
        <li><strong>10 product concepts</strong> — Gemini-drafted quotes + visual directions, all matching the voice</li>
        <li><strong>10 images</strong> — Pollinations Flux generated each at 1024×1024 for the mug print area</li>
        <li><strong>10 Printify products</strong> — uploaded, attached to the 11oz mug blueprint, drafts pending publish</li>
        <li><strong>Daily engines wired</strong> — content calendar, TikTok scripts, Pinterest pins, blog posts, newsletter, video creator, all running on schedule</li>
      </ol>

      <h2 style={{ fontSize: 28, letterSpacing: "-0.02em", marginBottom: 16 }}>What's running now (autopilot)</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12, marginBottom: 40 }}>
        {[
          { time: "6am daily", what: "Trend scan" },
          { time: "5:30am daily", what: "Hashtag research" },
          { time: "9am daily", what: "Product draft" },
          { time: "Tue/Thu 9am", what: "Blog post" },
          { time: "Wed 8am", what: "Newsletter issue" },
          { time: "M/W/F 11am", what: "TikTok scripts" },
          { time: "M/W/F 11:30am", what: "AI video creation" },
          { time: "M/W/F 12pm", what: "Video variant render" },
          { time: "Daily 10am", what: "Pinterest pins" },
          { time: "Daily 11am", what: "Marketing drafts" },
          { time: "Daily 1pm", what: "Social queue assembly" },
          { time: "Every 30-60 min", what: "Auto-publishers" },
        ].map((s) => (
          <div key={s.time} style={{ background: "white", border: "1px solid #E5DDD0", borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, color: "#7A6F8F", marginBottom: 4 }}>{s.time}</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{s.what}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 28, letterSpacing: "-0.02em", marginBottom: 16 }}>The lesson for clients</h2>
      <p style={{ fontSize: 16, color: "#444", lineHeight: 1.7, marginBottom: 16 }}>
        This wasn't a client build — it was an in-house experiment. The point: the agent stack is real, runs in production, and works on niches the operator (Jack) doesn't actively run.
      </p>
      <p style={{ fontSize: 16, color: "#444", lineHeight: 1.7, marginBottom: 40 }}>
        When we build you a Platform-tier project, we don't ship a back office and walk away. The same agents that run our experiments run yours. Your CFO agent files daily P&Ls. Your VP Sales drafts outbound. Your Brand Steward catches voice drift. Your Compliance Officer flags risk. You tap approve.
      </p>

      <div style={{ background: "#FAF8F4", border: "1px solid #E5DDD0", borderRadius: 16, padding: 32, marginBottom: 40, textAlign: "center" }}>
        <h3 style={{ fontSize: 22, letterSpacing: "-0.01em", marginBottom: 12 }}>See the live storefront</h3>
        <p style={{ color: "#666", marginBottom: 20, fontSize: 14 }}>10 products, Printify-fulfilled, generated end-to-end by agents.</p>
        <Link href="/brands/hot-flash-co" style={{ display: "inline-block", padding: "12px 24px", background: "#2F2A33", color: "white", borderRadius: 8, textDecoration: "none", fontSize: 14, marginRight: 8 }}>Open Hot Flash Co →</Link>
        <Link href="/stack" style={{ display: "inline-block", padding: "12px 24px", background: "white", border: "1px solid #E5DDD0", color: "#2F2A33", borderRadius: 8, textDecoration: "none", fontSize: 14 }}>See the stack</Link>
      </div>

      <div style={{ marginTop: 60, padding: 32, background: "white", border: "1px solid #E5DDD0", borderRadius: 12 }}>
        <h3 style={{ fontSize: 17, marginBottom: 8 }}>Get the weekly Day14 build log</h3>
        <p style={{ fontSize: 13, color: "#7A6F8F", marginBottom: 16 }}>One email a week. What we shipped, what broke, exact numbers from internal builds like this one.</p>
        <NewsletterSignup source="case-study-hot-flash-co" />
      </div>
    </main>
  );
}
