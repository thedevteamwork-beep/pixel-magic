"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { archetypes } from "@/constants/ai-influencer";
import { landingAssets } from "@/constants/landing-media";
import { useInfluencer } from "./InfluencerContext";
import styles from "./CharacterTypes.module.css";

/** Starting looks; picking one pre-fills the trait sections. */
export function CharacterTypes() {
  const { state, dispatch } = useInfluencer();
  return (
    <ul className={styles.grid}>
      {archetypes.map((item) => {
        const selected = state.archetypeId === item.id;
        return (
          <li key={item.id}>
            <button
              type="button"
              className={styles.tile}
              data-tone={item.tone}
              aria-pressed={selected}
              disabled={state.status === "generating"}
              onClick={() => dispatch({ type: "archetype", id: item.id })}
            >
              <Image src={landingAssets[item.asset].image} alt="" fill sizes="110px" className={styles.art} />
              <span className={styles.shade} aria-hidden="true" />
              <span className={styles.label}>{item.title}</span>
              {selected && (
                <span className={styles.check} aria-hidden="true">
                  <Check size={12} />
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
