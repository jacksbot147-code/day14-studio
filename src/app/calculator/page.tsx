import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ScopeCalculator } from "./scope-calculator";

/**
 * /calculator — interactive scope calculator. Sliders + toggles → tier
 * recommendation, real price, real launch date. Eliminates the "let's
 * hop on a call to scope" friction. The calculator IS the scope call.
 *
 * The page shell is server-rendered; the interactive calculator lives
 * in ./scope-calculator.tsx (client). No backend.
 */

export default function CalculatorPage() {
  return (
    <>
      <SiteHeader />
      <main className="container-page pt-14 pb-20 sm:pt-20">
        <div className="eyebrow mb-6">Scope calculator</div>
        <h1 className="max-w-3xl text-[40px] font-extrabold leading-[1.05] tracking-tightest text-ink sm:text-[60px]">
          A real price.
          <br className="hidden sm:block" /> A real launch date. Right now.
        </h1>
        <p className="mt-7 max-w-2xl text-lg text-ink-500 sm:text-xl">
          Slide and toggle to describe what you want built. The price and launch date update live. No &ldquo;contact us for pricing.&rdquo; No sales call required to find out if I&rsquo;m in your budget. Real numbers; you can book the intro call already knowing the quote.
        </p>

        <ScopeCalculator />
      </main>
      <SiteFooter />
    </>
  );
}
