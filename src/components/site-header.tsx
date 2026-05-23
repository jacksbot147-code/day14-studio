import Link from "next/link";
import { SITE } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-paper/85 backdrop-blur-md supports-[backdrop-filter]:bg-paper/65">
      <div className="container-page flex h-16 items-center justify-between">
        <Link
          href="/"
          className="group flex items-center gap-2.5 font-semibold tracking-tightest"
        >
          <span className="grid h-8 w-8 place-items-center rounded-sm bg-ink text-paper text-[13px] font-extrabold tnum transition-transform duration-150 group-hover:-rotate-3">
            14
          </span>
          <span className="text-[15px]">{SITE.brand}</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-ink-500 lg:flex">
          <a href="/#sku" className="transition-colors duration-150 hover:text-ink">Pricing</a>
          <Link href="/stack" className="transition-colors duration-150 hover:text-ink">Stack</Link>
          <Link href="/compare" className="transition-colors duration-150 hover:text-ink">Compare</Link>
          <Link href="/builds" className="transition-colors duration-150 hover:text-ink">Build log</Link>
          <a href="/#case-studies" className="transition-colors duration-150 hover:text-ink">Work</a>
          <Link href="/newsletter" className="transition-colors duration-150 hover:text-ink">Newsletter</Link>
          <Link href="/about" className="transition-colors duration-150 hover:text-ink">About</Link>
        </nav>
        <nav className="hidden items-center gap-6 text-sm font-medium text-ink-500 sm:flex lg:hidden">
          <a href="/#sku" className="transition-colors duration-150 hover:text-ink">Pricing</a>
          <Link href="/stack" className="transition-colors duration-150 hover:text-ink">Stack</Link>
          <Link href="/builds" className="transition-colors duration-150 hover:text-ink">Builds</Link>
          <Link href="/about" className="transition-colors duration-150 hover:text-ink">About</Link>
        </nav>

        <a href={SITE.bookingUrl} className="btn-ember text-[13px]">
          Book intro call
        </a>
      </div>
    </header>
  );
}
