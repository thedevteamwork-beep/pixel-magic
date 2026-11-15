import { useId } from "react";
import styles from "./main.module.css";

type TextFieldProps = {
  label: string;
  value: string;
  maxLength: number;
  placeholder: string;
  disabled: boolean;
  error?: string;
  /** Lets the parent focus this field, e.g. the first invalid one on submit. */
  fieldRef?: (node: HTMLInputElement | null) => void;
  onChange: (value: string) => void;
};

export function TextField({
  label,
  value,
  maxLength,
  placeholder,
  disabled,
  error,
  fieldRef,
  onChange,
}: TextFieldProps) {
  const id = useId();
  return (
    <div className={styles.textField}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        ref={fieldRef}
        type="text"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && (
        <span id={`${id}-error`} className={styles.fieldError} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
