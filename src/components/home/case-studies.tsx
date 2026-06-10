import Link from "next/link";
import { cn } from "@/lib/cn";
import { DecryptText } from "@/components/landing/decrypt-text";
import { PathCrumb } from "@/components/landing/path-crumb";

/* -------------------------------------------------------------------------- */
/* Case studies — three tenants                                                */
/* -------------------------------------------------------------------------- */

// Six tenants on the OS — the empire, live. Bento order:
//   Row 1 (tall): alignmd, life-loophole, day14
//   Row 2 (short): day14-realty, hot-flash-co, kennum-lawn-care
// hot-flash-co + kennum-lawn-care render as PARKED tiles per the operator
// brief — excluded from new product work but kept visible in the grid.
type TenantState = "live" | "paused" | "parked";
const OS_CASE_STUDIES: Array<{
  slug: string;
  name: string;
  title: string;
  story: string;
  state: TenantState;
  brandColor: string;
  size: "tall" | "short";
}> = [
  {
    slug: "alignmd",
    name: "AlignMD",
    title: "Credential-aware staffing, end to end.",
    story:
      "Clinician intake that used to take 40 minutes now takes 4. Same admin app I run every other business from.",
    state: "live",
    brandColor: "#3B82F6",
    size: "tall",
  },
  {
    slug: "splash-jacks-pools",
    name: "Splash Jacks Pools",
    title: "A real platform for a real pool guy.",
    story:
      "Customer booking, route dispatch, photo-proof visits with GPS+timestamp, Stripe billing. Live in Southwest Florida — replaced a Squarespace brochure with software that runs the business.",
    state: "live",
    brandColor: "#0EA5E9",
    size: "tall",
  },
  {
    slug: "casamore",
    name: "Casamoré",
    title: "Silent disco with a brand that doesn't blink.",
    story:
      "18 marketing pages, 19 essays, poster series, MailerLite-wired waitlist. The site runs itself on scheduled agents — nightly polish, weekly UX audit, monthly analytics, T-minus rituals for every show.",
    state: "live",
    brandColor: "#EF6C33",
    size: "tall",
  },
  {
    slug: "buildbridge",
    name: "Buildbridge",
    title: "Hurricane-season marketplace, 14 SQL migrations deep.",
    story:
      "Homeowner-contractor marketplace with Stripe escrow, multi-county permit lookups, and Storm Mode — NOAA-triggered contractor mobilization in hours. Private beta.",
    state: "live",
    brandColor: "#0F766E",
    size: "short",
  },
  {
    slug: "life-loophole",
    name: "Life Loophole",
    title: "Editorial finance, drafted by an agent nightly.",
    story:
      "A background automation drafts essays in brand voice each night. I review and publish from the inbox.",
    state: "live",
    brandColor: "#CA8A04",
    size: "short",
  },
  {
    slug: "day14",
    name: "Day14 OS",
    title: "The operating system running this page.",
    story:
      "Multi-tenant studio, scheduled agents, evidence-verified work-log. The same code stack runs all six brands.",
    state: "live",
    brandColor: "#475569",
    size: "short",
  },
];

export function CaseStudies() {
  // Apple-style bento. 3 cols on lg, 2 on md, 1 on mobile.
  // Row 1: alignmd, life-loophole, day14 (tall — 360px).
  // Row 2: day14-realty, hot-flash-co, kennum-lawn-care (short — 240px).
  // Tiles render with brand-color top border + warm peach long shadow.
  const tileShadow =
    "0 24px 60px -20px rgba(239, 108, 51, 0.10), 0 8px 24px -8px rgba(15, 23, 42, 0.06)";

  return (
    <section
      id="case-studies"
      className="bg-paper-cream py-32 sm:py-40"
    >
      <div className="container-page">
        <div className="mx-auto max-w-3xl text-center">
          <div className="flex justify-center">
            <PathCrumb path="case-studies" />
          </div>
          <div className="eyebrow mb-6 justify-center text-ember-600">
            <DecryptText text="Built and operated on Day14 OS" durationMs={600} triggerOnView />
          </div>
          <h2 className="text-[56px] font-extrabold leading-[0.98] tracking-[-0.04em] text-ink sm:text-[72px] lg:text-[80px]">
            <DecryptText text="I use it on six of my own." durationMs={800} startAt={250} triggerOnView />
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-[17px] leading-[1.6] text-warm-gray-500 sm:text-[18px]">
            Every tile below is a real product running on Day14 OS &mdash; ours. Same admin, same agents, same evidence verifier. Different brand, different vertical, same 14-day cadence.
          </p>
        </div>

        {(() => {
          // Split LIVE from PAUSED/PARKED so we can render an honest
          // separator heading between the two rows — "here are the three
          // shipping today; here are three more we built and put on hold."
          const live = OS_CASE_STUDIES.filter((cs) => cs.state === "live");
          const held = OS_CASE_STUDIES.filter((cs) => cs.state !== "live");
          const renderTile = (cs: typeof OS_CASE_STUDIES[number]) => (
            <article
              key={cs.slug}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-3xl bg-paper-cream p-7 sm:p-8",
                cs.size === "tall" ? "min-h-[360px]" : "min-h-[240px]",
              )}
              style={{ boxShadow: tileShadow }}
            >
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-1"
                style={{ backgroundColor: cs.brandColor }}
              />
              <div className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-warm-gray-500">
                {cs.name}
              </div>
              <h3 className="mt-4 text-2xl font-bold leading-[1.15] tracking-[-0.02em] text-ink sm:text-[26px]">
                {cs.title}
              </h3>
              <p className="mt-3 text-[15px] leading-[1.55] text-warm-gray-500">
                {cs.story}
              </p>
              <div className="mt-auto flex items-center justify-between gap-3 pt-6">
                {["alignmd", "splash-jacks-pools", "casamore", "buildbridge"].includes(cs.slug) ? (
                  <Link
                    href={`/case-studies/${cs.slug}`}
                    className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-ember-600 transition-colors hover:text-ember-500"
                  >
                    Read the case study →
                  </Link>
                ) : (
                  <span />
                )}
                <StatePill state={cs.state} />
              </div>
            </article>
          );
          return (
            <>
              <div className="mt-20 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {live.map(renderTile)}
              </div>
              {held.length > 0 ? (
                <div className="mt-20 flex items-center gap-4">
                  <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-warm-gray-500">
                    Also built (paused or held)
                  </h3>
                  <div className="h-px flex-1 bg-warm-gray-100" />
                </div>
              ) : null}
              <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {held.map(renderTile)}
              </div>
            </>
          );
        })()}

        <p className="mx-auto mt-16 max-w-2xl text-center font-mono text-xs uppercase tracking-[0.22em] text-warm-gray-400">
          Same OS · Same inbox · Same evidence verifier
        </p>
      </div>
    </section>
  );
}

function StatePill({ state }: { state: "live" | "paused" | "parked" }) {
  const config = {
    live: { dot: "bg-shipped-500", label: "Live", text: "text-shipped-600" },
    paused: { dot: "bg-amber-500", label: "Paused", text: "text-amber-600" },
    parked: { dot: "bg-warm-gray-400", label: "Parked", text: "text-warm-gray-500" },
  }[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-warm-gray-50 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em]",
        config.text,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}
