import { useId } from "react";
import { MAX_STYLE_NAME_LENGTH } from "@/components/ai-influencer/constants";
import { Button } from "@/ui/Button";
import type { StyleDraft } from "./useStyleReferences";
import styles from "./main.module.css";

type NewStyleFormProps = {
  draft: StyleDraft;
  name: string;
  error: string;
  saving: boolean;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onDiscard: () => void;
};

/** The image just picked, with a name field. Saving uploads it and keeps it as a style. */
export function NewStyleForm({ draft, name, error, saving, onNameChange, onSave, onDiscard }: NewStyleFormProps) {
  const id = useId();
  return (
    <div className={styles.newStyle}>
      {/* Browser-local object URL; never sent to the image optimizer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.newStyleImage} src={draft.previewUrl} alt="" />
      <div className={styles.newStyleFields}>
        <label htmlFor={id}>Style name</label>
        <input
          id={id}
          type="text"
          value={name}
          maxLength={MAX_STYLE_NAME_LENGTH}
          placeholder="e.g. Pink streetwear"
          disabled={saving}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onNameChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSave();
            }
          }}
        />
        {error && (
          <span id={`${id}-error`} className={styles.error} role="alert">
            {error}
          </span>
        )}
        <div className={styles.newStyleActions}>
          <Button variant="ghost" size="sm" onClick={onDiscard} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save style"}
          </Button>
        </div>
      </div>
    </div>
  );
}
