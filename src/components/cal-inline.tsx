"use client";

/**
 * CalInline — official Cal.com inline embed (no npm dependency; loads the
 * vanilla embed loader once). Renders the booking calendar directly on the
 * page instead of bouncing visitors to cal.com — the single biggest
 * conversion lever for a "book a call" funnel.
 *
 * calLink is the path after cal.com/ (e.g. "day14/intro").
 */

import { useEffect, useRef } from "react";

interface CalInlineProps {
  calLink: string;
  /** Cal theme — "light" | "dark" | "auto". Default light to match the site. */
  theme?: "light" | "dark" | "auto";
}

declare global {
  interface Window {
    Cal?: ((...args: unknown[]) => void) & { loaded?: boolean; q?: unknown[]; ns?: Record<string, unknown> };
  }
}

export function CalInline({ calLink, theme = "light" }: CalInlineProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Official Cal.com embed snippet (vanilla loader), guarded so it only
    // initializes once even across client navigations.
    (function (C: Window, A: string, L: string) {
      const p = function (a: { q: unknown[] }, ar: unknown) {
        a.q.push(ar);
      };
      const d = C.document;
      C.Cal =
        C.Cal ||
        function (...args: unknown[]) {
          const cal = C.Cal!;
          if (!cal.loaded) {
            cal.ns = {};
            cal.q = cal.q || [];
            const script = d.createElement("script");
            script.src = A;
            d.head.appendChild(script);
            cal.loaded = true;
          }
          if (args[0] === L) {
            const api = function (...iargs: unknown[]) {
              p(api as unknown as { q: unknown[] }, iargs);
            } as ((...a: unknown[]) => void) & { q: unknown[] };
            api.q = [];
            (cal as unknown as Record<string, unknown>)[L] = api;
            p(cal as unknown as { q: unknown[] }, args);
            return;
          }
          p(cal as unknown as { q: unknown[] }, args);
        };
    })(window, "https://app.cal.com/embed/embed.js", "init");

    const Cal = window.Cal!;
    Cal("init", { origin: "https://app.cal.com" });
    Cal("inline", {
      elementOrSelector: ref.current,
      calLink,
      layout: "month_view",
    });
    Cal("ui", {
      theme,
      hideEventTypeDetails: false,
      cssVarsPerTheme: { light: { "cal-brand": "#ef6c33" } },
    });
  }, [calLink, theme]);

  return (
    <div
      ref={ref}
      style={{ width: "100%", minHeight: 640, overflow: "scroll" }}
      aria-label="Booking calendar"
    />
  );
}
