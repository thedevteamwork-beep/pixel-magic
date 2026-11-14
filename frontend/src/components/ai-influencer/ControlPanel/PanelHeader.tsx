import { Plus } from "lucide-react";
import styles from "./main.module.css";

/** Title, and the button that starts a new influencer (the open one stays saved). */
export function PanelHeader({ disabled, onNew }: { disabled: boolean; onNew: () => void }) {
  return (
    <header className={styles.header}>
      <div>
        <p>Create your own character with</p>
        <h1>AI Influencer</h1>
      </div>
      <button type="button" onClick={onNew} disabled={disabled}>
        <Plus size={12} aria-hidden="true" />
        New influencer
      </button>
    </header>
  );
}
