"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

/**
 * ScopeCalculator — the interactive sliders/toggles + live result panel
 * for /calculator. Extracted from page.tsx so the page shell (header,
 * headline copy, footer) stays server-rendered.
 */

type Feature = {
  id: string;
  label: string;
  description: string;
  cost: number;
  days: number;
  // Hint about which tier this feature usually triggers
  triggers?: "studio" | "platform" | "custom";
};

const FEATURES: Feature[] = [
  { id: "blog", label: "Blog / content section", description: "MDX or CMS-driven blog, RSS feed, OG cards.", cost: 800, days: 1 },
  { id: "form", label: "Lead capture form", description: "Email-delivered, wired to your inbox.", cost: 0, days: 0 },
  { id: "booking", label: "Booking / scheduling", description: "Cal.com or Calendly integration, branded.", cost: 400, days: 1 },
  { id: "newsletter", label: "Newsletter signup", description: "MailerLite, Resend, or your provider.", cost: 200, days: 0 },
  { id: "portal", label: "Customer portal (login)", description: "Auth, user accounts, gated content.", cost: 4500, days: 5, triggers: "platform" },
  { id: "admin", label: "Admin app (you operate)", description: "Internal dashboard for your team.", cost: 5000, days: 6, triggers: "platform" },
  { id: "billing", label: "Stripe billing live", description: "Subscriptions, one-time, escrow if needed.", cost: 2500, days: 3, triggers: "platform" },
  { id: "multitenant", label: "Multi-tenant / marketplace", description: "Multiple brands or two-sided platform.", cost: 8000, days: 10, triggers: "custom" },
  { id: "mobile", label: "Mobile wrapper (Capacitor)", description: "iOS + Android shells of your web app.", cost: 3000, days: 4, triggers: "platform" },
  { id: "ai", label: "AI agent / chatbot", description: "Grounded in your content, brand-voiced.", cost: 1500, days: 2 },
  { id: "analytics", label: "Custom analytics dashboard", description: "Beyond GA4 — your metrics, your view.", cost: 1500, days: 2 },
  { id: "seo", label: "Deep SEO + schema", description: "Programmatic SEO pages, structured data.", cost: 1200, days: 2 },
  { id: "i18n", label: "Multi-language (i18n)", description: "Per-locale content + routing.", cost: 1800, days: 3 },
  { id: "ecom", label: "E-commerce (≤ 100 SKUs)", description: "Stripe-powered store, inventory, checkout.", cost: 3500, days: 4, triggers: "platform" },
];

const TIERS = [
  { name: "Spark", basePrice: 1500, baseDays: 5, maxPages: 1, ops: 49 },
  { name: "Studio", basePrice: 9000, baseDays: 14, maxPages: 6, ops: 149 },
  { name: "Platform", basePrice: 24000, baseDays: 28, maxPages: 20, ops: 299 },
  { name: "Custom", basePrice: 0, baseDays: 0, maxPages: Infinity, ops: 0 },
];

function pickTier(pages: number, features: string[]): typeof TIERS[number] {
  if (features.includes("multitenant")) return TIERS[3]!;
  if (
    features.includes("portal") ||
    features.includes("admin") ||
    features.includes("billing") ||
    features.includes("mobile") ||
    features.includes("ecom") ||
    pages > 6
  ) {
    return TIERS[2]!;
  }
  if (
    pages > 1 ||
    features.includes("blog") ||
    features.includes("booking") ||
    features.includes("ai") ||
    features.includes("seo") ||
    features.includes("i18n") ||
    features.includes("analytics")
  ) {
    return TIERS[1]!;
  }
  return TIERS[0]!;
}

function formatPrice(cents: number): string {
  if (cents === 0) return "Quoted";
  return "$" + cents.toLocaleString();
}

