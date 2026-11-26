import type { HeroChapter } from "@/types/landing";
import styles from "./main.module.css";

type ChapterTabsProps = {
  chapters: readonly HeroChapter[];
  activeIndex: number;
  /** Changes when the active chapter's timer restarts; the progress line restarts with it. */
  runKey: string;
  running: boolean;
  onSelect: (index: number) => void;
};

/** The numbered chapter pills. The active one fills a thin line until the next chapter. */
export function ChapterTabs({ chapters, activeIndex, runKey, running, onSelect }: ChapterTabsProps) {
  return (
    <div className={styles.chapters} role="group" aria-label="Featured chapters">
      {chapters.map((chapter, index) => (
        <button
          type="button"
          className={styles.chapter}
          key={chapter.id}
          aria-pressed={index === activeIndex}
          onClick={() => onSelect(index)}
        >
          <small aria-hidden="true">0{index + 1}</small>
          {chapter.label}
          {index === activeIndex && (
            <span className={styles.progress} data-running={running} key={runKey} aria-hidden="true" />
          )}
        </button>
      ))}
    </div>
  );
}
