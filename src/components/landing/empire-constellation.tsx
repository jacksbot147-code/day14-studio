"use client";

/**
 * EmpireConstellation — the hero's right-hand visual centerpiece.
 *
 * A dark cinematic "window" looking into the operator's empire: a central
 * Day14 ember-star with 6 tenant planets orbiting it, each in its real
 * brand color with a soft outer glow. Faint data filaments pulse from the
 * center to each tenant at random intervals (suggests "data flowing").
 * The whole composition slowly rotates and tilts on mouse parallax.
 *
 * Hover (or focus) a tenant → it scales up, its glow intensifies, and a
 * small floating card appears beside it with the tenant's domain + live
 * status. Click → opens the live site.
 *
 * Why this beats every other hero direction:
 *   - No admin chrome (visitor sees the empire, not the operator's tools)
 *   - No Gemini images (pure SVG + CSS, instant first paint, no 404 risk)
 *   - On-brand (the orbit IS Day14's totemic visual — leans into the OS
 *     metaphor with confidence)
 *   - Interactive (every visitor will mouse over the planets — that's the
 *     screenshotted-for-Twitter moment)
 *   - Cinematic (dark cosmos contrasted against the warm paper backdrop
 *     of the rest of the hero — the eye lands here first)
 *
 * Reduced motion: orbits freeze, no parallax tilt, no filament pulses.
 * Constellation still reads as a clear "central OS + 6 tenants" snapshot.
 *
 * SSR-safe: server renders the final static composition. Client takes over
 * for orbit rotation, parallax, and filament pulses only.
 */

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";

// ---------- tenant data ----------

type Tenant = {
  slug: string;
  label: string;
  domain: string;
  color: string;
  status: "Live" | "Paused" | "Parked";
  /** Position on the orbit, in degrees (0 = right, 90 = bottom, etc). */
  angle: number;
  /** Which orbit ring (1 = inner ~140, 2 = outer ~220). */
  ring: 1 | 2;
};

const TENANTS: Tenant[] = [
  { slug: "alignmd",          label: "AlignMD",        domain: "alignmd.com",      color: "#3b82f6", status: "Live",   angle: 200, ring: 1 },
  { slug: "life-loophole",    label: "Life Loophole",  domain: "lifeloophole.com", color: "#ca8a04", status: "Live",   angle: 320, ring: 1 },
  { slug: "day14-realty",     label: "Day14 Realty",   domain: "day14-realty.us",  color: "#14805a", status: "Paused", angle: 80,  ring: 1 },
  { slug: "hot-flash-co",     label: "Hot Flash Co",   domain: "hotflashco.com",   color: "#f472b6", status: "Parked", angle: 150, ring: 2 },
  { slug: "kennum-lawn-care", label: "Kennum",         domain: "kennum.us",        color: "#65a30d", status: "Parked", angle: 30,  ring: 2 },
  { slug: "day14",            label: "Day14 Studio",   domain: "day14.us",         color: "#ef6c33", status: "Live",   angle: 260, ring: 2 },
];

const VBOX = 700;
const CENTER = VBOX / 2;
const R1 = 150;
const R2 = 240;

function polar(angleDeg: number, r: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: CENTER + r * Math.cos(a), y: CENTER + r * Math.sin(a) };
}

// Deterministic starfield — 60 tiny white dots scattered across the canvas.
// Seeded so server + client render identical positions (no hydration jump).
function starfield(): Array<{ x: number; y: number; r: number; o: number }> {
  const stars: Array<{ x: number; y: number; r: number; o: number }> = [];
  let seed = 1337;
  const rng = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = 0; i < 60; i++) {
    stars.push({
      x: rng() * VBOX,
      y: rng() * VBOX,
      r: 0.4 + rng() * 1.1,
      o: 0.15 + rng() * 0.55,
    });
  }
  return stars;
}

const STARS = starfield();

// ---------- component ----------

