import { BookmarkCheck } from "lucide-react";
import styles from "./main.module.css";

type ResultToolbarProps = {
  name: string;
  summary: string;
  /** True once the influencer has a project: every Generate saves it. */
  saved: boolean;
};

export function ResultToolbar({ name, summary, saved }: ResultToolbarProps) {
  return (
    <header className={styles.toolbar}>
      <div className={styles.info}>
        <span className={styles.name}>{name}</span>
        <span className={styles.summary}>{summary}</span>
      </div>
      {saved && (
        <span className={styles.saved}>
          <BookmarkCheck size={14} aria-hidden="true" />
          Saved
        </span>
      )}
    </header>
  );
}
