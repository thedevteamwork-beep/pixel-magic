import type { FeaturedInfluencer } from "@/types/ai-influencer";
import { InfluencerCard } from "./InfluencerCard";
import styles from "./main.module.css";

type FeaturedGridProps = {
  items: readonly FeaturedInfluencer[];
  disabled: boolean;
  onSelect: (item: FeaturedInfluencer) => void;
};

export function FeaturedGrid({ items, disabled, onSelect }: FeaturedGridProps) {
  return (
    <section className={styles.featured} aria-labelledby="featured-title">
      <h3 id="featured-title">
        AI influencers <span>{items.length}</span>
      </h3>
      <ul className={styles.grid}>
        {items.map((item) => (
          <li key={item.id}>
            <InfluencerCard item={item} disabled={disabled} onSelect={onSelect} />
          </li>
        ))}
      </ul>
    </section>
  );
}
