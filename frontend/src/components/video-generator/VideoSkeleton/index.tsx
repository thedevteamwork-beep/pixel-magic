import { Skeleton } from "@/ui/Skeleton";
import styles from "./main.module.css";

/** The video studio's panel and start screen while it loads. */
export function VideoSkeleton() {
  return (
    <div className={styles.page} role="status" aria-label="Opening your video studio">
      <div className={styles.panel}>
        <Skeleton className={styles.field} />
        <Skeleton className={styles.fieldTall} />
        <Skeleton className={styles.label} />
        <Skeleton className={styles.prompt} />
        <div className={styles.pair}>
          <Skeleton className={styles.tile} />
          <Skeleton className={styles.tile} />
        </div>
        <div className={styles.pair}>
          <Skeleton className={styles.tile} />
          <Skeleton className={styles.tile} />
        </div>
        <div className={styles.generateArea}>
          <Skeleton className={styles.generate} />
        </div>
      </div>
      <div className={styles.feed}>
        <div className={styles.pills}>
          <Skeleton className={styles.pill} />
          <Skeleton className={styles.pill} />
        </div>
        <div className={styles.hero}>
          <Skeleton className={styles.eyebrow} />
          <Skeleton className={styles.title} />
          <Skeleton className={styles.text} />
          <Skeleton className={styles.textShort} />
        </div>
        <Skeleton className={styles.section} />
        <div className={styles.modes}>
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className={styles.mode} />
          ))}
        </div>
        <Skeleton className={styles.section} />
        <div className={styles.shots}>
          <Skeleton className={styles.shotLarge} />
          <Skeleton className={styles.shot} />
        </div>
      </div>
    </div>
  );
}
