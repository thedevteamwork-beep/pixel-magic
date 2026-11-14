import { LoaderCircle, Shuffle, Sparkles } from "lucide-react";
import styles from "./main.module.css";

type PanelFooterProps = {
  busy: boolean;
  hasResult: boolean;
  onShuffle: () => void;
};

/** Surprise-me button and the main Generate button. Submits the surrounding form. */
export function PanelFooter({ busy, hasResult, onShuffle }: PanelFooterProps) {
  return (
    <div className={styles.footer}>
      <button
        type="button"
        className={styles.shuffle}
        onClick={onShuffle}
        disabled={busy}
        aria-label="Surprise me with a random look"
        title="Surprise me"
      >
        <Shuffle size={18} aria-hidden="true" />
      </button>
      <button type="submit" className={styles.generate} disabled={busy}>
        {busy ? <LoaderCircle size={17} className={styles.spinner} aria-hidden="true" /> : null}
        <span>{busy ? "Creating…" : hasResult ? "Generate again" : "Generate"}</span>
        {!busy && <Sparkles size={16} aria-hidden="true" />}
      </button>
    </div>
  );
}
