import type { Metadata } from "next";

import { CapabilityMarquee } from "@/components/cinematic/CapabilityMarquee";
import { Statement } from "@/components/cinematic/Statement";
import { Capabilities } from "@/components/cinematic/Capabilities";
import { HowItWorks } from "@/components/cinematic/HowItWorks";
import { Engine } from "@/components/cinematic/Engine";
import { Testimonial } from "@/components/cinematic/Testimonial";
import { Proof } from "@/components/cinematic/Proof";
import { Pricing } from "@/components/cinematic/Pricing";
import { ClosingCTA } from "@/components/cinematic/ClosingCTA";
import { SiteFooter } from "@/components/cinematic/SiteFooter";
import { StickyCTA } from "@/components/cinematic/StickyCTA";

/**
 * /preview/cinematic — non-destructive assembly of the cinematic rebuild.
 *
 * WHY THIS EXISTS (QA task 8/8, 2026-06-24): tasks 1 + 3–7 built the cinematic
 * homepage as standalone section components under src/components/cinematic/ plus
 * cinematic.css, but no task ever mounted them on a route — the live `/`
 * homepage still renders the previous landing components. This route composes
 * the built sections inside the required `.cinematic` dark-surface scope so the
 * work can actually be viewed and QA'd in a browser, WITHOUT changing the live
 * homepage. Swapping `/` to the cinematic page is a separate, deliberate
 * decision for Jack — see CINEMATIC-REBUILD-REPORT-2026-06-24.md.
 *
 * KNOWN GAP rendered honestly here: the cinematic HERO + NAV (the prototype's
 * task-2 chrome: the word-cycle headline, the sticky nav, the particle canvas,
 * the scroll progress bar) were never built. The block below is a clearly
 * labelled PLACEHOLDER that supplies the page's single <h1> so the preview has
 * a valid heading/landmark structure — it is not the final hero.
 *
 * Never indexed (preview surface).
 */

export const metadata: Metadata = {
  title: "Cinematic rebuild — preview",
  robots: { index: false, follow: false },
};

export default function CinematicPreviewPage() {
  return (
    <div className="cinematic">
      {/* Preview banner — makes it unmistakable this is a staging surface. */}
      <div
        role="note"
        style={{
          padding: "10px 7vw",
          background: "rgba(86,179,255,0.10)",
          borderBottom: "1px solid var(--cin-line)",
          color: "var(--cin-ink)",
          fontFamily: "var(--cin-font-mono)",
          fontSize: 12,
          letterSpacing: "0.04em",
          textAlign: "center",
        }}
      >
        PREVIEW · cinematic rebuild assembly · the hero &amp; nav (task 2) are
        not built — the block below is a placeholder
      </div>

      <main>
        {/* PLACEHOLDER hero — carries the single <h1>. Not the final hero. */}
        <header
          className="cin-section"
          style={{
            minHeight: "60vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div className="cin-kicker">Placeholder hero · task 2 pending</div>
          <h1
            style={{
              fontSize: "var(--cin-fs-hero)",
              fontWeight: "var(--cin-weight-light)" as unknown as number,
              letterSpacing: "var(--cin-tracking-tightest)",
              lineHeight: 1,
              maxWidth: "16ch",
              margin: 0,
            }}
          >
            The system that runs your{" "}
            <span style={{ color: "var(--cin-accent)" }}>service</span> business.
          </h1>
          <p
            style={{
              marginTop: 24,
              color: "var(--cin-mut)",
              maxWidth: "50ch",
              fontSize: "var(--cin-fs-body)",
              lineHeight: "var(--cin-leading-body)" as unknown as number,
            }}
          >
            Site, booking, portal, payments, scheduling and an AI assistant —
            one platform, live in 14 days. (The animated word-cycle hero and nav
            still need to be built.)
          </p>
        </header>

        <CapabilityMarquee />
        <Statement />
        <Capabilities />
        <HowItWorks />
        <Engine />
        <Testimonial />
        <Proof />
        <Pricing />
        <ClosingCTA />
      </main>

      <SiteFooter />
      <StickyCTA />
    </div>
  );
}
