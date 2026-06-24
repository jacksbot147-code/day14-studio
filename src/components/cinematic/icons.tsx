/**
 * cinematic/icons — self-hosted inline SVG icon set for the cinematic theme.
 *
 * The locked prototype (cinematic-homepage-prototype-v5.html) draws the
 * capability icons from the Tabler icon *font* served off a CDN
 * (`<i class="ti ti-world">`). A CDN webfont is a production liability: extra
 * blocking request, FOUC, and a third-party dependency on the critical path.
 * Instead we ship the eight glyphs we actually use as inline, tree-shaken SVGs
 * — zero network cost, no runtime dep, and they inherit `currentColor` so the
 * cinematic accent tint applies for free.
 *
 * Each icon mirrors its Tabler counterpart (stroke-based, 24×24, 2px stroke,
 * round caps/joins) so the visual language matches the prototype 1:1. Icons are
 * decorative — every usage pairs them with a visible text label — so they are
 * marked `aria-hidden` and given `focusable="false"` by default.
 */

import type { SVGProps } from "react";

export type CinIcon = (props: SVGProps<SVGSVGElement>) => JSX.Element;

/** Shared wrapper: stroke icon defaults, currentColor, a11y-hidden. */
function Svg({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/** ti-world — marketing site */
export const IconWorld: CinIcon = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3.6 9h16.8M3.6 15h16.8" />
    <path d="M11.5 3a17 17 0 0 0 0 18M12.5 3a17 17 0 0 1 0 18" />
  </Svg>
);

/** ti-calendar-check — booking & quoting */
export const IconCalendarCheck: CinIcon = (props) => (
  <Svg {...props}>
    <rect x="4" y="5" width="16" height="16" rx="2" />
    <path d="M16 3v4M8 3v4M4 11h16" />
    <path d="m9 16 2 2 4-4" />
  </Svg>
);

/** ti-user-circle — customer portal */
export const IconUserCircle: CinIcon = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="10" r="3" />
    <path d="M6.2 18.6a6 6 0 0 1 11.6 0" />
  </Svg>
);

/** ti-credit-card — payments & invoicing */
export const IconCreditCard: CinIcon = (props) => (
  <Svg {...props}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 10h18M7 15h2" />
  </Svg>
);

/** ti-route — scheduling */
export const IconRoute: CinIcon = (props) => (
  <Svg {...props}>
    <circle cx="6" cy="19" r="2" />
    <circle cx="18" cy="5" r="2" />
    <path d="M12 19h4a2 2 0 0 0 2-2v-4M6 17V7a2 2 0 0 1 2-2h2" />
  </Svg>
);

/** ti-layout-dashboard — admin app */
export const IconLayoutDashboard: CinIcon = (props) => (
  <Svg {...props}>
    <rect x="4" y="4" width="7" height="9" rx="1" />
    <rect x="4" y="16" width="7" height="4" rx="1" />
    <rect x="13" y="4" width="7" height="4" rx="1" />
    <rect x="13" y="11" width="7" height="9" rx="1" />
  </Svg>
);

/** ti-message-2 — AI assistant */
export const IconMessage: CinIcon = (props) => (
  <Svg {...props}>
    <path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-7l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
    <path d="M8 9h8M8 12h5" />
  </Svg>
);

/** ti-mail — SMS & email */
export const IconMail: CinIcon = (props) => (
  <Svg {...props}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m4 7 8 6 8-6" />
  </Svg>
);