function formatDate(days: number): string {
  const d = new Date();
  // Skip weekends roughly — add 1.4x calendar days for working days
  const calendarDays = Math.ceil(days * 1.4);
  d.setDate(d.getDate() + calendarDays);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function ScopeCalculator() {
  const [pages, setPages] = useState(1);
  const [features, setFeatures] = useState<string[]>([]);
  const [rush, setRush] = useState(false);

  const toggle = (id: string) =>
    setFeatures((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));

  const calc = useMemo(() => {
    const tier = pickTier(pages, features);
    if (tier.name === "Custom") {
      return {
        tier,
        price: 0,
        days: 0,
        ops: 0,
        launchDate: "Quoted in 48h",
        pageAdds: 0,
        featureAdds: 0,
        rushAdd: 0,
      };
    }
    const extraPages = Math.max(0, pages - tier.maxPages);
    const pageAddCost = extraPages * 800;
    const pageAddDays = extraPages * 0.5;
    const featureCost = features.reduce((sum, fid) => sum + (FEATURES.find((f) => f.id === fid)?.cost ?? 0), 0);
    const featureDays = features.reduce((sum, fid) => sum + (FEATURES.find((f) => f.id === fid)?.days ?? 0), 0);
    const subtotal = tier.basePrice + pageAddCost + featureCost;
    const days = tier.baseDays + pageAddDays + featureDays;
    const rushAdd = rush ? Math.round(subtotal * 0.25) : 0;
    const total = subtotal + rushAdd;
    const finalDays = rush ? Math.ceil(days * 0.7) : days;
    return {
      tier,
      price: total,
      days: finalDays,
      ops: tier.ops,
      launchDate: formatDate(finalDays),
      pageAdds: pageAddCost,
      featureAdds: featureCost,
      rushAdd,
    };
  }, [pages, features, rush]);

  return (
    <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_0.8fr]">
      {/* Controls */}
      <div className="space-y-10">
        {/* Pages */}
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="pages" className="font-mono text-[11px] uppercase tracking-[0.18em] text-warm-gray-500">
              Pages
            </label>
            <span className="text-2xl font-extrabold text-ink tnum">{pages}</span>
          </div>
          <input
            id="pages"
            type="range"
            min={1}
            max={20}
            value={pages}
            onChange={(e) => setPages(Number(e.target.value))}
            className="mt-3 w-full accent-ember-500"
          />
          <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-warm-gray-400">
            <span>1 page</span>
            <span>5 pages</span>
            <span>10</span>
            <span>20+</span>
          </div>
        </div>

        {/* Features */}
        <div>
          <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-warm-gray-500">
            Features ({features.length} selected)
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {FEATURES.map((f) => {
              const on = features.includes(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggle(f.id)}
                  className={
                    "flex flex-col rounded-xl border p-4 text-left transition-colors duration-150 " +
                    (on
                      ? "border-ember-500 bg-ember-50"
                      : "border-warm-gray-200 bg-paper-cream hover:border-warm-gray-300")
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-ink">{f.label}</span>
                    <span
                      className={
                        "h-4 w-4 rounded-full border-2 " + (on ? "border-ember-500 bg-ember-500" : "border-warm-gray-300")
                      }
                    />
                  </div>
                  <p className="mt-1.5 text-[13px] leading-[1.5] text-ink-500">{f.description}</p>
                  <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-warm-gray-400">
                    +{f.cost > 0 ? "$" + f.cost.toLocaleString() : "incl."} · +{f.days}d
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Rush */}
        <div>
          <button
            type="button"
            onClick={() => setRush((r) => !r)}
            className={
              "flex w-full items-center justify-between rounded-xl border p-4 transition-colors duration-150 " +
              (rush
                ? "border-ember-500 bg-ember-50"
                : "border-warm-gray-200 bg-paper-cream hover:border-warm-gray-300")
            }
          >
            <div className="text-left">
              <div className="font-bold text-ink">Rush (+25%, 30% faster)</div>
              <p className="mt-1 text-[13px] text-ink-500">
                I drop everything else and ship yours first. One rush slot per month.
              </p>
            </div>
            <span
              className={
                "h-5 w-5 shrink-0 rounded-full border-2 " + (rush ? "border-ember-500 bg-ember-500" : "border-warm-gray-300")
              }
            />
          </button>
        </div>
      </div>

      {/* Result panel */}
      <aside className="lg:sticky lg:top-8 lg:self-start">
        <div className="rounded-2xl border-2 border-ember-500 bg-paper-cream p-7">
          <div className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-ember-600">
            {calc.tier.name} tier
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-[56px] font-extrabold leading-none tracking-tightest text-ink tnum">
              {formatPrice(calc.price)}
            </span>
          </div>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-warm-gray-500">
            {calc.tier.name === "Custom"
              ? "Multi-tenant or marketplace — quoted in 48h."
              : `Shipped by ${calc.launchDate}`}
          </p>

          {calc.tier.name !== "Custom" ? (
            <>
              <div className="mt-6 space-y-2 text-[13px] leading-[1.5] text-ink-500">
                <div className="flex justify-between">
                  <span>Base ({calc.tier.name} tier)</span>
                  <span className="tnum">${calc.tier.basePrice.toLocaleString()}</span>
                </div>
                {calc.pageAdds > 0 ? (
                  <div className="flex justify-between">
                    <span>Extra pages</span>
                    <span className="tnum">+${calc.pageAdds.toLocaleString()}</span>
                  </div>
                ) : null}
                {calc.featureAdds > 0 ? (
                  <div className="flex justify-between">
                    <span>Features ({features.length})</span>
                    <span className="tnum">+${calc.featureAdds.toLocaleString()}</span>
                  </div>
                ) : null}
                {calc.rushAdd > 0 ? (
                  <div className="flex justify-between text-ember-600">
                    <span>Rush (25%)</span>
                    <span className="tnum">+${calc.rushAdd.toLocaleString()}</span>
                  </div>
                ) : null}
              </div>

              <div className="mt-5 border-t border-warm-gray-200 pt-4 text-[13px] text-ink-500">
                <div className="flex justify-between">
                  <span>Plus ongoing</span>
                  <span className="font-bold text-ink tnum">${calc.ops}/mo</span>
                </div>
                <p className="mt-1 text-[12px] text-warm-gray-500">
                  Hosting + monitoring + monthly metrics on Day14 OS.
                </p>
              </div>
            </>
          ) : (
            <p className="mt-6 text-[13px] leading-[1.6] text-ink-500">
              Multi-tenant and marketplace work needs a real conversation. Tell me what you want built on the intro call and I&rsquo;ll come back with a fixed quote in 48 hours.
            </p>
          )}

          <div className="mt-7 flex flex-col gap-2">
            <Link href="/#book" className="btn-ember text-center">
              Book a 15-min intro call
            </Link>
            <Link href="/capabilities" className="btn-ghost text-center">
              See what&rsquo;s included
            </Link>
          </div>
        </div>

        <p className="mt-4 max-w-sm text-center text-[12px] leading-[1.55] text-warm-gray-500">
          Real numbers, not a teaser. The intro call confirms scope and I send the fixed quote in 48 hours.
        </p>
      </aside>
    </div>
  );
}
