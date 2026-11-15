"use client";

import { archetypes } from "@/components/ai-influencer/constants";
import { useInfluencer } from "../InfluencerContext";
import { CharacterTile } from "./CharacterTile";
import styles from "./main.module.css";

/** Starting looks; picking one pre-fills the trait sections. */
export function CharacterTypes() {
  const { state, dispatch } = useInfluencer();
  const humanTemplates = archetypes.filter((item) => !item.traits.character);
  const animalTemplates = archetypes.filter((item) => Boolean(item.traits.character));

  const grid = (items: typeof archetypes) => (
    <ul className={styles.grid}>
      {items.map((item) => (
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
  );

  return (
    <div className={styles.groups}>
      <section className={styles.group} aria-labelledby="human-templates-title">
        <h3 id="human-templates-title">Human looks</h3>
        {grid(humanTemplates)}
      </section>
      <section className={styles.group} aria-labelledby="animal-templates-title">
        <h3 id="animal-templates-title">Animal characters</h3>
        {grid(animalTemplates)}
      </section>
    </div>
  );
}
