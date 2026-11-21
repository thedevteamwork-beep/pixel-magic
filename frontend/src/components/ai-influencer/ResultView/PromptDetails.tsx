import { CopyButton } from "@/ui/CopyButton";
import styles from "./main.module.css";

/** What the user wrote for the portrait on show (not the system prompt), kept in its lines. */
export function PromptDetails({ prompt }: { prompt: string }) {
  return (
    <section className={styles.prompt} aria-label="Prompt">
      <div className={styles.promptHead}>
        <h4>Prompt</h4>
        <CopyButton text={prompt} label="Copy prompt" />
      </div>
      <pre className={styles.promptText} tabIndex={0}>
        {prompt}
      </pre>
    </section>
  );
}
