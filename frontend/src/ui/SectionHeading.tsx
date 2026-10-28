import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type SectionHeadingProps = {
  title: string;
  description?: string;
  /** `primary` is the brand-coloured heading used above galleries. */
  tone?: "primary" | "default";
  align?: "left" | "center";
  /** Buttons shown beside the heading on wide screens. */
  actions?: ReactNode;
  className?: string;
};

export function SectionHeading({
  title,
  description,
  tone = "primary",
  align = "left",
  actions,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div>
        <h2
          className={cn(
            "font-display text-2xl font-bold uppercase leading-tight tracking-tight md:text-3xl",
            tone === "primary" ? "text-primary" : "text-foreground",
          )}
        >
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-subtle">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}
