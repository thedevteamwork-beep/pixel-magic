import type { InfluencerPerson } from "@/types/landing";
import { LandingMedia } from "../LandingMedia";
import styles from "./main.module.css";

/** The chosen character in three scenes, each with a short label. */
export function SceneStrip({ person }: { person: InfluencerPerson }) {
  return (
    <ul className={styles.strip} aria-label={`${person.name} in other scenes`} key={person.id}>
      {person.scenes.map((scene) => (
        <li key={scene.asset}>
          <LandingMedia asset={scene.asset} alt={`${person.name}: ${scene.label}`} sizes="140px" />
          <span className={styles.sceneLabel}>{scene.label}</span>
        </li>
      ))}
    </ul>
  );
}
