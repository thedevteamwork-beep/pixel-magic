import { RotateCcw } from "lucide-react";
import styles from "./main.module.css";

export function PanelHeader({ disabled, onReset }: { disabled: boolean; onReset: () => void }) {
  return (
    <header className={styles.header}>
      <div>
        <p>Create your own character with</p>
        <h1>AI Influencer</h1>
      </div>
      <button type="button" onClick={onReset} disabled={disabled}>
        <RotateCcw size={12} aria-hidden="true" />
        Reset
      </button>
    </header>
  );
}
