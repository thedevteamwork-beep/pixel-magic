import { History } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./main.module.css";

type EmptyHistoryProps = {
  title: string;
  message: string;
  /** The one button or link under the message. */
  children: ReactNode;
};

/** Shown in place of the list: nothing saved yet, signed out, or the list failed to load. */
export function EmptyHistory({ title, message, children }: EmptyHistoryProps) {
  return (
    <div className={styles.empty}>
      <span aria-hidden="true">
        <History size={22} strokeWidth={1.5} />
      </span>
      <h2>{title}</h2>
      <p>{message}</p>
      {children}
    </div>
  );
}
