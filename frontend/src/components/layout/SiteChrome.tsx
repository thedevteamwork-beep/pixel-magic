"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const authRoutes = new Set(["/sign-in", "/sign-up", "/forgot-password", "/reset-password"]);

/** Server-rendered page content remains a slot; only chrome selection is client-side. */
export function SiteChrome({ children, header, footer }: { children: ReactNode; header: ReactNode; footer: ReactNode }) {
  const pathname = usePathname();
  if (authRoutes.has(pathname)) return children;
  if (pathname === "/image" || pathname === "/video" || pathname === "/upscale") return <>{header}{children}</>;
  return <>{header}{children}{footer}</>;
}
