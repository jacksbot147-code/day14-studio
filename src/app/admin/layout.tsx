import type { ReactNode } from "react";
import { AdminPageTransition } from "@/components/motion/admin-page-transition";

/**
 * Admin shell layout.
 *
 * Server component — keeps each page's `force-dynamic` data fetching intact.
 * Sole job is to mount the client-side `<AdminPageTransition>` so route
 * changes inside `/admin/*` get a subtle 200ms fade+slide. The transition
 * itself, including the `prefers-reduced-motion` short-circuit, lives in the
 * client component so this file can stay server-rendered.
 *
 * Note: the root `src/app/layout.tsx` already mounts a `<RouteTransition>`
 * for marketing routes; that wrapper explicitly bypasses `/admin`, so this
 * is the only motion layer running on admin pages.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminPageTransition>{children}</AdminPageTransition>;
}
