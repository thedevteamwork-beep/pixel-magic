"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { featuredInfluencers, heroFan } from "@/constants/ai-influencer";
import { landingAssets } from "@/constants/landing-media";
import { useInfluencer } from "./InfluencerContext";
import styles from "./ExploreView.module.css";

export function ExploreView() {
  const { state, dispatch } = useInfluencer();
  const middle = Math.floor(heroFan.length / 2);

  return (
    <div className={styles.explore}>
      <ul className={styles.fan} aria-hidden="true">
        {heroFan.map((asset, index) => (
          <li key={asset} data-distance={Math.abs(index - middle)}>
            <Image
              src={landingAssets[asset].image}
              alt=""
              fill
              sizes="240px"
              className={styles.fanImage}
              preload={index === middle}
            />
          </li>
        ))}
      </ul>

      <header className={styles.heading}>
        <h2>
          Your influencer,
          <br />
          your viral hit
        </h2>
        <p>
          Build an AI influencer with the face, body and style you want. Start from a look, fine-tune every detail, then
          save them for every campaign.
        </p>
      </header>

      <section className={styles.featured} aria-labelledby="featured-title">
        <h3 id="featured-title">
          AI influencers <span>{featuredInfluencers.length}</span>
        </h3>
        <ul className={styles.grid}>
          {featuredInfluencers.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={styles.card}
                disabled={state.status === "generating"}
                aria-label={`Use the look of ${item.name}`}
                onClick={() => dispatch({ type: "archetype", id: item.archetypeId, name: item.name })}
              >
                <Image
                  src={landingAssets[item.asset].image}
                  alt=""
                  fill
                  sizes="(max-width: 700px) 45vw, 220px"
                  className={styles.cardImage}
                  style={{ objectPosition: item.position, filter: `hue-rotate(${item.hue}deg)` }}
                />
                <span className={styles.shade} aria-hidden="true" />
                <span className={styles.meta}>
                  <strong>{item.name}</strong>
                  <small>{item.niche}</small>
                </span>
                <span className={styles.use} aria-hidden="true">
                  Use this look <ArrowUpRight size={12} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
