import type { InfluencerPerson } from "@/types/landing";
import { LandingMedia } from "../LandingMedia";
import styles from "./main.module.css";

type InfluencerStageProps = {
  people: readonly InfluencerPerson[];
  activeIndex: number;
};

/** The large picture: the chosen character in a new scene, with the one photo it came from in the corner. */
export function InfluencerStage({ people, activeIndex }: InfluencerStageProps) {
  const person = people[activeIndex];

  return (
    <div className={styles.stage}>
      {people.map((item, index) => {
        const scene = item.scenes[0];
        return (
          <div className={styles.scene} data-active={index === activeIndex} key={item.id}>
            <LandingMedia
              asset={scene.asset}
              alt={index === activeIndex ? `${item.name} in a new scene` : ""}
              objectPosition={scene.objectPosition}
              sizes="(max-width: 1100px) 100vw, 55vw"
            />
          </div>
        );
      })}
      <div className={styles.from}>
        <span className={styles.reference}>
          <LandingMedia asset={person.reference} alt={`The photo ${person.name} was made from`} sizes="92px" />
        </span>
        <svg className={styles.curve} viewBox="0 0 46 30" fill="none" aria-hidden="true">
          <path
            d="M2 24C14 6 30 4 42 10M36 4l6 6-7 4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>
          <small>From one photo</small>
          <b>{person.name}, in a new scene</b>
        </span>
      </div>
    </div>
  );
}
