"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stretch to the parent's width. */
  block?: boolean;
  /** Visually mark the button as the selected item in a set (tabs, toggles). */
  active?: boolean;
}

/**
 * The one button. Every colour comes from theme tokens via the `.ui-btn`
 * classes in globals.css; variants only switch which tokens are read.
 * Callers own the ARIA semantics (aria-current, aria-pressed, aria-label).
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", block = false, active = false, className, type = "button", children, ...rest },
  ref,
) {
  const classes = [
    "ui-btn",
    `ui-btn--${variant}`,
    `ui-btn--${size}`,
    block ? "ui-btn--block" : "",
    active ? "ui-btn--active" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button ref={ref} type={type} className={classes} {...rest}>
      {children}
    </button>
  );
});

export default Button;
