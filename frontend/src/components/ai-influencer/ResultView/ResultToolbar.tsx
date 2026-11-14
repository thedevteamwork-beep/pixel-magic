import { Bookmark } from "lucide-react";
import styles from "./main.module.css";

type ResultToolbarProps = {
  name: string;
  summary: string;
  saved: boolean;
  /** True when there is nothing to save yet, or a job is still running. */
  saveDisabled: boolean;
  onSave: () => void;
};

export function ResultToolbar({ name, summary, saved, saveDisabled, onSave }: ResultToolbarProps) {
  return (
    <header className={styles.toolbar}>
      <div className={styles.info}>
        <span className={styles.name}>{name}</span>
        <span className={styles.summary}>{summary}</span>
      </div>
      <button type="button" className={styles.save} onClick={onSave} disabled={saveDisabled || saved}>
        <Bookmark size={14} aria-hidden="true" />
        {saved ? "Saved" : "Save influencer"}
      </button>
    </header>
  );
}
