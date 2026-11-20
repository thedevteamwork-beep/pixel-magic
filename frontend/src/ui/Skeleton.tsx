import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

type SkeletonProps = {
  /** Size, shape and position: `h-10 w-40 rounded-xl`, or a module class. */
  className?: string;
  style?: CSSProperties;
};

/**
 * A placeholder block that pulses while the real content loads. Hidden from
 * screen readers: the region it sits in announces the loading instead.
 */
export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      style={style}
      className={cn(
        "block animate-pulse rounded-lg bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)] motion-reduce:animate-none",
        className,
      )}
    />
  );
}
