"use client";

/**
 * StatusLine — fixed-bottom vim-style status bar.
 *
 * Sets the IDE frame around the whole page. Single thin monospace strip
 * pinned to the bottom of the viewport, never intrudes on content. Shows:
 *
 *   ~/day14.us :: 24% :: <current-section> :: ⌘K to search
 *
 * Updates the scroll-position percentage live as the user scrolls. Tracks
 * the section currently most-in-view (whichever has the largest visible
 * area) via IntersectionObserver. Hidden on mobile (< 640px) — too small
 * to be readable and competes with the cmd-k floating pill.
 *
 * SSR-safe: server renders with placeholders (0%, no section). Client
 * takes over on mount.
 */

import { useEffect, useState } from "react";

const SECTION_LABELS: Record<string, string> = {
  loom: "loom",
  "case-studies": "case-studies",
  how: "how-it-works",
  pricing: "pricing",
  book: "book",
  waitlist: "os-tenant",
};

export function StatusLine() {
  const [scrollPct, setScrollPct] = useState(0);
  const [section, setSection] = useState<string>("hero");

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      const max = (doc.scrollHeight - window.innerHeight) || 1;
      const pct = Math.min(100, Math.max(0, Math.round((scrollTop / max) * 100)));
      setScrollPct(pct);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Section tracking — observe all sections with id, pick the one with the
  // highest intersection ratio. Fallback to "hero" when at the top.
  useEffect(() => {
    const ids = Object.keys(SECTION_LABELS);
    const observed: HTMLElement[] = [];
    const ratios = new Map<string, number>();

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).id;
          ratios.set(id, e.intersectionRatio);
        }
        let best: { id: string; ratio: number } | null = null;
        for (const [id, r] of ratios) {
          if (!best || r > best.ratio) best = { id, ratio: r };
        }
        if (best && best.ratio > 0.05) {
          setSection(best.id);
        } else if (window.scrollY < 100) {
          setSection("hero");
        }
      },
      { threshold: [0, 0.05, 0.25, 0.5, 0.75, 1] },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) {
        obs.observe(el);
        observed.push(el);
      }
    }
    return () => obs.disconnect();
  }, []);

  const sectionLabel = section === "hero" ? "hero" : SECTION_LABELS[section] ?? section;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: "5px 16px",
        background: "rgba(10,10,10,0.92)",
        backdropFilter: "blur(8px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        color: "rgba(255,255,255,0.55)",
        fontFamily: 'ui-monospace, "SF Mono", Menlo, "JetBrains Mono", monospace',
        fontSize: 10.5,
        letterSpacing: "0.04em",
        display: "none",
        alignItems: "center",
        gap: 12,
        pointerEvents: "none",
        userSelect: "none",
      }}
      className="day14-statusline"
    >
      <span style={{ color: "#fb923c" }}>~/day14.us</span>
      <Divider />
      <span>
        <span style={{ color: "rgba(255,255,255,0.85)" }}>{scrollPct}%</span>
        <span style={{ color: "rgba(255,255,255,0.30)" }}> scrolled</span>
      </span>
      <Divider />
      <span>
        <span style={{ color: "rgba(255,255,255,0.30)" }}>section: </span>
        <span style={{ color: "rgba(255,255,255,0.85)" }}>{sectionLabel}</span>
      </span>
      <span style={{ marginLeft: "auto", color: "rgba(255,255,255,0.40)" }}>
        <kbd style={{
          padding: "1px 6px",
          borderRadius: 4,
          background: "rgba(255,255,255,0.06)",
          color: "rgba(255,255,255,0.65)",
          fontFamily: "inherit",
          fontSize: 9.5,
          fontWeight: 700,
        }}>
          ⌘K
        </kbd>{" "}
        to search
      </span>
      <style>{`
        @media (min-width: 768px) {
          .day14-statusline { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

function Divider() {
  return <span style={{ color: "rgba(255,255,255,0.20)" }}>::</span>;
}
