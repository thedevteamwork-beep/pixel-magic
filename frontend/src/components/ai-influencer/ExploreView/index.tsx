"use client";

import { featuredInfluencers } from "@/components/ai-influencer/constants";
import { useInfluencer } from "../InfluencerContext";
import { ExploreHeading } from "./ExploreHeading";
import { FeaturedGrid } from "./FeaturedGrid";
import { HeroFan } from "./HeroFan";
import styles from "./main.module.css";

export function ExploreView() {
  const { state, dispatch } = useInfluencer();

  return (
    <div className={styles.explore}>
      <HeroFan />
      <ExploreHeading />
      <FeaturedGrid
        items={featuredInfluencers}
        disabled={state.status === "generating"}
        onSelect={(item) => dispatch({ type: "archetype", id: item.archetypeId, name: item.name })}
      />
    </div>
  );
}
