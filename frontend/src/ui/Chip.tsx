import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ChipProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

export function Chip({ href, className, children }: ChipProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center rounded-md bg-surface px-3 py-1.5 text-sm text-subtle transition-colors hover:bg-surface-raised hover:text-foreground",
        className,
      )}
    >
      {children}
    </Link>
  );
}
