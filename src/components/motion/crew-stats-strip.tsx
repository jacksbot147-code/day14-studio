"use client";

/**
 * CrewStatsStrip — the 6-stat counter strip at the top of Mission Control v2.
 * Each stat counts up from 0 on mount; the strip as a whole staggers in from
 * the bottom with a soft fade. Brings the cockpit to life on first paint
 * without making the page jumpy on re-renders.
 *
 * The numbers are small (≤25) so the count-up is a sub-second motion;
 * pleasant but not annoying. CountUp itself respects reduced-motion (jumps
 * to final value).
 */

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { CountUp } from "./count-up";

export interface CrewStat {
  value: number;
  label: string;
}

interface CrewStatsStripProps {
  stats: CrewStat[];
}

export function CrewStatsStrip({ stats }: CrewStatsStripProps) {
  const reduce = useReducedMotion();

  const containerVariants: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: reduce ? 0 : 0.04 },
    },
  };
  const itemVariants: Variants = {
    hidden: reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduce ? 0 : 0.22, ease: "easeOut" },
    },
  };

  return (
    <motion.div className="roster-meta" variants={containerVariants} initial="hidden" animate="show">
      {stats.map((s) => (
        <motion.div key={s.label} className="stat" variants={itemVariants}>
          <span className="n">
            <CountUp to={s.value} durationMs={700} />
          </span>
          <span className="l">{s.label}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}
