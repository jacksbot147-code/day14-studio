/**
 * cinematic/CinematicHome — the full cinematic homepage composition.
 *
 * Assembles the complete page in order: atmospheric backdrop + nav + intro, the
 * hero (task 2/8, the previously-missing chrome), then every section built in
 * tasks 3–7, the footer, and the sticky CTA. Wrapped in the `.cinematic` opt-in
 * dark scope so the design tokens apply.
 *
 * Mounted at /preview/cinematic. Swapping the live `/` homepage to render this
 * is a one-line change (see CINEMATIC-REBUILD-REPORT) and remains Jack's call —
 * this composition is built so that swap is trivial when approved.
 */

import { CanvasField } from "./CanvasField";
import { Nav } from "./Nav";
import { Intro } from "./Intro";
import { Hero } from "./Hero";
import { CapabilityMarquee } from "./CapabilityMarquee";
import { Statement } from "./Statement";
import { Capabilities } from "./Capabilities";
import { HowItWorks } from "./HowItWorks";
import { Engine } from "./Engine";
import { Testimonial } from "./Testimonial";
import { Proof } from "./Proof";
import { FeaturedTenant } from "./FeaturedTenant";
import { RoiCalculator } from "./RoiCalculator";
import { Pricing } from "./Pricing";
import { GeoCallout } from "./GeoCallout";
import { CaptureCallout } from "./CaptureCallout";
import { ClosingCTA } from "./ClosingCTA";
import { SiteFooter } from "./SiteFooter";
import { StickyCTA } from "./StickyCTA";
import { getPaymentLinks } from "@/lib/payment-links";

export function CinematicHome() {
  return (
    <div className="cinematic" id="top">
      <Intro />
      <CanvasField />
      <Nav />
      <main>
        <Hero />
        <CapabilityMarquee />
        <Statement />
        <Capabilities />
        <HowItWorks />
        <Engine />
        <Testimonial />
        <Proof />
        <FeaturedTenant />
        <RoiCalculator />
        <Pricing links={getPaymentLinks()} />
        <GeoCallout />
        <CaptureCallout />
        <ClosingCTA />
      </main>
      <SiteFooter />
      <StickyCTA />
    </div>
  );
}

export default CinematicHome;
