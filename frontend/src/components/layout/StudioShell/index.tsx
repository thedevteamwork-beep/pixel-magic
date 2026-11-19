import type { ReactNode } from "react";
import { StudioRail } from "./StudioRail";
import styles from "./main.module.css";

/** A studio page: the tool rail on the left, the studio beside it. */
export function StudioShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <StudioRail />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
