import Link from "next/link";

import { SITE } from "@/lib/site";
import {
  loadEmpireSnapshot,
  describeAction,
  relativeAge,
} from "@/lib/empire-snapshot";
import { CanvasField } from "@/components/cinematic/CanvasField";
import { Nav } from "@/components/cinematic/Nav";
import { SiteFooter } from "@/components/cinematic/SiteFooter";
import { Reveal } from "@/components/cinematic/Reveal";
import { ClosingCTA } from "@/components/cinematic/ClosingCTA";

/**
 * /stack — "the stack we sell is the one we run," in the cinematic skin.
 *
 * Re-themed into the cinematic system (started in block 4/10 after /about +
 * /process finished early). Composed directly from the shared shell
 * (CanvasField + Nav + SiteFooter + ClosingCTA), matching the /about pattern.
 * The live empire snapshot (loadEmpireSnapshot) is preserved and rendered with
 * the existing `.cin-stats` figures + a mono activity feed; the agents/engines/
 * proof render as `.cin-detail-cases`. Content is preserved from the prior
 * surface; only the skin changes.
 *
 * No prices appear on this page, so `check:prices` is trivially clean. The page
 * stays `force-dynamic` because the live panel reads a fresh snapshot per request.
 *
 * NOTE (deferred polish for the dedicated /stack block): the live feed uses a
 * few inline styles rather than new CSS classes (infra freeze). The newsletter
 * capture from the legacy page is dropped in favor of the standard ClosingCTA;
 * re-add a cinematic newsletter block when one exists.
 */

export const metadata = {
  title: "The Day14 Stack — how a one-operator studio ships in 14 days",
  description:
    "Inside the Day14 OS: 20+ AI agents running customer operations, content production, financial reporting, and self-improvement. The same stack we sell to customers.",
  alternates: { canonical: "/stack" },
  openGraph: {
    title: "The Day14 Stack",
    description: "How a one-operator studio ships in 14 days.",
  },
};

export const dynamic = "force-dynamic";

const AGENTS: { name: string; role: string }[] = [
  { name: "CFO", role: "Daily P&L, cash flow, pricing recommendations." },
  { name: "Head of Product", role: "Sales-driven roadmap, kill list, cross-pollination." },
  { name: "Customer Success", role: "Post-purchase drafts, NPS, win-back." },
  { name: "Compliance Officer", role: "Legal and brand-safety review of every output." },
  { name: "Performance Analyst", role: "Weekly cohort, week-over-week growth, attribution." },
  { name: "VP Sales", role: "Outbound drafts per archetype." },
  { name: "PR Director", role: "Brand-mention monitoring, podcast pitches." },
  { name: "Brand Steward", role: "Voice consistency across every piece of content." },
  { name: "DevOps / SRE", role: "Uptime, daemon health, security audits." },
  { name: "Investor Relations", role: "Monthly investor-style update with wins and asks." },
];

const ENGINES: { name: string; desc: string }[] = [
  {
    name: "Opportunity scanner",
    desc: "Continuous Gemini-grounded scan for underserved niches, scored 0–100.",
  },
  {
    name: "Idea pitcher",
    desc: "When an opportunity scores 75 or higher, auto-drafts a full launch pitch with a 30-day MVP plan.",
  },
  {
    name: "Business bootstrap",
    desc: "One command spins up a new business of any archetype: constitution, identity, competitor research, products, LaunchAgents, brand site.",
  },
  {
    name: "Product factory",
    desc: "Daily design generation, Printify upload, draft creation.",
  },
  {
    name: "Content pipeline",
    desc: "TikTok script → AI video → six platform variants → cross-poster → publishers across IG, TikTok, YouTube, LinkedIn, Pinterest, Threads, X.",
  },
  {
    name: "Recursive expansion",
    desc: "When you describe a need, the system auto-drafts a SKILL.md and an implementation stub. Approve to ship it into the registry.",
  },
];

const PROOF: { href: string; title: string; desc: string }[] = [
  {
    href: "/case-studies/hot-flash-co",
    title: "Hot Flash Co",
    desc: "Autonomous POD store, perimenopause humor niche.",
  },
  {
    href: "/case-studies/splash-jacks-pools",
    title: "Splash Jacks Pools",
    desc: "Service-business platform, customer #0.",
  },
  {
    href: "/brands/hot-flash-co",
    title: "Open Hot Flash Co",
    desc: "Live storefront, Printify-fulfilled.",
  },
];

