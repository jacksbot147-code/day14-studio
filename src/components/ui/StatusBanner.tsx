import type { HTMLAttributes, ReactNode } from "react";
import { UiStyles } from "./UiStyles";

export type StatusTone = "ok" | "warn" | "bad";

export interface StatusBannerProps extends HTMLAttributes<HTMLDivElement> {
  tone: StatusTone;
  /** Bold one-line summary. */
  headline: ReactNode;
  /** Optional second-line muted detail. */
  detail?: ReactNode;
}

/**
 * Mission-control style banner: a colored left-rule, a dot, a bold
 * headline, and an optional muted detail line. Three tones mirror
 * the admin `.mc-banner` pattern.
 */
export function StatusBanner({
  tone,
  headline,
  detail,
  className,
  ...rest
}: StatusBannerProps) {
  const cls = ["d14-banner", `d14-banner-${tone}`, className]
    .filter(Boolean)
    .join(" ");
  return (
    <>
      <UiStyles />
      <div {...rest} role="status" className={cls}>
        <span className="d14-banner-dot" aria-hidden="true" />
        <div className="d14-banner-text">
          <div className="d14-banner-headline">{headline}</div>
          {detail ? <div className="d14-banner-detail">{detail}</div> : null}
        </div>
      </div>
    </>
  );
}
