import type { HTMLAttributes, ReactNode } from "react";
import { UiStyles } from "./UiStyles";

export interface KpiProps extends HTMLAttributes<HTMLDivElement> {
  /** Small uppercase eyebrow above the value. */
  label: ReactNode;
  /** Big editorial number or short string. */
  value: ReactNode;
  /** Optional small caption beneath the value. */
  sub?: ReactNode;
}

/**
 * Editorial KPI tile: tiny uppercase label, big tabular-numerics
 * value, optional muted sub-caption. Matches the existing admin
 * KPI strip exactly. Drop into a grid for the usual line-divided
 * strip look.
 */
export function Kpi({ label, value, sub, className, ...rest }: KpiProps) {
  const cls = ["d14-kpi", className].filter(Boolean).join(" ");
  return (
    <>
      <UiStyles />
      <div {...rest} className={cls}>
        <div className="d14-kpi-label">{label}</div>
        <div className="d14-kpi-value">{value}</div>
        {sub ? <div className="d14-kpi-sub">{sub}</div> : null}
      </div>
    </>
  );
}
