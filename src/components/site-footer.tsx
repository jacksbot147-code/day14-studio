import Link from "next/link";
import { SITE } from "@/lib/site";
import { NewsletterSignup } from "./NewsletterSignup";

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
              The build studio that runs on its own OS. Custom sites and apps from {SITE.location}, shipped in days &mdash; from $750.
            </p>
            <div className="pt-2 max-w-xs">
              <div className="eyebrow mb-2">One email a week</div>
              <NewsletterSignup source="site-footer" variant="minimal" placeholder="hello@you.com" />
            </div>
          </div>

          <div>
            <div className="eyebrow mb-3">Product</div>
            <ul className="space-y-2 text-sm text-ink-500">
              <li><a href="/#pricing" className="transition-colors duration-150 hover:text-ink">Pricing</a></li>
              <li><Link href="/calculator" className="transition-colors duration-150 hover:text-ink">Scope calculator</Link></li>
              <li><Link href="/capabilities" className="transition-colors duration-150 hover:text-ink">Capabilities</Link></li>
              <li><Link href="/process" className="transition-colors duration-150 hover:text-ink">The 14-day process</Link></li>
              <li><Link href="/voice-check" className="transition-colors duration-150 hover:text-ink">Voice checker</Link></li>
              <li><Link href="/changelog" className="transition-colors duration-150 hover:text-ink">Changelog</Link></li>
              <li><Link href="/honest" className="transition-colors duration-150 hover:text-ink">Honest objections</Link></li>
              <li><Link href="/stack" className="transition-colors duration-150 hover:text-ink">The stack</Link></li>
              <li><Link href="/compare" className="transition-colors duration-150 hover:text-ink">Compare</Link></li>
              <li><a href="/#how" className="transition-colors duration-150 hover:text-ink">How it works</a></li>
              <li><Link href="/tools" className="transition-colors duration-150 hover:text-ink">Free tools</Link></li>
              <li><Link href="/faq" className="transition-colors duration-150 hover:text-ink">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <div className="eyebrow mb-3">Proof</div>
            <ul className="space-y-2 text-sm text-ink-500">
              <li><Link href="/status" className="transition-colors duration-150 hover:text-ink">Status</Link></li>
              <li><Link href="/brands" className="transition-colors duration-150 hover:text-ink">Brands</Link></li>
              <li><Link href="/builds" className="transition-colors duration-150 hover:text-ink">Active builds</Link></li>
              <li><Link href="/case-studies/alignmd" className="transition-colors duration-150 hover:text-ink">AlignMD</Link></li>
              <li><Link href="/case-studies/splash-jacks-pools" className="transition-colors duration-150 hover:text-ink">Splash Jacks</Link></li>
              <li><Link href="/case-studies/casamore" className="transition-colors duration-150 hover:text-ink">Casamoré</Link></li>
              <li><Link href="/case-studies/buildbridge" className="transition-colors duration-150 hover:text-ink">Buildbridge</Link></li>
              <li><Link href="/case-studies/hot-flash-co" className="transition-colors duration-150 hover:text-ink">Hot Flash Co</Link></li>
            </ul>
          </div>

          <div>
            <div className="eyebrow mb-3">Talk</div>
            <ul className="space-y-2 text-sm text-ink-500">
              <li><a href={SITE.bookingUrl} className="transition-colors duration-150 hover:text-ink">Book intro call</a></li>
              <li><a href={`mailto:${SITE.email}`} className="transition-colors duration-150 hover:text-ink">{SITE.email}</a></li>
              <li><Link href="/newsletter" className="transition-colors duration-150 hover:text-ink">Newsletter</Link></li>
              <li><Link href="/press" className="transition-colors duration-150 hover:text-ink">Press kit</Link></li>
              <li><a href="/api/feed.xml" className="transition-colors duration-150 hover:text-ink">RSS feed</a></li>
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
          <div>Built in days. Operated forever. From $750.</div>
        </div>
      </div>
    </footer>
  );
}
