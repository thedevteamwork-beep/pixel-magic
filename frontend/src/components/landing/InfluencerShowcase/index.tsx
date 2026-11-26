"use client";

import { influencerPeople, influencerSection } from "@/components/landing/constants";
import { useAutoAdvance } from "@/lib/landing/useAutoAdvance";
import { AccentHeading } from "../AccentHeading";
import { ActionPill } from "../ActionPill";
import { useLandingMotion } from "../LandingProvider";
import { FacePicker } from "./FacePicker";
import { InfluencerStage } from "./InfluencerStage";
import { SceneStrip } from "./SceneStrip";
import styles from "./main.module.css";

/** "Pick a face. Put it anywhere.": the characters take turns, and pointing at a face shows that one. */
export function InfluencerShowcase() {
  const { motionEnabled } = useLandingMotion();
  const faces = useAutoAdvance(influencerPeople.length, influencerSection.faceMs, motionEnabled);
  const person = influencerPeople[faces.index];

  return (
    <section
      className={`landing-section ${styles.section}`}
      id="influencer"
      aria-labelledby="influencer-heading"
      onPointerEnter={(event) => event.pointerType === "mouse" && faces.hold()}
      onPointerLeave={faces.release}
    >
      <InfluencerStage people={influencerPeople} activeIndex={faces.index} />
      <div className={styles.side}>
        <div>
          <p className="section-eyebrow">{influencerSection.eyebrow}</p>
          <AccentHeading heading={influencerSection.heading} id="influencer-heading" className={styles.title} />
          <p className={styles.description}>{influencerSection.description}</p>
          <FacePicker people={influencerPeople} activeIndex={faces.index} onSelect={faces.go} />
          <SceneStrip person={person} />
        </div>
        <div className={styles.cta}>
          <ActionPill href={influencerSection.cta.href}>{influencerSection.cta.label}</ActionPill>
        </div>
      </div>
    </section>
  );
}
