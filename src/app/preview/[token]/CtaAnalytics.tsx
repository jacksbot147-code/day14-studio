"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/**
 * CtaAnalytics — delegated CTA tracking for the generated preview pages.
 *
 * The preview routes (one-pager + services/about/contact) render their own
 * lightweight shell and do NOT mount <CanvasField>, which is where the rest of
 * the site hangs its delegated `[data-cta]` click listener. Without this island
 * the `data-cta` attributes already tagged across the preview CTAs (items 2, 5–11)
 * would fire no analytics. This mounts the SAME pattern CanvasField uses — one
 * document-level click listener that resolves the nearest `[data-cta]` ancestor
 * and emits a single `cta_click` event — scoped to the preview shell.
 *
 * Privacy-respecting by construction: `track()` honours DNT/GPC and no-ops on the
 * server or on opt-out, and never throws into the UI. No props, no DOM output.
 */
export default function CtaAnalytics() {
  useEffect(() => {
    const onCtaClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.(
        "[data-cta]",
      ) as HTMLElement | null;
      if (!el) return;
      track("cta_click", {
        cta: el.dataset.cta ?? "unknown",
        href: el.getAttribute("href") ?? "",
        surface: "preview",
      });
    };
    document.addEventListener("click", onCtaClick);
    return () => document.removeEventListener("click", onCtaClick);
  }, []);

  return null;
}
