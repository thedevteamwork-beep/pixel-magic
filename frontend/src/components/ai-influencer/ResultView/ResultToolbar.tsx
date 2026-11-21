import { BookmarkCheck, Download, Undo2 } from "lucide-react";
import styles from "./main.module.css";

type ResultToolbarProps = {
  name: string;
  summary: string;
  /** True once the influencer has a project: every Generate saves it. */
  saved: boolean;
  /** Puts the shown influencer's inputs back in the left panel; left out while there is nothing to reuse. */
  onReuse?: () => void;
  /** Saves the portrait on show; left out while there is none. */
  onDownload?: () => void;
};

export function ResultToolbar({ name, summary, saved, onReuse, onDownload }: ResultToolbarProps) {
  return (
    <header className={styles.toolbar}>
      <div className={styles.info}>
        <span className={styles.name}>{name}</span>
        <span className={styles.summary}>{summary}</span>
      </div>
      <div className={styles.toolbarActions}>
        {saved && (
          <span className={styles.saved}>
            <BookmarkCheck size={14} aria-hidden="true" />
            Saved
          </span>
        )}
        {onReuse && (
          <button type="button" className={styles.download} onClick={onReuse}>
            <Undo2 size={14} aria-hidden="true" />
            Reuse input
          </button>
        )}
        {onDownload && (
          <button type="button" className={styles.download} onClick={onDownload}>
            <Download size={14} aria-hidden="true" />
            Download
          </button>
        )}
      </div>
    </header>
  );
}
