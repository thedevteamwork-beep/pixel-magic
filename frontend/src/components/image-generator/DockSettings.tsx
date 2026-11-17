import { ChevronDown, Expand, Minus, Plus } from "lucide-react";
import type { ImageOptionValue, StudioModel } from "@/types/image-generator";
import { ModelPicker } from "./ModelPicker";
import styles from "./main.module.css";

type DockSettingsProps = {
  models: readonly StudioModel[];
  model: StudioModel;
  /** Resolved options: every control's current value for this model. */
  options: Record<string, ImageOptionValue>;
  onModelChange: (key: string) => void;
  onOptionChange: (field: string, value: ImageOptionValue) => void;
  disabled?: boolean;
};

/** Only the controls the selected model declares; another model may show others. */
export function DockSettings({
  models,
  model,
  options,
  onModelChange,
  onOptionChange,
  disabled = false,
}: DockSettingsProps) {
  const { shape, count, choices } = model;
  const countValue = count ? Number(options[count.field]) : 1;

  return (
    <div className={styles.controls} role="group" aria-label="Image generation settings">
      <ModelPicker compact models={models} value={model.key} onChange={onModelChange} disabled={disabled} />
      {shape && (
        <label className={`${styles.selectControl} ${styles.ratio}`}>
          <Expand className={styles.controlIcon} size={14} aria-hidden="true" />
          <select
            aria-label="Aspect ratio"
            title="Aspect ratio"
            value={String(options[shape.field])}
            disabled={disabled}
            onChange={(event) => onOptionChange(shape.field, event.target.value)}
          >
            {shape.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className={styles.selectChevron} size={12} aria-hidden="true" />
        </label>
      )}
      {choices.map((choice) => (
        <label key={choice.field} className={`${styles.selectControl} ${styles.quality}`}>
          <select
            aria-label={choice.label}
            title={choice.label}
            value={String(options[choice.field] ?? "")}
            disabled={disabled}
            onChange={(event) => onOptionChange(choice.field, event.target.value)}
          >
            {choice.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <ChevronDown className={styles.selectChevron} size={12} aria-hidden="true" />
        </label>
      ))}
      {count && count.max > count.min && (
        <div className={styles.count} role="group" aria-label="Number of images">
          <button
            type="button"
            aria-label="Generate one fewer image"
            disabled={disabled || countValue <= count.min}
            onClick={() => onOptionChange(count.field, countValue - 1)}
          >
            <Minus size={13} aria-hidden="true" />
          </button>
          <output aria-label="Image count" aria-live="polite">
            {countValue}
            <span>/{count.max}</span>
          </output>
          <button
            type="button"
            aria-label="Generate one more image"
            disabled={disabled || countValue >= count.max}
            onClick={() => onOptionChange(count.field, countValue + 1)}
          >
            <Plus size={13} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
