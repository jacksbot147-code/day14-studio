import type { HTMLAttributes, ReactNode } from "react";
import { UiStyles } from "./UiStyles";

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  /** Small uppercase eyebrow shown above the body. */
  title?: ReactNode;
  /** Optional right-aligned aside in the header (link, count, etc.). */
  aside?: ReactNode;
  children: ReactNode;
}

/**
 * A sectioned container matching the admin `.section` look: white
 * surface, hairline border, sharp radii. Optional `title` + `aside`
 * render an editorial eyebrow header above the body.
 */
export function Card({ title, aside, className, children, ...rest }: CardProps) {
  const cls = ["d14-card", className].filter(Boolean).join(" ");
  return (
    <>
      <UiStyles />
      <section {...rest} className={cls}>
        {(title || aside) && (
          <header className="d14-card-head">
            {title ? <h3 className="d14-card-title">{title}</h3> : <span />}
            {aside ? <div className="d14-card-aside">{aside}</div> : null}
          </header>
        )}
        <div className="d14-card-body">{children}</div>
      </section>
    </>
  );
}
