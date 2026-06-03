"use client";

/**
 * VideoHero — Package A: the hero that's a video.
 *
 * Three wow moves stacked into one component:
 *
 *   1. Four vignettes that loop every 12s (ADMIN → INBOX → DEPLOYS → ORBIT).
 *      Each vignette is a faked-live screenshot of a piece of the Day14 OS
 *      rendered in pure HTML/CSS. AnimatePresence cross-fades between them.
 *      The right column feels like a looping product demo reel, not a static
 *      screenshot — the "video hero" Jack asked for.
 *
 *   2. Particles orbiting the headline that react to mouse. 14 ember dots
 *      drift in slow elliptical orbits around the headline. The whole
 *      particle group counter-parallaxes the cursor (mouse-right → particles
 *      drift left by ~12px) with spring damping, so it feels alive without
 *      being twitchy.
 *
 *   3. Breathing ember gradient on the "operating system" text — slow 6s
 *      loop that shifts the gradient position, giving the text a quiet glow
 *      cycle. Subtle. The kind of thing you don't notice consciously but
 *      makes the page feel premium.
 *
 * Reduced motion: vignettes hold on ADMIN (no cycling). Particles freeze
 * at starting positions. Gradient holds at mid-cycle. Hero still reads
 * clearly — no information lost.
 *
 * SSR-safe: server renders the ADMIN vignette + static particle positions
 * + breathing text at frame 0. Client takes over for cycling + parallax.
 *
 * No new dependencies. framer-motion only.
 */

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

// ---------- vignettes (each = one frame of the looping "demo reel") ----

const VIGNETTE_DURATION_MS = 4500;
const VIGNETTE_CROSSFADE_MS = 700;

type VignetteName = "admin" | "inbox" | "deploys" | "orbit";
const VIGNETTE_ORDER: VignetteName[] = ["admin", "inbox", "deploys", "orbit"];

const TENANTS_VIGNETTE = [
  { slug: "day14",            label: "day14",         color: "#ef6c33", status: "OK"     },
  { slug: "alignmd",          label: "alignmd",       color: "#3b82f6", status: "OK"     },
  { slug: "life-loophole",    label: "life-loophole", color: "#ca8a04", status: "OK"     },
  { slug: "day14-realty",     label: "day14-realty",  color: "#14805a", status: "PAUSED" },
  { slug: "hot-flash-co",     label: "hot-flash-co",  color: "#f472b6", status: "PARKED" },
  { slug: "kennum-lawn-care", label: "kennum",        color: "#65a30d", status: "PARKED" },
];

// ---------- particles --------------------------------------------------

const PARTICLE_COUNT = 14;

interface Particle {
  baseX: number;   // px from container center
  baseY: number;
  radius: number;  // orbit radius
  speed: number;   // radians per second
  phase: number;   // starting angle
  size: number;
}

// Deterministic — seeded so server + client match (no hydration jump).
function makeParticles(): Particle[] {
  let seed = 9001;
  const rng = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const out: Particle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    out.push({
      baseX: (rng() - 0.5) * 480,
      baseY: (rng() - 0.5) * 280,
      radius: 14 + rng() * 36,
      speed: 0.15 + rng() * 0.35,
      phase: rng() * Math.PI * 2,
      size: 2.5 + rng() * 3.5,
    });
  }
  return out;
}

const PARTICLES = makeParticles();

// ---------- component --------------------------------------------------