export default async function StackPage() {
  const snap = await loadEmpireSnapshot();
  const hasLiveData = snap.runs_24h > 0 || snap.agent_count_total > 0;

  return (
    <div className="cinematic" id="top">
      <CanvasField />
      <Nav linkBase="/" />

      <main>
        {/* Hero. */}
        <header className="cin-detail">
          <Reveal as="div" className="cin-kicker">
            The Stack
          </Reveal>
          <Reveal as="h1" delayStep={1} className="cin-page-h1">
            The stack we ship to clients is the one we run ourselves.
          </Reveal>
          <Reveal as="p" delayStep={2} className="cin-page-lede">
            Day14 is a one-operator studio. We ship real products in 14 days
            because 20+ AI agents handle everything that isn&rsquo;t judgment —
            marketing, sales, customer success, financial reporting, compliance,
            devops. We sell you the same stack.
          </Reveal>
        </header>

        {/* Live system activity — preserved from the empire snapshot. */}
        {hasLiveData ? (
          <section className="cin-detail" aria-label="Live system activity">
            <Reveal as="div" className="cin-status">
              <span
                aria-hidden
                style={{
                  display: "inline-block",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "var(--cin-accent)",
                }}
              />
              Live · last 24 hours
            </Reveal>
            <div
              className="cin-stats"
              style={{ gridTemplateColumns: "repeat(3, 1fr)", margin: "0 auto" }}
            >
              <div className="cin-stat">
                <div className="cin-stat-v">{snap.runs_24h.toLocaleString()}</div>
                <div className="cin-stat-l">agent runs across the empire</div>
              </div>
              <div className="cin-stat">
                <div className="cin-stat-v">
                  {snap.agent_count_healthy}
                  <span style={{ color: "var(--cin-faint)" }}>
                    /{snap.agent_count_total}
                  </span>
                </div>
                <div className="cin-stat-l">agents reporting healthy</div>
              </div>
              <div className="cin-stat">
                <div className="cin-stat-v">{snap.tenant_count}</div>
                <div className="cin-stat-l">businesses on the stack</div>
              </div>
            </div>

            {snap.recent.length > 0 ? (
              <ul
                role="list"
                style={{
                  listStyle: "none",
                  margin: "5vh 0 0",
                  padding: "0",
                  borderTop: "1px solid var(--cin-line)",
                }}
              >
                {snap.recent.slice(0, 6).map((e, i) => (
                  <li
                    key={`${e.ts}-${i}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "90px 140px 1fr",
                      gap: "16px",
                      alignItems: "baseline",
                      padding: "12px 0",
                      borderBottom: "1px solid var(--cin-line)",
                      fontFamily: "var(--cin-font-mono)",
                      fontSize: "12px",
                    }}
                  >
                    <span style={{ color: "var(--cin-faint)" }}>
                      {relativeAge(e.ts)}
                    </span>
                    <span style={{ color: "var(--cin-accent)" }}>{e.actor}</span>
                    <span style={{ color: "var(--cin-mut)" }}>
                      {describeAction(e)}
                      <span style={{ color: "var(--cin-faint)" }}>
                        {" "}
                        · {e.tenant}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        {/* The C-suite, hired. */}
        <div className="cin-detail">
          <section className="cin-detail-block">
            <Reveal as="div" className="cin-kicker">
              The C-suite, hired
            </Reveal>
            <Reveal as="h2" delayStep={1} className="cin-detail-h2">
              Ten roles a real company would hire for.
            </Reveal>
            <Reveal as="p" delayStep={2} className="cin-detail-body">
              Each one runs on schedule, writes reports, and pings Telegram when
              something needs your attention.
            </Reveal>
            <div className="cin-detail-cases">
              {AGENTS.map((a, i) => (
                <Reveal
                  key={a.name}
                  className="cin-detail-case"
                  delayStep={Math.min(i, 3) as 0 | 1 | 2 | 3}
                >
                  <div className="cin-detail-case-v">{a.name}</div>
                  <p>{a.role}</p>
                </Reveal>
              ))}
            </div>
          </section>

          {/* Autonomous loops. */}
          <section className="cin-detail-block">
            <Reveal as="div" className="cin-kicker">
              Autonomous loops
            </Reveal>
            <Reveal as="h2" delayStep={1} className="cin-detail-h2">
              Six engines that run between approvals.
            </Reveal>
            <Reveal as="p" delayStep={2} className="cin-detail-body">
              The system finds opportunities, drafts pitches, builds businesses,
              ships content, and improves itself.
            </Reveal>
            <div className="cin-detail-cases">
              {ENGINES.map((e, i) => (
                <Reveal
                  key={e.name}
                  className="cin-detail-case"
                  delayStep={Math.min(i, 3) as 0 | 1 | 2 | 3}
                >
                  <div className="cin-detail-case-v">{e.name}</div>
                  <p>{e.desc}</p>
                </Reveal>
              ))}
            </div>
          </section>

          {/* Live proof. */}
          <section className="cin-detail-block">
            <Reveal as="div" className="cin-kicker">
              Live proof
            </Reveal>
            <Reveal as="h2" delayStep={1} className="cin-detail-h2">
              The stack runs our own businesses too.
            </Reveal>
            <Reveal as="p" delayStep={2} className="cin-detail-body">
              Hot Flash Co is a perimenopause-humor POD store we built as a
              stress-test — full autopilot, idea to first product in under a day.
            </Reveal>
            <div className="cin-detail-cases">
              {PROOF.map((p, i) => (
                <Reveal
                  key={p.href}
                  className="cin-detail-case"
                  delayStep={Math.min(i, 3) as 0 | 1 | 2 | 3}
                >
                  <Link
                    href={p.href}
                    style={{
                      display: "block",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <div className="cin-detail-case-v">{p.title} →</div>
                    <p>{p.desc}</p>
                  </Link>
                </Reveal>
              ))}
            </div>
          </section>

          {/* Run it in your business. */}
          <section className="cin-detail-block cin-detail-outcome">
            <Reveal as="p">
              The Platform SKU includes the agent stack — tuned to your
              operations, deployed on your domain, owned by you.
            </Reveal>
            <Reveal
              as="div"
              delayStep={1}
              className="cin-hcta cin-detail-cta"
            >
              <Link href="/#pricing" className="cin-btn" data-cta="pricing_stack">
                See pricing
              </Link>
              <a
                href={SITE.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="cin-btn cin-btn-solid"
                data-cta="book_stack"
              >
                Book a 15-min intro call
              </a>
            </Reveal>
          </section>
        </div>

        {/* Closing CTA. */}
        <ClosingCTA />
      </main>

      <SiteFooter />
    </div>
  );
}
