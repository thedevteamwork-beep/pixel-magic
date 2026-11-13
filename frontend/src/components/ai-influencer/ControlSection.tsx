import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./ControlSection.module.css";

/** Collapsible block used for every group in the left panel. */
export function ControlSection({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className={styles.section} open={defaultOpen}>
      <summary>
        <span>
          {title}
          {count !== undefined && <small> · {count}</small>}
        </span>
        <ChevronDown size={15} className={styles.chevron} aria-hidden="true" />
      </summary>
      <div className={styles.body}>{children}</div>
    </details>
  );
}
