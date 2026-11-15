import { useEffect, useId, useRef } from "react";
import { MAX_EXTRA_LENGTH } from "@/components/ai-influencer/constants";
import styles from "./main.module.css";

const MAX_HEIGHT = 96;

type PromptFieldProps = {
  value: string;
  error?: string;
  disabled: boolean;
  onChange: (value: string) => void;
  /** Enter (without Shift) generates, like the Generate button below it. */
  onSubmit: () => void;
  inputRef: (node: HTMLTextAreaElement | null) => void;
};

/** Free-text direction sent with the next generation, right above the Generate button. */
export function PromptField({ value, error, disabled, onChange, onSubmit, inputRef }: PromptFieldProps) {
  const id = useId();
  const input = useRef<HTMLTextAreaElement | null>(null);

  // Grow with the text, up to a few lines.
  useEffect(() => {
    const element = input.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT)}px`;
  }, [value]);

  return (
    <div className={styles.prompt}>
      <div className={styles.promptHead}>
        <label htmlFor={id}>Prompt</label>
        <span className={styles.promptCount}>
          {value.length}/{MAX_EXTRA_LENGTH}
        </span>
      </div>
      <textarea
        id={id}
        ref={(node) => {
          input.current = node;
          inputRef(node);
        }}
        className={styles.promptInput}
        rows={2}
        value={value}
        maxLength={MAX_EXTRA_LENGTH}
        placeholder="Optional: freckles, gold hoop earrings, warm smile…"
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            onSubmit();
          }
        }}
      />
      {error && (
        <p id={`${id}-error`} className={styles.promptError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
