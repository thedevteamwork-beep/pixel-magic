import { ChevronDown, LoaderCircle, Shuffle, Sparkles } from "lucide-react";
import { useId } from "react";
import type { PublicModel } from "@/lib/api/types";
import styles from "./main.module.css";

type PanelFooterProps = {
  busy: boolean;
  hasResult: boolean;
  models: readonly PublicModel[];
  modelKey: string;
  onModelChange: (key: string) => void;
  onShuffle: () => void;
};

/** Model picker, then the Surprise-me button and the main Generate button. Generate submits the surrounding form. */
export function PanelFooter({ busy, hasResult, models, modelKey, onModelChange, onShuffle }: PanelFooterProps) {
  const id = useId();
  return (
    <div className={styles.footer}>
      <div className={styles.model}>
        <label htmlFor={id}>Model</label>
        <span className={styles.select}>
          <select
            id={id}
            value={modelKey}
            disabled={busy || models.length === 0}
            onChange={(event) => onModelChange(event.target.value)}
          >
            {models.map((model) => (
              <option key={model.key} value={model.key}>
                {model.name} ({model.credits.min}–{model.credits.max} credits)
              </option>
            ))}
          </select>
          <ChevronDown size={14} aria-hidden="true" />
        </span>
      </div>
      <div className={styles.actions}>
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
    </div>
  );
}
