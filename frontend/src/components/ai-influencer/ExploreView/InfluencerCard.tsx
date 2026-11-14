import { Media } from "@/ui/Media";
import { ArrowUpRight } from "lucide-react";
import { landingAssets } from "@/constants/landing-media";
import { portraitStyle } from "@/lib/ai-influencer/portrait";
import type { FeaturedInfluencer } from "@/types/ai-influencer";
import styles from "./main.module.css";

type InfluencerCardProps = {
  item: FeaturedInfluencer;
  disabled: boolean;
  onSelect: (item: FeaturedInfluencer) => void;
};

export function InfluencerCard({ item, disabled, onSelect }: InfluencerCardProps) {
  return (
    <button
      type="button"
      className={styles.card}
      disabled={disabled}
      aria-label={`Use the look of ${item.name}`}
      onClick={() => onSelect(item)}
    >
      <Media
        media={{ kind: "image", src: landingAssets[item.asset].image, alt: "" }}
        fill
        sizes="(max-width: 700px) 45vw, 220px"
        className={styles.cardImage}
        imageProps={{ style: portraitStyle(item) }}
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
  );
}
