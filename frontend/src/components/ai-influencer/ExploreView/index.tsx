"use client";

import { featuredInfluencers } from "@/components/ai-influencer/constants";
import { useInfluencer } from "../InfluencerContext";
import { ExploreHeading } from "./ExploreHeading";
import { FeaturedGrid } from "./FeaturedGrid";
import { HeroFan } from "./HeroFan";
import styles from "./main.module.css";

export function ExploreView() {
  const { state, newInfluencer } = useInfluencer();

  return (
    <div className={styles.explore}>
      <HeroFan />
      <ExploreHeading />
      <FeaturedGrid
        items={featuredInfluencers}
        disabled={state.status === "generating"}
        // A featured persona is a different influencer, so it starts a new one rather than renaming the open one.
        onSelect={(item) => newInfluencer({ archetypeId: item.archetypeId, name: item.name })}
      />
    </div>
  );
}
