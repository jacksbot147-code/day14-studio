import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { RequestedPath } from "@/components/requested-path";

export const metadata: Metadata = {
  title: "Page not found",
  description:
    "We didn't build this one. Here's what's actually live on Day14.",
  robots: { index: false, follow: true },
};

/**
 * Custom 404 — on-brand failure state.
 *
 * Brand-animator personality move ("Custom 404 with personality"): cream
 * paper surface, one big ember numeral, plain-English copy, a single ember
 * CTA, and a quiet monospace path line. Fully SSR-rendered; no client JS is
 * required for the page to render or for navigation to work.
 */

const LINKS: Array<{ href: string; label: string }> = [
  { href: "/", label: "Home" },
  { href: "/work-with-us", label: "Work with us" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/case-studies/alignmd", label: "AlignMD case study" },
  { href: "/process", label: "How we ship" },
  { href: "/status", label: "Live status" },
];

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="container-page flex min-h-[70vh] flex-col items-start justify-center py-24">
        <div className="eyebrow mb-6">Error 404</div>

        <div className="text-[88px] font-extrabold leading-none tracking-tightest text-ember-500 sm:text-[140px]">
          404
        </div>

        <h1 className="mt-4 text-[34px] font-extrabold leading-[1.05] tracking-tightest text-ink sm:text-[48px]">
          Page not found.
        </h1>

        <p className="mt-6 max-w-xl text-lg text-ink-500">
          We didn&rsquo;t build this one. (Yet.) Try one of these instead:
        </p>

        <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group flex items-center justify-between rounded-sm border border-ink-100 bg-paper-50 px-4 py-3 text-sm font-semibold text-ink transition-colors duration-150 ease-out hover:border-ink"
            >
              {l.label}
              <span className="font-mono text-ink-300 transition-colors group-hover:text-ember-600">
                →
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-10">
          <Link href="/" className="btn-ember">
            ← Back to home
          </Link>
        </div>

        <RequestedPath />
      </main>
      <SiteFooter />
    </>
  );
}
