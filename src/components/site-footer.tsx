import Link from "next/link";
import { SITE } from "@/lib/site";
import { NewsletterSignup } from "./NewsletterSignup";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-ink-100 bg-paper">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tightest">
              <span className="grid h-7 w-7 place-items-center rounded bg-ink text-paper text-[13px] font-extrabold tnum">
                14
              </span>
              <span>{SITE.brand}</span>
            </Link>
            <p className="max-w-xs text-sm text-ink-500">
              Real platforms, productized. Built by a one-operator studio in {SITE.location}.
            </p>
            <div className="pt-2 max-w-xs">
              <div className="eyebrow mb-2">One email a week</div>
              <NewsletterSignup source="site-footer" variant="minimal" placeholder="hello@you.com" />
            </div>
          </div>

          <div>
            <div className="eyebrow mb-3">Product</div>
            <ul className="space-y-2 text-sm text-ink-500">
              <li><a href="/#sku" className="transition hover:text-ink">Pricing</a></li>
              <li><Link href="/stack" className="transition hover:text-ink">The stack</Link></li>
              <li><Link href="/compare" className="transition hover:text-ink">Compare</Link></li>
              <li><a href="/#how" className="transition hover:text-ink">How it works</a></li>
              <li><Link href="/tools" className="transition hover:text-ink">Free tools</Link></li>
              <li><Link href="/faq" className="transition hover:text-ink">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <div className="eyebrow mb-3">Proof</div>
            <ul className="space-y-2 text-sm text-ink-500">
              <li><Link href="/brands" className="transition hover:text-ink">Brands</Link></li>
              <li><Link href="/builds" className="transition hover:text-ink">Active builds</Link></li>
              <li><Link href="/case-studies/splash-jacks-pools" className="transition hover:text-ink">Splash Jacks</Link></li>
              <li><Link href="/case-studies/casamore" className="transition hover:text-ink">Casamoré</Link></li>
              <li><Link href="/case-studies/buildbridge" className="transition hover:text-ink">Buildbridge</Link></li>
              <li><Link href="/case-studies/hot-flash-co" className="transition hover:text-ink">Hot Flash Co</Link></li>
            </ul>
          </div>

          <div>
            <div className="eyebrow mb-3">Talk</div>
            <ul className="space-y-2 text-sm text-ink-500">
              <li><a href={SITE.bookingUrl} className="transition hover:text-ink">Book intro call</a></li>
              <li><a href={`mailto:${SITE.email}`} className="transition hover:text-ink">{SITE.email}</a></li>
              <li><Link href="/newsletter" className="transition hover:text-ink">Newsletter</Link></li>
              <li><Link href="/press" className="transition hover:text-ink">Press kit</Link></li>
              <li><a href="/api/feed.xml" className="transition hover:text-ink">RSS feed</a></li>
            </ul>
          </div>

          <div>
            <div className="eyebrow mb-3">Company</div>
            <ul className="space-y-2 text-sm text-ink-500">
              <li><Link href="/about" className="transition hover:text-ink">About</Link></li>
              <li><Link href="/privacy" className="transition hover:text-ink">Privacy</Link></li>
              <li><Link href="/terms" className="transition hover:text-ink">Terms</Link></li>
              <li><Link href="/refunds" className="transition hover:text-ink">Refunds</Link></li>
            </ul>
          </div>
        </div>

        <div className="rule mt-12" />

        <div className="mt-6 flex flex-col items-start justify-between gap-3 text-xs font-mono text-ink-400 md:flex-row md:items-center">
          <div>© {new Date().getFullYear()} {SITE.brand} · {SITE.domain}</div>
          <div>Real platforms. Two weeks. Done.</div>
        </div>
      </div>
    </footer>
  );
}
