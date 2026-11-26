import type { BeforeAfterPair } from "@/types/landing";
import { LandingMedia } from "../LandingMedia";
import styles from "./main.module.css";

type PairListProps = {
  pairs: readonly BeforeAfterPair[];
  activeIndex: number;
  runKey: string;
  running: boolean;
  onSelect: (index: number) => void;
};

/** The examples to compare. The active one fills a small bar until the next example. */
export function PairList({ pairs, activeIndex, runKey, running, onSelect }: PairListProps) {
  return (
    <div className={styles.list} role="group" aria-label="Examples">
      {pairs.map((pair, index) => (
        <button
          type="button"
          key={pair.id}
          className={styles.item}
          aria-pressed={index === activeIndex}
          onClick={() => onSelect(index)}
        >
          <span className={styles.thumb} aria-hidden="true">
            <LandingMedia asset={pair.after} alt="" sizes="52px" />
          </span>
          <span className={styles.itemText}>
            <b>{pair.name}</b>
            <small>{pair.note}</small>
          </span>
          <span className={styles.bar} aria-hidden="true">
            {index === activeIndex && <i key={runKey} data-running={running} />}
          </span>
        </button>
      ))}
    </div>
  );
}
