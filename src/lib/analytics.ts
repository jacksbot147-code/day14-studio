/**
 * analytics.ts — privacy-first event hook for day14.us.
 *
 * Page-view analytics is already handled by Vercel Analytics (cookieless, no
 * cross-site identifiers, GDPR/CCPA-friendly) mounted in layout.tsx. This is
 * the thin custom-event layer on top of it.
 *
 * Consent posture: we honour the browser's Do-Not-Track and Global Privacy
 * Control signals. If either is set, custom events are dropped on the floor —
 * no event leaves the device. No third-party script, no consent banner needed.
 *
 * Usage:  import { track } from "@/lib/analytics";  track("chat_opened");
 */

import { track as vercelTrack } from "@vercel/analytics";

type Props = Record<string, string | number | boolean | null>;

/** True when the user has asked not to be tracked (DNT or GPC). */
function optedOut(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.globalPrivacyControl === true) return true;
  // DNT is reported as the string "1" by most browsers that still send it.
  return nav.doNotTrack === "1";
}

/**
 * Record a privacy-respecting custom event. No-ops on the server, when the
 * user has opted out, or if the analytics call throws (never let telemetry
 * break a user interaction).
 */
export function track(event: string, props?: Props): void {
  if (typeof window === "undefined") return;
  if (optedOut()) return;
  try {
    vercelTrack(event, props);
  } catch {
    // analytics must never throw into the UI
  }
}
