"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { StudioShell } from "@/components/layout/StudioShell";

const authRoutes = new Set(["/sign-in", "/sign-up", "/forgot-password", "/reset-password"]);
/** Full-height tools: the studio rail beside them (when `SHOW_STUDIO_RAIL` is on), no footer. */
const studioRoutes = new Set(["/image", "/video", "/upscale", "/influencer"]);

/** Server-rendered page content remains a slot; only chrome selection is client-side. */
export function SiteChrome({
  children,
  header,
  footer,
}: {
  children: ReactNode;
  header: ReactNode;
  footer: ReactNode;
}) {
  const pathname = usePathname();
  if (authRoutes.has(pathname)) return children;
  if (studioRoutes.has(pathname))
    return (
      <>
        {header}
        <StudioShell>{children}</StudioShell>
      </>
    );
  return (
    <>
      {header}
      {children}
      {footer}
    </>
  );
}
