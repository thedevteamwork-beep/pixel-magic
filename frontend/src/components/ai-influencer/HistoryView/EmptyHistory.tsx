import { History } from "lucide-react";
import styles from "./main.module.css";

export function EmptyHistory({ onExplore }: { onExplore: () => void }) {
  return (
    <div className={styles.empty}>
      <span aria-hidden="true">
        <History size={22} strokeWidth={1.5} />
      </span>
      <h2>No saved influencers yet</h2>
      <p>Generate one and choose “Save influencer” to keep them here.</p>
      <button type="button" onClick={onExplore}>
        Explore looks
      </button>
    </div>
  );
}
