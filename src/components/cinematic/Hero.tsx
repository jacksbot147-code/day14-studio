"use client";

/**
 * cinematic/Hero — the above-the-fold + the "build it yourself" moment.
 *
 * Two parts, one shared client component (so the headline and the dashboard
 * morph together):
 *   1. The hero header — status pill, line-by-line headline with a business-type
 *      word-cycle, lead copy, the "build your site" input row, and a scroll cue.
 *      Scroll-tell: the header dissolves + lifts as you scroll (first viewport).
 *   2. The buildout — an admin-dashboard panel that ASSEMBLES (frame slides up,
 *      tiles snap in staggered) the first time it scrolls into view.
 *
 * The wow: type a business name + trade + city and hit "Build it" — the headline
 * rewrites to "Meet {Business}" and the dashboard relabels itself around the
 * operator. The page builds itself in front of them, which is literally what
 * Day14 does.
 *
 * CLS-safe word-cycle (single inline-grid cell). Reduced-motion: everything
 * resolves instantly (see cinematic.css guards). The single <h1> lives here.
 */

import { useEffect, useRef, useState, type FormEvent } from "react";
import { prefersReducedMotion } from "./motion";
import { encodePreview } from "@/lib/preview";

const WORDS = [
  "pool route",
  "lawn crew",
  "cleaning company",
  "HVAC shop",
  "salon",
  "restaurant",
];

interface Trade {
  value: string;
  label: string;
  noun: string;
}

const TRADES: readonly Trade[] = [
  { value: "pool route", label: "Pool service", noun: "Pool" },
  { value: "lawn crew", label: "Lawn / landscaping", noun: "Lawn" },
  { value: "pressure-wash crew", label: "Pressure washing", noun: "Pressure washing" },
  { value: "handyman shop", label: "Handyman", noun: "Handyman" },
  { value: "detailing crew", label: "Mobile detailing", noun: "Detailing" },
  { value: "service business", label: "Other / another trade", noun: "Service" },
];

const titleCase = (s: string) =>
  s.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1));