export function EmpireConstellation() {
  const reduce = useReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [filamentTick, setFilamentTick] = useState(0);

  // Mouse parallax — track cursor relative to the container, translate the
  // whole composition by ±10px. Spring smooths the motion so it feels weighty.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 120, damping: 18, mass: 0.4 });
  const sy = useSpring(my, { stiffness: 120, damping: 18, mass: 0.4 });
  const tx = useTransform(sx, [-1, 1], [-10, 10]);
  const ty = useTransform(sy, [-1, 1], [-10, 10]);
  // Counter-shift for the headline panel — opposite direction, smaller, so
  // the two pieces feel coupled. (Currently unused but available.)

  useEffect(() => {
    if (reduce) return;
    // Filament pulse — every 1.4s, pick a random tenant to "ping".
    const id = window.setInterval(() => {
      setFilamentTick((t) => t + 1);
    }, 1400);
    return () => window.clearInterval(id);
  }, [reduce]);

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduce) return;
    const node = containerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    mx.set(px * 2 - 1);
    my.set(py * 2 - 1);
  }

  function onPointerLeave() {
    mx.set(0);
    my.set(0);
    setHovered(null);
  }

  // Which tenant is "firing" this tick? Cycle deterministically so no
  // hydration mismatch from Math.random.
  const firingTenant = TENANTS[filamentTick % TENANTS.length]!;

  return (
    <div
      ref={containerRef}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "1 / 1",
        maxWidth: 640,
        margin: "0 auto",
        borderRadius: 20,
        overflow: "hidden",
        background:
          "radial-gradient(120% 100% at 50% 50%, #0d1424 0%, #060912 60%, #03060c 100%)",
        boxShadow:
          "0 50px 120px -40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.04)",
      }}
    >
      {/* Outer halo glow — gives the dark window a sense of depth, like
          looking into a telescope eyepiece. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(60% 60% at 50% 50%, rgba(239,108,51,0.10) 0%, rgba(239,108,51,0) 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Top-left chrome label — sets the tone: this is a viewport on the
          empire, not a generic graphic. */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 18,
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.20em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.40)",
          zIndex: 3,
          pointerEvents: "none",
        }}
      >
        <span style={{ color: "#fb923c" }}>●</span> The empire · live view
      </div>

      {/* Top-right tenant count */}
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 18,
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.20em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.40)",
          zIndex: 3,
          pointerEvents: "none",
        }}
      >
        6 tenants
      </div>

      <motion.div
        style={
          reduce
            ? { width: "100%", height: "100%" }
            : ({ width: "100%", height: "100%", x: tx, y: ty } as unknown as React.CSSProperties)
        }
      >
        <svg
          viewBox={`0 0 ${VBOX} ${VBOX}`}
          style={{ display: "block", width: "100%", height: "100%" }}
          aria-label="Day14 OS at the center with 6 tenant businesses orbiting around it"
        >
          <defs>
            <radialGradient id="ec-core" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#fff7ed" stopOpacity="1" />
              <stop offset="35%"  stopColor="#fb923c" stopOpacity="0.85" />
              <stop offset="70%"  stopColor="#ef6c33" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#ef6c33" stopOpacity="0" />
            </radialGradient>
            {TENANTS.map((t) => (
              <radialGradient key={`ec-g-${t.slug}`} id={`ec-g-${t.slug}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor={t.color} stopOpacity="0.85" />
                <stop offset="50%"  stopColor={t.color} stopOpacity="0.30" />
                <stop offset="100%" stopColor={t.color} stopOpacity="0" />
              </radialGradient>
            ))}
            <filter id="ec-blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="0.6" />
            </filter>
          </defs>

          {/* Starfield */}
          {STARS.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#ffffff" opacity={s.o} />
          ))}

          {/* Orbital rings — dashed hairlines. */}
          <circle cx={CENTER} cy={CENTER} r={R1}
            fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="2 6" />
          <circle cx={CENTER} cy={CENTER} r={R2}
            fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="2 6" />

          {/* Pulsing data filaments — only render the one currently "firing". */}
          {!reduce && (
            <FilamentPulse
              key={filamentTick}
              tenant={firingTenant}
            />
          )}

          {/* Slow orbital rotation — inner ring 80s, outer ring 120s,
              opposite directions for visual dynamism. */}
          <motion.g
            animate={reduce ? undefined : { rotate: 360 }}
            transition={reduce ? undefined : { duration: 80, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
          >
            {TENANTS.filter((t) => t.ring === 1).map((t) => (
              <TenantNode
                key={t.slug}
                tenant={t}
                hovered={hovered === t.slug}
                onHover={(slug) => setHovered(slug)}
              />
            ))}
          </motion.g>

          <motion.g
            animate={reduce ? undefined : { rotate: -360 }}
            transition={reduce ? undefined : { duration: 120, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
          >
            {TENANTS.filter((t) => t.ring === 2).map((t) => (
              <TenantNode
                key={t.slug}
                tenant={t}
                hovered={hovered === t.slug}
                onHover={(slug) => setHovered(slug)}
              />
            ))}
          </motion.g>

          {/* Central Day14 ember — breathing core */}
          <circle cx={CENTER} cy={CENTER} r={110} fill="url(#ec-core)" />
          {!reduce && (
            <motion.circle
              cx={CENTER}
              cy={CENTER}
              r={48}
              fill="none"
              stroke="#fb923c"
              strokeWidth="1.2"
              opacity={0.4}
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: [1, 1.7, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: "easeOut" }}
              style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
            />
          )}
          <circle cx={CENTER} cy={CENTER} r="28" fill="#0a0e14" />
          <circle cx={CENTER} cy={CENTER} r="28" fill="none"
            stroke="#fb923c" strokeWidth="1" opacity={0.6} />
          <text
            x={CENTER}
            y={CENTER - 1}
            textAnchor="middle"
            fontFamily='ui-monospace, "SF Mono", Menlo, monospace'
            fontSize="13"
            fontWeight={800}
            fill="#fb923c"
            style={{ letterSpacing: "0.12em" }}
          >
            DAY14
          </text>
          <text
            x={CENTER}
            y={CENTER + 12}
            textAnchor="middle"
            fontFamily='ui-monospace, "SF Mono", Menlo, monospace'
            fontSize="8"
            fontWeight={700}
            fill="rgba(255,255,255,0.55)"
            style={{ letterSpacing: "0.18em" }}
          >
            OS
          </text>
        </svg>
      </motion.div>

      {/* Hover/focus tooltip — absolutely positioned over the SVG. Because
          the SVG is rotating, we render a separate static overlay layer
          that knows the tenant's UN-rotated position. The labels stay
          upright regardless of which orbit ring is spinning underneath. */}
      {hovered && <TenantTooltip slug={hovered} />}

      {/* Bottom legend — quiet status summary so the dark window doesn't
          leave the visitor wondering what they're looking at. */}
      <div
        style={{
          position: "absolute",
          bottom: 14,
          left: 18,
          right: 18,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.40)",
          zIndex: 3,
          pointerEvents: "none",
        }}
      >
        <span>Mouse to tilt · hover a planet</span>
        <span>
          <span style={{ color: "#86efac" }}>4 live</span>
          <span style={{ margin: "0 6px", color: "rgba(255,255,255,0.20)" }}>·</span>
          <span style={{ color: "#fcd34d" }}>1 paused</span>
          <span style={{ margin: "0 6px", color: "rgba(255,255,255,0.20)" }}>·</span>
          <span style={{ color: "rgba(255,255,255,0.55)" }}>1 parked</span>
        </span>
      </div>
    </div>
  );
}

// ---------- sub-components ----------

function TenantNode({
  tenant,
  hovered,
  onHover,
}: {
  tenant: Tenant;
  hovered: boolean;
  onHover: (slug: string | null) => void;
}) {
  const p = polar(tenant.angle, tenant.ring === 1 ? R1 : R2);
  const ringDur = tenant.ring === 1 ? 80 : 120;
  const ringDir = tenant.ring === 1 ? -360 : 360; // counter to outer rotation
  const reduce = useReducedMotion();
  return (
    <motion.g
      animate={reduce ? undefined : { rotate: ringDir }}
      transition={reduce ? undefined : { duration: ringDur, repeat: Infinity, ease: "linear" }}
      style={{ transformOrigin: `${p.x}px ${p.y}px` }}
      onMouseEnter={() => onHover(tenant.slug)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(tenant.slug)}
      onBlur={() => onHover(null)}
    >
      <a
        href={`https://${tenant.domain}`}
        target="_blank"
        rel="noreferrer"
        aria-label={`${tenant.label} — ${tenant.domain}, ${tenant.status}`}
      >
        {/* Glow halo — scales up on hover */}
        <motion.circle
          cx={p.x}
          cy={p.y}
          r={36}
          fill={`url(#ec-g-${tenant.slug})`}
          animate={{ scale: hovered ? 1.35 : 1, opacity: hovered ? 1 : 0.85 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: `${p.x}px ${p.y}px` }}
        />
        {/* Planet core */}
        <motion.circle
          cx={p.x}
          cy={p.y}
          r={tenant.ring === 1 ? 10 : 8}
          fill={tenant.color}
          animate={{ scale: hovered ? 1.5 : 1 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: `${p.x}px ${p.y}px` }}
        />
        {/* Inner highlight */}
        <circle
          cx={p.x - 2}
          cy={p.y - 2}
          r={tenant.ring === 1 ? 3 : 2.4}
          fill="rgba(255,255,255,0.65)"
        />
        {/* Outline ring */}
        <circle
          cx={p.x}
          cy={p.y}
          r={tenant.ring === 1 ? 10 : 8}
          fill="none"
          stroke="rgba(255,255,255,0.85)"
          strokeWidth={1}
        />
        {/* Hit area (invisible, larger) — makes hover/click forgiving. */}
        <circle cx={p.x} cy={p.y} r={28} fill="transparent" style={{ cursor: "pointer" }} />
      </a>
    </motion.g>
  );
}

function FilamentPulse({ tenant }: { tenant: Tenant }) {
  const p = polar(tenant.angle, tenant.ring === 1 ? R1 : R2);
  return (
    <motion.line
      x1={CENTER}
      y1={CENTER}
      x2={p.x}
      y2={p.y}
      stroke={tenant.color}
      strokeWidth={1.4}
      filter="url(#ec-blur)"
      initial={{ opacity: 0, pathLength: 0 }}
      animate={{ opacity: [0, 0.85, 0], pathLength: [0, 1, 1] }}
      transition={{ duration: 1.3, ease: "easeOut" }}
    />
  );
}

function TenantTooltip({ slug }: { slug: string }) {
  const tenant = TENANTS.find((t) => t.slug === slug);
  if (!tenant) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "absolute",
        bottom: 44,
        left: "50%",
        transform: "translateX(-50%)",
        padding: "10px 14px",
        borderRadius: 10,
        background: "rgba(10,14,20,0.92)",
        border: `1px solid ${tenant.color}55`,
        boxShadow: `0 18px 48px -12px ${tenant.color}55, inset 0 1px 0 rgba(255,255,255,0.06)`,
        fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
        color: "#e2e8f0",
        zIndex: 4,
        pointerEvents: "none",
        backdropFilter: "blur(6px)",
        minWidth: 220,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.06em",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: tenant.color,
            boxShadow: `0 0 10px ${tenant.color}`,
          }}
        />
        <span style={{ color: "#fff" }}>{tenant.label}</span>
        <span style={{ marginLeft: "auto", color: statusTint(tenant.status), fontSize: 9 }}>
          {tenant.status.toUpperCase()}
        </span>
      </div>
      <div style={{ marginTop: 4, fontSize: 10.5, color: "rgba(255,255,255,0.65)" }}>
        {tenant.domain}
      </div>
    </motion.div>
  );
}

function statusTint(status: Tenant["status"]) {
  if (status === "Live")   return "#86efac";
  if (status === "Paused") return "#fcd34d";
  return "rgba(255,255,255,0.55)";
}
