"use client";

/**
 * OrbitDiagram — generative SVG showing Day14 OS at the center with the 6
 * tenants in slow orbit around it. Visual centerpiece for the case-study
 * section: makes the "multi-tenant from the metal up" claim *visible*
 * rather than just stated.
 *
 * Structure:
 *  - Central node: pulsing core (the OS)
 *  - 2 concentric orbital rings (radii r1, r2)
 *  - 6 tenant nodes distributed across the rings, each with its own label
 *  - Slow continuous rotation (60s per revolution by default)
 *  - Soft glow on each node, brand-tinted per tenant
 *
 * Responsive: SVG scales to its container. Looks good from 320px → 800px+.
 *
 * Reduced motion: orbits are static (no rotation), pulses stop. The
 * diagram still reads as a clear "central OS + 6 tenants" snapshot.
 */

import { motion, useReducedMotion } from "framer-motion";

type TenantSpec = {
  slug: string;
  label: string;
  color: string;
  ring: 1 | 2;
  angleDeg: number;
};

const TENANTS: TenantSpec[] = [
  { slug: "alignmd",          label: "AlignMD",    color: "#3b82f6", ring: 1, angleDeg: 0 },
  { slug: "life-loophole",    label: "Loophole",   color: "#ca8a04", ring: 1, angleDeg: 120 },
  { slug: "day14",            label: "Day14",      color: "#ef6c33", ring: 1, angleDeg: 240 },
  { slug: "hot-flash-co",     label: "Hot Flash",  color: "#f472b6", ring: 2, angleDeg: 60 },
  { slug: "day14-realty",     label: "Realty",     color: "#14805a", ring: 2, angleDeg: 180 },
  { slug: "kennum-lawn-care", label: "Kennum",     color: "#65a30d", ring: 2, angleDeg: 300 },
];

// SVG view box: 400 wide, 400 tall, centered on (200, 200).
const VBOX = 400;
const CENTER = VBOX / 2;
const R1 = 110;
const R2 = 175;

function polar(angleDeg: number, r: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: CENTER + r * Math.cos(a), y: CENTER + r * Math.sin(a) };
}

