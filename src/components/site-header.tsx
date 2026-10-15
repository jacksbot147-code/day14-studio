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

        <nav className="hidden items-center gap-7 text-sm font-medium text-ink-500 sm:flex">
          <Link href="/platform" className="transition-colors duration-150 hover:text-ink">Platform</Link>
          <Link href="/#work" className="transition-colors duration-150 hover:text-ink">Work</Link>
          <Link href="/pricing" className="transition-colors duration-150 hover:text-ink">Pricing</Link>
          <Link href="/geo" className="transition-colors duration-150 hover:text-ink">GEO</Link>
        </nav>

        <Link href="/book" className="btn-ember text-[13px]">
          Book
        </Link>
      </div>
    </header>
  );
}
