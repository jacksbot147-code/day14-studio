/**
 * cinematic/CinematicHome — the public homepage.
 *
 * Focused flow: hero, capabilities, how it works, proof, ROI, pricing, GEO,
 * closing CTA. The testimonial mounts only when a real quote exists.
 */

import { CanvasField } from "./CanvasField";
import { Nav } from "./Nav";
import { Hero } from "./Hero";
import { Capabilities } from "./Capabilities";
import { HowItWorks } from "./HowItWorks";
import { StatsRow } from "./StatsRow";
import { Testimonial } from "./Testimonial";
import { Proof } from "./Proof";
import { RoiCalculator } from "./RoiCalculator";
import { Pricing } from "./Pricing";
import { GeoCallout } from "./GeoCallout";
import { ClosingCTA } from "./ClosingCTA";
import { SiteFooter } from "./SiteFooter";
import { getPaymentLinks } from "@/lib/payment-links";

export function CinematicHome() {
  return (
    <div className="cinematic" id="top">
      <CanvasField />
      <Nav />
      <main>
        <Hero />
        <Capabilities />
        <HowItWorks />
        <StatsRow />
        <Testimonial />
        <Proof />
        <RoiCalculator />
        <Pricing links={getPaymentLinks()} />
        <GeoCallout />
        <ClosingCTA />
      </main>
      <SiteFooter />
    </div>
  );
}

export default CinematicHome;
