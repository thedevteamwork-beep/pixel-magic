import { Media } from "@/ui/Media";
import { Trash2 } from "lucide-react";
import { displayName, traitLabel } from "@/lib/ai-influencer/prompt";
import { portraitStyle } from "@/lib/ai-influencer/portrait";
import type { SavedInfluencer } from "@/types/ai-influencer";
import styles from "./main.module.css";

type HistoryCardProps = {
  item: SavedInfluencer;
  disabled: boolean;
  onOpen: () => void;
  onRemove: () => void;
};

export function HistoryCard({ item, disabled, onOpen, onRemove }: HistoryCardProps) {
  const name = displayName(item.traits);
  const details = [
    item.traits.hairStyle && traitLabel("hairStyle", item.traits.hairStyle),
    item.traits.outfit && traitLabel("outfit", item.traits.outfit),
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className={styles.item}>
      <button type="button" className={styles.card} onClick={onOpen} disabled={disabled} aria-label={`Open ${name}`}>
        <Media
          media={{ kind: "image", src: item.cover.url, alt: "" }}
          fill
          sizes="(max-width: 700px) 45vw, 220px"
          className={styles.image}
          imageProps={{ style: portraitStyle(item.cover) }}
        />
        <span className={styles.shade} aria-hidden="true" />
        <span className={styles.meta}>
          <strong>{name}</strong>
          <small>{details}</small>
        </span>
      </button>
      <button type="button" className={styles.remove} onClick={onRemove} aria-label={`Remove ${name}`}>
        <Trash2 size={14} />
      </button>
    </div>
  );
}
