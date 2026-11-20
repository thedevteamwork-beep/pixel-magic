import { Skeleton } from "@/ui/Skeleton";
import styles from "./main.module.css";

/** The influencer studio's panel and stage while it loads. */
export function InfluencerSkeleton() {
  return (
    <div className={styles.page} role="status" aria-label="Opening the AI influencer studio">
      <div className={styles.panel}>
        <Skeleton className={styles.eyebrow} />
        <Skeleton className={styles.heading} />
        <Skeleton className={styles.upload} />
        <Skeleton className={styles.label} />
        <div className={styles.tiles}>
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className={styles.tile} />
          ))}
        </div>
        <div className={styles.footer}>
          <Skeleton className={styles.prompt} />
          <div className={styles.actions}>
            <Skeleton className={styles.shuffle} />
            <Skeleton className={styles.generate} />
          </div>
        </div>
      </div>
      <div className={styles.stage}>
        <div className={styles.tabs}>
          <Skeleton className={styles.tab} />
          <Skeleton className={styles.tab} />
          <Skeleton className={styles.tab} />
        </div>
        <div className={styles.fan}>
          <Skeleton className={styles.fanSide} />
          <Skeleton className={styles.fanCenter} />
          <Skeleton className={styles.fanSide} />
        </div>
        <Skeleton className={styles.title} />
        <Skeleton className={styles.titleSecond} />
        <Skeleton className={styles.text} />
      </div>
    </div>
  );
}
