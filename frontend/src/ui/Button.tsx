import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

const baseClasses =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary-hover",
  ghost: "text-foreground hover:bg-overlay-hover",
  outline: "border border-border-strong text-foreground hover:bg-overlay-hover",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

/** Look of a button; shared by `Button` and `ButtonWithLink`. */
export type ButtonStyleProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
};

/** The button classes, for anything that needs to look like a button. */
export function buttonClasses({ variant = "primary", size = "md", fullWidth, className }: ButtonStyleProps = {}) {
  return cn(baseClasses, variantClasses[variant], sizeClasses[size], fullWidth && "w-full", className);
}

type ButtonProps = ButtonStyleProps & Omit<ComponentPropsWithoutRef<"button">, keyof ButtonStyleProps>;

/**
 * A `<button>` for actions on the page; renders its children as-is
 * (put an `<Icon />` next to the label for an icon). To navigate, use `ButtonWithLink`.
 */
export function Button({ variant, size, fullWidth, className, type = "button", ...buttonProps }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, fullWidth, className })} {...buttonProps} />;
}

/** A link button described as data, so widgets can take CTAs from config. */
export type ActionLink = {
  label: string;
  href: string;
  variant?: ButtonVariant;
};

type ButtonWithLinkProps = ButtonStyleProps &
  Omit<ComponentPropsWithoutRef<"a">, keyof ButtonStyleProps | "href"> & {
    href: string;
  };

/**
 * A link styled as a button; renders its children as-is. Internal paths use
 * `next/link`; `http(s)` URLs open in a new tab.
 */
export function ButtonWithLink({ variant, size, fullWidth, className, href, ...anchorProps }: ButtonWithLinkProps) {
  const classes = buttonClasses({ variant, size, fullWidth, className });

  if (/^https?:\/\//.test(href)) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...anchorProps} />;
  }
  return <Link href={href} className={classes} {...anchorProps} />;
}
