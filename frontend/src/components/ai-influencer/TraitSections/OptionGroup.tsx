import type { ReactNode } from "react";
import styles from "./main.module.css";

type OptionGroupProps = {
  label: string;
  disabled: boolean;
  /** Marks the trait as required. Optional traits get a small "Optional" tag instead. */
  required?: boolean;
  children: ReactNode;
};

/** Labelled fieldset around one trait's choices. */
export function OptionGroup({ label, disabled, required, children }: OptionGroupProps) {
  return (
    <fieldset className={styles.field} disabled={disabled}>
      <legend>
        {label} <small>{required ? "Required" : "Optional"}</small>
      </legend>
      {children}
    </fieldset>
  );
}