export function Hero() {
  const [active, setActive] = useState(0);
  const [built, setBuilt] = useState(false);
  const [name, setName] = useState("");
  const [trade, setTrade] = useState(TRADES[0]!.value);
  const [city, setCity] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const buildoutRef = useRef<HTMLDivElement>(null);

  // Word-cycle — stops once the visitor has "built" their site.
  useEffect(() => {
    if (prefersReducedMotion() || built) return;
    const id = window.setInterval(
      () => setActive((i) => (i + 1) % WORDS.length),
      2400,
    );
    return () => window.clearInterval(id);
  }, [built]);

  // Scroll-tell parallax + dissolve (hero header only, first viewport).
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const hero = document.getElementById("cin-hero");
    if (!hero) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < window.innerHeight) {
          hero.style.opacity = String(1 - (y / window.innerHeight) * 1.1);
          hero.style.transform = `translateY(${y * 0.16}px) scale(${
            1 + (y / window.innerHeight) * 0.04
          })`;
        }
        raf = 0;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Buildout assembly — frame slides up, tiles snap in staggered, on scroll-in.
  useEffect(() => {
    const node = buildoutRef.current;
    if (!node) return;
    const card = node.querySelector(".cin-bo-card");
    const panels = Array.from(node.querySelectorAll<HTMLElement>(".cin-bo-panel"));
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      card?.classList.add("in");
      panels.forEach((p) => p.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          card?.classList.add("in");
          panels.forEach((p, i) =>
            window.setTimeout(() => p.classList.add("in"), 160 + i * 150),
          );
        }
      },
      { threshold: 0.3 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  const biz = name.trim() ? titleCase(name.trim()) : "";
  const cityLabel = city.trim() ? titleCase(city.trim()) : "your area";

  function build(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setPreviewUrl(
      `/preview/${encodePreview({ name: name.trim(), trade, city: city.trim() })}`,
    );
    setBuilt(true);
  }

  const dashTitle = built ? `${biz.toLowerCase()} · admin` : "your business · admin";
  const bookingName = built ? `${biz} — new job` : "New request";
  const jobA = built ? `Mon · ${trade}` : "Mon · route 1";
  const jobB = built ? `Tue · ${trade}` : "Tue · route 2";
  const asstQ = built ? `"Hey ${biz}, this Friday?"` : `"Can you come Friday?"`;

  return (
    <>
      <header id="cin-hero" className="cin-hero">
        <div className="cin-status">
          <span className="cin-dot" aria-hidden="true" />
          <span style={{ fontFamily: "var(--cin-font-mono)" }}>
            one platform · any service business · built by an operator
          </span>
        </div>

        <h1
          key={built ? "h1-built" : "h1-default"}
          className={built ? "cin-h1-built" : undefined}
        >
          {built ? (
            <>
              <span className="cin-ln">
                <span>Meet</span>
              </span>
              <span className="cin-ln">
                <span>{biz}.</span>
              </span>
              <span className="cin-ln">
                <span>Booked solid in {cityLabel}.</span>
              </span>
            </>
          ) : (
            <>
              <span className="cin-ln">
                <span>The system that runs</span>
              </span>
              <span className="cin-ln">
                <span>
                  your{" "}
                  <span className="cin-cycle" aria-hidden="true">
                    {WORDS.map((w, i) => (
                      <span
                        key={w}
                        className={i === active ? "cin-cycle-active" : undefined}
                      >
                        {w}
                      </span>
                    ))}
                  </span>
                  <span className="cin-sr-only">service</span>
                </span>
              </span>
              <span className="cin-ln">
                <span>business.</span>
              </span>
            </>
          )}
        </h1>

        <p>
          {built ? (
            <>
              Your site, your booking, your back office — assembled in seconds.{" "}
              <em>{biz}</em> could be live in 14 days.
            </>
          ) : (
            <>
              Site, online booking, customer portal, payments, and a back office
              that runs itself. Type your business and watch it assemble around
              you.
            </>
          )}
        </p>

        <form className="cin-build" onSubmit={build}>
          <div className="cin-build-console">
            <div className="cin-seg">
              <label htmlFor="cin-b-name">Business</label>
              <input
                id="cin-b-name"
                placeholder="Sunny Pools"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="cin-seg">
              <label htmlFor="cin-b-trade">Trade</label>
              <select
                id="cin-b-trade"
                value={trade}
                onChange={(e) => setTrade(e.target.value)}
              >
                {TRADES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="cin-seg">
              <label htmlFor="cin-b-city">City</label>
              <input
                id="cin-b-city"
                placeholder="Naples"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                autoComplete="off"
              />
            </div>
            <button type="submit" className="cin-seg-go" data-cta="build_hero">
              Build it →
            </button>
          </div>
          <div className="cin-build-hint">
            {built && previewUrl ? (
              <>
                Your preview is live.{" "}
                <a href={previewUrl} data-cta="open_preview">
                  Open your full site preview →
                </a>
              </>
            ) : (
              <>
                Type your business — the page rebuilds around it.{" "}
                <a href="#book" data-cta="book_hero">
                  or see it run →
                </a>
              </>
            )}
          </div>
        </form>

      </header>

      <section
        className="cin-buildout"
        ref={buildoutRef}
        aria-label="Live admin preview"
      >
        <div className="cin-bo-card">
          <div className="cin-bo-bar">
            <span className="cin-bo-tl" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="cin-bo-title" aria-live="polite">
              {dashTitle}
            </span>
            <span className="cin-bo-live">
              <span className="cin-dot" aria-hidden="true" /> live
            </span>
          </div>
          <div className="cin-bo-grid">
            <div className="cin-bo-panel">
              <div className="cin-bo-hd">booking</div>
              <div className="cin-bo-line acc" />
              <div className="cin-bo-line" style={{ width: "82%" }} />
              <div className="cin-bo-line" style={{ width: "64%" }} />
              <div className="cin-bo-row">
                <span>{bookingName}</span>
                <span className="cin-bo-pill g">booked</span>
              </div>
            </div>
            <div className="cin-bo-panel">
              <div className="cin-bo-hd">job board</div>
              <div className="cin-bo-row">
                <span>{jobA}</span>
                <span className="cin-bo-pill g">done</span>
              </div>
              <div className="cin-bo-row">
                <span>{jobB}</span>
                <span className="cin-bo-pill">queued</span>
              </div>
              <div className="cin-bo-row">
                <span>Wed · service call</span>
                <span className="cin-bo-pill">queued</span>
              </div>
            </div>
            <div className="cin-bo-panel">
              <div className="cin-bo-hd">revenue</div>
              <svg viewBox="0 0 320 54" preserveAspectRatio="none" aria-hidden="true">
                <polyline
                  fill="none"
                  stroke="var(--cin-accent)"
                  strokeWidth="2"
                  points="0,46 50,40 100,42 150,26 200,30 260,14 320,8"
                />
              </svg>
              <div className="cin-bo-row">
                <span>this month</span>
                <span className="cin-bo-pill">+24%</span>
              </div>
            </div>
            <div className="cin-bo-panel">
              <div className="cin-bo-hd">assistant</div>
              <div className="cin-bo-line" style={{ width: "90%" }} />
              <div className="cin-bo-line acc" style={{ width: "52%" }} />
              <div className="cin-bo-row">
                <span>{asstQ}</span>
                <span className="cin-bo-pill g">replied</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default Hero;
