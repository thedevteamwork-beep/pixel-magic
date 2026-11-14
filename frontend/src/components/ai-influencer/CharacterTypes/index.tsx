"use client";

import { archetypes } from "@/components/ai-influencer/constants";
import { useInfluencer } from "../InfluencerContext";
import { CharacterTile } from "./CharacterTile";
import styles from "./main.module.css";

/** Starting looks; picking one pre-fills the trait sections. */
export function CharacterTypes() {
  const { state, dispatch } = useInfluencer();
  return (
    <ul className={styles.grid}>
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
  );
}
