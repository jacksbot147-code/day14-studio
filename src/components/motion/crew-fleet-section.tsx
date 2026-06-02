"use client";

/**
 * CrewFleetSection — wraps a single fleet's section header + card grid with
 * a stagger reveal triggered when the section enters the viewport. The
 * effect: as you scroll Mission Control v2, each fleet rolls in like a
 * separate launch sequence rather than the page being a static wall.
 *
 * Layout-preserving: the inner grid stays the same `crew-grid` CSS class so
 * column widths + gaps from the page styles win. The motion lives entirely
 * on the wrapper + each child.
 *
 * Reduced motion: renders children straight through, no observer attached.
 */

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Children, type ReactNode } from "react";

interface CrewFleetSectionProps {
  /** Fleet header text — rendered above the cards. */
  title: string;
  subtitle: string;
  /** Card children — usually <CrewCardLive>...</CrewCardLive> per unit. */
  children: ReactNode;
}

export function CrewFleetSection({ title, subtitle, children }: CrewFleetSectionProps) {
  const reduce = useReducedMotion();
  const childArr = Children.toArray(children);

  const containerVariants: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: reduce ? 0 : 0.04, delayChildren: reduce ? 0 : 0.05 },
    },
  };
  const itemVariants: Variants = {
    hidden: reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduce ? 0 : 0.24, ease: "easeOut" },
    },
  };
  const headerVariants: Variants = {
    hidden: reduce ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 },
    show: { opacity: 1, x: 0, transition: { duration: reduce ? 0 : 0.22, ease: "easeOut" } },
  };

  return (
    <motion.section
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={containerVariants}
    >
      <motion.div className="fleet-header" variants={headerVariants}>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </motion.div>
      <motion.div className="crew-grid" variants={containerVariants}>
        {childArr.map((child, i) => (
          <motion.div key={i} variants={itemVariants}>
            {child}
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}
