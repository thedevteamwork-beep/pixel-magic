import { LoaderCircle, Sparkles } from "lucide-react";
import styles from "./main.module.css";

type PanelFooterProps = {
  busy: boolean;
  hasResult: boolean;
};

/** The main Generate button. It submits the surrounding form. */
export function PanelFooter({ busy, hasResult }: PanelFooterProps) {
  return (
    <button type="submit" className={styles.generate} disabled={busy}>
      {busy ? <LoaderCircle size={17} className={styles.spinner} aria-hidden="true" /> : null}
      <span>{busy ? "Creating…" : hasResult ? "Generate again" : "Generate"}</span>
      {!busy && <Sparkles size={16} aria-hidden="true" />}
    </button>
  );
}
