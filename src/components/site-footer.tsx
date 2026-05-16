import Link from "next/link";
import { SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-ink-100 bg-paper">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
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
          </div>

          <div>
            <div className="eyebrow mb-3">Product</div>
            <ul className="space-y-2 text-sm text-ink-500">
              <li><a href="/#sku" className="transition hover:text-ink">Site</a></li>
              <li><a href="/#sku" className="transition hover:text-ink">Portal</a></li>
              <li><a href="/#sku" className="transition hover:text-ink">Platform</a></li>
              <li><a href="/#how" className="transition hover:text-ink">How it works</a></li>
            </ul>
          </div>

          <div>
            <div className="eyebrow mb-3">Proof</div>
            <ul className="space-y-2 text-sm text-ink-500">
              <li>
                <Link href="/case-studies/splash-jacks-pools" className="transition hover:text-ink">
                  Splash Jacks Pools
                </Link>
              </li>
              <li><a href="/#faq" className="transition hover:text-ink">FAQ</a></li>
            </ul>
          </div>

          <div>
            <div className="eyebrow mb-3">Talk</div>
            <ul className="space-y-2 text-sm text-ink-500">
              <li>
                <a href={SITE.bookingUrl} className="transition hover:text-ink">
                  Book intro call
                </a>
              </li>
              <li>
                <a href={`mailto:${SITE.email}`} className="transition hover:text-ink">
                  {SITE.email}
                </a>
              </li>
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
