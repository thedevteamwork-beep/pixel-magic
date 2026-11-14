import styles from "./main.module.css";

export function PromptDetails({ prompt }: { prompt: string }) {
  return (
    <details className={styles.prompt}>
      <summary>Prompt used</summary>
      <p>{prompt}</p>
    </details>
  );
}
