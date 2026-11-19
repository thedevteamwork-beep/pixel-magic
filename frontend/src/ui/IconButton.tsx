import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type IconButtonVariant = "ghost" | "outline" | "glass" | "onMedia";
export type IconButtonSize = "sm" | "md" | "lg";

const baseClasses =
  "inline-grid shrink-0 place-items-center rounded-full transition-[background-color,color,border-color,transform] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-95 disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none motion-reduce:active:scale-100";

const variantClasses: Record<IconButtonVariant, string> = {
  ghost: "text-muted hover:bg-overlay-hover hover:text-foreground",
  outline: "border border-border-strong text-foreground hover:border-subtle hover:bg-overlay-hover",
  /** For buttons over images. */
  glass:
    "border border-[color-mix(in_srgb,var(--on-media)_14%,transparent)] bg-[color-mix(in_srgb,var(--media-ink)_52%,transparent)] text-[var(--on-media)] backdrop-blur-md hover:bg-[color-mix(in_srgb,var(--media-ink)_72%,transparent)]",
  /** For buttons inside a dark bar that is already over an image. */
  onMedia:
    "text-[var(--on-media-muted)] hover:bg-[color-mix(in_srgb,var(--on-media)_12%,transparent)] hover:text-[var(--on-media)]",
};

const sizeClasses: Record<IconButtonSize, string> = {
  sm: "size-8",
  md: "size-9",
  lg: "size-11",
};

/** Pressed toggles (a favorite, say) take the brand color. */
const pressedClasses = "text-primary hover:text-primary";

export type IconButtonStyleProps = {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  pressed?: boolean;
  className?: string;
};

/** The icon button classes, for links that look like icon buttons (a download, say). */
export function iconButtonClasses({ variant = "ghost", size = "md", pressed, className }: IconButtonStyleProps = {}) {
  return cn(baseClasses, variantClasses[variant], sizeClasses[size], pressed && pressedClasses, className);
}

type IconButtonProps = IconButtonStyleProps &
  Omit<ComponentPropsWithoutRef<"button">, keyof IconButtonStyleProps | "aria-label" | "aria-pressed" | "children"> & {
    /** What the button does; its accessible name and tooltip. */
    label: string;
    /** The icon, marked `aria-hidden`. */
    children: ReactNode;
  };

/**
 * A round button holding only an icon. `label` names it for screen readers
 * and as a tooltip; `pressed` makes it a toggle.
 */
export function IconButton({
  variant,
  size,
  pressed,
  className,
  label,
  type = "button",
  title,
  ...buttonProps
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={iconButtonClasses({ variant, size, pressed, className })}
      aria-label={label}
      aria-pressed={pressed}
      title={title ?? label}
      {...buttonProps}
    />
  );
}
