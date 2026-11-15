import { X } from "lucide-react";
import styles from "./main.module.css";

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <p className={styles.error} role="alert">
      {message}
      <button type="button" onClick={onDismiss} aria-label="Dismiss error">
        <X size={15} />
      </button>
    </p>
  );
}
