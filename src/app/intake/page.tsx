import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { IntakeForm } from "./intake-form";

/**
 * /intake — the post-deposit intake form.
 *
 * Single page, all fields visible (no multi-step). Captures the
 * fields the intake-parser expects, POSTs to /api/intake on submit,
 * shows confirmation on success.
 *
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
    <>
      <SiteHeader />
      <main>
        <section className="container-page pt-16 pb-12">
          <div className="font-mono text-xs uppercase tracking-[0.18em] text-ember-600">
            Intake · {sku ? `${sku.toUpperCase()} tier` : "Day14"}
          </div>

          <h1 className="mt-5 max-w-3xl text-[44px] font-extrabold leading-[1.05] tracking-tightest text-ink sm:text-[64px]">
            Tell us about your business.
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-ink-500 sm:text-xl">
            One page. Save partway if you need to come back — your browser
            holds the draft. We start building the moment this lands.
          </p>

          <div className="mt-3 max-w-2xl text-sm text-ink-400">
            Required fields are marked.{" "}
            <span className="text-ink-500">
              Everything else helps — none of it blocks the build.
            </span>
          </div>
        </section>

        <section className="container-page pb-24">
          <IntakeForm sku={sku} prefilledEmail={email} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