export function VideoHero({ cta }: { cta?: ReactNode }) {
  const reduce = useReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Vignette cycling — index into VIGNETTE_ORDER.
  const [vignetteIdx, setVignetteIdx] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      setVignetteIdx((i) => (i + 1) % VIGNETTE_ORDER.length);
    }, VIGNETTE_DURATION_MS);
    return () => window.clearInterval(id);
  }, [reduce]);
  const currentVignette = VIGNETTE_ORDER[vignetteIdx]!;

  // Mouse parallax — particles drift opposite the cursor by up to ±12px.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 90, damping: 16, mass: 0.5 });
  const sy = useSpring(my, { stiffness: 90, damping: 16, mass: 0.5 });
  const particleShiftX = useTransform(sx, [-1, 1], [12, -12]);
  const particleShiftY = useTransform(sy, [-1, 1], [12, -12]);

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduce) return;
    const node = containerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    mx.set(((e.clientX - rect.left) / rect.width) * 2 - 1);
    my.set(((e.clientY - rect.top) / rect.height) * 2 - 1);
  }
  function onPointerLeave() {
    mx.set(0);
    my.set(0);
  }

  // Particle animation tick — drives a numeric `t` (seconds) on a rAF loop
  // so each particle's orbital position can be derived as
  // (baseX + radius*cos(phase + speed*t), baseY + radius*sin(...))
  const [t, setT] = useState(0);
  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    let start = performance.now();
    const tick = (now: number) => {
      setT((now - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  return (
    <div
      ref={containerRef}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={{ position: "relative", width: "100%" }}
    >
      <div
        className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16 xl:gap-20"
        style={{ position: "relative" }}
      >
        {/* ------- LEFT: headline + particles ------- */}
        <div style={{ position: "relative" }}>
          {/* Eyebrow — urgency anchor. The pulsing ember dot sells "now booking"
              as a live capacity signal, not a static label. */}
          <div className="eyebrow mb-8 inline-flex items-center gap-2.5">
            <motion.span
              className="inline-block h-1.5 w-1.5 rounded-full bg-ember-500"
              animate={reduce ? undefined : { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={reduce ? undefined : { duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <span>Build studio · running on Day14 OS</span>
          </div>

          {/* Particles — absolutely positioned behind the headline */}
          <motion.div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: 0,
              x: reduce ? 0 : particleShiftX,
              y: reduce ? 0 : particleShiftY,
            }}
          >
            <svg
              viewBox="-300 -200 600 400"
              preserveAspectRatio="none"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
            >
              {PARTICLES.map((p, i) => {
                const a = p.phase + p.speed * t;
                const x = p.baseX + p.radius * Math.cos(a);
                const y = p.baseY + p.radius * Math.sin(a);
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={p.size}
                    fill="#ef6c33"
                    opacity={0.45}
                  />
                );
              })}
            </svg>
          </motion.div>

          {/* Headline — build studio positioning. Three short escalating
              phrases. The closing "our OS" gets the breathing ember gradient
              treatment so the differentiator is the loudest pixel on screen. */}
          <h1
            className="relative max-w-2xl text-[2.875rem] font-extrabold leading-[0.95] tracking-tightest text-ink sm:text-[64px] lg:text-[84px] xl:text-[96px]"
            style={{ position: "relative", zIndex: 1 }}
          >
            <span className="hero-phrase" style={{ animationDelay: "0ms" }}>
              Build it in 14 days.
            </span>
            <br />{" "}
            <span className="hero-phrase" style={{ animationDelay: "140ms" }}>
              Run it on{" "}
              <span
                style={{
                  background:
                    "linear-gradient(90deg, #ef6c33 0%, #ff8a4c 25%, #ff5c28 50%, #ff8a4c 75%, #ef6c33 100%)",
                  backgroundSize: "200% 100%",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  animation: reduce
                    ? undefined
                    : "vh-breathe 6s ease-in-out infinite",
                  display: "inline-block",
                }}
              >
                our OS
              </span>
              .
            </span>
            <br />{" "}
            <span className="hero-phrase" style={{ animationDelay: "280ms" }}>
              Stop hiring agencies.
            </span>
          </h1>

          <p
            className="relative mt-10 max-w-xl text-lg text-ink-500 sm:mt-12 sm:text-xl lg:leading-[1.4]"
            style={{ position: "relative", zIndex: 1 }}
          >
            Day14 is a build studio with its own operating system &mdash; Day14 OS &mdash; already running six of our own businesses. We build your site or platform in 14 days, then $299/mo keeps it shipping forever. <span className="font-semibold text-ink">Now booking 3 builds for July.</span>
          </p>

          {cta && (
            <div className="relative mt-10 sm:mt-12" style={{ position: "relative", zIndex: 1 }}>
              {cta}
            </div>
          )}
        </div>

        {/* ------- RIGHT: looping vignette reel ------- */}
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "1 / 1",
            maxWidth: 580,
            margin: "0 auto",
            borderRadius: 20,
            overflow: "hidden",
            background:
              "radial-gradient(120% 100% at 50% 50%, #0d1424 0%, #060912 60%, #03060c 100%)",
            boxShadow:
              "0 50px 120px -40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.05)",
            fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          }}
        >
          {/* Reel chrome */}
          <div
            style={{
              position: "absolute",
              top: 14,
              left: 18,
              right: 18,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              zIndex: 5,
              pointerEvents: "none",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.20em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.40)",
            }}
          >
            <span>
              <span style={{ color: "#fb923c" }}>●</span> {labelFor(currentVignette)}
            </span>
            <span>{vignetteIdx + 1} / {VIGNETTE_ORDER.length}</span>
          </div>

          {/* Vignettes */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentVignette}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: VIGNETTE_CROSSFADE_MS / 1000, ease: "easeInOut" }}
              style={{ position: "absolute", inset: 0 }}
            >
              {currentVignette === "admin" && <AdminVignette />}
              {currentVignette === "inbox" && <InboxVignette />}
              {currentVignette === "deploys" && <DeploysVignette />}
              {currentVignette === "orbit" && <OrbitVignette reduce={!!reduce} />}
            </motion.div>
          </AnimatePresence>

          {/* Progress bar at the bottom */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 2,
              background: "rgba(255,255,255,0.05)",
              zIndex: 6,
            }}
          >
            {!reduce && (
              <motion.div
                key={vignetteIdx}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{
                  duration: VIGNETTE_DURATION_MS / 1000,
                  ease: "linear",
                }}
                style={{ height: "100%", background: "#ef6c33" }}
              />
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes vh-breathe {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}

function labelFor(v: VignetteName): string {
  if (v === "admin") return "Admin · live view";
  if (v === "inbox") return "Inbox · 3 to approve";
  if (v === "deploys") return "Deploys · last 24h";
  return "Empire · constellation";
}

// ---------- vignette components ----------------------------------------

function AdminVignette() {
  return (
    <div style={{ position: "absolute", inset: 0, padding: "48px 36px 36px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {TENANTS_VIGNETTE.map((t, i) => (
          <motion.div
            key={t.slug}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 12px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.03)",
              fontSize: 12,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: t.color,
                boxShadow: `0 0 10px ${t.color}80`,
              }}
            />
            <span style={{ color: "#e2e8f0", flex: 1 }}>{t.label}</span>
            <span
              style={{
                fontSize: 8.5,
                fontWeight: 700,
                letterSpacing: "0.10em",
                color:
                  t.status === "OK" ? "#86efac" : t.status === "PAUSED" ? "#fcd34d" : "#94a3b8",
              }}
            >
              {t.status}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function InboxVignette() {
  const items = [
    { tenant: "alignmd",       color: "#3b82f6", title: "Approve clinician dossier — Karen Wong, MD", time: "2m" },
    { tenant: "life-loophole", color: "#ca8a04", title: "Review draft: 'The Roth IRA trade'",          time: "8m" },
    { tenant: "day14",         color: "#ef6c33", title: "Pick hero image for /work-with-us",          time: "14m" },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, padding: "48px 28px 36px", display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((it, i) => (
        <motion.div
          key={it.tenant}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + i * 0.10, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{
            display: "flex",
            gap: 12,
            padding: "14px 14px",
            borderRadius: 10,
            background: i === 0 ? "rgba(239,108,51,0.08)" : "rgba(255,255,255,0.025)",
            border: i === 0 ? "1px solid rgba(239,108,51,0.30)" : "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: it.color,
              marginTop: 5,
              boxShadow: `0 0 8px ${it.color}80`,
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.50)",
              }}
            >
              {it.tenant}
            </div>
            <div
              style={{
                marginTop: 3,
                fontSize: 12.5,
                color: "#e2e8f0",
                lineHeight: 1.35,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {it.title}
            </div>
          </div>
          <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.40)", flexShrink: 0 }}>
            {it.time}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function DeploysVignette() {
  const deploys = [
    { tenant: "day14",         color: "#ef6c33", state: "deployed",  time: "12m ago" },
    { tenant: "alignmd",       color: "#3b82f6", state: "deployed",  time: "1h ago"  },
    { tenant: "life-loophole", color: "#ca8a04", state: "deploying", time: "now"     },
    { tenant: "day14-realty",  color: "#14805a", state: "deployed",  time: "4h ago"  },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, padding: "48px 28px 36px", display: "flex", flexDirection: "column", gap: 10 }}>
      {deploys.map((d, i) => {
        const isDeploying = d.state === "deploying";
        return (
          <motion.div
            key={d.tenant}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: d.color,
                  boxShadow: `0 0 8px ${d.color}80`,
                }}
              />
              <span style={{ flex: 1, color: "#e2e8f0", fontSize: 12.5 }}>{d.tenant}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: isDeploying ? "#fb923c" : "#86efac",
                }}
              >
                {d.state}
              </span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.40)" }}>{d.time}</span>
            </div>
            {isDeploying && (
              <div style={{ marginTop: 8, height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "65%" }}
                  transition={{ duration: 3, ease: "easeInOut" }}
                  style={{ height: "100%", background: "#fb923c" }}
                />
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

function OrbitVignette({ reduce }: { reduce: boolean }) {
  // Compact constellation — central ember with 3 orbiting brand-color
  // planets. Slower-feel than the full empire constellation because this
  // tile only gets 4.5s on screen before the next vignette.
  const planets = [
    { color: "#3b82f6", angle: 30,  r: 110 },
    { color: "#ca8a04", angle: 150, r: 110 },
    { color: "#14805a", angle: 270, r: 110 },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
      <svg viewBox="-200 -200 400 400" style={{ width: "85%", height: "85%" }}>
        <circle cx={0} cy={0} r={110} fill="none" stroke="rgba(255,255,255,0.07)" strokeDasharray="2 6" />
        <defs>
          <radialGradient id="vh-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff7ed" />
            <stop offset="40%" stopColor="#fb923c" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ef6c33" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={0} cy={0} r={70} fill="url(#vh-core)" />
        <circle cx={0} cy={0} r={18} fill="#0a0e14" stroke="#fb923c" strokeWidth="1" opacity={0.85} />
        <text x={0} y={-2} textAnchor="middle" fontSize="9" fontFamily='ui-monospace, "SF Mono", Menlo, monospace' fontWeight={800} fill="#fb923c" style={{ letterSpacing: "0.12em" }}>
          DAY14
        </text>
        <text x={0} y={9} textAnchor="middle" fontSize="6.5" fontFamily='ui-monospace, "SF Mono", Menlo, monospace' fontWeight={700} fill="rgba(255,255,255,0.55)" style={{ letterSpacing: "0.18em" }}>
          OS
        </text>
        <motion.g
          animate={reduce ? undefined : { rotate: 360 }}
          transition={reduce ? undefined : { duration: 30, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "0px 0px" }}
        >
          {planets.map((p, i) => {
            const a = (p.angle * Math.PI) / 180;
            const x = p.r * Math.cos(a);
            const y = p.r * Math.sin(a);
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={18} fill={p.color} opacity={0.18} />
                <circle cx={x} cy={y} r={7} fill={p.color} />
                <circle cx={x} cy={y} r={7} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={1} />
              </g>
            );
          })}
        </motion.g>
      </svg>
    </div>
  );
}
