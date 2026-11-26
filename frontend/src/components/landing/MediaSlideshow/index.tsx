"use client";

import { useAutoAdvance } from "@/lib/landing/useAutoAdvance";
import type { FramedAsset } from "@/types/landing";
import { LandingMedia } from "../LandingMedia";
import { useLandingMotion } from "../LandingProvider";
import styles from "./main.module.css";

type MediaSlideshowProps = {
  slides: readonly FramedAsset[];
  intervalMs: number;
  sizes: string;
  /** Load the first slide straight away, for a slideshow visible on first paint. */
  priority?: boolean;
};

/** Pictures that cross-fade one after another inside their parent's box. Holds on the first when motion is off. */
export function MediaSlideshow({ slides, intervalMs, sizes, priority = false }: MediaSlideshowProps) {
  const { motionEnabled } = useLandingMotion();
  const { index } = useAutoAdvance(slides.length, intervalMs, motionEnabled);

  return (
    <span className={styles.slides} aria-hidden="true">
      {slides.map((slide, slideIndex) => (
        <span className={styles.slide} data-active={slideIndex === index} key={`${slide.asset}-${slideIndex}`}>
          <LandingMedia
            asset={slide.asset}
            alt=""
            objectPosition={slide.objectPosition}
            priority={priority && slideIndex === 0}
            sizes={sizes}
          />
        </span>
      ))}
    </span>
  );
}
