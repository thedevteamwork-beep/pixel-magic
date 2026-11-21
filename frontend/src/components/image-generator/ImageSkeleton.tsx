import { Skeleton } from "@/ui/Skeleton";
import styles from "./main.module.css";

/** The image studio's first screen (heading, inspiration cards, prompt bar) while it loads. */
export function ImageSkeleton() {
  return (
    <div className={styles.skeletonPage} role="status" aria-label="Opening your image studio">
      <div className={styles.skeletonTabs}>
        <Skeleton className={styles.skeletonTab} />
        <Skeleton className={styles.skeletonTab} />
      </div>
      <div className={styles.skeletonColumn}>
        <Skeleton className={styles.skeletonHeading} />
        <div className={styles.skeletonCards}>
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className={styles.skeletonCard} />
          ))}
        </div>
        <div className={styles.skeletonDock}>
          <Skeleton className={styles.skeletonPrompt} />
          <div className={styles.skeletonChips}>
            <Skeleton className={styles.skeletonChip} />
            <Skeleton className={styles.skeletonChipWide} />
            <Skeleton className={styles.skeletonChip} />
            <Skeleton className={styles.skeletonChip} />
          </div>
          <Skeleton className={styles.skeletonGenerate} />
        </div>
      </div>
    </div>
  );
}