export function OrbitDiagram() {
  const reduce = useReducedMotion();

  return (
    <div style={{ width: "100%", maxWidth: 560, margin: "0 auto" }}>
      <svg viewBox={`0 0 ${VBOX} ${VBOX}`} style={{ width: "100%", height: "auto" }} aria-label="Day14 OS with 6 tenant businesses orbiting around it">
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef6c33" stopOpacity="0.65" />
            <stop offset="60%" stopColor="#ef6c33" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#ef6c33" stopOpacity="0" />
          </radialGradient>
          {TENANTS.map((t) => (
            <radialGradient key={`g-${t.slug}`} id={`glow-${t.slug}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={t.color} stopOpacity="0.65" />
              <stop offset="60%" stopColor={t.color} stopOpacity="0.12" />
              <stop offset="100%" stopColor={t.color} stopOpacity="0" />
            </radialGradient>
          ))}
        </defs>

        {/* Orbital rings — hairlines. */}
        <circle cx={CENTER} cy={CENTER} r={R1} fill="none" stroke="rgba(15,23,42,0.08)" strokeWidth="1" strokeDasharray="3 4" />
        <circle cx={CENTER} cy={CENTER} r={R2} fill="none" stroke="rgba(15,23,42,0.06)" strokeWidth="1" strokeDasharray="3 4" />

        {/* Two rotating groups — inner ring spins one way, outer the other,
            so the composition feels dynamic. */}
        <motion.g
          animate={reduce ? undefined : { rotate: 360 }}
          transition={reduce ? undefined : { duration: 60, repeat: Infinity, ease: "linear" }}
          style={{ originX: CENTER, originY: CENTER, transformOrigin: `${CENTER}px ${CENTER}px` }}
        >
          {TENANTS.filter((t) => t.ring === 1).map((t) => {
            const p = polar(t.angleDeg, R1);
            return (
              <g key={t.slug}>
                {/* Counter-rotate the inner content so labels stay upright. */}
                <motion.g
                  animate={reduce ? undefined : { rotate: -360 }}
                  transition={reduce ? undefined : { duration: 60, repeat: Infinity, ease: "linear" }}
                  style={{ originX: p.x, originY: p.y, transformOrigin: `${p.x}px ${p.y}px` }}
                >
                  <circle cx={p.x} cy={p.y} r="28" fill={`url(#glow-${t.slug})`} />
                  <circle cx={p.x} cy={p.y} r="9" fill={t.color} />
                  <circle cx={p.x} cy={p.y} r="9" fill="none" stroke="white" strokeWidth="2" />
                  <text x={p.x} y={p.y + 30} textAnchor="middle" fontSize="10" fontFamily="ui-monospace, SF Mono, Menlo, monospace" fill="rgba(15,23,42,0.65)" style={{ letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>
                    {t.label}
                  </text>
                </motion.g>
              </g>
            );
          })}
        </motion.g>

        <motion.g
          animate={reduce ? undefined : { rotate: -360 }}
          transition={reduce ? undefined : { duration: 90, repeat: Infinity, ease: "linear" }}
          style={{ originX: CENTER, originY: CENTER, transformOrigin: `${CENTER}px ${CENTER}px` }}
        >
          {TENANTS.filter((t) => t.ring === 2).map((t) => {
            const p = polar(t.angleDeg, R2);
            return (
              <g key={t.slug}>
                <motion.g
                  animate={reduce ? undefined : { rotate: 360 }}
                  transition={reduce ? undefined : { duration: 90, repeat: Infinity, ease: "linear" }}
                  style={{ originX: p.x, originY: p.y, transformOrigin: `${p.x}px ${p.y}px` }}
                >
                  <circle cx={p.x} cy={p.y} r="26" fill={`url(#glow-${t.slug})`} />
                  <circle cx={p.x} cy={p.y} r="7" fill={t.color} />
                  <circle cx={p.x} cy={p.y} r="7" fill="none" stroke="white" strokeWidth="2" />
                  <text x={p.x} y={p.y + 26} textAnchor="middle" fontSize="9" fontFamily="ui-monospace, SF Mono, Menlo, monospace" fill="rgba(15,23,42,0.50)" style={{ letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>
                    {t.label}
                  </text>
                </motion.g>
              </g>
            );
          })}
        </motion.g>

        {/* Central core — Day14 OS, pulsing. */}
        <circle cx={CENTER} cy={CENTER} r="80" fill="url(#coreGlow)" />
        {!reduce && (
          <motion.circle
            cx={CENTER}
            cy={CENTER}
            r="38"
            fill="none"
            stroke="#ef6c33"
            strokeWidth="1.5"
            initial={{ opacity: 0.4, scale: 1 }}
            animate={{ opacity: [0.4, 0, 0.4], scale: [1, 1.6, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
            style={{ originX: CENTER, originY: CENTER, transformOrigin: `${CENTER}px ${CENTER}px` }}
          />
        )}
        <circle cx={CENTER} cy={CENTER} r="22" fill="#0f172a" />
        <text x={CENTER} y={CENTER - 2} textAnchor="middle" fontSize="11" fontFamily="ui-monospace, SF Mono, Menlo, monospace" fill="#ef6c33" style={{ letterSpacing: "0.10em", fontWeight: 800 }}>
          DAY14
        </text>
        <text x={CENTER} y={CENTER + 10} textAnchor="middle" fontSize="8" fontFamily="ui-monospace, SF Mono, Menlo, monospace" fill="rgba(255,255,255,0.55)" style={{ letterSpacing: "0.12em", fontWeight: 600 }}>
          OS
        </text>
      </svg>
    </div>
  );
}
