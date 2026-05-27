import type { ButtonHTMLAttributes, ReactNode } from "react";
import { UiStyles } from "./UiStyles";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md";

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

/**
 * Primary action button matching the admin's sharp, ember-accented look.
 * Three variants: solid ember `primary`, hairline `secondary`, and
 * underlined-on-hover `ghost`. Two sizes: `sm` and `md`.
 */
export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  type,
  ...rest
}: ButtonProps) {
  const cls = [
    "d14-btn",
    `d14-btn-${variant}`,
    `d14-btn-${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <>
      <UiStyles />
      <button {...rest} type={type ?? "button"} className={cls}>
        {children}
      </button>
    </>
  );
}
