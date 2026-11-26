import type { CSSProperties, ReactNode } from "react";
import styles from "./main.module.css";

type FadeEndingProps = {
  children: ReactNode;
  /** While collapsed, the content stops at this height and its last rows fade out under `action`. */
  expanded: boolean;
  /** Collapsed height in px on wide screens; phones use about three quarters of it. */
  maxHeight: number;
  /** A short line above the action. */
  note?: string;
  /** The call to action that sits over the fade. */
  action: ReactNode;
};

/** Ends a long gallery with a fade instead of a plain "Show more" button. */
export function FadeEnding({ children, expanded, maxHeight, note, action }: FadeEndingProps) {
  return (
    <div className={styles.box} data-expanded={expanded} style={{ "--fade-max": `${maxHeight}px` } as CSSProperties}>
      {children}
      {!expanded && (
        <div className={styles.cta}>
          {note && <p>{note}</p>}
          {action}
        </div>
      )}
    </div>
  );
}
