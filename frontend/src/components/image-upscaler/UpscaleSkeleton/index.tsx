import { Skeleton } from "@/ui/Skeleton";
import styles from "./main.module.css";

/** The upload card's shape while the upscaler loads, so the page appears in place without a jump. */
export function UpscaleSkeleton() {
  return (
    <div className={styles.page} role="status" aria-label="Opening the upscaler">
      <div className={styles.card}>
        <Skeleton className={styles.image} />
        <div className={styles.copy}>
          <Skeleton className={styles.title} />
          <Skeleton className={styles.line} />
          <Skeleton className={styles.lineShort} />
          <Skeleton className={styles.button} />
          <Skeleton className={styles.hint} />
        </div>
      </div>
    </div>
  );
}
