import type { HTMLAttributes, ReactNode } from "react";
import { UiStyles } from "./UiStyles";

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  /** Emoji string or icon node shown at the top. Optional. */
  icon?: ReactNode;
  /** Short bold headline explaining what's missing. */
  headline: ReactNode;
  /** Muted explanatory hint underneath. */
  hint?: ReactNode;
  /** Optional CTA — usually a <Button> or link. */
  cta?: ReactNode;
}

/**
 * Friendly empty-state block used wherever a list, table, or panel
 * has nothing to show yet. Dashed-border surface, optional icon or
 * emoji, headline, hint, optional CTA. Sized to drop into any
 * `.section`-style container.
 */
export function EmptyState({
  icon,
  headline,
  hint,
  cta,
  className,
  ...rest
}: EmptyStateProps) {
  const cls = ["d14-empty", className].filter(Boolean).join(" ");
  return (
    <>
      <UiStyles />
      <div {...rest} className={cls}>
        {icon ? (
          <div className="d14-empty-icon" aria-hidden="true">
            {icon}
          </div>
        ) : null}
        <p className="d14-empty-headline">{headline}</p>
        {hint ? <p className="d14-empty-hint">{hint}</p> : null}
        {cta ? <div className="d14-empty-cta">{cta}</div> : null}
      </div>
    </>
  );
}
