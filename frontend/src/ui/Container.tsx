import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ContainerProps = {
  as?: "div" | "section" | "main" | "header" | "footer" | "nav";
  className?: string;
  children: ReactNode;
};

/** Page-width wrapper with the site's side padding. */
export function Container({ as: Tag = "div", className, children }: ContainerProps) {
  return <Tag className={cn("page-container", className)}>{children}</Tag>;
}
