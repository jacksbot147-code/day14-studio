import Link from "next/link";
import { SITE } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-100/80 bg-paper/85 backdrop-blur supports-[backdrop-filter]:bg-paper/70">
      <div className="container-page flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tightest">
          <span className="grid h-7 w-7 place-items-center rounded bg-ink text-paper text-[13px] font-extrabold tnum">
            14
          </span>
          <span className="text-[15px]">{SITE.brand}</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-ink-500 sm:flex">
          <a href="/#verticals" className="transition hover:text-ink">Verticals</a>
          <a href="/#sku" className="transition hover:text-ink">Pricing</a>
          <Link href="/compare" className="transition hover:text-ink">Compare</Link>
          <a href="/#how" className="transition hover:text-ink">How it works</a>
          <a href="/#case-studies" className="transition hover:text-ink">Work</a>
          <Link href="/builds" className="transition hover:text-ink">Build log</Link>
          <Link href="/about" className="transition hover:text-ink">About</Link>
        </nav>

        <a href={SITE.bookingUrl} className="btn-ember text-[13px]">
          Book intro call
        </a>
      </div>
    </header>
  );
}
