"use client";

import type { CSSProperties } from "react";
import { beforeAfterPairs, beforeAfterSection } from "@/components/landing/constants";
import { useAutoAdvance } from "@/lib/landing/useAutoAdvance";
import { CompareView } from "../CompareView";
import { useLandingMotion } from "../LandingProvider";
import { SectionIntro } from "../SectionIntro";
import { PairList } from "./PairList";
import styles from "./main.module.css";

/** "See what changes": pick an example, then move across the picture to compare the photo and the result. */
export function BeforeAfterShowcase() {
  const { motionEnabled } = useLandingMotion();
  const pairs = useAutoAdvance(beforeAfterPairs.length, beforeAfterSection.pairMs, motionEnabled);
  const pair = beforeAfterPairs[pairs.index];

  return (
    <section
      className={`landing-section ${styles.section}`}
      id="before-after"
      aria-labelledby="before-after-heading"
      style={{ "--pair-ms": `${beforeAfterSection.pairMs}ms` } as CSSProperties}
      onPointerEnter={(event) => event.pointerType === "mouse" && pairs.hold()}
      onPointerLeave={pairs.release}
    >
      <div>
        <SectionIntro
          eyebrow={beforeAfterSection.eyebrow}
          heading={beforeAfterSection.heading}
          description={beforeAfterSection.description}
          headingId="before-after-heading"
        />
        <PairList
          pairs={beforeAfterPairs}
          activeIndex={pairs.index}
          runKey={pairs.runKey}
          running={pairs.running}
          onSelect={pairs.go}
        />
      </div>
      <div className={styles.stage}>
        <CompareView
          variant="full"
          before={pair.before}
          after={pair.after}
          softenBefore={pair.softenBefore}
          objectPosition={pair.objectPosition ?? "center 25%"}
          beforeLabel={pair.beforeLabel}
          afterLabel={pair.afterLabel}
          hint="Move across to compare"
          label={`${pair.name}: ${pair.beforeLabel} and ${pair.afterLabel}, side by side`}
          sizes="(max-width: 1100px) 100vw, 55vw"
        />
      </div>
    </section>
  );
}
