import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { CanvasField } from "@/components/cinematic/CanvasField";
import { Nav } from "@/components/cinematic/Nav";
import { SiteFooter } from "@/components/cinematic/SiteFooter";
import { Reveal } from "@/components/cinematic/Reveal";
import { IntakeForm } from "./intake-form";

/**
 * /intake — the post-deposit intake form.
 *
 * Single page, all fields visible (no multi-step). Captures the
 * fields the intake-parser expects, POSTs to /api/intake on submit,
 * shows confirmation on success.
 *
 * Re-themed onto the cinematic shell (block 9/10) so the chrome matches every
 * other route. The form lives in ./intake-form.tsx (client) and is unchanged.
 * Reachable from /thanks?sku=... or directly via day14.us/intake.
 */

export const metadata: Metadata = {
  title: `Intake — ${SITE.brand}`,
  description:
    "Tell us about your business. One page, ~25 minutes, no calls needed.",
  robots: { index: false, follow: false },
};

export default function IntakePage({
  searchParams,
}: {
  searchParams?: { sku?: string; email?: string };
}) {
  const sku = searchParams?.sku;
  const email = searchParams?.email;

  return (
    <div className="cinematic" id="top">
      <CanvasField />
      <Nav linkBase="/" />

      <main className="cin-detail">
        <header className="cin-detail-hero">
          <Reveal as="div" className="cin-kicker">
            Intake · {sku ? `${sku.toUpperCase()} tier` : "Day14"}
          </Reveal>
          <Reveal as="h1" delayStep={1} className="cin-detail-h1">
            Tell us about your business.
          </Reveal>
          <Reveal as="p" delayStep={2} className="cin-detail-lede">
            One page. Save partway if you need to come back — your browser holds
            the draft. We start building the moment this lands.
          </Reveal>
          <Reveal as="p" delayStep={3} className="cin-detail-body">
            Required fields are marked. Everything else helps — none of it blocks
            the build.
          </Reveal>
        </header>

        <section className="cin-detail-block">
          <IntakeForm sku={sku} prefilledEmail={email} />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
