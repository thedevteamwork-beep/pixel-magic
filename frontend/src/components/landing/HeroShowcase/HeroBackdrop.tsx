import type { HeroChapter } from "@/types/landing";
import { LandingMedia } from "../LandingMedia";
import styles from "./main.module.css";

type HeroBackdropProps = {
  chapters: readonly HeroChapter[];
  activeIndex: number;
  /** Stops the film, for example while the reel is open. */
  paused: boolean;
};

/** Every chapter's film or photo, stacked; the active one fades in and plays. */
export function HeroBackdrop({ chapters, activeIndex, paused }: HeroBackdropProps) {
  return (
    <div className={styles.backdrops} aria-hidden="true">
      {chapters.map(({ id, backdrop }, index) => {
        const active = index === activeIndex;
        return (
          <div className={styles.backdrop} data-active={active} data-layout={backdrop.layout} key={id}>
            <span className={styles.backdropMedia}>
              <LandingMedia
                asset={backdrop.asset}
                alt=""
                behavior={active && !paused ? "ambient" : "still"}
                objectPosition={backdrop.objectPosition}
                priority={index === 0}
                sizes={
                  backdrop.layout === "side" ? "(max-width: 720px) 100vw, 45vw" : "(min-width: 1660px) 1580px, 100vw"
                }
              />
            </span>
          </div>
        );
      })}
    </div>
  );
}
