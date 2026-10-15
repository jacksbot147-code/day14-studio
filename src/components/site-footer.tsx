import Link from "next/link";
import { SITE, STARTING_PRICE_LABEL } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-100 bg-paper">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tightest">
              <span className="grid h-7 w-7 place-items-center rounded-sm bg-ink text-paper text-[13px] font-extrabold tnum">
                14
              </span>
              <span>{SITE.brand}</span>
            </Link>
            <p className="max-w-xs text-sm text-ink-500">
              Software that runs a local service business, live in 14 days. From {STARTING_PRICE_LABEL}. {SITE.location}.
            </p>
          </div>

          <div>
            <div className="eyebrow mb-3">Product</div>
            <ul className="space-y-2 text-sm text-ink-500">
              <li><Link href="/platform" className="transition-colors duration-150 hover:text-ink">Platform</Link></li>
              <li><Link href="/pricing" className="transition-colors duration-150 hover:text-ink">Pricing</Link></li>
              <li><Link href="/geo" className="transition-colors duration-150 hover:text-ink">GEO</Link></li>
              <li><Link href="/calculator" className="transition-colors duration-150 hover:text-ink">ROI calculator</Link></li>
              <li><Link href="/faq" className="transition-colors duration-150 hover:text-ink">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <div className="eyebrow mb-3">Proof</div>
            <ul className="space-y-2 text-sm text-ink-500">
              <li><Link href="/#work" className="transition-colors duration-150 hover:text-ink">Work</Link></li>
              <li><Link href="/case-studies/splash-jacks-pools" className="transition-colors duration-150 hover:text-ink">Splash Jacks Pools</Link></li>
              <li><Link href="/case-studies/alignmd" className="transition-colors duration-150 hover:text-ink">AlignMD</Link></li>
              <li><a href="https://ad-forge-amber.vercel.app" className="transition-colors duration-150 hover:text-ink">Marque / AdForge</a></li>
            </ul>
          </div>

          <div>
            <div className="eyebrow mb-3">Talk</div>
            <ul className="space-y-2 text-sm text-ink-500">
              <li><Link href="/book" className="transition-colors duration-150 hover:text-ink">Book a call</Link></li>
              <li><a href={`mailto:${SITE.email}`} className="transition-colors duration-150 hover:text-ink">{SITE.email}</a></li>
            </ul>
          </div>

          <div>
            <div className="eyebrow mb-3">Company</div>
            <ul className="space-y-2 text-sm text-ink-500">
              <li><Link href="/about" className="transition-colors duration-150 hover:text-ink">About</Link></li>
              <li><Link href="/privacy" className="transition-colors duration-150 hover:text-ink">Privacy</Link></li>
              <li><Link href="/terms" className="transition-colors duration-150 hover:text-ink">Terms</Link></li>
              <li><Link href="/refunds" className="transition-colors duration-150 hover:text-ink">Refunds</Link></li>
            </ul>
          </div>
        </div>

        <div className="rule mt-12" />

        <div className="mt-6 flex flex-col items-start justify-between gap-3 text-xs font-mono text-ink-400 md:flex-row md:items-center">
          <div>© {new Date().getFullYear()} {SITE.brand} · {SITE.domain}</div>
          <div>Built in days. Operated forever. From {STARTING_PRICE_LABEL}.</div>
        </div>
      </div>
    </footer>
  );
}
