"use client";

import { brandTheme as t, contact } from "./theme";

/**
 * Mobile-only sticky bottom bar — call + book always visible.
 * Hidden on tablets and up (md breakpoint).
 * Mirrors what tap-to-call apps do: phone-first, single decision.
 */
export function StickyMobileBar() {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 md:hidden"
      style={{
        backgroundColor: `${t.colors.surface}f5`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderTop: `1px solid ${t.colors.muted}25`,
        paddingBottom: "env(safe-area-inset-bottom, 0)",
      }}
    >
      <div className="flex items-stretch gap-2 p-3">
        <a
          href={contact.phoneHref}
          className="flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-[14px] font-semibold text-white"
          style={{ backgroundColor: t.colors.accent }}
        >
          📞 Call
        </a>
        <a
          href={contact.sms}
          className="flex flex-1 items-center justify-center gap-2 rounded-full border-2 px-4 py-3 text-[14px] font-semibold"
          style={{ borderColor: t.colors.primary, color: t.colors.primary, backgroundColor: t.colors.surface }}
        >
          💬 Text
        </a>
        <a
          href="#book"
          className="flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-[14px] font-semibold text-white"
          style={{ backgroundColor: t.colors.primary }}
        >
          Book
        </a>
      </div>
    </div>
  );
}
