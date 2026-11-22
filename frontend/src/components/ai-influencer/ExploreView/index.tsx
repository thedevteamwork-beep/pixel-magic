"use client";

import { archetypes } from "@/components/ai-influencer/constants";
import { CharacterTile } from "../CharacterTypes/CharacterTile";
import { useInfluencer } from "../InfluencerContext";
import { ExploreHeading } from "./ExploreHeading";
import { HeroFan } from "./HeroFan";
import styles from "./main.module.css";

export function ExploreView() {
  const { state, dispatch } = useInfluencer();
  return (
    <div className={styles.explore}>
      <HeroFan />
      <ExploreHeading />
      <section className={styles.starterTemplates} aria-labelledby="explore-templates-title">
        <div className={styles.starterTemplatesHeading}>
          <h3 id="explore-templates-title">Start from a template</h3>
          <p>Choose a ready-made look, including animal characters.</p>
        </div>
        <ul className={styles.templateGrid}>
          {archetypes.map((item) => (
            <li key={item.id}>
              <CharacterTile
                item={item}
                selected={state.archetypeId === item.id}
                disabled={state.status === "generating"}
                onSelect={() => dispatch({ type: "archetype", id: item.id })}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
