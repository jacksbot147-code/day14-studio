"use client";

/**
 * HeroHeadline — signature moment #2. Word-by-word build, then a single
 * ember underline sweep beneath the final line. Plays once.
 *
 * <HeroHeadline lines={["Your business,", "running itself", "by week two."]} />
 */

import { motion, useReducedMotion } from "framer-motion";
import { heroWord, instant, STAGGER, EASE, DURATION } from "@/lib/motion";

interface HeroHeadlineProps {
  lines: string[];
  className?: string;
  /** Tailwind classes for the underline bar. */
  underlineClassName?: string;
}

export function HeroHeadline({
  lines,
  className,
  underlineClassName = "bg-[#FF5C28]",
}: HeroHeadlineProps) {
  const reduced = useReducedMotion();
  const wordVariants = reduced ? instant : heroWord;
  const totalWords = lines.reduce((n, l) => n + l.split(" ").length, 0);

  let wordIndex = 0;

  return (
    <motion.h1 className={className} initial="hidden" animate="visible">
      {lines.map((line, li) => (
        <span key={li} className="block overflow-hidden">
          {line.split(" ").map((word) => {
            const delay = reduced ? 0 : wordIndex++ * STAGGER.words;
            return (
              <motion.span
                key={`${li}-${word}-${wordIndex}`}
                className="inline-block whitespace-pre"
                variants={wordVariants}
                transition={{
                  duration: DURATION.slow,
                  ease: EASE.out,
                  delay,
                }}
              >
                {word}{" "}
              </motion.span>
            );
          })}
          {li === lines.length - 1 && (
            <motion.span
              aria-hidden
              className={`block h-[0.18em] w-full origin-left ${underlineClassName}`}
              initial={{ scaleX: reduced ? 1 : 0 }}
              animate={{ scaleX: 1 }}
              transition={{
                duration: 0.5,
                ease: EASE.sweep,
                delay: reduced ? 0 : totalWords * STAGGER.words + 0.15,
              }}
            />
          )}
        </span>
      ))}
    </motion.h1>
  );
}
