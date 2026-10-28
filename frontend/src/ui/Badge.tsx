import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type BadgeTone = "primary" | "neutral";

const toneClasses: Record<BadgeTone, string> = {
  primary: "bg-primary text-primary-foreground",
  neutral: "bg-surface-raised text-foreground",
};

type BadgeProps = {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
};

export function Badge({ tone = "primary", className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[0.625rem] font-bold uppercase italic leading-none",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
