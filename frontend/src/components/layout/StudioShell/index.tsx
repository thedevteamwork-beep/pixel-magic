import type { ReactNode } from "react";
import { SHOW_STUDIO_RAIL } from "@/components/layout/constants";
import { StudioRail } from "./StudioRail";
import styles from "./main.module.css";

/** A studio page: the tool rail on the left (when `SHOW_STUDIO_RAIL` is on), the studio beside it. */
export function StudioShell({ children }: { children: ReactNode }) {
  return (
    <div className={[styles.shell, !SHOW_STUDIO_RAIL && styles.noRail].filter(Boolean).join(" ")}>
      {SHOW_STUDIO_RAIL && <StudioRail />}
      <div className={styles.content}>{children}</div>
    </div>
  );
}
