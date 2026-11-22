import { useId, type ReactNode } from "react";
import type { TraitOption } from "@/types/ai-influencer";
import styles from "./main.module.css";

type OptionChipsProps = {
  options: readonly TraitOption[];
  value: string;
  /** Clicking the selected chip again clears it (for optional traits). */
  allowClear?: boolean;
  /** A small picture before an option's label, e.g. a ratio outline. */
  icon?: (value: string) => ReactNode;
  onChange: (value: string) => void;
};

/** Text pills, with a colour dot for skin, hair and eye options, or a caller's icon. */
export function OptionChips({ options, value, allowClear, icon, onChange }: OptionChipsProps) {
  const name = useId();
  return (
    <div className={styles.options}>
      {options.map((option) => (
        <label key={option.value} className={styles.option} data-selected={option.value === value} title={option.label}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
            onClick={() => {
              if (allowClear && option.value === value) onChange("");
            }}
          />
          {option.swatch && <span className={styles.swatch} style={{ background: option.swatch }} aria-hidden="true" />}
          {icon?.(option.value)}
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}
