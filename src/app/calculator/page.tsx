import { CanvasField } from "@/components/cinematic/CanvasField";
import { Nav } from "@/components/cinematic/Nav";
import { SiteFooter } from "@/components/cinematic/SiteFooter";
import { Reveal } from "@/components/cinematic/Reveal";
import { ScopeCalculator } from "./scope-calculator";

/**
 * /calculator — interactive scope calculator. Sliders + toggles → tier
 * recommendation, real price, real launch date. Eliminates the "let's
 * hop on a call to scope" friction. The calculator IS the scope call.
 *
 * Re-themed onto the cinematic shell (block 9/10) so the chrome matches every
 * other route. The interactive calculator lives in ./scope-calculator.tsx
 * (client) and is unchanged here; it reads its prices from pricing.ts.
 */

export default function CalculatorPage() {
  return (
    <div className="cinematic" id="top">
      <CanvasField />
      <Nav linkBase="/" />

      <main className="cin-detail">
        <header className="cin-detail-hero">
          <Reveal as="div" className="cin-kicker">
            Scope calculator
          </Reveal>
          <Reveal as="h1" delayStep={1} className="cin-detail-h1">
            A real price. A real launch date. Right now.
          </Reveal>
          <Reveal as="p" delayStep={2} className="cin-detail-lede">
            Slide and toggle to describe what you want built. The price and
            launch date update live. No &ldquo;contact us for pricing.&rdquo; No
            sales call required to find out if I&rsquo;m in your budget. Real
            numbers; you can book the intro call already knowing the quote.
          </Reveal>
        </header>

        <section className="cin-detail-block">
          <ScopeCalculator />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
